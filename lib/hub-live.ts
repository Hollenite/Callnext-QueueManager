export type HubLiveEntry = {
  queue_id: string;
  display_name: string;
  status: "waiting" | "serving";
  serving_at?: string | null;
};

export type HubLive = {
  servingNames: string[];
  servingSince: string | null;
  waiting: number;
};

export const HUB_BUSY_WAITING = 3;

export function hubLiveByQueue(entries: HubLiveEntry[]): Map<string, HubLive> {
  const byQueue = new Map<string, HubLive>();
  for (const entry of entries) {
    const row = byQueue.get(entry.queue_id) ?? {
      servingNames: [],
      servingSince: null,
      waiting: 0,
    };
    if (entry.status === "serving") {
      row.servingNames.push(entry.display_name);
      if (
        entry.serving_at &&
        (!row.servingSince || entry.serving_at < row.servingSince)
      ) {
        row.servingSince = entry.serving_at;
      }
    } else {
      row.waiting += 1;
    }
    byQueue.set(entry.queue_id, row);
  }
  return byQueue;
}