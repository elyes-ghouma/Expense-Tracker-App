import { transactionInputSchema } from "@/services/domain/transactionService";
import { budgetService } from "@/services/domain/budgetService";
describe("domain validation and budget rules", () => {
  it("accepts valid transaction input", () =>
    expect(
      transactionInputSchema.safeParse({
        type: "expense",
        amountMinor: 2500,
        categoryId: 2,
        date: "2026-11-14",
        note: "lunch",
      }).success,
    ).toBe(true));
  it.each([
    { type: "transfer", amountMinor: 50, categoryId: 1, date: "2026-11-14" },
    { type: "income", amountMinor: 0, categoryId: 1, date: "2026-11-14" },
    { type: "expense", amountMinor: 50, categoryId: 1, date: "bad" },
  ])("rejects invalid transaction input", (input) =>
    expect(transactionInputSchema.safeParse(input).success).toBe(false),
  );
  it("detects threshold and budget limit crossings", () => {
    expect(budgetService.crossedThresholds(7900, 8000, {
      amountMinor: 10000,
      alertThresholdPct: 80,
      alertThresholdMode: "percent",
      alertThresholdValue: 80,
    })).toEqual({
      threshold: true,
      limit: false,
    });
    expect(budgetService.crossedThresholds(9900, 10100, {
      amountMinor: 10000,
      alertThresholdPct: 80,
      alertThresholdMode: "percent",
      alertThresholdValue: 80,
    })).toEqual({
      threshold: false,
      limit: true,
    });
    expect(budgetService.crossedThresholds(5000, 7900, {
      amountMinor: 10000,
      alertThresholdPct: 80,
      alertThresholdMode: "percent",
      alertThresholdValue: 80,
    })).toEqual({
      threshold: false,
      limit: false,
    });
    expect(budgetService.crossedThresholds(7999, 8000, {
      amountMinor: 10000,
      alertThresholdPct: 80,
      alertThresholdMode: "cash",
      alertThresholdValue: 8000,
    })).toEqual({ threshold: true, limit: false });
  });
});
