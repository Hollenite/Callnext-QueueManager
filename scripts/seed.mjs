import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.QUEUE_DEMO_EMAIL ?? "demo@queue.local";
const password = process.env.QUEUE_DEMO_PASSWORD ?? "demo-pass-12345";

if (!url || !anon) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

if (service) {
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError && !/already been registered|already exists/i.test(createError.message)) {
    console.error(createError.message);
    process.exit(1);
  }
}

const owner = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: signInError } = await owner.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error(signInError.message);
  process.exit(1);
}

const { data: existing } = await owner
  .from("queues")
  .select("id")
  .eq("name", "Front desk")
  .limit(1)
  .maybeSingle();

let queueId = existing?.id;
if (!queueId) {
  const { data, error } = await owner.rpc("create_queue", {
    name: "Front desk",
    default_service_minutes: 12,
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  queueId = data.id;
}

const names = ["Priya", "Arjun", "Meera"];
for (const name of names) {
  const { error } = await createClient(url, anon).rpc("join_queue", {
    queue_id: queueId,
    name,
    client_token: crypto.randomUUID(),
  });
  if (error && !/already_in_queue/.test(error.message)) {
    console.error(error.message);
    process.exit(1);
  }
}

console.log(`Demo owner: ${email}`);
console.log(`Demo password: ${password}`);
console.log(`Seeded queue: ${queueId}`);
