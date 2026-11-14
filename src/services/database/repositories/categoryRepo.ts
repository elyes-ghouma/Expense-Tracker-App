import type { Category, Db, TxType } from "@/types/domain";
type Row = {
  id: number;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  is_default: number;
  is_archived: number;
  sort_order: number;
};
const map = (r: Row): Category => ({
  id: r.id,
  name: r.name,
  type: r.type,
  icon: r.icon,
  color: r.color,
  isDefault: !!r.is_default,
  isArchived: !!r.is_archived,
  sortOrder: r.sort_order,
});
export const categoryRepo = {
  async list(db: Db, o: { type?: TxType; includeArchived?: boolean } = {}) {
    const p: unknown[] = [];
    let w = "";
    if (o.type) {
      w = "WHERE type=?";
      p.push(o.type);
    }
    if (!o.includeArchived) w += `${w ? " AND" : "WHERE"} is_archived=0`;
    return (
      await db.getAllAsync<Row>(
        `SELECT * FROM categories ${w} ORDER BY sort_order,name`,
        p,
      )
    ).map(map);
  },
  async getFrequent(db: Db, type: TxType, sinceDay: string, limit = 4) {
    return (
      await db.getAllAsync<Row>(
        "SELECT c.*,COUNT(t.id) usage_count FROM categories c LEFT JOIN transactions t ON t.category_id=c.id AND t.transaction_date>=? WHERE c.type=? AND c.is_archived=0 GROUP BY c.id ORDER BY usage_count DESC,c.sort_order LIMIT ?",
        [sinceDay, type, limit],
      )
    ).map(map);
  },
  async insert(
    db: Db,
    input: { name: string; type: TxType; icon: string; color: string },
  ) {
    const r = await db.runAsync(
      "INSERT INTO categories(name,type,icon,color,sort_order) VALUES(?,?,?,?,(SELECT COALESCE(MAX(sort_order),0)+1 FROM categories WHERE type=?))",
      [input.name.trim(), input.type, input.icon, input.color, input.type],
    );
    return this.get(db, r.lastInsertRowId);
  },
  async update(
    db: Db,
    id: number,
    input: Partial<{ name: string; icon: string; color: string }>,
  ) {
    await db.runAsync(
      "UPDATE categories SET name=COALESCE(?,name),icon=COALESCE(?,icon),color=COALESCE(?,color),updated_at=? WHERE id=?",
      [
        input.name?.trim() ?? null,
        input.icon ?? null,
        input.color ?? null,
        Date.now(),
        id,
      ],
    );
  },
  async get(db: Db, id: number) {
    const r = await db.getFirstAsync<Row>(
      "SELECT * FROM categories WHERE id=?",
      [id],
    );
    return r ? map(r) : null;
  },
  async archive(db: Db, id: number) {
    await db.runAsync(
      "UPDATE categories SET is_archived=1,updated_at=? WHERE id=?",
      [Date.now(), id],
    );
  },
  async usageCount(db: Db, id: number) {
    const r = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) count FROM transactions WHERE category_id=?",
      [id],
    );
    return r?.count ?? 0;
  },
  async deleteIfUnused(db: Db, id: number) {
    await db.runAsync(
      "DELETE FROM categories WHERE id=? AND NOT EXISTS(SELECT 1 FROM transactions WHERE category_id=?)",
      [id, id],
    );
  },
};
