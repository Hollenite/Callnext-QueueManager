"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { BusySubmit } from "@/components/busy-submit";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import {
  getTicket,
  newClientToken,
  saveTicket,
} from "@/lib/ticket-token";

export function JoinForm({ queueId }: { queueId: string }) {
  const router = useRouter();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const name = String(formData.get("name") ?? "").trim();
    const existing = getTicket(queueId);
    const token = existing?.token ?? newClientToken();
    saveTicket(queueId, { token, entryId: existing?.entryId });

    const { data, error: rpcError } = await createClient().rpc("join_queue", {
      queue_id: queueId,
      name,
      client_token: token,
    });

    if (rpcError) {
      if (rpcError.message.includes("already_in_queue")) {
        await router.replace(`/q/${queueId}/live`);
        return;
      }
      setError(rpcErrorMessage(rpcError));
      return;
    }

    saveTicket(queueId, { token, entryId: data.id as string });
    await router.replace(`/q/${queueId}/live`);
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {error ? (
        <p id={errorId} className="text-ticket" role="alert">
          {error}
        </p>
      ) : null}
      <BusySubmit
        className="btn btn-ticket mt-2"
        idle="Join the queue"
        busy="Joining…"
      />
    </form>
  );
}
