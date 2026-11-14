import {
  addMonths as addDateMonths,
  format,
  startOfMonth,
  addDays,
} from "date-fns";
import type { DayKey, MonthKey } from "@/types/domain";
export const toDayKey = (date: Date): DayKey => format(date, "yyyy-MM-dd");
export const monthKey = (date: Date): MonthKey => format(date, "yyyy-MM");
export function monthRange(month: MonthKey): [DayKey, DayKey] {
  const start = startOfMonth(new Date(`${month}-01T12:00:00`));
  return [toDayKey(start), toDayKey(addDateMonths(start, 1))];
}
export function addMonths(month: MonthKey, amount: number): MonthKey {
  return format(
    addDateMonths(new Date(`${month}-01T12:00:00`), amount),
    "yyyy-MM",
  );
}
export function groupLabel(day: DayKey, today: DayKey): string {
  if (day === today) return "Today";
  if (day === toDayKey(addDays(new Date(`${today}T12:00:00`), -1)))
    return "Yesterday";
  return format(new Date(`${day}T12:00:00`), "EEE, d MMM");
}
