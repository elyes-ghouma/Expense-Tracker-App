import type { Db, TxType } from "@/types/domain";
export const analyticsRepo = {
  async categoryBreakdown(db: Db, type: TxType, from: string, to: string) {
    return db.getAllAsync<{
      category_id: number;
      name: string;
      icon: string;
      color: string;
      total: number;
    }>(
      "SELECT c.id category_id,c.name,c.icon,c.color,SUM(t.amount_minor) total FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.type=? AND t.transaction_date>=? AND t.transaction_date<? GROUP BY c.id ORDER BY total DESC",
      [type, from, to],
    );
  },
  async trend(db: Db, from: string, to: string) {
    return db.getAllAsync<{ month: string; income: number; expense: number }>(
      "SELECT substr(transaction_date,1,7) month,COALESCE(SUM(CASE WHEN type='income' THEN amount_minor ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN type='expense' THEN amount_minor ELSE 0 END),0) expense FROM transactions WHERE transaction_date>=? AND transaction_date<? GROUP BY substr(transaction_date,1,7) ORDER BY month",
      [from, to],
    );
  },
  async dailySpend(db: Db, from: string, to: string) {
    return db.getAllAsync<{ day: string; total: number }>(
      "SELECT transaction_date day,SUM(amount_minor) total FROM transactions WHERE type='expense' AND transaction_date>=? AND transaction_date<? GROUP BY transaction_date ORDER BY day",
      [from, to],
    );
  },
  async topSpendDay(db: Db, from: string, to: string) {
    return db.getFirstAsync<{ day: string; total: number }>(
      "SELECT transaction_date day,SUM(amount_minor) total FROM transactions WHERE type='expense' AND transaction_date>=? AND transaction_date<? GROUP BY transaction_date ORDER BY total DESC LIMIT 1",
      [from, to],
    );
  },
};
