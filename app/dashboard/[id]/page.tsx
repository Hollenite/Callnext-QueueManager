import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueueBoard } from "@/components/queue-board";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PUBLIC_ENTRY_COLUMNS, type PublicEntry, type Queue } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Front desk" };

  const { id } = await params;
  const supabase = await createClient();
  const { data: queue } = await supabase
    .from("queues")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  return { title: (queue as { name?: string } | null)?.name ?? "Front desk" };
}

export default async function QueueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: queue } = await supabase
    .from("queues")
    .select(
      "id, owner_id, name, is_open, default_service_minutes, created_at",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!queue) notFound();

  const { data: entries } = await supabase
    .from("queue_entries")
    .select(PUBLIC_ENTRY_COLUMNS)
    .eq("queue_id", id)
    .in("status", ["waiting", "serving"])
    .order("joined_at", { ascending: true });

  return (
    <>
      <SiteHeader signedIn className="max-w-4xl" />
      <main id="main" className="mx-auto w-full max-w-4xl px-6 pb-16">
        <QueueBoard
          initialQueue={queue as Queue}
          initialEntries={(entries ?? []) as PublicEntry[]}
        />
      </main>
    </>
  );
}
