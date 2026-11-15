import { migrateDbIfNeeded } from "@/services/database/client";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { analyticsService } from "@/services/domain/analyticsService";
import { budgetService } from "@/services/domain/budgetService";
import { currencyService } from "@/services/domain/currencyService";
import { transactionService } from "@/services/domain/transactionService";
import { TestDb } from "./sqliteAdapter";

describe("currency changes, budget alerts and daily average", () => {
  let db: TestDb;
  let groceriesId: number;
  let salaryId: number;
  beforeEach(async () => {
    db = await TestDb.create();
    await migrateDbIfNeeded(db);
    groceriesId = (await categoryRepo.list(db, { type: "expense" })).find(
      (item) => item.name === "Groceries",
    )!.id;
    salaryId = (await categoryRepo.list(db, { type: "income" })).find(
      (item) => item.name === "Salary",
    )!.id;
  });
  afterEach(() => db?.close());

  const expense = (amountMinor: number, date = "2026-11-10") => ({
    type: "expense" as const,
    amountMinor,
    categoryId: groceriesId,
    date,
  });

  it("keeps displayed amounts when the currency's decimal places change", async () => {
    const tx = await transactionRepo.insert(db, expense(1234));
    await budgetService.setBudget(db, {
      categoryId: null,
      month: "2026-11",
      amountMinor: 50000,
      alertThresholdPct: 80,
      alertThresholdMode: "cash",
      alertThresholdValue: 40000,
    });
    await budgetService.setBudget(db, {
      categoryId: groceriesId,
      month: "2026-11",
      amountMinor: 10000,
      alertThresholdPct: 80,
    });
    await settingsRepo.set(db, "opening_balance_minor", "10050");

    expect(await currencyService.willRound(db, "EUR")).toBe(false);
    expect(await currencyService.willRound(db, "JPY")).toBe(true);
    expect(await currencyService.change(db, " jpy ")).toEqual({
      currency: "JPY",
      decimals: 0,
    });
    expect((await transactionRepo.getById(db, tx.id))?.amountMinor).toBe(12);
    let budgets = await budgetRepo.listForMonth(db, "2026-11");
    expect(budgets.find((b) => b.categoryId === null)).toMatchObject({
      amountMinor: 500,
      alertThresholdValue: 400,
    });
    expect(budgets.find((b) => b.categoryId === groceriesId)).toMatchObject({
      amountMinor: 100,
      alertThresholdMode: "percent",
      alertThresholdValue: 80,
    });
    let settings = await settingsRepo.getAll(db);
    expect(settings).toMatchObject({
      currency_code: "JPY",
      currency_decimals: "0",
      opening_balance_minor: "101",
    });

    await currencyService.change(db, "BHD");
    expect((await transactionRepo.getById(db, tx.id))?.amountMinor).toBe(12000);
    budgets = await budgetRepo.listForMonth(db, "2026-11");
    expect(budgets.find((b) => b.categoryId === null)).toMatchObject({
      amountMinor: 500000,
      alertThresholdValue: 400000,
    });
    settings = await settingsRepo.getAll(db);
    expect(settings).toMatchObject({
      currency_decimals: "3",
      opening_balance_minor: "101000",
    });
  });

  it("only switches the code when decimal places are unchanged and rejects bad codes", async () => {
    const tx = await transactionRepo.insert(db, expense(1234));
    await currencyService.change(db, "EUR");
    expect((await transactionRepo.getById(db, tx.id))?.amountMinor).toBe(1234);
    await expect(currencyService.change(db, "US")).rejects.toThrow(
      "valid 3-letter currency code",
    );
    await expect(currencyService.change(db, "U$D")).rejects.toThrow();
    expect((await settingsRepo.getAll(db)).currency_code).toBe("EUR");
  });

  it("reports budgets that cross their alert threshold or limit on save", async () => {
    await budgetService.setBudget(db, {
      categoryId: null,
      month: "2026-11",
      amountMinor: 10000,
      alertThresholdPct: 80,
    });
    const first = await transactionService.saveWithAlerts(db, expense(5000));
    expect(first.alerts).toEqual([]);
    expect(first.transaction.amountMinor).toBe(5000);

    const second = await transactionService.saveWithAlerts(db, expense(3500));
    expect(second.alerts).toEqual([
      { budgetId: expect.any(Number), name: "Overall", kind: "threshold" },
    ]);

    // Editing an existing transaction upward crosses the limit.
    const edited = await transactionService.saveWithAlerts(
      db,
      expense(6000),
      second.transaction.id,
    );
    expect(edited.transaction.id).toBe(second.transaction.id);
    expect(edited.alerts).toEqual([
      { budgetId: expect.any(Number), name: "Overall", kind: "limit" },
    ]);

    // Already over the limit: nothing new is crossed.
    expect((await transactionService.saveWithAlerts(db, expense(100))).alerts)
      .toEqual([]);
  });

  it("stays quiet for income, other months and when alerts are switched off", async () => {
    await budgetService.setBudget(db, {
      categoryId: groceriesId,
      month: "2026-11",
      amountMinor: 1000,
      alertThresholdPct: 50,
    });
    const income = await transactionService.saveWithAlerts(db, {
      type: "income",
      amountMinor: 999999,
      categoryId: salaryId,
      date: "2026-11-10",
    });
    expect(income.alerts).toEqual([]);
    expect(
      (await transactionService.saveWithAlerts(db, expense(5000, "2026-10-10")))
        .alerts,
    ).toEqual([]);

    await settingsRepo.set(db, "budget_alerts_enabled", "0");
    expect((await transactionService.saveWithAlerts(db, expense(5000))).alerts)
      .toEqual([]);

    await settingsRepo.set(db, "budget_alerts_enabled", "1");
    await transactionRepo.remove(
      db,
      (await transactionRepo.recent(db, 1))[0].id,
    );
    expect(
      (await transactionService.saveWithAlerts(db, expense(600))).alerts,
    ).toEqual([
      { budgetId: expect.any(Number), name: "Groceries", kind: "threshold" },
    ]);
  });

  it("copies last month's budgets through the budget service", async () => {
    await budgetService.setBudget(db, {
      categoryId: null,
      month: "2026-10",
      amountMinor: 7000,
      alertThresholdPct: 80,
    });
    await budgetService.copyMonth(db, "2026-10", "2026-11");
    expect(await budgetRepo.listForMonth(db, "2026-11")).toHaveLength(1);
  });

  it("averages daily spend over elapsed days, or the whole month once it is over", async () => {
    await transactionRepo.insert(db, expense(3000, "2026-11-03"));
    await transactionRepo.insert(db, expense(3000, "2026-11-10"));
    const midMonth = await analyticsService.insights(
      db,
      "2026-11",
      new Date(2026, 10, 10, 12),
    );
    expect(midMonth.averageDailySpend).toBe(600);
    const afterwards = await analyticsService.insights(
      db,
      "2026-11",
      new Date(2027, 0, 15, 12),
    );
    expect(afterwards.averageDailySpend).toBe(200);
    expect(
      (await analyticsService.insights(db, "2026-09")).averageDailySpend,
    ).toBe(0);
  });
});
