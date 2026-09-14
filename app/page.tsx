import Link from "next/link";
import { AuthCatcher } from "@/components/AuthCatcher";

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

const steps = [
  {
    n: "01",
    title: "Answer four sections",
    text: "Your use case, your data, safety, and the country context. Plain-language questions with examples at every step, answered in any order, together as a team.",
  },
  {
    n: "02",
    title: "Review and close gaps",
    text: "Each time you return to the progress page, every started section is reviewed for completeness, with specific pointers to what is worth elaborating.",
  },
  {
    n: "03",
    title: "Get your scoping report",
    text: "A recommendation across AI, hybrid, and simpler non-AI options, with realistic solution options and relative costs, a readiness assessment, and prioritized next steps.",
  },
];

export default function Landing() {
  return (
    <main>
      <AuthCatcher />

      {/* Top bar */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/jhu-bsph-logo.png"
              alt="Johns Hopkins Bloomberg School of Public Health"
              width={345}
              height={94}
              style={{ height: "34px", width: "auto" }}
            />
            <span className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-widest text-spirit-dark sm:block">
              Center for Global Digital Health Innovation
            </span>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-heritage px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-[1fr_23rem] lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
            AI Use Case Scoping &amp; Readiness Assessment{" "}
            <span className="ml-1 inline-block rounded border border-washline bg-wash px-1.5 py-0.5 align-middle text-[10px] font-bold text-spirit-dark">
              Beta
            </span>
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-heritage sm:text-5xl">
            Is your AI use case ready to build?
          </h1>
          <p className="mt-5 max-w-measure text-lg leading-relaxed text-ink-soft">
            A structured assessment for health and CRVS teams. Work through it
            together, see what is missing as you go, and end with a scoping
            report that weighs AI against simpler options.
          </p>

          {/* Illustration: a miniature scoping result */}
          <div className="mt-9 max-w-lg border border-line bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Your scoping report
            </p>
            <p className="mt-2 font-bold text-heritage">
              Proceed after addressing key gaps
            </p>
            <div className="mt-3 flex overflow-hidden rounded-md border border-line text-center text-[11px] font-semibold">
              <div className="flex-1 bg-white px-2 py-1.5 text-ink-muted">
                Non-AI digital
              </div>
              <div className="flex-1 border-x border-line bg-heritage px-2 py-1.5 text-white">
                Hybrid
              </div>
              <div className="flex-1 bg-white px-2 py-1.5 text-ink-muted">
                AI solution
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-status-green bg-status-greenbg px-2 py-0.5 text-[11px] font-bold text-status-green">
                Use case: Ready
              </span>
              <span className="rounded-md border border-status-amber bg-status-amberbg px-2 py-0.5 text-[11px] font-bold text-status-amber">
                Data: Some gaps
              </span>
              <span className="rounded-md border border-status-green bg-status-greenbg px-2 py-0.5 text-[11px] font-bold text-status-green">
                Safety: Ready
              </span>
              <span className="rounded-md border border-status-amber bg-status-amberbg px-2 py-0.5 text-[11px] font-bold text-status-amber">
                Country: Some gaps
              </span>
            </div>
            <p className="mt-3 text-[11px] text-ink-muted">
              Illustrative result. Your report reflects your team&apos;s
              answers.
            </p>
          </div>
        </div>

        {/* Action card */}
        <div className="h-fit border border-line bg-white p-6 shadow-sm lg:mt-10">
          <h2 className="text-xl font-bold text-heritage">
            Start your assessment
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Sign in with your team, or explore first as a guest. Answers save
            as you go, and anyone on your team can pick up where you left off.
          </p>
          <div className="mt-5 grid gap-2.5">
            <Link
              href="/login"
              className="rounded-md bg-heritage px-5 py-2.5 text-center font-semibold text-white transition-colors hover:bg-heritage-deep"
            >
              Sign in to begin
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-heritage px-5 py-2.5 text-center font-semibold text-heritage transition-colors hover:bg-wash"
            >
              Create an account
            </Link>
          </div>
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">
            Want to explore first?{" "}
            <Link
              href="/try"
              className="font-semibold text-spirit-dark underline underline-offset-2"
            >
              Try it without an account
            </Link>{" "}
            (nothing you enter is saved).
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="border-y border-line bg-wash/40">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-3xl font-bold text-heritage">How it works</h2>
          <p className="mt-3 max-w-measure text-ink-soft">
            Built for program teams, not engineers: the assessment does not
            assume AI is the answer. It structures the scoping conversation
            and turns it into a report your leadership can act on.
          </p>

          <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {steps.map((s, i) => (
              <div key={s.n} className="contents">
                {i > 0 && (
                  <div
                    className="hidden items-center text-xl text-spirit sm:flex"
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}
                <div className="border border-washline bg-gradient-to-b from-wash to-white p-5">
                  <p className="font-mono text-sm font-bold text-spirit-dark">
                    {s.n}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {s.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What counts as a use case */}
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="max-w-measure border-l-2 border-heritage bg-wash p-5">
          <h2 className="font-bold text-heritage">
            What counts as a use case?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            One specific task you would hand to an AI:{" "}
            <strong>one kind of input goes in, one kind of output comes out</strong>.
            &ldquo;Suggest a cause of death from a completed verbal autopsy
            form&rdquo; is a use case. &ldquo;Modernize our health data
            system&rdquo; is not; that&apos;s many use cases, and each one
            would be assessed on its own.
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
      </div>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-6 py-8 text-xs text-ink-muted">
          Center for Global Digital Health Innovation · Johns Hopkins
          Bloomberg School of Public Health
        </p>
      </footer>
    </main>
  );
}
