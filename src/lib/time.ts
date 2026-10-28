// Divvy is in Chicago, so times are shown in Chicago time,
// whatever the server's or phone's time zone.
const TZ = "America/Chicago";

const clock = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

export function formatClock(date: Date): string {
  return clock.format(date);
}
