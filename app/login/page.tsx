import Link from "next/link";

export default function LoginPlaceholder() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-heritage">Accounts are next</h1>
      <p className="mt-3 text-ink-soft">
        Sign-in, teams, and the dashboard arrive in the next build step (PRD
        §15, step 4). This page is a placeholder so nothing 404s in the
        meantime.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-spirit-dark underline underline-offset-2"
      >
        Back to the landing page
      </Link>
    </main>
  );
}
