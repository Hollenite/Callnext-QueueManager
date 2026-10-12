"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QueueStatus } from "@/components/queue-status";
import { cn } from "@/lib/cn";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { getTicket, saveTicket, type StoredTicket } from "@/lib/ticket-token";
import {
  formatWaitLabel,
  peopleAheadCount,
  waitingPosition,
} from "@/lib/wait-estimate";
import type { PublicEntry, Queue, WaitEstimate } from "@/lib/types";
import { PUBLIC_ENTRY_COLUMNS } from "@/lib/types";

type Props = {
  initialQueue: Queue;
  initialEntries: PublicEntry[];
};

type Phase = "loading" | "missing" | "live" | "serving" | "done" | "no_show" | "left";

export function TicketBoard({ initialQueue, initialEntries }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [entries, setEntries] = useState(initialEntries);
  const [ticket, setTicket] = useState<StoredTicket | null>(null);
  const [estimate, setEstimate] = useState<WaitEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [myStatus, setMyStatus] = useState<Phase>("loading");

  const mine = useMemo(
    () => entries.find((entry) => entry.id === ticket?.entryId) ?? null,
    [entries, ticket?.entryId],
  );
  const position = mine ? waitingPosition(entries, mine.id) : null;
  const ahead = mine ? peopleAheadCount(entries, mine.id) : null;
  const waitLabel =
    ahead === null || !estimate
      ? null
      : formatWaitLabel(ahead, estimate.avg_minutes);

  async function refresh() {
    const supabase = createClient();
    const stored = getTicket(initialQueue.id);
    const [{ data: nextQueue }, { data: liveEntries }] = await Promise.all([
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
    let list = (liveEntries ?? []) as PublicEntry[];
    if (stored?.entryId && !list.some((entry) => entry.id === stored.entryId)) {
      const { data: me } = await supabase
        .from("queue_entries")
        .select(PUBLIC_ENTRY_COLUMNS)
        .eq("id", stored.entryId)
        .maybeSingle();
      if (me) list = [...list, me as PublicEntry];
    }
    setEntries(list);

    if (stored?.token) {
      const { data } = await supabase.rpc("wait_estimate", {
        queue_id: initialQueue.id,
        client_token: stored.token,
      });
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload) setEstimate(payload as WaitEstimate);
    }

    setTicket(stored);

    if (!stored?.entryId) {
      setMyStatus("missing");
      return;
    }

    const me = list.find((entry) => entry.id === stored.entryId) ?? null;

    if (!me) {
      setMyStatus("missing");
      return;
    }

    if (me.status === "waiting") setMyStatus("live");
    else if (me.status === "serving") setMyStatus("serving");
    else setMyStatus(me.status);
  }

  useEffect(() => {
    void Promise.resolve().then(() => refresh());

    const supabase = createClient();
    const channel = supabase
      .channel(`ticket:${initialQueue.id}`)
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

  async function leave() {
    if (!ticket?.entryId || !ticket.token) return;
    if (!window.confirm("Leave the queue?")) return;
    setLeaving(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("leave_queue", {
      entry_id: ticket.entryId,
      client_token: ticket.token,
    });
    setLeaving(false);
    if (rpcError) {
      setError(rpcErrorMessage(rpcError));
      return;
    }
    saveTicket(initialQueue.id, { token: ticket.token });
    setMyStatus("left");
    router.refresh();
  }

  if (myStatus === "loading") {
    return <p className="text-slate">Finding your ticket…</p>;
  }

  if (myStatus === "missing") {
    return (
      <div className="my-auto">
        <h1 className="text-4xl tracking-tight">No ticket on this phone</h1>
        <p className="mt-4 text-lg text-slate">
          Tickets stay on this phone, even if you close the browser. Join from
          this device — not private browsing — so we can keep your place.
        </p>
        <Link href={`/q/${queue.id}`} className="btn btn-ticket mt-8 w-fit">
          Join the queue
        </Link>
      </div>
    );
  }

  if (myStatus === "done" || myStatus === "no_show" || myStatus === "left") {
    const copy =
      myStatus === "done"
        ? "You were seen. You can join again if you need to."
        : myStatus === "no_show"
          ? "The desk marked this ticket as a no-show."
          : "You left the queue.";
    return (
      <div className="my-auto">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-slate">{queue.name}</p>
          <QueueStatus open={queue.is_open} />
        </div>
        <h1 className="mt-4 text-4xl tracking-tight">{copy}</h1>
        {queue.is_open ? (
          <Link href={`/q/${queue.id}`} className="btn btn-ticket mt-8 w-fit">
            Join again
          </Link>
        ) : (
          <p className="mt-6 text-ticket">This queue is closed.</p>
        )}
      </div>
    );
  }

  const serving = myStatus === "serving";
  const nextUp = !serving && position === 1;
  const live = serving ? "assertive" : "polite";
  const headline = serving
    ? "Go to the desk now"
    : nextUp
      ? "Get ready"
      : "Stay put";
  const instruction = serving
    ? "They called you."
    : nextUp
      ? "You're after the person being seen. Go to the desk when this screen says you're in."
      : "Keep this screen. Walk up when it says you're next or you're in.";

  return (
    <div className="flex min-h-[80dvh] flex-col">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-slate">{queue.name}</p>
        <QueueStatus open={queue.is_open} />
      </div>
      <div className="mt-10 flex flex-1 flex-col items-start">
        <div className="ticket-stub w-full">
          <p
            key={serving ? "now" : String(position ?? "wait")}
            className={cn("ticket-number", serving && "is-now")}
            aria-live={live}
            aria-atomic="true"
          >
            {serving ? "now" : (position ?? "—")}
          </p>
        </div>
        <h1
          className="mt-8 text-3xl tracking-tight"
          aria-live={live}
          aria-atomic="true"
        >
          {headline}
        </h1>
        <p className="mt-3 text-lg text-slate">{instruction}</p>
        {!serving && waitLabel && !nextUp ? (
          <p className="mt-3 text-xl text-slate">{waitLabel}</p>
        ) : null}
        {!queue.is_open ? (
          <p className="mt-4 text-ticket">
            This queue is closed to new joins. Your place is kept.
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-ticket" role="alert">
          {error}
        </p>
      ) : null}
      {!serving ? (
        <>
          <p className="mt-8 text-sm text-slate">
            This ticket stays on this phone. If you close the page or the
            browser, scan the same QR or open this link again here.
          </p>
          <button
            className="btn btn-ghost mt-6 w-fit"
            type="button"
            disabled={leaving}
            onClick={() => void leave()}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {leaving ? "Leaving…" : "Leave the queue"}
          </button>
        </>
      ) : null}
    </div>
  );
}
