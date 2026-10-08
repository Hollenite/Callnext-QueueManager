import { notFound } from "next/navigation";
import { TicketBoard } from "@/components/ticket-board";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PUBLIC_ENTRY_COLUMNS, type PublicEntry, type Queue } from "@/lib/types";

export default async function LiveTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { id } = await params;
  const supabase = await createClient();
  const { data: queue } = await supabase
    .from("queues")
    .select("id, name, is_open, default_service_minutes, created_at, owner_id")
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <TicketBoard
        initialQueue={queue as Queue}
        initialEntries={(entries ?? []) as PublicEntry[]}
      />
    </main>
  );
}
