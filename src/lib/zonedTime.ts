/**
 * Converts a wall-clock date/time in an IANA timezone to the real UTC instant.
 * Estate opening hours and bookings are expressed in the estate's own local
 * time, never the server's, so a booking for "18:00" is 18:00 in the estate.
 * Resolves the zone's offset at that moment via Intl (handles DST zones too).
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(asUtc));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const rendered = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));

  return new Date(asUtc - (rendered - asUtc));
}

/** Minutes since midnight for an "HH:MM" string. */
export function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
