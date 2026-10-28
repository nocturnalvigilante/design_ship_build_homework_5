// Divvy is in Chicago, so times are shown and compared in Chicago time,
// whatever the server's or phone's time zone.
const TZ = "America/Chicago";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const clock = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatClock(date: Date): string {
  return clock.format(date);
}

// "17:40:00" → "5:40 PM"
export function formatLeaveAt(leaveAt: string): string {
  const [h, m] = leaveAt.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function minutesOfDay(leaveAt: string): number {
  const [h, m] = leaveAt.split(":").map(Number);
  return h * 60 + m;
}

// Weekday (0 = Sunday) and minutes since midnight, in Chicago time.
export function chicagoWeekdayAndMinutes(date: Date): { weekday: number; minutes: number } {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return { weekday: WEEKDAYS.indexOf(p.weekday), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

// [1,2,3,4,5] → "Mon–Fri"; otherwise "Mon, Wed".
export function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join() === "1,2,3,4,5") return "Mon–Fri";
  if (sorted.join() === "0,6") return "Weekends";
  if (sorted.length === 7) return "Every day";
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}
