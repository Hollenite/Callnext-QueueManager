"use client";

import { useEffect, useMemo, useState } from "react";
import { JoinQr } from "@/components/join-qr";
import { QueueStatus } from "@/components/queue-status";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import type { PublicEntry, Queue } from "@/lib/types";
import { PUBLIC_ENTRY_COLUMNS } from "@/lib/types";

type Props = {
  initialQueue: Queue;
  initialEntries: PublicEntry[];
};

export function QueueWall({ initialQueue, initialEntries }: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [entries, setEntries] = useState(initialEntries);

  const serving = useMemo(
    () => entries.filter((entry) => entry.status === "serving"),
    [entries],
  );
  const waiting = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "waiting")
        .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
        .slice(0, 5),
    [entries],
  );
  const nowKey = serving.map((entry) => entry.id).join("-") || "none";

  async function refresh() {
    const supabase = createClient();
    const [{ data: nextQueue }, { data: nextEntries }] = await Promise.all([
      supabase
        .from("queues")
        .select(
          "id, owner_id, name, is_open, default_service_minutes, created_at",
        )
        .eq("id", initialQueue.id)
        .maybeSingle(),
      supabase
        .from("queue_entries")
        .select(PUBLIC_ENTRY_COLUMNS)
        .eq("queue_id", initialQueue.id)
        .in("status", ["waiting", "serving"])
        .order("joined_at", { ascending: true }),
    ]);
    if (nextQueue) setQueue(nextQueue as Queue);
    if (nextEntries) setEntries(nextEntries as PublicEntry[]);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wall:${initialQueue.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `queue_id=eq.${initialQueue.id}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queues",
          filter: `id=eq.${initialQueue.id}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueue.id]);

  return (
    <div className="relative flex min-h-dvh flex-col px-8 py-8 lg:px-14 lg:py-10">
      <div className="flex flex-wrap items-center gap-4">
        <p className="display text-2xl tracking-tight">{queue.name}</p>
        <QueueStatus open={queue.is_open} variant="full" />
      </div>

      <div className="mt-10 flex flex-1 flex-col lg:flex-row lg:gap-16">
        <section className="min-w-0 flex-1">
          <p className="text-amber">Now</p>
          {serving.length > 0 ? (
            <ul key={nowKey}>
              {serving.map((entry) => (
                <li
                  key={entry.id}
                  className={cn("ticket-headline wall-now mt-2")}
                >
                  {entry.display_name}
                </li>
              ))}
            </ul>
          ) : (
            <p key={nowKey} className="ticket-headline wall-now is-empty mt-2">
              Nobody being seen
            </p>
          )}
        </section>

        <section className="mt-12 min-w-0 flex-1 lg:mt-0">
          <p className="text-slate">Next</p>
          {waiting.length === 0 ? (
            <p className="mt-3 text-2xl text-slate">Nobody waiting</p>
          ) : (
            <ol className="mt-3">
              {waiting.map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-baseline gap-4 border-b border-line py-3"
                >
                  <span className="display text-2xl text-ticket">
                    {index + 1}
                  </span>
                  <span className="display text-2xl">{entry.display_name}</span>
                </li>
              ))}
            </ol>
          )}
          {!queue.is_open ? (
            <p className="mt-6 text-ticket">
              This queue is closed to new joins.
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-10 w-fit self-end lg:absolute lg:right-14 lg:bottom-10">
        <JoinQr queueId={queue.id} variant="wall" />
      </div>
    </div>
  );
}
