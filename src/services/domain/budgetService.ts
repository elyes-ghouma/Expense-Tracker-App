import type { Db } from "@/types/domain";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
export const budgetService = {
  ensureMonth: async (db: Db, month: string) =>
    budgetRepo.listForMonth(db, month),
  setBudget: async (
    db: Db,
    b: {
      categoryId: number | null;
      month: string;
      amountMinor: number;
      alertThresholdPct: number;
      alertThresholdMode?: "percent" | "cash";
      alertThresholdValue?: number;
    },
  ) => {
    if (!Number.isInteger(b.amountMinor) || b.amountMinor <= 0)
      throw new Error("Budget must be greater than zero");
    const mode = b.alertThresholdMode ?? "percent";
    const value = b.alertThresholdValue ?? b.alertThresholdPct;
    if (!Number.isInteger(value) || value <= 0)
      throw new Error("Alert threshold must be greater than zero");
    if (mode === "percent" && value > 100)
      throw new Error("Percentage threshold must be between 1 and 100");
    if (mode === "cash" && value > b.amountMinor)
      throw new Error("Cash alert cannot exceed the monthly limit");
    const alertThresholdPct = mode === "percent"
      ? value
      : Math.max(1, Math.round((value / b.amountMinor) * 100));
    return budgetRepo.upsert(db, { ...b, alertThresholdPct, alertThresholdMode: mode, alertThresholdValue: value });
  },
  removeBudget: budgetRepo.remove,
  alertThresholdMinor: (budget: { amountMinor: number; alertThresholdMode?: "percent" | "cash"; alertThresholdValue?: number; alertThresholdPct: number }) =>
    budget.alertThresholdMode === "cash"
      ? budget.alertThresholdValue ?? 0
      : Math.round((budget.amountMinor * (budget.alertThresholdValue ?? budget.alertThresholdPct)) / 100),
  crossedThresholds: (beforeSpentMinor: number, afterSpentMinor: number, budget: { amountMinor: number; alertThresholdMode?: "percent" | "cash"; alertThresholdValue?: number; alertThresholdPct: number }) => {
    const thresholdMinor = budgetService.alertThresholdMinor(budget);
    return {
      threshold: beforeSpentMinor < thresholdMinor && afterSpentMinor >= thresholdMinor,
      limit: beforeSpentMinor < budget.amountMinor && afterSpentMinor >= budget.amountMinor,
    };
  },
};
