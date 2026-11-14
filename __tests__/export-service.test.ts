import { migrateDbIfNeeded } from "@/services/database/client";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { TestDb } from "./sqliteAdapter";
import { exportService, quoteCsv } from "@/services/domain/exportService";

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
  backupDatabaseAsync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
  defaultDatabaseDirectory: "file:///sqlite",
}));
const mockWrite = jest.requireMock("expo-file-system/legacy")
  .writeAsStringAsync as jest.Mock;
const mockCopy = jest.requireMock("expo-file-system/legacy")
  .copyAsync as jest.Mock;
const mockShare = jest.requireMock("expo-sharing").shareAsync as jest.Mock;
const mockAvailable = jest.requireMock("expo-sharing")
  .isAvailableAsync as jest.Mock;
const mockGetDocument = jest.requireMock("expo-document-picker")
  .getDocumentAsync as jest.Mock;
const mockOpen = jest.requireMock("expo-sqlite").openDatabaseAsync as jest.Mock;
const mockBackup = jest.requireMock("expo-sqlite")
  .backupDatabaseAsync as jest.Mock;
const mockDelete = jest.requireMock("expo-sqlite")
  .deleteDatabaseAsync as jest.Mock;
const mockClose = jest.fn();

describe("export service", () => {
  let db: TestDb;
  beforeEach(async () => {
    jest.clearAllMocks();
    db = await TestDb.create();
    await migrateDbIfNeeded(db);
    mockAvailable.mockResolvedValue(true);
    mockWrite.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
  });
  afterEach(() => db?.close());

  it("escapes CSV fields and shares an exported report", async () => {
    expect(quoteCsv('a "quote", b')).toBe('"a ""quote"", b"');
    const category = await categoryRepo.insert(db, {
      name: 'Cafe, "North"',
      type: "expense",
      icon: "restaurant",
      color: "#123ABC",
    });
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 1234,
      categoryId: category!.id,
      date: "2026-11-14",
      note: "coffee, beans",
    });
    const uri = await exportService.exportCsv(db);
    expect(uri).toMatch(/^file:\/\/\/cache\/transactions-/);
    expect(mockWrite).toHaveBeenCalledWith(
      uri,
      expect.stringContaining('"Cafe, ""North""","12.34","coffee, beans"'),
    );
    expect(mockShare).toHaveBeenCalledWith(uri);
  });

  it("creates a consistent database backup and shares it", async () => {
    const copyDb = {
      databasePath: "file:///sqlite/backup.db",
      closeAsync: mockClose,
    };
    mockOpen.mockResolvedValue(copyDb);
    const uri = await exportService.backupDatabase(db as never);
    expect(mockBackup).toHaveBeenCalledWith(
      expect.objectContaining({ sourceDatabase: db, destDatabase: copyDb }),
    );
    expect(mockCopy).toHaveBeenCalledWith({
      from: copyDb.databasePath,
      to: uri,
    });
    expect(mockShare).toHaveBeenCalledWith(
      uri,
      expect.objectContaining({ mimeType: "application/x-sqlite3" }),
    );
    expect(mockClose).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns false when backup restoration is canceled", async () => {
    mockGetDocument.mockResolvedValue({ canceled: true, assets: [] });
    await expect(exportService.restoreDatabase(db)).resolves.toBe(false);
  });

  it("restores validated SQLite tables transactionally", async () => {
    const source = await TestDb.create();
    await migrateDbIfNeeded(source);
    const salary = (await categoryRepo.list(source, { type: "income" })).find(
      (item) => item.name === "Salary",
    )!;
    await transactionRepo.insert(source, {
      type: "income",
      amountMinor: 9000,
      categoryId: salary.id,
      date: "2026-11-14",
    });
    mockGetDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///backup.db" }],
    });
    mockOpen.mockResolvedValue({
      getFirstAsync: source.getFirstAsync.bind(source),
      getAllAsync: source.getAllAsync.bind(source),
      closeAsync: () => source.close(),
    });
    const restored = await exportService.restoreDatabase(db);
    expect(restored).toBe(true);
    expect(await transactionRepo.netBalance(db)).toBe(9000);
  });

  it("resets user data while retaining seeded setup records", async () => {
    const groceries = (await categoryRepo.list(db, { type: "expense" })).find(
      (item) => item.name === "Groceries",
    )!;
    await transactionRepo.insert(db, {
      type: "expense",
      amountMinor: 1200,
      categoryId: groceries.id,
      date: "2026-11-14",
    });
    await exportService.resetAll(db);
    expect(await transactionRepo.summary(db)).toMatchObject({
      count: 0,
      expenseMinor: 0,
    });
    expect((await categoryRepo.list(db)).length).toBe(17);
  });
});
