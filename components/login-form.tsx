"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useId, useState } from "react";
import { BusySubmit } from "@/components/busy-submit";
import { createClient } from "@/lib/supabase/client";

function ModeSwitch({
  mode,
  onToggle,
}: {
  mode: "signin" | "signup";
  onToggle: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn btn-quiet self-start px-0"
      type="button"
      disabled={pending}
      onClick={onToggle}
    >
      {mode === "signin"
        ? "Need an owner account?"
        : "Already have an account?"}
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const errorId = useId();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error: authError } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(
        mode === "signin"
          ? "Email or password is wrong."
          : authError.message,
      );
      return;
    }

    await router.push("/dashboard");
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
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
        className="btn btn-primary mt-2"
        idle={mode === "signin" ? "Sign in" : "Create account"}
        busy={mode === "signin" ? "Signing in…" : "Creating account…"}
      />
      <ModeSwitch
        mode={mode}
        onToggle={() => {
          setError(null);
          setMode(mode === "signin" ? "signup" : "signin");
        }}
      />
    </form>
  );
}
