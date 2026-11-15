import type { Db } from "@/types/domain";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { analyticsRepo } from "@/services/database/repositories/analyticsRepo";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { monthRange, addMonths, monthKey } from "@/utils/dates";
export const analyticsService = {
  async dashboard(db: Db, month: string) {
    const [from, to] = monthRange(month);
    const [totals, balance, breakdown, incomeBreakdown, recent, budgets] =
      await Promise.all([
        transactionRepo.monthTotals(db, from, to),
        transactionRepo.netBalance(db),
        analyticsRepo.categoryBreakdown(db, "expense", from, to),
        analyticsRepo.categoryBreakdown(db, "income", from, to),
        transactionRepo.recent(db, 5),
        budgetRepo.listForMonth(db, month),
      ]);
    return {
      ...totals,
      balanceMinor: balance,
      breakdown,
      incomeBreakdown,
      recent,
      budgets,
    };
  },
  async trend(db: Db, month: string, count = 6) {
    const first = addMonths(month, -(count - 1));
    const [, to] = monthRange(addMonths(month, 1));
    const [from] = monthRange(first);
    return analyticsRepo.trend(db, from, to);
  },
  async comparison(db: Db, month: string) {
    const [from, to] = monthRange(month);
    const [previous] = monthRange(addMonths(month, -1));
    const [current, prior] = await Promise.all([
      transactionRepo.monthTotals(db, from, to),
      transactionRepo.monthTotals(db, previous, from),
    ]);
    return {
      current: current.expenseMinor,
      previous: prior.expenseMinor,
      delta: current.expenseMinor - prior.expenseMinor,
    };
  },
  async insights(db: Db, month: string, today = new Date()) {
    const [from, to] = monthRange(month);
    // Average over the days elapsed so far in the current month, or over the
    // whole month for past months.
    const daysInMonth = Math.round(
      (new Date(`${to}T12:00:00`).getTime() -
        new Date(`${from}T12:00:00`).getTime()) /
        86_400_000,
    );
    const days = month === monthKey(today) ? today.getDate() : daysInMonth;
    const [daily, top] = await Promise.all([
      analyticsRepo.dailySpend(db, from, to),
      analyticsRepo.topSpendDay(db, from, to),
    ]);
    return {
      daily,
      topSpendDay: top,
      averageDailySpend: daily.length
        ? Math.round(daily.reduce((s, d) => s + d.total, 0) / days)
        : 0,
    };
  },
};
