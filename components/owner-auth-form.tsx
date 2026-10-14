"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Intent = "signin" | "signup";

function signupErrorCopy(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  ) {
    return "That email already has an owner account.";
  }
  if (lower.includes("password")) {
    return "Use at least 6 characters.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "Use a real email address.";
  }
  if (lower.includes("rate limit")) {
    return "Try again in a minute.";
  }
  return "Could not create the account. Try again.";
}

export function OwnerAuthForm({ intent }: { intent: Intent }) {
  const router = useRouter();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setError(null);
    setConfirmNote(false);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    if (intent === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setPending(false);
        setError("Email or password is wrong.");
        return;
      }
      await router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setPending(false);
      setError(signupErrorCopy(authError.message));
      return;
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setPending(false);
      setError("That email already has an owner account.");
      return;
    }

    if (data.session) {
      await router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data: signedIn } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signedIn.session) {
      await router.push("/dashboard");
      router.refresh();
      return;
    }

    setPending(false);
    setConfirmNote(true);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" aria-busy={pending}>
      <label className="flex flex-col gap-2">
        <span>Email</span>
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={pending}
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
          autoComplete={intent === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {error ? (
        <p id={errorId} className="text-ticket" role="alert">
          {error}
          {error.includes("already has an owner account") ? (
            <>
              {" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {confirmNote ? (
        <p className="text-slate" role="status">
          Account created. Sign in after you confirm your email.{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      ) : null}
      <button
        className="btn btn-primary mt-2"
        type="submit"
        disabled={pending}
        aria-busy={pending}
      >
        {pending
          ? intent === "signin"
            ? "Signing in…"
            : "Creating account…"
          : intent === "signin"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
