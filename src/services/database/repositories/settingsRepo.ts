import type { Db } from "@/types/domain";
export const settingsRepo = {
  async getAll(db: Db) {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key,value FROM settings",
    );
    return Object.fromEntries(rows.map((x) => [x.key, x.value])) as Record<
      string,
      string
    >;
  },
  async set(db: Db, key: string, value: string) {
    await db.runAsync(
      "INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      [key, value, Date.now()],
    );
  },
};
