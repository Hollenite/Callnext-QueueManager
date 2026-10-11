import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6"
    >
      <h1 className="text-4xl tracking-tight">That page is gone</h1>
      <p className="mt-4 text-lg text-slate">
        Check the join link, or open the owner dashboard.
      </p>
      <Link href="/" className="btn btn-primary mt-8 w-fit">
        Home
      </Link>
    </main>
  );
}
