import type { Db } from "@/types/domain";
import { seedDatabase } from "./seed";
export async function migrateDbIfNeeded(db: Db): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const version = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((version?.user_version ?? 0) >= 1) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL,updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL COLLATE NOCASE CHECK(length(trim(name)) BETWEEN 1 AND 40),type TEXT NOT NULL CHECK(type IN ('expense','income')),icon TEXT NOT NULL,color TEXT NOT NULL CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN(0,1)),is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN(0,1)),sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),UNIQUE(type,name));
  CREATE INDEX IF NOT EXISTS idx_categories_type_active ON categories(type,is_archived,sort_order);
  CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL CHECK(type IN ('expense','income')),amount_minor INTEGER NOT NULL CHECK(amount_minor>0),category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,note TEXT CHECK(note IS NULL OR length(note)<=280),transaction_date TEXT NOT NULL CHECK(transaction_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(transaction_date) IS NOT NULL),created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000));
  CREATE INDEX IF NOT EXISTS idx_tx_date_id ON transactions(transaction_date DESC,id DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_category_date ON transactions(category_id,transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_tx_type_date_cover ON transactions(type,transaction_date,category_id,amount_minor);
  CREATE TRIGGER IF NOT EXISTS trg_tx_type_matches_category_ins BEFORE INSERT ON transactions WHEN (SELECT type FROM categories WHERE id=NEW.category_id)<>NEW.type BEGIN SELECT RAISE(ABORT,'transaction type must match category type'); END;
  CREATE TRIGGER IF NOT EXISTS trg_tx_type_matches_category_upd BEFORE UPDATE OF type,category_id ON transactions WHEN (SELECT type FROM categories WHERE id=NEW.category_id)<>NEW.type BEGIN SELECT RAISE(ABORT,'transaction type must match category type'); END;
  CREATE TRIGGER IF NOT EXISTS trg_tx_touch_updated_at AFTER UPDATE ON transactions FOR EACH ROW WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE transactions SET updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE id=NEW.id; END;
  CREATE TABLE IF NOT EXISTS budgets(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE,month TEXT NOT NULL CHECK(month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),amount_minor INTEGER NOT NULL CHECK(amount_minor>0),alert_threshold_pct INTEGER NOT NULL DEFAULT 80 CHECK(alert_threshold_pct BETWEEN 1 AND 100),created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),UNIQUE(category_id,month));
  CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_overall_month ON budgets(month) WHERE category_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  PRAGMA user_version = 1;`);
    await seedDatabase(db);
  });
}
