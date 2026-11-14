import { migrateDbIfNeeded } from "@/services/database/client";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { TestDb } from "./sqliteAdapter";
describe("SQLite repositories", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await TestDb.create();
    await migrateDbIfNeeded(db);
  });
  afterEach(() => db?.close());
  it("creates 17 default categories and rejects mismatched transaction types", async () => {
    expect((await categoryRepo.list(db)).length).toBe(17);
    const cats = await categoryRepo.list(db);
    const salary = cats.find((x) => x.name === "Salary")!;
    await expect(
      transactionRepo.insert(db, {
        type: "expense",
        amountMinor: 100,
        categoryId: salary.id,
        date: "2026-11-14",
      }),
    ).rejects.toThrow(/type must match/i);
  });
  it("inserts, filters, summarizes, and paginates newest first", async () => {
    const groceries = (await categoryRepo.list(db, { type: "expense" })).find(
      (x) => x.name === "Groceries",
    )!;
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 2500,
      categoryId: groceries.id,
      date: "2026-11-14",
      note: "market",
    });
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 1200,
      categoryId: groceries.id,
      date: "2026-11-13",
      note: "bread",
    });
    const first = await transactionRepo.list(db, {}, undefined, 1);
    expect(first.items[0].note).toBe("market");
    expect(first.nextCursor).toEqual({
      date: "2026-11-14",
      id: first.items[0].id,
    });
    const next = await transactionRepo.list(db, {}, first.nextCursor!, 1);
    expect(next.items[0].note).toBe("bread");
    expect(
      (await transactionRepo.summary(db, { search: "market" })).expenseMinor,
    ).toBe(2500);
  });
  it("upserts one overall budget and aggregates all expenses", async () => {
    const groceries = (await categoryRepo.list(db, { type: "expense" })).find(
      (x) => x.name === "Groceries",
    )!;
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 3500,
      categoryId: groceries.id,
      date: "2026-11-02",
    });
    await budgetRepo.upsert(db, {
      categoryId: null,
      month: "2026-11",
      amountMinor: 10000,
      alertThresholdPct: 80,
    });
    await budgetRepo.upsert(db, {
      categoryId: null,
      month: "2026-11",
      amountMinor: 12000,
      alertThresholdPct: 85,
    });
    const budgets = await budgetRepo.listForMonth(db, "2026-11");
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toMatchObject({
      amountMinor: 12000,
      spentMinor: 3500,
      alertThresholdPct: 85,
    });
  });
  it("rejects invalid dates and non-positive amounts at the database boundary", async () => {
    const category = (await categoryRepo.list(db, { type: "expense" }))[0];
    await expect(
      transactionRepo.insert(db, {
        type: "expense",
        amountMinor: 0,
        categoryId: category.id,
        date: "2026-11-14",
      }),
    ).rejects.toThrow();
    await expect(
      transactionRepo.insert(db, {
        type: "expense",
        amountMinor: 100,
        categoryId: category.id,
        date: "not-a-day",
      }),
    ).rejects.toThrow();
  });
  it("combines transaction type, date, category and escaped search filters", async () => {
    const expense = (await categoryRepo.list(db, { type: "expense" }))[0];
    const income = (await categoryRepo.list(db, { type: "income" }))[0];
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 100,
      categoryId: expense.id,
      date: "2026-11-05",
      note: "50%_off special",
    });
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 200,
      categoryId: expense.id,
      date: "2026-11-12",
      note: "outside range",
    });
    await transactionRepo.insert(db, {
      type: "income",
      amountMinor: 300,
      categoryId: income.id,
      date: "2026-11-05",
      note: "50%_off special",
    });
    const page = await transactionRepo.list(db, {
      type: "expense",
      dateFrom: "2026-11-01",
      dateTo: "2026-11-10",
      categoryIds: [expense.id],
      search: "50%_off",
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      amountMinor: 100,
      note: "50%_off special",
    });
    expect(await categoryRepo.get(db, 999)).toBeNull();
  });
  it("returns clear errors for edits and removals of missing transactions", async () => {
    await expect(
      transactionRepo.update(db, 404, {
        type: "expense",
        amountMinor: 100,
        categoryId: 1,
        date: "2026-11-01",
      }),
    ).rejects.toThrow("Transaction not found");
    await expect(transactionRepo.remove(db, 404)).rejects.toThrow(
      "Transaction not found",
    );
    expect(await transactionRepo.getById(db, 404)).toBeNull();
  });
  it("updates and archives a category and exposes archived categories only when requested", async () => {
    const category = await categoryRepo.insert(db, {
      name: "Weekend",
      type: "expense",
      icon: "sunny",
      color: "#F97316",
    });
    await categoryRepo.update(db, category!.id, { name: "Leisure" });
    expect((await categoryRepo.get(db, category!.id))?.name).toBe("Leisure");
    await categoryRepo.archive(db, category!.id);
    expect(
      (await categoryRepo.list(db)).some((item) => item.id === category!.id),
    ).toBe(false);
    expect(
      (await categoryRepo.list(db, { includeArchived: true })).some(
        (item) => item.id === category!.id,
      ),
    ).toBe(true);
  });
});
