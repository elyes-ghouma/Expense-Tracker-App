import type {
  Cursor,
  Db,
  Page,
  TransactionFilter,
  TransactionItem,
  Transaction,
} from "@/types/domain";
type Row = {
  id: number;
  type: "expense" | "income";
  amount_minor: number;
  category_id: number;
  note: string | null;
  transaction_date: string;
  created_at: number;
  updated_at: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
};
const map = (r: Row): TransactionItem => ({
  id: r.id,
  type: r.type,
  amountMinor: r.amount_minor,
  categoryId: r.category_id,
  note: r.note,
  date: r.transaction_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  categoryName: r.category_name ?? "",
  categoryIcon: r.category_icon ?? "",
  categoryColor: r.category_color ?? "#5B5FEF",
});
function where(filter: TransactionFilter) {
  const parts: string[] = [];
  const values: unknown[] = [];
  if (filter.type) {
    parts.push("t.type=?");
    values.push(filter.type);
  }
  if (filter.dateFrom) {
    parts.push("t.transaction_date>=?");
    values.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    parts.push("t.transaction_date<?");
    values.push(filter.dateTo);
  }
  if (filter.categoryIds?.length) {
    parts.push(
      `t.category_id IN (${filter.categoryIds.map(() => "?").join(",")})`,
    );
    values.push(...filter.categoryIds);
  }
  if (filter.search?.trim()) {
    parts.push("(t.note LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')");
    const escaped = filter.search.trim().replace(/[\\%_]/g, "\\$&");
    values.push(`%${escaped}%`, `%${escaped}%`);
  }
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", values };
}
export const transactionRepo = {
  async insert(
    db: Db,
    input: {
      type: "expense" | "income";
      amountMinor: number;
      categoryId: number;
      note?: string | null;
      date: string;
    },
  ): Promise<Transaction> {
    const r = await db.runAsync(
      "INSERT INTO transactions(type,amount_minor,category_id,note,transaction_date) VALUES(?,?,?,?,?)",
      [
        input.type,
        input.amountMinor,
        input.categoryId,
        input.note?.trim() || null,
        input.date,
      ],
    );
    return this.getById(db, r.lastInsertRowId) as Promise<Transaction>;
  },
  async insertWithId(db: Db, tx: Transaction) {
    await db.runAsync(
      "INSERT INTO transactions(id,type,amount_minor,category_id,note,transaction_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      [
        tx.id,
        tx.type,
        tx.amountMinor,
        tx.categoryId,
        tx.note,
        tx.date,
        tx.createdAt,
        tx.updatedAt,
      ],
    );
  },
  async update(
    db: Db,
    id: number,
    input: {
      type: "expense" | "income";
      amountMinor: number;
      categoryId: number;
      note?: string | null;
      date: string;
    },
  ) {
    await db.runAsync(
      "UPDATE transactions SET type=?,amount_minor=?,category_id=?,note=?,transaction_date=?,updated_at=? WHERE id=?",
      [
        input.type,
        input.amountMinor,
        input.categoryId,
        input.note?.trim() || null,
        input.date,
        Date.now(),
        id,
      ],
    );
    const result = await this.getById(db, id);
    if (!result) throw new Error("Transaction not found");
    return result;
  },
  async remove(db: Db, id: number) {
    const row = await this.getById(db, id);
    if (!row) throw new Error("Transaction not found");
    await db.runAsync("DELETE FROM transactions WHERE id=?", [id]);
    return row;
  },
  async getById(db: Db, id: number) {
    const r = await db.getFirstAsync<Row>(
      "SELECT * FROM transactions WHERE id=?",
      [id],
    );
    return r
      ? {
          id: r.id,
          type: r.type,
          amountMinor: r.amount_minor,
          categoryId: r.category_id,
          note: r.note,
          date: r.transaction_date,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      : null;
  },
  async list(
    db: Db,
    filter: TransactionFilter = {},
    cursor?: Cursor,
    limit = 30,
  ): Promise<Page<TransactionItem>> {
    const w = where(filter);
    const c = cursor
      ? `${w.sql ? "AND" : "WHERE"} (t.transaction_date<? OR (t.transaction_date=? AND t.id<?))`
      : "";
    const args = [
      ...w.values,
      ...(cursor ? [cursor.date, cursor.date, cursor.id] : []),
      limit + 1,
    ];
    const rows = await db.getAllAsync<Row>(
      `SELECT t.*,c.name AS category_name,c.icon AS category_icon,c.color AS category_color FROM transactions t JOIN categories c ON c.id=t.category_id ${w.sql}${c ? ` ${c}` : ""} ORDER BY t.transaction_date DESC,t.id DESC LIMIT ?`,
      args,
    );
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(map);
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? { date: last.date, id: last.id } : null,
    };
  },
  async summary(db: Db, filter: TransactionFilter = {}) {
    const w = where(filter);
    const r = await db.getFirstAsync<{
      count: number;
      income_minor: number;
      expense_minor: number;
    }>(
      `SELECT COUNT(*) count,COALESCE(SUM(CASE WHEN t.type='income' THEN amount_minor ELSE 0 END),0) income_minor,COALESCE(SUM(CASE WHEN t.type='expense' THEN amount_minor ELSE 0 END),0) expense_minor FROM transactions t JOIN categories c ON c.id=t.category_id ${w.sql}`,
      w.values,
    );
    return {
      count: r?.count ?? 0,
      incomeMinor: r?.income_minor ?? 0,
      expenseMinor: r?.expense_minor ?? 0,
    };
  },
  async monthTotals(db: Db, from: string, to: string) {
    const r = await db.getFirstAsync<{ income: number; expense: number }>(
      "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount_minor ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN type='expense' THEN amount_minor ELSE 0 END),0) expense FROM transactions WHERE transaction_date>=? AND transaction_date<?",
      [from, to],
    );
    return { incomeMinor: r?.income ?? 0, expenseMinor: r?.expense ?? 0 };
  },
  async netBalance(db: Db) {
    const r = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount_minor ELSE -amount_minor END),0) total FROM transactions",
    );
    return r?.total ?? 0;
  },
  async recent(db: Db, n: number) {
    return (await this.list(db, {}, undefined, n)).items;
  },
};
