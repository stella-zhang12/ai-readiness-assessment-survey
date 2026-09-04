import Link from "next/link";

export function AppHeader({ teamName }: { teamName?: string }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="font-bold text-heritage">
          AI Readiness Assessment
          <span className="ml-2 rounded border border-washline bg-wash px-1.5 py-0.5 align-middle text-xs font-semibold text-spirit-dark">
            Beta
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {teamName && <span className="text-ink-muted">{teamName}</span>}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="font-semibold text-spirit-dark underline underline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
