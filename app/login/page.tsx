import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="text-slate">
        Home
      </Link>
      <p className="mt-8 text-slate">Owner</p>
      <h1 className="mt-2 text-4xl tracking-tight">Sign in</h1>
      {isSupabaseConfigured() ? (
        <LoginForm />
      ) : (
        <p className="mt-6 text-lg text-slate">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>{" "}
          first.
        </p>
      )}
    </main>
  );
}
