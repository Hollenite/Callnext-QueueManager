import Link from "next/link";
import { LandingPreview } from "@/components/landing-preview";
import { SiteHeader } from "@/components/site-header";
import { deskShell } from "@/lib/desk";

function ScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M7 4H4v3M17 4h3v3M4 17v3h3M20 17v3h-3" />
      <rect x="8" y="8" width="8" height="8" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader tone="landing" />
      <main
        id="main"
        className={`${deskShell} flex flex-1 flex-col justify-center py-8 lg:py-12`}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <LandingPreview />
          <div>
            <h1 className="max-w-[12ch] text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Run the queue from{" "}
              <span className="text-ticket">one screen.</span>
            </h1>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-slate">
              Customers scan a QR, type a name, and watch their place update. No
              phone numbers.
            </p>
            <ol className="landing-steps mt-9 max-w-md">
              <li>
                <b>01</b>
                <span>Scan the QR at the desk.</span>
                <ScanIcon />
              </li>
              <li>
                <b>02</b>
                <span>Type the name they should call.</span>
                <PersonIcon />
              </li>
              <li>
                <b>03</b>
                <span>Watch your place update live.</span>
                <LiveIcon />
              </li>
            </ol>
            <div className="landing-actions mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/scan" className="btn btn-ticket w-full sm:w-auto">
                Scan QR
                <ScanIcon />
              </Link>
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto">
                Open a desk
              </Link>
            </div>
            <p className="mt-4 text-slate">
              Point this phone at the desk QR to try it out.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
