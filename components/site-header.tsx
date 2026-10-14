import Link from "next/link";
import { signOutAction } from "@/app/dashboard/actions";
import { BusySubmit } from "@/components/busy-submit";
import { QueueMark } from "@/components/queue-mark";
import { cn } from "@/lib/cn";
import { deskShell } from "@/lib/desk";

type Props = {
  signedIn?: boolean;
  className?: string;
  tone?: "app" | "landing";
};

function SignOutIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function SiteHeader({
  signedIn = false,
  className,
  tone = "app",
}: Props) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 py-5",
        deskShell,
        className,
      )}
    >
      <Link href="/" className="display flex items-center gap-2 text-xl tracking-tight">
        <QueueMark />
        Queue
      </Link>
      <nav className="flex items-center gap-2" aria-label="Site">
        {signedIn ? (
          <>
            <Link href="/dashboard" className="btn btn-quiet">
              Queues
            </Link>
            <form action={signOutAction}>
              <BusySubmit
                className="btn btn-quiet"
                idle="Sign out"
                busy="Signing out…"
              >
                <SignOutIcon />
              </BusySubmit>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={
                tone === "landing" ? "btn btn-login-pill" : "btn btn-quiet"
              }
            >
              Owner login
            </Link>
            <Link href="/signup" className="btn btn-quiet">
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
