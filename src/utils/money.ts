export function parseToMinor(input: string, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 3)
    throw new Error("Invalid currency decimals");
  const value = input.trim().replace(/,/g, ".");
  if (!/^\d+(?:\.\d*)?$/.test(value)) throw new Error("Enter a valid amount");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals)
    throw new Error(`Use no more than ${decimals} decimal places`);
  const scale = 10 ** decimals;
  const result =
    Number(whole) * scale +
    Number((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (!Number.isSafeInteger(result) || result <= 0 || result > 999_999_999_999)
    throw new Error("Amount is out of range");
  return result;
}
export function formatMoney(
  minor: number,
  o: {
    currency: string;
    locale: string;
    decimals: number;
    signDisplay?: "auto" | "always" | "never";
  },
): string {
  const value = minor / 10 ** o.decimals;
  return new Intl.NumberFormat(o.locale, {
    style: "currency",
    currency: o.currency,
    minimumFractionDigits: o.decimals,
    maximumFractionDigits: o.decimals,
    signDisplay: o.signDisplay ?? "auto",
  }).format(value);
}
export function splitMinor(
  minor: number,
  decimals: number,
): { whole: string; fraction: string } {
  const scale = 10 ** decimals;
  return {
    whole: String(Math.floor(minor / scale)),
    fraction: decimals ? String(minor % scale).padStart(decimals, "0") : "",
  };
}
export function currencyDecimals(currency: string): number {
  try {
    const decimals =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2;
    if ([0, 2, 3].includes(decimals)) return decimals;
  } catch {
    /* Use the standard two digit default for unknown currency codes. */
  }
  return 2;
}
