import { z } from "zod";
import type { Db, Transaction } from "@/types/domain";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { budgetService } from "@/services/domain/budgetService";
import { toDayKey } from "@/utils/dates";
export const transactionInputSchema = z.object({
  type: z.enum(["expense", "income"]),
  amountMinor: z.number().int().positive().max(999_999_999_999),
  categoryId: z.number().int().positive(),
  note: z.string().max(280).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export const transactionService = {
  async create(db: Db, input: TransactionInput) {
    const dto = transactionInputSchema.parse(input);
    const category = await categoryRepo.get(db, dto.categoryId);
    if (!category || category.type !== dto.type || category.isArchived)
      throw new Error("Choose an active category for this transaction type");
    return transactionRepo.insert(db, dto);
  },
  async update(db: Db, id: number, input: TransactionInput) {
    const dto = transactionInputSchema.parse(input);
    const category = await categoryRepo.get(db, dto.categoryId);
    if (!category || category.type !== dto.type)
      throw new Error("Choose a category for this transaction type");
    return transactionRepo.update(db, id, dto);
  },
  /**
   * Creates (or, with `id`, updates) a transaction and reports which budgets
   * for that month just crossed their alert threshold or limit. Alerts are
   * empty for income or when the "Budget alerts" setting is off.
   */
  async saveWithAlerts(db: Db, input: TransactionInput, id?: number) {
    const settings = await settingsRepo.getAll(db);
    const track =
      input.type === "expense" && settings.budget_alerts_enabled !== "0";
    const month = input.date.slice(0, 7);
    const before = track ? await budgetRepo.listForMonth(db, month) : [];
    const transaction =
      id === undefined
        ? await transactionService.create(db, input)
        : await transactionService.update(db, id, input);
    const alerts = track
      ? budgetService.alertsBetween(
          before,
          await budgetRepo.listForMonth(db, month),
        )
      : [];
    return { transaction, alerts };
  },
  remove: (db: Db, id: number) => transactionRepo.remove(db, id),
  restore: (db: Db, tx: Transaction) => transactionRepo.insertWithId(db, tx),
  async duplicate(db: Db, id: number) {
    const tx = await transactionRepo.getById(db, id);
    if (!tx) throw new Error("Transaction not found");
    return transactionRepo.insert(db, {
      ...tx,
      date: toDayKey(new Date()),
      note: tx.note,
    });
  },
};
