"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { diagnostic } from "@/lib/instrument";
import type { Followups, Judgment } from "@/lib/ai/prompts";

const LEVEL_STYLE: Record<string, string> = {
  green: "bg-status-greenbg text-status-green border-status-green",
  amber: "bg-status-amberbg text-status-amber border-status-amber",
  red: "bg-status-redbg text-status-red border-status-red",
};

const LEVEL_LABEL: Record<string, string> = {
  green: "Fully Meets the Criteria",
  amber: "Partially Meets the Criteria",
  red: "Absent",
};

function qidText(qid: string): string {
  for (const s of diagnostic.sections) {
    if (s.type === "text") {
      const q = s.questions.find((q) => q.id === qid);
      if (q) return q.handle;
    }
    if (s.type === "likert") {
      const it = s.items.find((i) => i.id === qid);
      if (it) return it.statement.length > 90 ? it.statement.slice(0, 87) + "…" : it.statement;
    }
  }
  return qid;
}

const resultsSection = diagnostic.sections.find((s) => s.type === "results");
const elementOrder =
  resultsSection?.type === "results"
    ? resultsSection.elements
    : [];

export function ResultsView({
  assessmentId,
  title,
}: {
  assessmentId: string;
  title: string;
}) {
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [followups, setFollowups] = useState<Followups | null>(null);
  const started = useRef(false);

  const generate = useCallback(async (regenerate: boolean) => {
    setPhase("loading");
    try {
      const res = await fetch("/api/ai/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, regenerate }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setJudgment(data.judgment);
      setFollowups(data.followups);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, [assessmentId]);

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
          Judging readiness…
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          The AI is reading your team&apos;s answers and ratings and writing
          the reasoning for each element. This usually takes 15–30 seconds.
        </p>
        <div className="mx-auto mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-heritage" />
        </div>
      </main>
    );
  }

  if (phase === "error" || !judgment) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-heritage">
          Couldn&apos;t generate results
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          Something went wrong talking to the AI. Your answers are all saved —
          try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => generate(true)}
          className="mt-8 rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
        >
          Try again
        </button>
      </main>
    );
  }

  const ordered = elementOrder
    .map((el) => judgment.elements.find((e) => e.id === el.id))
    .filter(Boolean) as Judgment["elements"];

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
        Final use case readiness · {title}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-heritage">
        Your readiness profile
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        AI-generated from your team&apos;s answers and ratings.
      </p>

      {judgment.fallback && (
        <p className="no-print mt-4 rounded-md bg-status-amberbg px-3 py-2 text-sm text-status-amber">
          The AI reasoning couldn&apos;t be generated, so ratings below are
          computed directly from your answers.{" "}
          <button
            type="button"
            onClick={() => generate(true)}
            className="font-semibold underline underline-offset-2"
          >
            Generate again
          </button>
        </p>
      )}

      {/* At-a-glance strip */}
      <div className="mt-6 flex flex-wrap gap-2">
        {ordered.map((el) => {
          const meta = elementOrder.find((e) => e.id === el.id)!;
          return (
            <span
              key={el.id}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${LEVEL_STYLE[el.level]}`}
            >
              {meta.label}
            </span>
          );
        })}
      </div>

      {/* The table (instrument requirement: table presentation) */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        {ordered.map((el, i) => {
          const meta = elementOrder.find((e) => e.id === el.id)!;
          return (
            <div key={el.id} className={i > 0 ? "border-t border-line" : ""}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div>
                  <p className="font-bold text-ink">{meta.label}</p>
                  {el.confidence !== "high" && (
                    <p className="text-xs text-ink-muted">
                      {el.confidence === "low"
                        ? "Low confidence — your team marked many questions as unknown"
                        : "Medium confidence"}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-md border px-3 py-1.5 text-sm font-bold ${LEVEL_STYLE[el.level]}`}
                >
                  {LEVEL_LABEL[el.level]}
                </span>
              </div>
              <details className="group border-t border-washline bg-wash/50 px-4 sm:px-5">
                <summary className="cursor-pointer list-none py-2.5 text-xs font-semibold text-spirit-dark">
                  How this rating was made{" "}
                  <span className="inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <div className="pb-4">
                  <p className="max-w-measure text-sm leading-relaxed text-ink-soft">
                    {el.reasoning}
                  </p>
                  {el.drivers.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {el.drivers.map((d) => (
                        <li key={d.qid} className="text-xs text-ink-muted">
                          <span
                            className={`mr-1.5 font-bold ${
                              d.direction === "strength"
                                ? "text-status-green"
                                : "text-status-red"
                            }`}
                          >
                            {d.direction === "strength" ? "+" : "–"}
                          </span>
                          <span className="font-mono">{d.qid}</span> ·{" "}
                          {qidText(d.qid)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <p className="mt-4 max-w-measure text-sm text-ink-soft">
        {judgment.overall_note}
      </p>

      {/* Follow-ups */}
      {followups && followups.todos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-heritage">
            Suggested next steps for your team
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {followups.fallback
              ? "Questions your team marked as unknown:"
              : "AI-generated from the gaps and unknowns in your answers."}
          </p>
          <ol className="mt-3 space-y-3">
            {followups.todos.map((t, i) => (
              <li key={i} className="rounded-lg border border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">{t.action}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {t.why}
                  {t.qid && (
                    <span className="ml-1 font-mono text-spirit-dark">
                      ({t.qid})
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="no-print mt-10 flex items-center gap-4 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => generate(true)}
          className="text-xs font-semibold text-spirit-dark underline underline-offset-2"
        >
          Regenerate results
        </button>
      </div>

      <p className="mt-6 max-w-measure text-xs text-ink-muted">
        {diagnostic.disclaimer} Results are advisory input to your team&apos;s
        decision — never an approval or rejection of a project.
      </p>
    </main>
  );
}
