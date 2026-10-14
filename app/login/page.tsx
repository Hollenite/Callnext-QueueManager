import type { Metadata } from "next";
import Link from "next/link";
import { OwnerAuthForm } from "@/components/owner-auth-form";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12"
      >
        <p className="text-slate">Owner</p>
        <h1 className="mt-2 text-4xl tracking-tight">Sign in</h1>
        {isSupabaseConfigured() ? (
          <>
            <OwnerAuthForm intent="signin" />
            <Link href="/signup" className="btn btn-quiet mt-4 self-start px-0">
              Need an owner account?
            </Link>
          </>
        ) : (
          <p className="mt-6 text-lg text-slate">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>{" "}
            first.
          </p>
        )}
      </main>
    </>
  );
}
