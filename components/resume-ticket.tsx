"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTicket } from "@/lib/ticket-token";
import { PUBLIC_ENTRY_COLUMNS } from "@/lib/types";

export function ResumeTicket({ queueId }: { queueId: string }) {
  const router = useRouter();

  useEffect(() => {
    const ticket = getTicket(queueId);
    if (!ticket?.entryId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await createClient()
        .from("queue_entries")
        .select(PUBLIC_ENTRY_COLUMNS)
        .eq("id", ticket.entryId)
        .maybeSingle();
      if (cancelled) return;
      if (data && (data.status === "waiting" || data.status === "serving")) {
        router.replace(`/q/${queueId}/live`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queueId, router]);

  return null;
}
