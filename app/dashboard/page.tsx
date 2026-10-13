import type { Metadata } from "next";
import Link from "next/link";
import { createQueueAction } from "./actions";
import { BusySubmit } from "@/components/busy-submit";
import { QueueStatus } from "@/components/queue-status";
import { SiteHeader } from "@/components/site-header";
import { deskShell } from "@/lib/desk";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TodayPhrase } from "@/components/today-phrase";
import type { DayOutcome } from "@/lib/day-counts";
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
        <h1 className="text-4xl tracking-tight">Front desk</h1>
        <p className="mt-2 text-slate">Open a queue and put the QR at the desk.</p>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start">
          <section>
            {list.length ? (
              <ul>
                {list.map((queue) => {
                  const live = liveByQueue.get(queue.id);
                  const servingNames = live?.servingNames ?? [];
                  const waiting = live?.waiting ?? 0;
                  const busy = waiting >= HUB_BUSY_WAITING;
                  const inService = live?.servingSince
                    ? minutesIn(live.servingSince)
                    : null;
                  return (
                    <li key={queue.id} className="border-b border-line py-4">
                      <Link
                        href={`/dashboard/${queue.id}`}
                        className="flex items-start justify-between gap-4"
                      >
                        <span className="min-w-0">
                          <span className="text-lg">{queue.name}</span>
                          <span className="mt-1 block text-sm">
                            {servingNames.length > 0 ? (
                              <>
                                <span className="text-amber">Now serving</span>{" "}
                                {servingNames.join(", ")}
                                {inService ? (
                                  <>
                                    {" · "}
                                    <span className="text-slate">{inService}</span>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-slate">
                                Nobody being seen
                              </span>
                            )}
                            {" · "}
                            <span className="display text-ticket">{waiting}</span>
                            {" "}
                            <span className="text-slate">waiting</span>
                            {busy ? (
                              <>
                                {" · "}
                                <span className="text-ticket">Busy</span>
                              </>
                            ) : null}
                            {" · "}
                            <TodayPhrase
                              rows={todayByQueue.get(queue.id) ?? []}
                            />
                          </span>
                        </span>
                        <QueueStatus open={queue.is_open} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-lg text-slate">
                No queues yet. Create one and put the QR at the desk.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl">New queue</h2>
            <form action={createQueueAction} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span>Name</span>
                <input
                  className="field"
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Front desk"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "create-error" : undefined}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span>Average service time, minutes</span>
                <input
                  className="field"
                  type="number"
                  name="default_service_minutes"
                  min={1}
                  max={120}
                  defaultValue={10}
                />
              </label>
              {error ? (
                <p id="create-error" className="text-ticket" role="alert">
                  {error}
                </p>
              ) : null}
              <BusySubmit
                className="btn btn-primary mt-2 w-fit"
                idle="Create queue"
                busy="Creating…"
              />
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
