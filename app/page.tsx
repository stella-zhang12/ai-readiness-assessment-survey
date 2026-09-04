import Link from "next/link";
import { brainstorm, diagnostic } from "@/lib/instrument";

const versions = [brainstorm, diagnostic];

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-spirit-dark">
        Johns Hopkins Bloomberg School of Public Health
      </p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-heritage">
        AI Use Case Scoping &amp; Readiness Assessment{" "}
        <span className="ml-1 inline-block rounded border border-washline bg-wash px-2 py-0.5 align-middle text-sm font-semibold text-spirit-dark">
          Beta
        </span>
      </h1>
      <p className="mt-4 max-w-measure text-lg text-ink-soft">
        A guided assessment for health-sector and CRVS teams weighing an AI
        project: define one use case, answer structured questions as a team, and
        get an AI-assisted readiness read across four elements — Use Case, Data,
        Safety, and Country-Level Readiness.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className="rounded-xl border border-line p-5 transition-colors hover:border-spirit"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-heritage">{v.title}</h2>
              <span className="text-sm text-ink-muted">
                ~{v.estimatedMinutes} min
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {v.chooserDescription}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/login"
          className="rounded-md bg-heritage px-6 py-3 font-semibold text-white transition-colors hover:bg-heritage-deep"
        >
          Sign in to begin
        </Link>
        <span className="text-sm text-ink-muted">
          Works as a team — share one assessment, pick up where anyone left off.
        </span>
      </div>

      <ul className="mt-12 max-w-measure space-y-1.5 border-t border-line pt-6 text-sm text-ink-muted">
        <li>
          Results are advisory input to your team&apos;s decision — never an
          approval or rejection of a project.
        </li>
        <li>
          This tool asks <em>about</em> your data; it never collects or
          processes your actual records. Please don&apos;t enter personal or
          patient data.
        </li>
        <li>
          It uses AI to generate summaries and readiness ratings, and records
          time spent to help us improve it. AI can make mistakes, so accuracy
          should be cross-checked.
        </li>
      </ul>
    </main>
  );
}
