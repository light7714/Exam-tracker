import { EXAM_DATE } from "@/lib/constants";

export const APP_TIME_ZONE = "Asia/Kolkata";

export function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDatePartsInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine date parts for timezone.");
  }

  return { year, month, day };
}

export function getTodayStringInTimeZone(referenceDate = new Date(), timeZone = APP_TIME_ZONE) {
  const { year, month, day } = getDatePartsInTimeZone(referenceDate, timeZone);
  return `${year}-${month}-${day}`;
}

export function getMonthKeyInTimeZone(referenceDate = new Date(), timeZone = APP_TIME_ZONE) {
  const { year, month } = getDatePartsInTimeZone(referenceDate, timeZone);
  return `${year}-${month}`;
}

export function createMonthGrid(monthKey: string) {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  const first = new Date(year, monthIndex, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks: Date[][] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: Date[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + weekIndex * 7 + dayIndex);
      week.push(day);
    }

    weeks.push(week);
  }

  return weeks;
}

export function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

export function formatMonthLabel(monthKey: string) {
  const [yearString, monthString] = monthKey.split("-");
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric"
  }).format(new Date(Number(yearString), Number(monthString) - 1, 1));
}

export function shiftMonth(monthKey: string, offset: number) {
  const [yearString, monthString] = monthKey.split("-");
  const shifted = new Date(Number(yearString), Number(monthString) - 1 + offset, 1);
  return monthKeyFromDate(shifted);
}

export function isToday(dateString: string) {
  return formatDateString(new Date()) === dateString;
}

export function getCountdownDays(referenceDate = new Date(), timeZone = APP_TIME_ZONE) {
  const todayString = getTodayStringInTimeZone(referenceDate, timeZone);
  const exam = new Date(`${EXAM_DATE}T00:00:00`);
  const diff = exam.getTime() - new Date(`${todayString}T00:00:00`).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
