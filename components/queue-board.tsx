"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { JoinQr } from "@/components/join-qr";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { minutesAgo } from "@/lib/time";
import type { PublicEntry, Queue } from "@/lib/types";
import { PUBLIC_ENTRY_COLUMNS } from "@/lib/types";

type Props = {
  initialQueue: Queue;
  initialEntries: PublicEntry[];
};

export function QueueBoard({ initialQueue, initialEntries }: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const serving = useMemo(
    () => entries.filter((entry) => entry.status === "serving"),
    [entries],
  );
  const waiting = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "waiting")
        .sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    [entries],
  );

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
      .channel(`owner:${initialQueue.id}`)
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

  function run(label: string, fn: () => Promise<void>) {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await fn();
          await refresh();
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : `Could not ${label}.`,
          );
        }
      })();
    });
  }

  function callNext() {
    run("call next", async () => {
      const { data, error: rpcError } = await createClient().rpc("call_next", {
        queue_id: queue.id,
      });
      if (rpcError) throw new Error(rpcErrorMessage(rpcError));
      if (!data) throw new Error("Nobody is waiting.");
    });
  }

  function finish(entryId: string, outcome: "done" | "no_show") {
    run(outcome, async () => {
      const { error: rpcError } = await createClient().rpc("finish_entry", {
        entry_id: entryId,
        outcome,
      });
      if (rpcError) throw new Error(rpcErrorMessage(rpcError));
    });
  }

  function toggleOpen() {
    run("update queue", async () => {
      const { error: rpcError } = await createClient().rpc("set_queue_open", {
        queue_id: queue.id,
        is_open: !queue.is_open,
      });
      if (rpcError) throw new Error(rpcErrorMessage(rpcError));
    });
  }

  return (
    <div className="mt-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-tight">{queue.name}</h1>
          <p className="mt-1 text-slate">
            {queue.is_open ? "Open for joins" : "Closed"}
          </p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={toggleOpen} disabled={pending}>
          {queue.is_open ? "Close" : "Open"}
        </button>
      </header>

      <JoinQr queueId={queue.id} />

      <button
        className="btn btn-primary mt-10 min-h-16 w-full text-xl"
        type="button"
        onClick={callNext}
        disabled={pending || waiting.length === 0}
      >
        Call next
      </button>
      {error ? <p className="mt-3 text-ticket">{error}</p> : null}

      {serving.length === 0 && waiting.length === 0 ? (
        <p className="mt-10 text-lg text-slate">
          Nobody is waiting. Share the QR.
        </p>
      ) : null}

      {serving.map((entry) => (
        <section
          key={entry.id}
          className="mt-10 border-t-2 border-amber pt-4"
        >
          <p className="text-amber">Now serving</p>
          <p className="display mt-1 text-3xl">{entry.display_name}</p>
          <div className="mt-4 flex gap-3">
            <button
              className="btn btn-amber"
              type="button"
              disabled={pending}
              onClick={() => finish(entry.id, "done")}
            >
              Done
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={pending}
              onClick={() => finish(entry.id, "no_show")}
            >
              No-show
            </button>
          </div>
        </section>
      ))}

      <ol className="mt-8">
        {waiting.map((entry, index) => (
          <li key={entry.id} className="clipboard-row">
            <span className="display text-xl text-ticket">{index + 1}</span>
            <span className="text-lg">{entry.display_name}</span>
            <span className="text-slate">{minutesAgo(entry.joined_at)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
