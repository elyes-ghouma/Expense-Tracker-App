import type { BudgetProgress, Db } from "@/types/domain";
type Row = {
  id: number;
  category_id: number | null;
  month: string;
  amount_minor: number;
  alert_threshold_pct: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent_minor: number;
};
export const budgetRepo = {
  async listForMonth(db: Db, month: string): Promise<BudgetProgress[]> {
    const rows = await db.getAllAsync<Row>(
      `SELECT b.*,c.name category_name,c.icon category_icon,c.color category_color,COALESCE(SUM(t.amount_minor),0) spent_minor FROM budgets b LEFT JOIN categories c ON c.id=b.category_id LEFT JOIN transactions t ON t.type='expense' AND substr(t.transaction_date,1,7)=b.month AND (t.category_id=b.category_id OR b.category_id IS NULL) WHERE b.month=? GROUP BY b.id ORDER BY b.category_id IS NOT NULL,c.sort_order`,
      [month],
    );
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      month: r.month,
      amountMinor: r.amount_minor,
      alertThresholdPct: r.alert_threshold_pct,
      categoryName: r.category_name,
      categoryIcon: r.category_icon,
      categoryColor: r.category_color,
      spentMinor: r.spent_minor,
    }));
  },
  async upsert(
    db: Db,
    b: {
      categoryId: number | null;
      month: string;
      amountMinor: number;
      alertThresholdPct: number;
    },
  ) {
    if (b.categoryId === null) {
      await db.runAsync(
        "INSERT INTO budgets(category_id,month,amount_minor,alert_threshold_pct) VALUES(NULL,?,?,?) ON CONFLICT(month) WHERE category_id IS NULL DO UPDATE SET amount_minor=excluded.amount_minor,alert_threshold_pct=excluded.alert_threshold_pct,updated_at=?",
        [b.month, b.amountMinor, b.alertThresholdPct, Date.now()],
      );
      return;
    }
    await db.runAsync(
      "INSERT INTO budgets(category_id,month,amount_minor,alert_threshold_pct) VALUES(?,?,?,?) ON CONFLICT(category_id,month) DO UPDATE SET amount_minor=excluded.amount_minor,alert_threshold_pct=excluded.alert_threshold_pct,updated_at=?",
      [b.categoryId, b.month, b.amountMinor, b.alertThresholdPct, Date.now()],
    );
  },
  async remove(db: Db, id: number) {
    await db.runAsync("DELETE FROM budgets WHERE id=?", [id]);
  },
  async copyMonth(db: Db, from: string, to: string) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT OR IGNORE INTO budgets(category_id,month,amount_minor,alert_threshold_pct) SELECT category_id,?,amount_minor,alert_threshold_pct FROM budgets WHERE month=?",
        [to, from],
      );
    });
  },
};
