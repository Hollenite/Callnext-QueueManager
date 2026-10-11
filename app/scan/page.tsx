import type { Metadata } from "next";
import { QrScanner } from "@/components/qr-scanner";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Scan",
};

export default function ScanPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10"
      >
        <h1 className="text-4xl tracking-tight">Scan the desk QR</h1>
        <p className="mt-3 text-lg text-slate">
          Point this phone at the code on the counter. We only open Queue join
          links.
        </p>
        <div className="mt-8">
          <QrScanner />
        </div>
      </main>
    </>
  );
}
