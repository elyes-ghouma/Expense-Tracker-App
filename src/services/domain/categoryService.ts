import type { Db, TxType } from "@/types/domain";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
const colorPattern = /^#[0-9A-Fa-f]{6}$/;
export const categoryService = {
  async create(
    db: Db,
    input: { name: string; type: TxType; icon: string; color: string },
  ) {
    const name = input.name.trim();
    if (!name || name.length > 40)
      throw new Error("Category names must be 1 to 40 characters");
    if (!colorPattern.test(input.color))
      throw new Error("Choose a valid category color");
    return categoryRepo.insert(db, { ...input, name });
  },
  async update(
    db: Db,
    id: number,
    input: Partial<{ name: string; icon: string; color: string }>,
  ) {
    if (
      input.name !== undefined &&
      (!input.name.trim() || input.name.trim().length > 40)
    )
      throw new Error("Category names must be 1 to 40 characters");
    if (input.color !== undefined && !colorPattern.test(input.color))
      throw new Error("Choose a valid category color");
    return categoryRepo.update(db, id, input);
  },
  async archiveOrDelete(db: Db, id: number) {
    const category = await categoryRepo.get(db, id);
    if (!category) throw new Error("Category not found");
    if (category.isDefault)
      throw new Error("Default categories cannot be removed");
    if (await categoryRepo.usageCount(db, id)) {
      await categoryRepo.archive(db, id);
      return "archived" as const;
    }
    await categoryRepo.deleteIfUnused(db, id);
    return "deleted" as const;
  },
};
