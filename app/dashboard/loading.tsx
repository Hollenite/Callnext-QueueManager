import { SiteHeader } from "@/components/site-header";

export default function DashboardLoading() {
  return (
    <>
      <SiteHeader signedIn />
      <main id="main" className="mx-auto w-full max-w-lg px-6 py-10">
        <p className="text-slate">Loading queues…</p>
      </main>
    </>
  );
}
