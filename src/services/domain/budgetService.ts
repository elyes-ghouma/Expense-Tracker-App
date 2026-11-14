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
    },
  ) => {
    if (!Number.isInteger(b.amountMinor) || b.amountMinor <= 0)
      throw new Error("Budget must be greater than zero");
    if (
      !Number.isInteger(b.alertThresholdPct) ||
      b.alertThresholdPct < 1 ||
      b.alertThresholdPct > 100
    )
      throw new Error("Threshold must be between 1 and 100");
    return budgetRepo.upsert(db, b);
  },
  removeBudget: budgetRepo.remove,
  crossedThresholds: (before: number, after: number, threshold: number) => ({
    threshold: before < threshold && after >= threshold,
    limit: before < 100 && after >= 100,
  }),
};
