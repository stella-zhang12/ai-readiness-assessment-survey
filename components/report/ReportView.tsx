"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Report } from "@/lib/ai/report";

const APPROACH_LABEL: Record<string, string> = {
  ai: "An AI solution appears appropriate",
  hybrid: "A hybrid AI + non-AI approach may be appropriate",
  non_ai: "A non-AI digital solution may be sufficient",
  insufficient: "Insufficient information to determine",
};

const CAPABILITY_LABEL: Record<string, string> = {
  classification: "Classification",
  prediction: "Prediction",
  information_extraction: "Information extraction",
  summarization: "Summarization",
  generation: "Generation",
  pattern_recognition: "Pattern recognition",
  other: "Other",
  none: "",
};

const AREA_LABEL: Record<string, string> = {
  use_case: "Use case",
  data: "Data readiness",
  safety: "Safety and responsible use",
  country: "Country-level readiness",
};

const AREA_SHORT: Record<string, string> = {
  use_case: "Use case",
  data: "Data",
  safety: "Safety",
  country: "Country",
};

const ASSESSMENT_LABEL: Record<string, string> = {
  ready: "Ready",
  some_gaps: "Some gaps",
  major_gaps: "Major gaps",
  unable: "Unable to assess",
};

const ASSESSMENT_STYLE: Record<string, string> = {
  ready: "border-status-green bg-status-greenbg text-status-green",
  some_gaps: "border-status-amber bg-status-amberbg text-status-amber",
  major_gaps: "border-status-red bg-status-redbg text-status-red",
  unable: "border-line bg-white text-ink-muted",
};

const VERDICT_LABEL: Record<string, string> = {
  proceed: "Proceed to technical design / pilot",
  proceed_after_gaps: "Proceed after addressing key gaps",
  simpler_first: "Explore a simpler or hybrid solution first",
  more_scoping: "Further scoping is needed before proceeding",
};

const PRIORITY_LABEL: Record<string, string> = {
  immediate: "Immediate",
  before_pilot: "Before development or piloting",
  before_scale: "Before wider implementation",
};

const PRIORITY_SHORT: Record<string, string> = {
  immediate: "Now",
  before_pilot: "Before pilot",
  before_scale: "Before scale",
};

const COST_LABEL: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

const NAV = [
  { id: "s1", label: "1 Summary" },
  { id: "s2", label: "2 Approach" },
  { id: "s3", label: "3 Options" },
  { id: "s4", label: "4 Readiness" },
  { id: "s5", label: "5 Gaps & actions" },
  { id: "s6", label: "6 Roadmap" },
  { id: "s7", label: "7 Recommendation" },
];

const SUMMARY_ROWS: { key: keyof Report["use_case_summary"]; label: string }[] =
  [
    { key: "problem", label: "The problem or task" },
    { key: "current_process", label: "Current process and challenges" },
    { key: "users", label: "Primary users" },
    { key: "inputs", label: "Information provided to the system" },
    { key: "outputs", label: "Expected outputs" },
    { key: "output_use", label: "How outputs would be used" },
    { key: "desired_outcomes", label: "Desired outcomes" },
  ];

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="border-b border-line pb-1.5 text-lg font-bold text-heritage">
      {n}. {title}
    </h2>
  );
}

function SummaryRows({ summary }: { summary: Report["use_case_summary"] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {SUMMARY_ROWS.map((row) => (
        <div
          key={row.key}
          className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[13rem_1fr]"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {row.label}
          </span>
          <span className="text-sm leading-relaxed text-ink">
            {summary[row.key]}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Three-stop spectrum showing where the recommendation sits. */
function ApproachSpectrum({
  classification,
}: {
  classification: Report["approach"]["classification"];
}) {
  const stops = [
    { key: "non_ai", label: "Non-AI digital" },
    { key: "hybrid", label: "Hybrid" },
    { key: "ai", label: "AI solution" },
  ];
  const insufficient = classification === "insufficient";
  return (
    <div>
      <div className="flex overflow-hidden rounded-md border border-line">
        {stops.map((s, i) => {
          const active = !insufficient && classification === s.key;
          return (
            <div
              key={s.key}
              className={`flex-1 px-2 py-2 text-center text-xs font-semibold ${
                i > 0 ? "border-l border-line" : ""
              } ${
                active
                  ? "bg-heritage text-white"
                  : insufficient
                    ? "bg-white text-ink-muted opacity-60"
                    : "bg-white text-ink-muted"
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>
      {insufficient && (
        <p className="mt-1.5 text-xs font-semibold text-status-amber">
          Insufficient information to place this use case on the spectrum yet.
        </p>
      )}
    </div>
  );
}

export function ReportView({
  assessmentId,
  title,
}: {
  assessmentId: string;
  title: string;
}) {
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const started = useRef(false);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setPhase("loading");
      try {
        const res = await fetch("/api/ai/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId, regenerate }),
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setReport(data.report);
        setGeneratedAt(data.generatedAt ?? null);
        setPhase("done");
      } catch {
        setPhase("error");
      }
    },
    [assessmentId]
  );

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void generate(false);
    }
  }, [generate]);

  if (phase === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-heritage">
          Preparing your scoping report…
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          Your team&apos;s answers across all four sections are being reviewed
          to weigh AI, hybrid, and non-AI options. This usually takes about
          half a minute.
        </p>
        <div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-heritage" />
        </div>
      </main>
    );
  }

  if (phase === "error" || !report) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-heritage">
          Couldn&apos;t generate the report
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          Something went wrong. Your answers are all saved; try again in a
          moment.
        </p>
        <button
          type="button"
          onClick={() => generate(false)}
          className="mt-8 rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
        >
          Try again
        </button>
      </main>
    );
  }

  const dateLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Gap cards absorb the steps that name them; the roadmap shows everything.
  const norm = (s: string) => s.trim().toLowerCase();
  const stepsForGap = (gapTitle: string) =>
    report.next_steps.filter((s) => norm(s.gap) === norm(gapTitle));

  const roadmap = (["immediate", "before_pilot", "before_scale"] as const).map(
    (p) => ({
      priority: p,
      steps: report.next_steps.filter((s) => s.priority === p),
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 pb-14">
      {/* Print-only report header */}
      <p className="hidden border-b border-line pb-2 pt-6 text-xs text-ink-muted print:block">
        AI Solution Scoping Report · {title}
        {dateLabel ? ` · Generated ${dateLabel}` : ""} · Johns Hopkins
        Bloomberg School of Public Health
      </p>

      <div className="no-print flex items-center justify-between pt-14">
        <Link
          href={`/a/${assessmentId}`}
          className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
        >
          ← Back to the assessment
        </Link>
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => window.print()}
            className="font-semibold text-spirit-dark underline underline-offset-2"
          >
            Print / Save as PDF
          </button>
          <Link
            href="/dashboard"
            className="font-semibold text-spirit-dark underline underline-offset-2"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Verdict + dashboard */}
      <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        AI Solution Scoping Report · {title}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-heritage">
        {VERDICT_LABEL[report.overall.verdict]}
      </h1>
      {dateLabel && (
        <p className="mt-1 text-xs text-ink-muted">Generated {dateLabel}</p>
      )}

      <div className="mt-5 border-y border-line py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {report.readiness.map((r) => (
            <a
              key={r.area}
              href="#s4"
              className={`rounded-md border px-2.5 py-1 text-xs font-bold ${ASSESSMENT_STYLE[r.assessment]}`}
            >
              {AREA_SHORT[r.area]}: {ASSESSMENT_LABEL[r.assessment]}
            </a>
          ))}
          <a
            href="#s2"
            className="rounded-md border border-washline bg-wash px-2.5 py-1 text-xs font-bold text-heritage"
          >
            {APPROACH_LABEL[report.approach.classification]}
          </a>
        </div>
      </div>

      <p className="mt-4 max-w-measure text-sm leading-relaxed text-ink-soft">
        {report.overall.explanation}
      </p>

      {/* In-page navigation */}
      <nav className="no-print sticky top-0 z-10 -mx-6 mt-6 border-b border-line bg-white/95 px-6 py-2 backdrop-blur">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="text-ink-muted underline-offset-2 hover:text-spirit-dark hover:underline"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      {/* 1. Use case summary: collapsed on screen, expanded in print */}
      <section id="s1" className="mt-10 scroll-mt-12">
        <SectionHeading n={1} title="Use case summary" />
        <details className="no-print group mt-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-spirit-dark">
            <span className="underline underline-offset-2">
              What we heard from your team
            </span>{" "}
            <span className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="mt-2">
            <SummaryRows summary={report.use_case_summary} />
          </div>
        </details>
        <div className="hidden print:block">
          <SummaryRows summary={report.use_case_summary} />
        </div>
      </section>

      {/* 2. Approach */}
      <section id="s2" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={2} title="Recommended solution approach" />
        <div className="mt-3">
          <ApproachSpectrum classification={report.approach.classification} />
        </div>
        {report.approach.ai_capability !== "none" && (
          <p className="mt-3 text-sm">
            <span className="rounded border border-washline bg-wash px-2 py-0.5 text-xs font-semibold text-spirit-dark">
              Main AI capability:{" "}
              {CAPABILITY_LABEL[report.approach.ai_capability]}
            </span>
          </p>
        )}
        <p className="mt-3 max-w-measure text-sm leading-relaxed text-ink-soft">
          {report.approach.reasoning}
        </p>
      </section>

      {/* 3. Options */}
      <section id="s3" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={3} title="Potential solution options" />
        <div className="mt-3 space-y-4">
          {report.options.map((o, i) => (
            <div key={o.title} className="border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-ink">
                  Option {i + 1}: {o.title}
                </p>
                <p className="text-xs font-semibold text-ink-muted">
                  Set-up cost: {COST_LABEL[o.cost.setup]} · Ongoing:{" "}
                  {COST_LABEL[o.cost.ongoing]}
                </p>
              </div>
              <p className="mt-1 text-sm font-semibold text-spirit-dark">
                {o.best_if}
              </p>
              <p className="mt-1.5 max-w-measure text-sm leading-relaxed text-ink-soft">
                {o.how_it_works}
              </p>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-status-green">
                    Advantages
                  </p>
                  <ul className="mt-1 space-y-1 text-ink-soft">
                    {o.advantages.map((a) => (
                      <li key={a}>· {a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-status-amber">
                    Limitations
                  </p>
                  <ul className="mt-1 space-y-1 text-ink-soft">
                    {o.limitations.map((l) => (
                      <li key={l}>· {l}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Key requirements
                  </p>
                  <ul className="mt-1 space-y-1 text-ink-soft">
                    {o.requirements.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 border-t border-washline pt-2 text-xs text-ink-muted">
                Cost note: {o.cost.note}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Costs are relative comparisons between these options, not price
          quotes.
        </p>
      </section>

      {/* 4. Readiness */}
      <section id="s4" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={4} title="Readiness assessment" />
        <div className="mt-3 overflow-hidden border border-line">
          {report.readiness.map((r, i) => (
            <div
              key={r.area}
              className={`px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-ink">{AREA_LABEL[r.area]}</p>
                <span
                  className={`rounded-md border px-3 py-1 text-sm font-bold ${ASSESSMENT_STYLE[r.assessment]}`}
                >
                  {ASSESSMENT_LABEL[r.assessment]}
                </span>
              </div>
              <p className="mt-1.5 max-w-measure text-sm leading-relaxed text-ink-soft">
                {r.findings}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Gaps with their actions */}
      <section id="s5" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={5} title="Key gaps and what to do about them" />
        <div className="mt-3 space-y-4">
          {report.gaps.map((g) => {
            const steps = stepsForGap(g.title);
            return (
              <div key={g.title} className="border-l-2 border-status-amber pl-4">
                <p className="text-sm font-bold text-ink">{g.title}</p>
                <p className="mt-0.5 max-w-measure text-sm leading-relaxed text-ink-soft">
                  {g.why_it_matters}
                </p>
                {steps.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {steps.map((s) => (
                      <li key={s.action} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 rounded-sm border border-washline bg-wash px-1.5 py-px text-[11px] font-semibold text-spirit-dark">
                          {PRIORITY_SHORT[s.priority]}
                        </span>
                        <span className="leading-relaxed text-ink">
                          {s.action}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {report.gaps.length === 0 && (
            <p className="text-sm text-ink-soft">
              No major gaps were identified from the answers provided.
            </p>
          )}
        </div>
      </section>

      {/* 6. Roadmap */}
      <section id="s6" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={6} title="Roadmap of next steps" />
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {roadmap.map((g) => (
            <div key={g.priority} className="border-t-2 border-heritage pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-spirit-dark">
                {PRIORITY_LABEL[g.priority]}
              </p>
              {g.steps.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {g.steps.map((s) => (
                    <li key={s.action} className="text-sm leading-snug text-ink-soft">
                      · {s.action}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">None.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. Recommendation */}
      <section id="s7" className="mt-10 scroll-mt-12 print:break-before-page">
        <SectionHeading n={7} title="Overall recommendation" />
        <p className="mt-3 border-l-2 border-heritage bg-wash px-3.5 py-2.5 text-sm font-bold text-heritage">
          {VERDICT_LABEL[report.overall.verdict]}
        </p>
        <p className="mt-2.5 max-w-measure text-sm leading-relaxed text-ink-soft">
          {report.overall.explanation}
        </p>
      </section>

      <div className="no-print mt-10 flex items-center gap-4 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => generate(true)}
          className="text-xs font-semibold text-spirit-dark underline underline-offset-2"
        >
          Regenerate report
        </button>
      </div>

      <p className="mt-6 max-w-measure text-xs text-ink-muted">
        Generated automatically from your team&apos;s answers. This report is
        advisory input to your team&apos;s decision, never an approval or
        rejection of a project, and its accuracy should be cross-checked.
      </p>
    </main>
  );
}
