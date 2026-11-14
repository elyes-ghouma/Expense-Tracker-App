import {
  currencyDecimals,
  formatMoney,
  parseToMinor,
  splitMinor,
} from "@/utils/money";
describe("money utilities", () => {
  test.each([
    ["12.5", 2, 1250],
    ["0.01", 2, 1],
    ["900", 0, 900],
    ["10.125", 3, 10125],
  ] as const)("parses %s", (input, decimals, expected) =>
    expect(parseToMinor(input, decimals)).toBe(expected),
  );
  test.each(["", "-1", "1.234", "1..2", "1,2,3"])(
    "rejects invalid amount %s",
    (input) => expect(() => parseToMinor(input, 2)).toThrow(),
  );
  it("rejects zero and unsafe amounts", () => {
    expect(() => parseToMinor("0", 2)).toThrow();
    expect(() => parseToMinor("9999999999999", 2)).toThrow();
  });
  it("splits integer minor units without rounding", () =>
    expect(splitMinor(1205, 2)).toEqual({ whole: "12", fraction: "05" }));
  it("formats a localized currency amount", () =>
    expect(
      formatMoney(1234, { currency: "USD", locale: "en-US", decimals: 2 }),
    ).toContain("12.34"));
  it("uses the ISO currency fraction convention for zero and three digit currencies", () => {
    expect(currencyDecimals("JPY")).toBe(0);
    expect(currencyDecimals("BHD")).toBe(3);
    expect(currencyDecimals("USD")).toBe(2);
  });
});
