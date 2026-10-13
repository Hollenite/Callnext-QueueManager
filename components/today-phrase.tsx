"use client";

import { useMemo } from "react";
import {
  countToday,
  formatTodayCounts,
  localDayStart,
  type DayOutcome,
} from "@/lib/day-counts";

export function TodayPhrase({
  rows,
  className,
}: {
  rows: DayOutcome[];
  className?: string;
}) {
  const label = useMemo(
    () => formatTodayCounts(countToday(rows, localDayStart())),
    [rows],
  );
  return <span className={className}>{label}</span>;
}
