import type { Metadata } from "next";
import Link from "next/link";
import { createQueueAction } from "./actions";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Queue } from "@/lib/types";

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
        <main id="main" className="mx-auto max-w-lg px-6 py-16">
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

  if (loadError) {
    return (
      <>
        <SiteHeader signedIn />
        <main id="main" className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-4xl">Database is not ready</h1>
          <p className="mt-4 text-lg text-slate">
            Run <code>supabase/migrations/0001_init.sql</code> in the Supabase SQL
            editor, then refresh.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader signedIn />
      <main id="main" className="mx-auto w-full max-w-lg px-6 pb-16">
        <h1 className="text-4xl tracking-tight">Front desk</h1>
        <p className="mt-2 text-slate">Open a queue and put the QR at the desk.</p>

        <section className="mt-10">
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
            <button className="btn btn-primary mt-2 w-fit" type="submit">
              Create queue
            </button>
          </form>
        </section>

        <section className="mt-12">
          {(queues as Queue[] | null)?.length ? (
            <ul>
              {(queues as Queue[]).map((queue) => (
                <li key={queue.id} className="border-b border-line py-4">
                  <Link
                    href={`/dashboard/${queue.id}`}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="text-lg">{queue.name}</span>
                    <span className="text-slate">
                      {queue.is_open ? "Open" : "Closed"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg text-slate">
              No queues yet. Create one and put the QR at the desk.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
