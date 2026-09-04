import Link from "next/link";
import { brainstorm, diagnostic } from "@/lib/instrument";

const versions = [brainstorm, diagnostic];

const quickExamples = [
  {
    task: "Suggest a cause of death from a verbal autopsy record",
    io: "completed interview form in → suggested ICD-10 code out",
  },
  {
    task: "Predict which children may miss their next vaccination",
    io: "visit history in → weekly list of at-risk children out",
  },
  {
    task: "Extract structured data from handwritten facility reports",
    io: "scanned page in → filled database fields out",
  },
  {
    task: "Flag registry entries that may be duplicates of the same person",
    io: "two records in → same-person likelihood out",
  },
  {
    task: "Draft a plain-language summary of a monthly surveillance report",
    io: "routine data tables in → draft narrative out",
  },
];

export default function Landing() {
  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/campus-banner.jpg"
        alt="Gilman Hall clock tower, Johns Hopkins University"
        width={1800}
        height={700}
        className="h-40 w-full border-b-4 border-heritage object-cover sm:h-52"
      />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-col gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jhu-bsph-logo.png"
            alt="Johns Hopkins Bloomberg School of Public Health"
            width={345}
            height={94}
            className="h-12 w-auto"
          />
          <span className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
            Center for Global Digital Health Innovation
          </span>
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-tight text-heritage">
          AI Use Case Scoping &amp; Readiness Assessment{" "}
          <span className="ml-1 inline-block rounded border border-washline bg-wash px-2 py-0.5 align-middle text-sm font-semibold text-spirit-dark">
            Beta
          </span>
        </h1>

        <div className="mt-5 max-w-measure space-y-3 text-lg text-ink-soft">
          <p>
            A structured self-assessment for health-sector and civil
            registration (CRVS) programs considering the adoption of artificial
            intelligence. The instrument evaluates a single, clearly defined
            use case and produces a readiness profile across four elements —
            Use Case, Data, Safety, and Country-Level Readiness — to inform
            planning prior to development.
          </p>
        </div>

      <div className="mt-8 max-w-measure rounded-xl border border-washline bg-wash p-5">
        <h2 className="font-bold text-heritage">What counts as a use case?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          One specific task you would hand to an AI:{" "}
          <strong>one kind of input goes in, one kind of output comes out</strong>.
          &ldquo;Suggest a cause of death from a completed verbal autopsy
          form&rdquo; is a use case. &ldquo;Modernize our health data
          system&rdquo; is not — that&apos;s many use cases, and each one would
          be assessed on its own.
        </p>
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-spirit-dark">
            <span className="underline underline-offset-2">
              See quick examples
            </span>{" "}
            <span className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="mt-3 space-y-2.5">
            {quickExamples.map((ex) => (
              <li key={ex.task} className="text-sm leading-snug">
                <span className="font-semibold text-ink">{ex.task}</span>
                <br />
                <span className="text-ink-muted">{ex.io}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
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

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/login"
          className="rounded-md bg-heritage px-6 py-3 font-semibold text-white transition-colors hover:bg-heritage-deep"
        >
          Sign in to begin
        </Link>
        <span className="text-sm text-ink-muted">
          Works as a team — share one assessment, pick up where anyone left
          off.
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
      </ul>

        <p className="mt-6 text-xs text-ink-muted">
          Banner photo: Gilman Hall, Johns Hopkins University (public domain).
        </p>
      </div>
    </main>
  );
}
