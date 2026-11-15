import type { BudgetProgress, Db } from "@/types/domain";
type Row = {
  id: number;
  category_id: number | null;
  month: string;
  amount_minor: number;
  alert_threshold_pct: number;
  alert_threshold_mode: "percent" | "cash";
  alert_threshold_value: number;
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
      alertThresholdMode: r.alert_threshold_mode ?? "percent",
      alertThresholdValue: r.alert_threshold_value ?? r.alert_threshold_pct,
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
      alertThresholdMode?: "percent" | "cash";
      alertThresholdValue?: number;
    },
  ) {
    if (b.categoryId === null) {
      await db.runAsync(
        "INSERT INTO budgets(category_id,month,amount_minor,alert_threshold_pct,alert_threshold_mode,alert_threshold_value) VALUES(NULL,?,?,?,?,?) ON CONFLICT(month) WHERE category_id IS NULL DO UPDATE SET amount_minor=excluded.amount_minor,alert_threshold_pct=excluded.alert_threshold_pct,alert_threshold_mode=excluded.alert_threshold_mode,alert_threshold_value=excluded.alert_threshold_value,updated_at=?",
        [b.month, b.amountMinor, b.alertThresholdPct, b.alertThresholdMode ?? "percent", b.alertThresholdValue ?? b.alertThresholdPct, Date.now()],
      );
      return;
    }
    await db.runAsync(
      "INSERT INTO budgets(category_id,month,amount_minor,alert_threshold_pct,alert_threshold_mode,alert_threshold_value) VALUES(?,?,?,?,?,?) ON CONFLICT(category_id,month) DO UPDATE SET amount_minor=excluded.amount_minor,alert_threshold_pct=excluded.alert_threshold_pct,alert_threshold_mode=excluded.alert_threshold_mode,alert_threshold_value=excluded.alert_threshold_value,updated_at=?",
      [b.categoryId, b.month, b.amountMinor, b.alertThresholdPct, b.alertThresholdMode ?? "percent", b.alertThresholdValue ?? b.alertThresholdPct, Date.now()],
    );
  },
  async remove(db: Db, id: number) {
    await db.runAsync("DELETE FROM budgets WHERE id=?", [id]);
  },
  /** Rescales limits and cash alert amounts; percentage alerts are unchanged. */
  async rescaleAmounts(db: Db, fromDecimals: number, toDecimals: number) {
    const factor = 10 ** Math.abs(toDecimals - fromDecimals);
    if (toDecimals > fromDecimals)
      await db.runAsync(
        "UPDATE budgets SET amount_minor=amount_minor*?,alert_threshold_value=CASE WHEN alert_threshold_mode='cash' THEN alert_threshold_value*? ELSE alert_threshold_value END",
        [factor, factor],
      );
    else if (toDecimals < fromDecimals)
      await db.runAsync(
        "UPDATE budgets SET amount_minor=MAX(1,CAST(ROUND(amount_minor*1.0/?) AS INTEGER)),alert_threshold_value=CASE WHEN alert_threshold_mode='cash' THEN MAX(1,CAST(ROUND(alert_threshold_value*1.0/?) AS INTEGER)) ELSE alert_threshold_value END",
        [factor, factor],
      );
  },
  async copyMonth(db: Db, from: string, to: string) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT OR IGNORE INTO budgets(category_id,month,amount_minor,alert_threshold_pct,alert_threshold_mode,alert_threshold_value) SELECT category_id,?,amount_minor,alert_threshold_pct,alert_threshold_mode,alert_threshold_value FROM budgets WHERE month=?",
        [to, from],
      );
    });
  },
};
