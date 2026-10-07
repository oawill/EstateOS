import { describe, expect, it } from "vitest";
import { minutesOfDay, zonedToUtc } from "../zonedTime";

describe("zonedToUtc", () => {
  it("converts Lagos wall-clock time (UTC+1, no DST) to UTC", () => {
    expect(zonedToUtc("2026-10-10", "18:00", "Africa/Lagos").toISOString()).toBe("2026-10-10T17:00:00.000Z");
  });

  it("handles a zone behind UTC across the date line", () => {
    expect(zonedToUtc("2026-01-15", "23:30", "America/New_York").toISOString()).toBe("2026-01-16T04:30:00.000Z");
  });

  it("respects daylight saving offsets for the given date", () => {
    expect(zonedToUtc("2026-07-15", "12:00", "Europe/London").toISOString()).toBe("2026-07-15T11:00:00.000Z");
    expect(zonedToUtc("2026-01-15", "12:00", "Europe/London").toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});

describe("minutesOfDay", () => {
  it("parses HH:MM", () => {
    expect(minutesOfDay("06:30")).toBe(390);
  });
});
