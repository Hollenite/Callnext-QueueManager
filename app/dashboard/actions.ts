"use server";

import { redirect } from "next/navigation";
import { rpcErrorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/server";
import type { Queue } from "@/lib/types";

export async function createQueueAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const default_service_minutes = Number(
    formData.get("default_service_minutes") ?? 10,
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_queue", {
    name,
    default_service_minutes,
  });

  const queue = data as Queue | null;
  if (error || !queue) {
    redirect(
      `/dashboard?error=${encodeURIComponent(rpcErrorMessage(error))}`,
    );
  }

  redirect(`/dashboard/${queue.id}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
