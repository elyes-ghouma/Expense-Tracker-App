import type { Db, TransactionFilter } from "@/types/domain";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { format } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { seedDatabase } from "@/services/database/seed";
import * as SQLite from "expo-sqlite";
import * as DocumentPicker from "expo-document-picker";
export const quoteCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
// Spreadsheet apps run cells starting with these characters as formulas.
// A leading apostrophe makes them plain text.
export const neutralizeFormula = (v: string) =>
  /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
export const exportService = {
  async exportCsv(db: Db, filter?: TransactionFilter) {
    const settings = await settingsRepo.getAll(db);
    const decimals = Number(settings.currency_decimals ?? 2);
    const chunks: string[] = [];
    let cursor;
    do {
      const page = await transactionRepo.list(db, filter, cursor, 500);
      chunks.push(
        ...page.items.map((t) =>
          [
            t.date,
            t.type,
            neutralizeFormula(t.categoryName),
            (t.amountMinor / 10 ** decimals).toFixed(decimals),
            neutralizeFormula(t.note ?? ""),
          ]
            .map(quoteCsv)
            .join(","),
        ),
      );
      cursor = page.nextCursor;
    } while (cursor);
    const text = `\uFEFFdate,type,category,amount,note\r\n${chunks.join("\r\n")}`;
    const uri = `${FileSystem.cacheDirectory}transactions-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    await FileSystem.writeAsStringAsync(uri, text);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    return uri;
  },
  async backupDatabase(db: SQLite.SQLiteDatabase) {
    await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
    const name = `expense-tracker-backup-${format(new Date(), "yyyyMMdd-HHmmss")}.db`;
    const copy = await SQLite.openDatabaseAsync(name);
    try {
      // The *DatabaseName options are SQLite schema names (default "main"),
      // not file names, so they are left at their defaults.
      await SQLite.backupDatabaseAsync({
        sourceDatabase: db,
        destDatabase: copy,
      });
      const path = copy.databasePath;
      if (!path) throw new Error("Database file path is unavailable");
      const uri = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.copyAsync({ from: path, to: uri });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, {
          mimeType: "application/x-sqlite3",
          dialogTitle: "Share database backup",
        });
      return uri;
    } finally {
      await copy.closeAsync();
      await SQLite.deleteDatabaseAsync(name);
    }
  },
  async restoreDatabase(db: Db) {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/x-sqlite3", "application/octet-stream", "*/*"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return false;
    const asset = picked.assets[0];
    const name = `restore-${Date.now()}.db`;
    const dir = SQLite.defaultDatabaseDirectory;
    if (!dir) throw new Error("SQLite storage location is unavailable");
    const target = `${dir}/${name}`;
    await FileSystem.copyAsync({ from: asset.uri, to: target });
    const source = await SQLite.openDatabaseAsync(name);
    try {
      const version = await source.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if (version?.user_version !== 1 && version?.user_version !== 2)
        throw new Error("This backup version is not supported");
      const tables = await source.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      const available = new Set(tables.map((t) => t.name));
      for (const table of ["settings", "categories", "transactions", "budgets"])
        if (!available.has(table))
          throw new Error(`Backup is missing ${table}`);
      const [settings, categories, transactions, budgets] = await Promise.all([
        source.getAllAsync<{ key: string; value: string; updated_at: number }>(
          "SELECT * FROM settings",
        ),
        source.getAllAsync<Record<string, unknown>>("SELECT * FROM categories"),
        source.getAllAsync<Record<string, unknown>>(
          "SELECT * FROM transactions",
        ),
        source.getAllAsync<Record<string, unknown>>("SELECT * FROM budgets"),
      ]);
      await db.withTransactionAsync(async () => {
        await db.execAsync(
          "DELETE FROM transactions; DELETE FROM budgets; DELETE FROM categories; DELETE FROM settings;",
        );
        for (const row of categories)
          await db.runAsync(
            "INSERT INTO categories(id,name,type,icon,color,is_default,is_archived,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            [
              row.id,
              row.name,
              row.type,
              row.icon,
              row.color,
              row.is_default,
              row.is_archived,
              row.sort_order,
              row.created_at,
              row.updated_at,
            ],
          );
        for (const row of transactions)
          await db.runAsync(
            "INSERT INTO transactions(id,type,amount_minor,category_id,note,transaction_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
            [
              row.id,
              row.type,
              row.amount_minor,
              row.category_id,
              row.note,
              row.transaction_date,
              row.created_at,
              row.updated_at,
            ],
          );
        for (const row of budgets)
          await db.runAsync(
            "INSERT INTO budgets(id,category_id,month,amount_minor,alert_threshold_pct,alert_threshold_mode,alert_threshold_value,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
            [
              row.id,
              row.category_id,
              row.month,
              row.amount_minor,
              row.alert_threshold_pct,
              row.alert_threshold_mode ?? "percent",
              row.alert_threshold_value ?? row.alert_threshold_pct,
              row.created_at,
              row.updated_at,
            ],
          );
        for (const row of settings)
          await db.runAsync(
            "INSERT INTO settings(key,value,updated_at) VALUES(?,?,?)",
            [row.key, row.value, row.updated_at],
          );
      });
      return true;
    } finally {
      await source.closeAsync();
      await SQLite.deleteDatabaseAsync(name);
    }
  },
  async resetAll(db: Db) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        "DELETE FROM transactions; DELETE FROM budgets; DELETE FROM categories; DELETE FROM settings;",
      );
      await seedDatabase(db);
    });
    await settingsRepo.set(db, "onboarding_done", "0");
  },
};
