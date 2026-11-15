import type { Db } from "@/types/domain";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { currencyDecimals, isValidCurrencyCode } from "@/utils/money";

const storedDecimals = (value: string | undefined) => {
  const decimals = Number(value ?? 2);
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 3
    ? decimals
    : 2;
};

export const currencyService = {
  /** True when switching to `code` drops decimal places, so amounts get rounded. */
  async willRound(db: Db, code: string) {
    const settings = await settingsRepo.getAll(db);
    return (
      currencyDecimals(code) < storedDecimals(settings.currency_decimals)
    );
  },
  /**
   * Changes the display currency. Amounts are stored as integer minor units,
   * so when the number of decimal places changes every stored amount is
   * rescaled in the same transaction: 12.34 stays 12.34 (or rounds to 12 for
   * a currency without decimals). No exchange rate is applied.
   */
  async change(db: Db, code: string) {
    const currency = code.trim().toUpperCase();
    if (!isValidCurrencyCode(currency))
      throw new Error("Enter a valid 3-letter currency code, like USD");
    const settings = await settingsRepo.getAll(db);
    const from = storedDecimals(settings.currency_decimals);
    const to = currencyDecimals(currency);
    await db.withTransactionAsync(async () => {
      if (from !== to) {
        await transactionRepo.rescaleAmounts(db, from, to);
        await budgetRepo.rescaleAmounts(db, from, to);
        const opening = Number(settings.opening_balance_minor ?? 0) || 0;
        await settingsRepo.set(
          db,
          "opening_balance_minor",
          String(Math.round(opening * 10 ** (to - from))),
        );
      }
      await settingsRepo.set(db, "currency_code", currency);
      await settingsRepo.set(db, "currency_decimals", String(to));
    });
    return { currency, decimals: to };
  },
};
