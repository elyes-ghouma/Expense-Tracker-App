import {
  addMonths,
  groupLabel,
  monthRange,
  monthKey,
  toDayKey,
} from "@/utils/dates";
describe("date utilities", () => {
  it("creates local day and month keys", () => {
    const d = new Date(2026, 10, 14, 16);
    expect(toDayKey(d)).toBe("2026-11-14");
    expect(monthKey(d)).toBe("2026-11");
  });
  it("returns half-open month ranges including year rollover", () =>
    expect(monthRange("2026-12")).toEqual(["2026-12-01", "2027-01-01"]));
  it("adds months across year boundaries", () =>
    expect(addMonths("2026-01", -1)).toBe("2025-12"));
  it("labels today and yesterday", () => {
    expect(groupLabel("2026-11-14", "2026-11-14")).toBe("Today");
    expect(groupLabel("2026-11-13", "2026-11-14")).toBe("Yesterday");
  });
});
