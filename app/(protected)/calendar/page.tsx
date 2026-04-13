import { CalendarClient } from "@/components/calendar-client";
import { getMonthKeyInTimeZone, getTodayStringInTimeZone } from "@/lib/date-utils";
import { getMonthSummaries } from "@/lib/store";

export default async function CalendarPage() {
  const now = new Date();
  const month = getMonthKeyInTimeZone(now);
  const todayString = getTodayStringInTimeZone(now);
  const summaries = await getMonthSummaries(month);

  return <CalendarClient initialMonth={month} initialSummaries={summaries} todayString={todayString} />;
}
