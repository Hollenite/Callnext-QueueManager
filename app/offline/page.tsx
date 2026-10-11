import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6"
    >
      <h1 className="text-4xl tracking-tight">You&apos;re offline</h1>
      <p className="mt-4 text-lg text-slate">
        The live queue needs a connection. Reopen this page when you&apos;re
        back online.
      </p>
      <Link href="/" className="btn btn-primary mt-8 w-fit">
        Try again
      </Link>
    </main>
  );
}
