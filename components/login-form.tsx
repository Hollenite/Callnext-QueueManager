"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error: authError } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setPending(false);

    if (authError) {
      setError(
        mode === "signin"
          ? "Email or password is wrong."
          : authError.message,
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span>Email</span>
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>Password</span>
        <input
          className="field"
          type="password"
          name="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </label>
      {error ? <p className="text-ticket">{error}</p> : null}
      <button className="btn btn-primary mt-2" type="submit" disabled={pending}>
        {pending
          ? "Working…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>
      <button
        className="btn btn-quiet self-start px-0"
        type="button"
        onClick={() => {
          setError(null);
          setMode(mode === "signin" ? "signup" : "signin");
        }}
      >
        {mode === "signin"
          ? "Need an owner account?"
          : "Already have an account?"}
      </button>
    </form>
  );
}
