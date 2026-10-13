export type DayOutcome = {
  queue_id: string;
  status: "done" | "no_show" | "left" | string;
  finished_at: string | null;
};

export type DayCounts = {
  seen: number;
  noShow: number;
  left: number;
};

export function localDayStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function countToday(
  rows: DayOutcome[],
  dayStart: Date = localDayStart(),
): DayCounts {
  const startMs = dayStart.getTime();
  const counts: DayCounts = { seen: 0, noShow: 0, left: 0 };
  for (const row of rows) {
    if (!row.finished_at) continue;
    if (new Date(row.finished_at).getTime() < startMs) continue;
    if (row.status === "done") counts.seen += 1;
    else if (row.status === "no_show") counts.noShow += 1;
    else if (row.status === "left") counts.left += 1;
  }
  return counts;
}

export function formatTodayCounts({ seen, noShow, left }: DayCounts) {
  const parts = [`${seen} seen`];
  if (noShow > 0) parts.push(`${noShow} no-show`);
  if (left > 0) parts.push(`${left} left`);
  return parts.join(" · ");
}

export function hubTodayByQueue(
  rows: DayOutcome[],
  dayStart: Date = localDayStart(),
) {
  const byQueue = new Map<string, DayOutcome[]>();
  for (const row of rows) {
    const list = byQueue.get(row.queue_id) ?? [];
    list.push(row);
    byQueue.set(row.queue_id, list);
  }
  const counts = new Map<string, DayCounts>();
  for (const [queueId, list] of byQueue) {
    counts.set(queueId, countToday(list, dayStart));
  }
  return counts;
}
