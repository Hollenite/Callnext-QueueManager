import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueueWall } from "@/components/queue-wall";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PUBLIC_ENTRY_COLUMNS, type PublicEntry, type Queue } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Waiting room" };

  const { id } = await params;
  const supabase = await createClient();
  const { data: queue } = await supabase
    .from("queues")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const name = (queue as { name?: string } | null)?.name;
  return { title: name ? `${name} waiting room` : "Waiting room" };
}

export default async function WaitingRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = await createClient();
  const { data: queue } = await supabase
    .from("queues")
    .select("id, owner_id, name, is_open, default_service_minutes, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!queue) notFound();

  const { data: entries } = await supabase
    .from("queue_entries")
    .select(PUBLIC_ENTRY_COLUMNS)
    .eq("queue_id", id)
    .in("status", ["waiting", "serving"])
    .order("joined_at", { ascending: true });

  return (
    <main id="main">
      <QueueWall
        initialQueue={queue as Queue}
        initialEntries={(entries ?? []) as PublicEntry[]}
      />
    </main>
  );
}
