import initSqlJs, { type Database, type SqlValue } from "sql.js";
import type { Db } from "@/types/domain";
export class TestDb implements Db {
  private constructor(readonly native: Database) {}
  static async create() {
    const SQL = await initSqlJs({
      locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
    });
    return new TestDb(new SQL.Database());
  }
  async getAllAsync<T>(sql: string, params: unknown[] = []) {
    const stmt = this.native.prepare(sql, params as SqlValue[]);
    try {
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }
  async getFirstAsync<T>(sql: string, params: unknown[] = []) {
    const stmt = this.native.prepare(sql, params as SqlValue[]);
    try {
      return stmt.step() ? (stmt.getAsObject() as T) : null;
    } finally {
      stmt.free();
    }
  }
  async runAsync(sql: string, params: unknown[] = []) {
    this.native.run(sql, params as SqlValue[]);
    const row = this.native.exec("SELECT last_insert_rowid() AS id")[0];
    return {
      lastInsertRowId: Number(row?.values[0]?.[0] ?? 0),
      changes: this.native.getRowsModified(),
    };
  }
  async execAsync(sql: string) {
    this.native.exec(sql);
  }
  async withTransactionAsync(fn: () => Promise<void>) {
    this.native.exec("BEGIN");
    try {
      await fn();
      this.native.exec("COMMIT");
    } catch (e) {
      this.native.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.native.close();
  }
}
