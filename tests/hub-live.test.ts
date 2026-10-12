import { describe, expect, it } from "vitest";
import { hubLiveByQueue } from "@/lib/hub-live";

describe("hubLiveByQueue", () => {
  it("groups serving names, earliest serving_at, and waiting count", () => {
    const byQueue = hubLiveByQueue([
      {
        queue_id: "a",
        display_name: "Saksham",
        status: "serving",
        serving_at: "2026-01-01T10:08:00Z",
      },
      {
        queue_id: "a",
        display_name: "Meera",
        status: "waiting",
      },
      {
        queue_id: "b",
        display_name: "Priya",
        status: "waiting",
      },
    ]);

    expect(byQueue.get("a")).toEqual({
      servingNames: ["Saksham"],
      servingSince: "2026-01-01T10:08:00Z",
      waiting: 1,
    });
    expect(byQueue.get("b")).toEqual({
      servingNames: [],
      servingSince: null,
      waiting: 1,
    });
  });
});