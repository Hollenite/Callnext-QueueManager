import { describe, expect, it } from "vitest";
import {
  averageServiceMinutes,
  formatWaitLabel,
  peopleAheadCount,
  waitingPosition,
} from "@/lib/wait-estimate";

const waiting = (
  id: string,
  joined_at: string,
): Parameters<typeof peopleAheadCount>[0][number] => ({
  id,
  status: "waiting",
  joined_at,
});

describe("averageServiceMinutes", () => {
  it("uses the queue default when there is no history", () => {
    expect(averageServiceMinutes([], 10)).toEqual({
      avg: 10,
      sampleCount: 0,
      usedFallback: true,
    });
  });

  it("uses the queue default until there are 3 samples", () => {
    expect(averageServiceMinutes([8, 12], 10)).toEqual({
      avg: 10,
      sampleCount: 2,
      usedFallback: true,
    });
  });

  it("averages up to the last 20 done samples", () => {
    const samples = Array.from({ length: 20 }, () => 6);
    expect(averageServiceMinutes(samples, 10)).toEqual({
      avg: 6,
      sampleCount: 20,
      usedFallback: false,
    });
  });

  it("ignores samples beyond the last 20", () => {
    const samples = [...Array.from({ length: 20 }, () => 5), 100];
    expect(averageServiceMinutes(samples, 10).avg).toBe(5);
  });
});

describe("peopleAheadCount", () => {
  it("counts people waiting ahead plus the person being served", () => {
    const entries = [
      { id: "s", status: "serving" as const, joined_at: "2026-01-01T10:00:00Z" },
      waiting("a", "2026-01-01T10:01:00Z"),
      waiting("me", "2026-01-01T10:02:00Z"),
    ];
    expect(peopleAheadCount(entries, "me")).toBe(2);
  });

  it("returns 0 while this ticket is being served", () => {
    const entries = [
      { id: "me", status: "serving" as const, joined_at: "2026-01-01T10:00:00Z" },
      waiting("a", "2026-01-01T10:01:00Z"),
    ];
    expect(peopleAheadCount(entries, "me")).toBe(0);
  });
});

describe("waitingPosition and formatWaitLabel", () => {
  it("numbers waiting tickets in join order", () => {
    const entries = [
      waiting("a", "2026-01-01T10:00:00Z"),
      waiting("me", "2026-01-01T10:01:00Z"),
    ];
    expect(waitingPosition(entries, "me")).toBe(2);
  });

  it("says you are next when nobody is ahead", () => {
    expect(formatWaitLabel(0, 10)).toBe("You're next");
  });

  it("rounds wait as an about-N-min label", () => {
    expect(formatWaitLabel(2, 6.4)).toBe("about 13 min");
  });
});
