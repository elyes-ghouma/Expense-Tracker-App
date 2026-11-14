import { migrateDbIfNeeded } from "@/services/database/client";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { analyticsRepo } from "@/services/database/repositories/analyticsRepo";
import { transactionService } from "@/services/domain/transactionService";
import { categoryService } from "@/services/domain/categoryService";
import { budgetService } from "@/services/domain/budgetService";
import { analyticsService } from "@/services/domain/analyticsService";
import { TestDb } from "./sqliteAdapter";

describe("domain services and repository operations", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await TestDb.create();
    await migrateDbIfNeeded(db);
  });
  afterEach(() => db?.close());

  it("validates and creates, edits, removes, restores and duplicates transactions", async () => {
    const groceries = (await categoryRepo.list(db, { type: "expense" })).find(
      (item) => item.name === "Groceries",
    )!;
    const salary = (await categoryRepo.list(db, { type: "income" })).find(
      (item) => item.name === "Salary",
    )!;
    const dto = {
      type: "expense" as const,
      amountMinor: 2200,
      categoryId: groceries.id,
      date: "2026-11-14",
      note: "market",
    };
    const created = await transactionService.create(db, dto);
    await expect(
      transactionService.create(db, { ...dto, categoryId: salary.id }),
    ).rejects.toThrow("Choose an active category");
    const updated = await transactionService.update(db, created.id, {
      ...dto,
      amountMinor: 3200,
      note: "weekly shop",
    });
    expect(updated.amountMinor).toBe(3200);
    const duplicate = await transactionService.duplicate(db, created.id);
    expect(duplicate.date).toBe("2026-11-14");
    const removed = await transactionService.remove(db, created.id);
    await transactionService.restore(db, removed);
    expect(await transactionRepo.getById(db, created.id)).toMatchObject({
      id: created.id,
      amountMinor: 3200,
    });
  });

  it("creates categories, validates names, and archives categories in use", async () => {
    const custom = await categoryService.create(db, {
      name: "  Pet care ",
      type: "expense",
      icon: "paw",
      color: "#123ABC",
    });
    expect(custom?.name).toBe("Pet care");
    await expect(
      categoryService.create(db, {
        name: " ",
        type: "expense",
        icon: "paw",
        color: "#123ABC",
      }),
    ).rejects.toThrow();
    await expect(
      categoryService.update(db, custom!.id, { color: "purple" }),
    ).rejects.toThrow();
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 500,
      categoryId: custom!.id,
      date: "2026-11-14",
    });
    expect(await categoryService.archiveOrDelete(db, custom!.id)).toBe(
      "archived",
    );
    expect(await categoryRepo.usageCount(db, custom!.id)).toBe(1);
    const unused = await categoryService.create(db, {
      name: "New hobby",
      type: "expense",
      icon: "star",
      color: "#123ABC",
    });
    expect(await categoryService.archiveOrDelete(db, unused!.id)).toBe(
      "deleted",
    );
    await expect(categoryService.archiveOrDelete(db, 9999)).rejects.toThrow(
      "Category not found",
    );
  });

  it("reads and updates settings, category frequency and budget copies", async () => {
    const grocery = (await categoryRepo.list(db, { type: "expense" })).find(
      (item) => item.name === "Groceries",
    )!;
    await settingsRepo.set(db, "currency_code", "EUR");
    expect((await settingsRepo.getAll(db)).currency_code).toBe("EUR");
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 100,
      categoryId: grocery.id,
      date: "2026-11-12",
    });
    expect(
      (await categoryRepo.getFrequent(db, "expense", "2026-11-01")).some(
        (item) => item.id === grocery.id,
      ),
    ).toBe(true);
    await budgetService.setBudget(db, {
      categoryId: grocery.id,
      month: "2026-11",
      amountMinor: 5000,
      alertThresholdPct: 75,
    });
    await budgetRepo.copyMonth(db, "2026-11", "2026-12");
    expect(await budgetRepo.listForMonth(db, "2026-12")).toMatchObject([
      { categoryId: grocery.id, amountMinor: 5000 },
    ]);
    await budgetRepo.remove(
      db,
      (await budgetRepo.listForMonth(db, "2026-12"))[0].id,
    );
    expect(await budgetRepo.listForMonth(db, "2026-12")).toHaveLength(0);
    await expect(
      budgetService.setBudget(db, {
        categoryId: null,
        month: "2026-11",
        amountMinor: 0,
        alertThresholdPct: 80,
      }),
    ).rejects.toThrow();
  });

  it("calculates dashboard, analytics, totals and balance from SQLite", async () => {
    const grocery = (await categoryRepo.list(db, { type: "expense" })).find(
      (item) => item.name === "Groceries",
    )!;
    const salary = (await categoryRepo.list(db, { type: "income" })).find(
      (item) => item.name === "Salary",
    )!;
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 4000,
      categoryId: grocery.id,
      date: "2026-11-03",
    });
    await transactionRepo.insert(db, {
      type: "income",
      amountMinor: 10000,
      categoryId: salary.id,
      date: "2026-11-05",
    });
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 2000,
      categoryId: grocery.id,
      date: "2026-10-03",
    });
    expect(await transactionRepo.netBalance(db)).toBe(4000);
    expect(
      await transactionRepo.monthTotals(db, "2026-11-01", "2026-12-01"),
    ).toEqual({ incomeMinor: 10000, expenseMinor: 4000 });
    expect(await transactionRepo.recent(db, 1)).toHaveLength(1);
    expect(
      await analyticsRepo.categoryBreakdown(
        db,
        "expense",
        "2026-11-01",
        "2026-12-01",
      ),
    ).toHaveLength(1);
    expect(
      await analyticsRepo.trend(db, "2026-10-01", "2026-12-01"),
    ).toHaveLength(2);
    expect(
      await analyticsRepo.dailySpend(db, "2026-11-01", "2026-12-01"),
    ).toHaveLength(1);
    expect(
      await analyticsRepo.topSpendDay(db, "2026-11-01", "2026-12-01"),
    ).toMatchObject({ day: "2026-11-03", total: 4000 });
    expect((await analyticsService.dashboard(db, "2026-11")).balanceMinor).toBe(
      4000,
    );
    expect(await analyticsService.comparison(db, "2026-11")).toMatchObject({
      current: 4000,
      previous: 2000,
      delta: 2000,
    });
    expect((await analyticsService.trend(db, "2026-11", 3)).length).toBe(2);
    expect(
      (await analyticsService.insights(db, "2026-11")).topSpendDay?.day,
    ).toBe("2026-11-03");
  });
});
