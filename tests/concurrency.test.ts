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

describe.skipIf(!configured)("call_next concurrency", () => {
  let owner: SupabaseClient;
  let queueId: string;

  beforeAll(async () => {
    await ensureOwner();
    owner = await ownerClient();
    const { data, error } = await owner.rpc("create_queue", {
      name: `Concurrency ${Date.now()}`,
      default_service_minutes: 8,
    });
    if (error) throw error;
    queueId = data.id as string;

    const joins = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        createClient(url!, anon!).rpc("join_queue", {
          queue_id: queueId,
          name: `Guest ${i + 1}`,
          client_token: crypto.randomUUID(),
        }),
      ),
    );

    for (const result of joins) {
      if (result.error) throw result.error;
    }
  });

  afterAll(async () => {
    if (!queueId) return;
    await admin().from("queue_entries").delete().eq("queue_id", queueId);
    await admin().from("queues").delete().eq("id", queueId);
  });

  it("never serves the same customer twice under parallel call_next", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => owner.rpc("call_next", { queue_id: queueId })),
    );

    for (const result of results) {
      if (result.error) throw result.error;
    }

    const servedIds = results
      .map((result) => result.data?.id as string | undefined)
      .filter((id): id is string => Boolean(id));

    expect(new Set(servedIds).size).toBe(servedIds.length);

    const { data: serving, error } = await admin()
      .from("queue_entries")
      .select("id, status")
      .eq("queue_id", queueId)
      .eq("status", "serving");

    if (error) throw error;
    const servingIds = (serving ?? []).map((row) => row.id as string);
    expect(new Set(servingIds).size).toBe(servingIds.length);
    expect(servingIds.length).toBeLessThanOrEqual(8);
  });

  it("rejects a second join with the same client token", async () => {
    const token = crypto.randomUUID();
    const guest = createClient(url!, anon!);
    const first = await guest.rpc("join_queue", {
      queue_id: queueId,
      name: "Repeat",
      client_token: token,
    });
    if (first.error) throw first.error;

    const second = await guest.rpc("join_queue", {
      queue_id: queueId,
      name: "Repeat",
      client_token: token,
    });

    expect(second.error?.message).toMatch(/already_in_queue/);
  });
});
