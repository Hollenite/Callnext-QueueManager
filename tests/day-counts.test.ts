import { describe, expect, it } from "vitest";
import {
  countToday,
  formatTodayCounts,
  hubTodayByQueue,
} from "@/lib/day-counts";

const dayStart = new Date("2026-10-13T00:00:00.000Z");

describe("countToday", () => {
  it("counts local-day outcomes and hides zero no-show and left in copy", () => {
    const counts = countToday(
      [
        {
          queue_id: "a",
          status: "done",
          finished_at: "2026-10-13T08:00:00.000Z",
        },
        {
          queue_id: "a",
          status: "done",
          finished_at: "2026-10-12T23:00:00.000Z",
        },
        {
          queue_id: "a",
          status: "no_show",
          finished_at: "2026-10-13T09:00:00.000Z",
        },
        {
          queue_id: "a",
          status: "left",
          finished_at: "2026-10-11T12:00:00.000Z",
        },
      ],
      dayStart,
    );
    expect(counts).toEqual({ seen: 1, noShow: 1, left: 0 });
    expect(formatTodayCounts(counts)).toBe("1 seen · 1 no-show");
    expect(formatTodayCounts({ seen: 0, noShow: 0, left: 0 })).toBe("0 seen");
  });
});

describe("hubTodayByQueue", () => {
  it("groups counts per queue for the local day", () => {
    const byQueue = hubTodayByQueue(
      [
        {
          queue_id: "a",
          status: "done",
          finished_at: "2026-10-13T08:00:00.000Z",
        },
        {
          queue_id: "b",
          status: "left",
          finished_at: "2026-10-13T08:00:00.000Z",
        },
      ],
      dayStart,
    );
    expect(byQueue.get("a")).toEqual({ seen: 1, noShow: 0, left: 0 });
    expect(byQueue.get("b")).toEqual({ seen: 0, noShow: 0, left: 1 });
  });
});
