import { SiteHeader } from "@/components/site-header";
import { deskShell } from "@/lib/desk";

export default function DashboardLoading() {
  return (
    <>
      <SiteHeader signedIn />
      <main id="main" className={`${deskShell} py-10`}>
        <p className="text-slate">Loading queues…</p>
      </main>
    </>
  );
}
