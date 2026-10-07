import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
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
      <div className="mt-10 flex flex-col gap-4">
        <Link href="/login" className="btn btn-primary w-full sm:w-auto">
          Owner login
        </Link>
        <p className="text-slate">
          Already have a join link? Open it on your phone.
        </p>
      </div>
    </main>
  );
}
