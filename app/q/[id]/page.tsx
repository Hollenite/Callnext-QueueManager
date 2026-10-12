import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/join-form";
import { QueueStatus } from "@/components/queue-status";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Queue } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Join" };

  const { id } = await params;
  const supabase = await createClient();
  const { data: queue } = await supabase
    .from("queues")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const name = (queue as { name?: string } | null)?.name;
  return { title: name ? `Join ${name}` : "Join" };
}

export default async function JoinPage({
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

  const typed = queue as Queue;

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12"
    >
      <p className="text-slate">{typed.name}</p>
      <div className="mt-3">
        <QueueStatus open={typed.is_open} variant="full" />
      </div>
      {typed.is_open ? (
        <>
          <h1 className="mt-6 text-4xl tracking-tight">Join the queue</h1>
          <JoinForm queueId={typed.id} />
        </>
      ) : (
        <>
          <h1 className="mt-6 text-4xl tracking-tight">This queue is closed</h1>
          <p className="mt-4 text-lg text-slate">
            Ask the desk if they are taking names.
          </p>
        </>
      )}
    </main>
  );
}
