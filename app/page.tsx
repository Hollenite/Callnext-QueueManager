import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { deskShell } from "@/lib/desk";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className={`${deskShell} flex flex-1 flex-col justify-center py-10 lg:py-16`}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="ticket-stub ticket-stub-hero mx-auto w-full max-w-md lg:mx-0 lg:max-w-xl">
            <p className="ticket-number select-none" aria-hidden="true">
              3
            </p>
          </div>
          <div>
            <h1 className="max-w-[12ch] text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Run the queue from one screen.
            </h1>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-slate">
              Customers scan a QR, type a name, and watch their place update. No
              phone numbers.
            </p>
            <ol className="steps mt-10 max-w-sm text-slate">
              <li>Scan the QR at the desk.</li>
              <li>Type the name they should call.</li>
              <li>Watch your place update live.</li>
            </ol>
            <div className="mt-10 flex flex-col gap-3 lg:flex-row">
              <Link href="/scan" className="btn btn-ticket w-full lg:w-auto">
                Scan QR
              </Link>
              <Link href="/login" className="btn btn-primary w-full lg:w-auto">
                Owner login
              </Link>
            </div>
            <p className="mt-4 text-slate">Point this phone at the desk QR.</p>
          </div>
        </div>
      </main>
    </>
  );
}
