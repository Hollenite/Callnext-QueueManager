import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.QUEUE_TEST_EMAIL ?? "demo@queue.local";
const password = process.env.QUEUE_TEST_PASSWORD ?? "demo-pass-12345";

const configured = Boolean(url && anon && service);

function admin() {
  return createClient(url!, service!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ownerClient() {
  const client = createClient(url!, anon!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function ensureOwner() {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !/already been registered|already exists/i.test(error.message)) {
    throw error;
  }
  return data.user?.id;
}

describe.skipIf(!configured)("desk ops RPCs", () => {
  let owner: SupabaseClient;
  let queueId: string;

  beforeAll(async () => {
    await ensureOwner();
    owner = await ownerClient();
    const { data, error } = await owner.rpc("create_queue", {
      name: `Desk ops ${Date.now()}`,
      default_service_minutes: 8,
    });
    if (error) throw error;
    queueId = data.id as string;
    const closed = await owner.rpc("set_queue_open", {
      queue_id: queueId,
      is_open: false,
    });
    if (closed.error) throw closed.error;
  });

  afterAll(async () => {
    if (!queueId) return;
    await admin().from("queue_entries").delete().eq("queue_id", queueId);
    await admin().from("queues").delete().eq("id", queueId);
  });

  it("lets the desk add a name while the queue is closed", async () => {
    const { data, error } = await owner.rpc("desk_join", {
      queue_id: queueId,
      name: "Walk-up",
    });
    expect(error).toBeNull();
    expect(data?.status).toBe("waiting");
    expect(data?.display_name).toBe("Walk-up");
  });

  it("marks a waiting person no-show", async () => {
    const added = await owner.rpc("desk_join", {
      queue_id: queueId,
      name: "Skip me",
    });
    if (added.error) throw added.error;
    const { data, error } = await owner.rpc("dismiss_waiting", {
      entry_id: added.data.id,
    });
    expect(error).toBeNull();
    expect(data?.status).toBe("no_show");
    expect(data?.finished_at).toBeTruthy();
  });

  it("rejects finish_entry on a waiting row", async () => {
    const added = await owner.rpc("desk_join", {
      queue_id: queueId,
      name: "Still waiting",
    });
    if (added.error) throw added.error;
    const { error } = await owner.rpc("finish_entry", {
      entry_id: added.data.id,
      outcome: "no_show",
    });
    expect(error?.message).toMatch(/not_serving/);
  });

  it("puts a miss-tap back first in line", async () => {
    const first = await owner.rpc("desk_join", {
      queue_id: queueId,
      name: "First",
    });
    if (first.error) throw first.error;
    const second = await owner.rpc("desk_join", {
      queue_id: queueId,
      name: "Second",
    });
    if (second.error) throw second.error;

    const called = await owner.rpc("call_next", { queue_id: queueId });
    if (called.error) throw called.error;
    expect(called.data?.id).toBe(first.data.id);

    const recalled = await owner.rpc("recall_entry", {
      entry_id: first.data.id,
    });
    expect(recalled.error).toBeNull();
    expect(recalled.data?.status).toBe("waiting");
    expect(recalled.data?.serving_at).toBeNull();

    const again = await owner.rpc("call_next", { queue_id: queueId });
    if (again.error) throw again.error;
    expect(again.data?.id).toBe(first.data.id);
  });
});
