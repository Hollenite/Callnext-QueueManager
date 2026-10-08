"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import {
  getTicket,
  newClientToken,
  saveTicket,
} from "@/lib/ticket-token";
import { PUBLIC_ENTRY_COLUMNS } from "@/lib/types";

export function JoinForm({ queueId }: { queueId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const name = String(formData.get("name") ?? "").trim();
    const existing = getTicket(queueId);
    const token = existing?.token ?? newClientToken();
    saveTicket(queueId, { token, entryId: existing?.entryId });

    const { data, error: rpcError } = await createClient().rpc("join_queue", {
      queue_id: queueId,
      name,
      client_token: token,
    });

    setPending(false);

    if (rpcError) {
      if (rpcError.message.includes("already_in_queue")) {
        router.replace(`/q/${queueId}/live`);
        return;
      }
      setError(rpcErrorMessage(rpcError));
      return;
    }

    saveTicket(queueId, { token, entryId: data.id as string });
    router.replace(`/q/${queueId}/live`);
  }

  return (
    <form action={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span>Your name</span>
        <input
          className="field"
          name="name"
          required
          maxLength={40}
          autoComplete="name"
          placeholder="So the desk can call you"
        />
      </label>
      {error ? <p className="text-ticket">{error}</p> : null}
      <button className="btn btn-ticket mt-2" type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join the queue"}
      </button>
    </form>
  );
}
