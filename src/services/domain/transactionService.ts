import { z } from "zod";
import type { Db, Transaction } from "@/types/domain";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
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
