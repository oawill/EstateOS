import { describe, expect, it } from "vitest";
import { isOverdue } from "../service";

const HOUR = 60 * 60 * 1000;

describe("isOverdue", () => {
  const now = new Date("2026-01-15T12:00:00Z");

  it.each([
    ["URGENT", 24],
    ["HIGH", 72],
    ["MEDIUM", 24 * 7],
    ["LOW", 24 * 14],
  ] as const)("%s tickets become overdue just after their %ih SLA, not just before", (priority, slaHours) => {
    const justUnder = new Date(now.getTime() - (slaHours * HOUR - HOUR));
    const justOver = new Date(now.getTime() - (slaHours * HOUR + HOUR));

    expect(isOverdue({ status: "REPORTED", priority, createdAt: justUnder }, now)).toBe(false);
    expect(isOverdue({ status: "REPORTED", priority, createdAt: justOver }, now)).toBe(true);
  });

  it("a REVIEWED ticket is still eligible to be overdue", () => {
    const longAgo = new Date(now.getTime() - 30 * 24 * HOUR);
    expect(isOverdue({ status: "REVIEWED", priority: "LOW", createdAt: longAgo }, now)).toBe(true);
  });

  it.each(["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const)(
    "a %s ticket is never overdue regardless of age",
    (status) => {
      const veryOld = new Date(now.getTime() - 365 * 24 * HOUR);
      expect(isOverdue({ status, priority: "URGENT", createdAt: veryOld }, now)).toBe(false);
    },
  );
});
