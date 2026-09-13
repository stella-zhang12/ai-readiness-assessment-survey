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
    <h2 className="mt-10 border-b border-line pb-1.5 text-lg font-bold text-heritage">
      {n}. {title}
    </h2>
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

  const grouped = (["immediate", "before_pilot", "before_scale"] as const).map(
    (p) => ({
      priority: p,
      steps: report.next_steps.filter((s) => s.priority === p),
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <div className="no-print flex items-center justify-between">
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

      <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        AI Solution Scoping Report · {title}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-heritage">
        {VERDICT_LABEL[report.overall.verdict]}
      </h1>
      <p className="mt-3 max-w-measure text-sm leading-relaxed text-ink-soft">
        {report.overall.explanation}
      </p>

      <SectionHeading n={1} title="Use case summary" />
      <div className="mt-3 divide-y divide-line border-y border-line">
        {SUMMARY_ROWS.map((row) => (
          <div
            key={row.key}
            className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[13rem_1fr]"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {row.label}
            </span>
            <span className="text-sm leading-relaxed text-ink">
              {report.use_case_summary[row.key]}
            </span>
          </div>
        ))}
      </div>

      <SectionHeading n={2} title="Recommended solution approach" />
      <p className="mt-3 border-l-2 border-heritage bg-wash px-3.5 py-2.5 text-sm font-bold text-heritage">
        {APPROACH_LABEL[report.approach.classification]}
        {report.approach.ai_capability !== "none" && (
          <span className="ml-2 rounded border border-washline bg-white px-2 py-0.5 text-xs font-semibold text-spirit-dark">
            Main AI capability:{" "}
            {CAPABILITY_LABEL[report.approach.ai_capability]}
          </span>
        )}
      </p>
      <p className="mt-2.5 max-w-measure text-sm leading-relaxed text-ink-soft">
        {report.approach.reasoning}
      </p>

      <SectionHeading n={3} title="Potential solution options" />
      <div className="mt-3 space-y-4">
        {report.options.map((o, i) => (
          <div key={o.title} className="border border-line p-4">
            <p className="font-bold text-ink">
              Option {i + 1}: {o.title}
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
          </div>
        ))}
      </div>

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

      <SectionHeading n={5} title="Key gaps and risks" />
      <ul className="mt-3 space-y-3">
        {report.gaps.map((g) => (
          <li key={g.title} className="border-l-2 border-status-amber pl-3.5">
            <p className="text-sm font-semibold text-ink">{g.title}</p>
            <p className="mt-0.5 max-w-measure text-sm leading-relaxed text-ink-soft">
              {g.why_it_matters}
            </p>
          </li>
        ))}
        {report.gaps.length === 0 && (
          <li className="text-sm text-ink-soft">
            No major gaps were identified from the answers provided.
          </li>
        )}
      </ul>

      <SectionHeading n={6} title="Recommended next steps" />
      <div className="mt-3 space-y-5">
        {grouped.map(
          (g) =>
            g.steps.length > 0 && (
              <div key={g.priority}>
                <p className="text-xs font-semibold uppercase tracking-wider text-spirit-dark">
                  {PRIORITY_LABEL[g.priority]}
                </p>
                <ol className="mt-1.5 space-y-1.5">
                  {g.steps.map((s) => (
                    <li key={s.action} className="text-sm leading-relaxed text-ink">
                      · {s.action}
                    </li>
                  ))}
                </ol>
              </div>
            )
        )}
      </div>

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
