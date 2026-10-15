import type { Metadata } from "next";
import Link from "next/link";
import { NewQueueDialog } from "@/components/new-queue-dialog";
import { QueueStatus } from "@/components/queue-status";
import { SiteHeader } from "@/components/site-header";
import { deskShell } from "@/lib/desk";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DayOutcome } from "@/lib/day-counts";
import { countToday } from "@/lib/day-counts";
import {
  HUB_BUSY_WAITING,
  hubLiveByQueue,
  type HubLiveEntry,
} from "@/lib/hub-live";
import { minutesIn } from "@/lib/time";
import { OWNER_TODAY_COLUMNS, type Queue } from "@/lib/types";

export const metadata: Metadata = {
  title: "Front desk",
};

function Chevron() {
  return (
    <svg
      className="hub-card-chevron size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <SiteHeader signedIn />
        <main id="main" className={`${deskShell} py-16`}>
          <h1 className="text-4xl">Set up Supabase</h1>
          <p className="mt-4 text-lg text-slate">
            Copy <code>.env.example</code> to <code>.env.local</code> and add your
            project URL and anon key.
          </p>
        </main>
      </>
    );
  }

  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: queues, error: loadError } = await supabase
    .from("queues")
    .select("id, name, is_open, default_service_minutes, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const list = (queues as Queue[] | null) ?? [];
  const ids = list.map((queue) => queue.id);
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const emptyLive = { data: [] as HubLiveEntry[] };
  const emptyToday = { data: [] as DayOutcome[] };
  const [{ data: liveEntries }, { data: todayEntries }] =
    ids.length === 0
      ? [emptyLive, emptyToday]
      : await Promise.all([
          supabase
            .from("queue_entries")
            .select("queue_id, display_name, status, serving_at")
            .in("queue_id", ids)
            .in("status", ["waiting", "serving"])
            .order("joined_at", { ascending: true }),
          supabase
            .from("queue_entries")
            .select(OWNER_TODAY_COLUMNS)
            .in("queue_id", ids)
            .in("status", ["done", "no_show", "left"])
            .gte("finished_at", since),
        ]);
  const liveByQueue = hubLiveByQueue((liveEntries ?? []) as HubLiveEntry[]);
  const todayByQueue = new Map<string, DayOutcome[]>();
  for (const row of (todayEntries ?? []) as DayOutcome[]) {
    const listForQueue = todayByQueue.get(row.queue_id) ?? [];
    listForQueue.push(row);
    todayByQueue.set(row.queue_id, listForQueue);
  }

  if (loadError) {
    return (
      <>
        <SiteHeader signedIn />
        <main id="main" className={`${deskShell} py-16`}>
          <h1 className="text-4xl">Database is not ready</h1>
          <p className="mt-4 text-lg text-slate">
            Run <code>supabase/migrations/0001_init.sql</code> then
            <code>0002_desk_ops.sql</code> in the Supabase SQL editor, then
            refresh.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader signedIn />
      <main id="main" className={`${deskShell} pb-16`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight">Front desk</h1>
            <p className="mt-2 text-slate">
              Open a queue and put the QR at the desk.
            </p>
          </div>
          <NewQueueDialog error={error} />
        </div>

        <section className="mt-10">
          {list.length ? (
            <ul className="grid gap-3">
              {list.map((queue) => {
                const live = liveByQueue.get(queue.id);
                const servingNames = live?.servingNames ?? [];
                const waiting = live?.waiting ?? 0;
                const busy = waiting >= HUB_BUSY_WAITING;
                const inService = live?.servingSince
                  ? minutesIn(live.servingSince)
                  : null;
                const today = countToday(todayByQueue.get(queue.id) ?? []);
                return (
                  <li key={queue.id}>
                    <Link href={`/dashboard/${queue.id}`} className="hub-card">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-lg">{queue.name}</span>
                          <QueueStatus open={queue.is_open} />
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          {servingNames.length > 0 ? (
                            <span className="serving-badge">
                              Now serving: {servingNames.join(", ")}
                              {inService ? (
                                <span className="when">({inService})</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-sm text-slate">
                              Nobody being seen
                            </span>
                          )}
                        </span>
                        <span className="mt-2 flex flex-wrap items-baseline gap-2 text-sm text-slate">
                          <span>
                            <span className="display text-ticket">{waiting}</span>{" "}
                            waiting
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            <span className="display">{today.seen}</span> seen
                          </span>
                          {busy ? (
                            <span className="text-ticket">Busy</span>
                          ) : null}
                        </span>
                      </span>
                      <Chevron />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-lg text-slate">
              No queues yet. Use New queue and put the QR at the desk.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
