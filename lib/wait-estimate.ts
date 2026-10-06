export type TimedEntry = {
  id: string;
  status: "waiting" | "serving" | "done" | "no_show" | "left";
  joined_at: string;
};

export function peopleAheadCount(
  entries: TimedEntry[],
  myId: string,
): number | null {
  const me = entries.find((entry) => entry.id === myId);
  if (!me) return null;
  if (me.status === "serving") return 0;
  if (me.status !== "waiting") return null;

  const serving = entries.filter((entry) => entry.status === "serving").length;
  const waitingAhead = entries.filter(
    (entry) =>
      entry.status === "waiting" && entry.joined_at < me.joined_at,
  ).length;

  return serving + waitingAhead;
}

export function waitingPosition(
  entries: TimedEntry[],
  myId: string,
): number | null {
  const me = entries.find((entry) => entry.id === myId);
  if (!me || me.status !== "waiting") return null;

  const waiting = entries
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at));

  const index = waiting.findIndex((entry) => entry.id === myId);
  return index === -1 ? null : index + 1;
}

export function averageServiceMinutes(
  samplesNewestFirst: number[],
  fallbackMinutes: number,
  minSamples = 3,
  maxSamples = 20,
): { avg: number; sampleCount: number; usedFallback: boolean } {
  const recent = samplesNewestFirst.slice(0, maxSamples);
  if (recent.length < minSamples) {
    return {
      avg: fallbackMinutes,
      sampleCount: recent.length,
      usedFallback: true,
    };
  }

  const avg = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  return { avg, sampleCount: recent.length, usedFallback: false };
}

export function formatWaitLabel(
  peopleAhead: number,
  avgMinutes: number,
): string {
  if (peopleAhead <= 0) return "You're next";
  const minutes = Math.max(1, Math.round(peopleAhead * avgMinutes));
  return `about ${minutes} min`;
}
