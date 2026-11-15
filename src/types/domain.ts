export type TxType = "expense" | "income";
export type DayKey = string;
export type MonthKey = string;
export interface Category {
  id: number;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
}
export interface Transaction {
  id: number;
  type: TxType;
  amountMinor: number;
  categoryId: number;
  note: string | null;
  date: DayKey;
  createdAt: number;
  updatedAt: number;
}
export interface TransactionItem extends Transaction {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}
export interface Budget {
  id: number;
  categoryId: number | null;
  month: MonthKey;
  amountMinor: number;
  alertThresholdPct: number;
  alertThresholdMode: "percent" | "cash";
  alertThresholdValue: number;
}
export interface BudgetProgress extends Budget {
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  spentMinor: number;
}
export interface TransactionFilter {
  type?: TxType;
  dateFrom?: DayKey;
  dateTo?: DayKey;
  categoryIds?: number[];
  search?: string;
}
export interface Cursor {
  date: DayKey;
  id: number;
}
export interface Page<T> {
  items: T[];
  nextCursor: Cursor | null;
}
export interface Db {
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  runAsync(
    sql: string,
    params?: unknown[],
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
export interface Settings {
  currency_code: string;
  currency_decimals: string;
  opening_balance_minor: string;
  theme_mode: "light" | "dark" | "system";
  onboarding_done: string;
  privacy_mode?: string;
}
