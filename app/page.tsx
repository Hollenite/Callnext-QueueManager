import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10"
      >
        <p className="ticket-number select-none" aria-hidden="true">
          3
        </p>
        <h1 className="mt-8 max-w-[12ch] text-5xl leading-[1.05] tracking-tight">
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
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn btn-primary w-full sm:w-auto">
            Owner login
          </Link>
          <Link href="/scan" className="btn btn-ticket w-full sm:w-auto">
            Scan QR
          </Link>
        </div>
        <p className="mt-4 text-slate">
          Point this phone at the desk QR.
        </p>
      </main>
    </>
  );
}
