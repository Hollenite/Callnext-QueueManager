import Link from "next/link";
import { signOutAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/cn";
import { deskShell } from "@/lib/desk";

type Props = {
  signedIn?: boolean;
  className?: string;
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

export function SiteHeader({ signedIn = false, className }: Props) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 py-5",
        signedIn ? deskShell : "mx-auto w-full max-w-3xl px-6",
        className,
      )}
    >
      <Link href="/" className="display text-xl tracking-tight">
        Queue
      </Link>
      <nav className="flex items-center gap-2" aria-label="Site">
        {signedIn ? (
          <>
            <Link href="/dashboard" className="btn btn-quiet">
              Queues
            </Link>
            <form action={signOutAction}>
              <button className="btn btn-quiet" type="submit">
                <SignOutIcon />
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn btn-quiet">
            Owner login
          </Link>
        )}
      </nav>
    </header>
  );
}
