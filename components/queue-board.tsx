"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { JoinQr } from "@/components/join-qr";
import { QueueStatus } from "@/components/queue-status";
import { toast } from "@/components/toaster";
import { countToday, type DayOutcome } from "@/lib/day-counts";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { minutesAgo, minutesIn } from "@/lib/time";
import type { PublicEntry, Queue } from "@/lib/types";
import { OWNER_LIVE_COLUMNS, OWNER_TODAY_COLUMNS } from "@/lib/types";

type Props = {
  initialQueue: Queue;
  initialEntries: PublicEntry[];
  initialToday: DayOutcome[];
};

type PendingKind =
  | "call"
  | "open"
  | "close"
  | "done"
  | "no_show"
  | "add"
  | "recall";

type PendingAction = { kind: PendingKind; entryId?: string } | null;

function todaySince() {
  return new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
}

export function QueueBoard({
  initialQueue,
  initialEntries,
  initialToday,
}: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [entries, setEntries] = useState(initialEntries);
  const [todayRows, setTodayRows] = useState(initialToday);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const pending = pendingAction !== null;

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
  const todayCounts = useMemo(() => countToday(todayRows), [todayRows]);
  const current = serving[0] ?? null;

  function isBusy(kind: PendingKind, entryId?: string) {
    if (pendingAction?.kind !== kind) return false;
    if (entryId === undefined) return true;
    return pendingAction.entryId === entryId;
  }

  async function refresh() {
    const supabase = createClient();
    const [{ data: nextQueue }, { data: nextEntries }, { data: nextToday }] =
      await Promise.all([
        supabase
          .from("queues")
          .select(
            "id, owner_id, name, is_open, default_service_minutes, created_at",
          )
          .eq("id", initialQueue.id)
          .maybeSingle(),
        supabase
          .from("queue_entries")
          .select(OWNER_LIVE_COLUMNS)
          .eq("queue_id", initialQueue.id)
          .in("status", ["waiting", "serving"])
          .order("joined_at", { ascending: true }),
        supabase
          .from("queue_entries")
          .select(OWNER_TODAY_COLUMNS)
          .eq("queue_id", initialQueue.id)
          .in("status", ["done", "no_show", "left"])
          .gte("finished_at", todaySince()),
      ]);
    if (nextQueue) setQueue(nextQueue as Queue);
    if (nextEntries) setEntries(nextEntries as PublicEntry[]);
    if (nextToday) setTodayRows(nextToday as DayOutcome[]);
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

  function run(
    action: NonNullable<PendingAction>,
    label: string,
    fn: () => Promise<void>,
    successToast?: string,
  ) {
    setError(null);
    setPendingAction(action);
    return (async () => {
      try {
        await fn();
        await refresh();
        if (successToast) toast(successToast);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : `Could not ${label}.`,
        );
      } finally {
        setPendingAction(null);
      }
    })();
  }

  function callNext() {
    run(
      { kind: "call" },
      "call next",
      async () => {
        const { data, error: rpcError } = await createClient().rpc("call_next", {
          queue_id: queue.id,
        });
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
        if (!data) throw new Error("Nobody is waiting.");
      },
      "Call next",
    );
  }

  function finish(entryId: string, outcome: "done" | "no_show") {
    run(
      { kind: outcome, entryId },
      outcome,
      async () => {
        const { error: rpcError } = await createClient().rpc("finish_entry", {
          entry_id: entryId,
          outcome,
        });
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
      },
      outcome === "done" ? "Done" : "No-show",
    );
  }

  function dismissWaiting(entryId: string) {
    run(
      { kind: "no_show", entryId },
      "no-show",
      async () => {
        const { error: rpcError } = await createClient().rpc(
          "dismiss_waiting",
          { entry_id: entryId },
        );
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
      },
      "No-show",
    );
  }

  function putBack(entryId: string) {
    run(
      { kind: "recall", entryId },
      "put back",
      async () => {
        const { error: rpcError } = await createClient().rpc("recall_entry", {
          entry_id: entryId,
        });
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
      },
      "Put back",
    );
  }

  function toggleOpen() {
    run(
      { kind: queue.is_open ? "close" : "open" },
      "update queue",
      async () => {
        const { error: rpcError } = await createClient().rpc("set_queue_open", {
          queue_id: queue.id,
          is_open: !queue.is_open,
        });
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
      },
    );
  }

  function addAtDesk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    void run(
      { kind: "add" },
      "add",
      async () => {
        const { error: rpcError } = await createClient().rpc("desk_join", {
          queue_id: queue.id,
          name,
        });
        if (rpcError) throw new Error(rpcErrorMessage(rpcError));
        form.reset();
      },
      "Add",
    );
  }

  return (
    <div className="mt-4 flex min-h-[calc(100dvh-6rem)] flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl tracking-tight">{queue.name}</h1>
            <QueueStatus open={queue.is_open} variant="full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="metric-pill is-ticket">
              <b>{waiting.length}</b> waiting
            </span>
            <span className="metric-pill">
              <b>{todayCounts.seen}</b> seen
            </span>
            {todayCounts.noShow > 0 ? (
              <span className="metric-pill">
                <b>{todayCounts.noShow}</b> no-show
              </span>
            ) : null}
            {todayCounts.left > 0 ? (
              <span className="metric-pill">
                <b>{todayCounts.left}</b> left
              </span>
            ) : null}
          </div>
        </div>
        <button
          className={queue.is_open ? "btn btn-ghost" : "btn btn-ticket"}
          type="button"
          onClick={toggleOpen}
          disabled={pending}
          aria-busy={isBusy("close") || isBusy("open")}
        >
          {isBusy("close")
            ? "Closing…"
            : isBusy("open")
              ? "Opening…"
              : queue.is_open
                ? "Close queue"
                : "Open queue"}
        </button>
      </header>

      <div className="mt-4 grid flex-1 gap-8 lg:grid-cols-[minmax(16rem,1.2fr)_minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <button
            className="btn btn-primary min-h-16 w-full text-xl"
            type="button"
            onClick={callNext}
            disabled={pending || waiting.length === 0}
            aria-busy={isBusy("call")}
          >
            {isBusy("call") ? "Calling next…" : "Call next"}
          </button>
          {error ? (
            <p className="mt-3 text-ticket" role="alert">
              {error}
            </p>
          ) : null}

          {current ? (
            <section className="serving-card mt-4">
              <div>
                <p className="kicker">Currently serving</p>
                <p className="who">{current.display_name}</p>
                {current.serving_at ? (
                  <p className="elapsed">{minutesIn(current.serving_at)}</p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn btn-amber"
                  type="button"
                  disabled={pending}
                  aria-busy={isBusy("done", current.id)}
                  onClick={() => finish(current.id, "done")}
                >
                  {isBusy("done", current.id) ? "Done…" : "Done"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={pending}
                  aria-busy={isBusy("no_show", current.id)}
                  onClick={() => finish(current.id, "no_show")}
                >
                  {isBusy("no_show", current.id) ? "No-show…" : "No-show"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={pending}
                  aria-busy={isBusy("recall", current.id)}
                  onClick={() => putBack(current.id)}
                >
                  {isBusy("recall", current.id) ? "Putting back…" : "Put back"}
                </button>
              </div>
            </section>
          ) : (
            <section className="serving-card is-empty mt-4" aria-live="polite">
              <p className="kicker">Currently serving</p>
              <p>Nobody yet. Call next when someone is waiting.</p>
            </section>
          )}

          <form onSubmit={addAtDesk} className="walk-in mt-4">
            <label className="sr-only" htmlFor="walk-in-name">
              Name
            </label>
            <input
              id="walk-in-name"
              className="field"
              name="name"
              required
              maxLength={40}
              autoComplete="off"
              placeholder="Name"
              disabled={pending}
            />
            <button
              className="btn btn-ghost"
              type="submit"
              disabled={pending}
              aria-busy={isBusy("add")}
            >
              {isBusy("add") ? "Adding…" : "Add"}
            </button>
          </form>
        </div>

        <div>
          {waiting.length === 0 ? (
            <p className="text-lg text-slate">Nobody is waiting.</p>
          ) : (
            <ol>
              {waiting.map((entry, index) => (
                <li
                  key={entry.id}
                  className={index === 0 ? "clipboard-row is-next" : "clipboard-row"}
                >
                  <span className="display text-xl text-ticket">{index + 1}</span>
                  <span className="text-lg">{entry.display_name}</span>
                  <span className="text-slate">{minutesAgo(entry.joined_at)}</span>
                  <details className="waiting-menu">
                    <summary aria-label={`More actions for ${entry.display_name}`}>
                      ⋯
                    </summary>
                    <div className="waiting-popover">
                      <button
                        className="btn btn-quiet"
                        type="button"
                        disabled={pending}
                        aria-busy={isBusy("no_show", entry.id)}
                        onClick={() => dismissWaiting(entry.id)}
                      >
                        {isBusy("no_show", entry.id) ? "No-show…" : "No-show"}
                      </button>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="qr-stub lg:sticky lg:top-6">
          <p className="mb-3 text-sm text-slate">Customers scan this</p>
          {!queue.is_open ? (
            <p className="mb-3 text-ticket">Closed to new joins</p>
          ) : null}
          <JoinQr queueId={queue.id} />
        </aside>
      </div>
    </div>
  );
}
