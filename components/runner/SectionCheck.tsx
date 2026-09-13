"use client";

import { useEffect, useRef, useState } from "react";
import type { SectionCheck as Check } from "@/lib/ai/sectionCheck";

const STATUS_STYLE: Record<string, string> = {
  complete: "border-status-green bg-status-greenbg text-status-green",
  partial: "border-status-amber bg-status-amberbg text-status-amber",
  not_answered: "border-status-red bg-status-redbg text-status-red",
  not_applicable: "border-line bg-white text-ink-muted",
};

const STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  partial: "Partially complete",
  not_answered: "Not answered",
  not_applicable: "N/A",
};

/**
 * Completeness check rendered under a section on the progress page.
 * Each question row is clickable and jumps straight to that question.
 * Runs whenever the page opens; the server reuses the stored check unless
 * this section's answers changed since the last run.
 */
export function SectionCheck({
  assessmentId,
  sectionId,
  answeredCount,
  confirmedHash,
  onConfirm,
  onEnterSection,
  onGoToQuestion,
}: {
  assessmentId: string;
  sectionId: string;
  answeredCount: number;
  /** Hash stored when the team last confirmed the checkpoint. */
  confirmedHash?: string;
  onConfirm: (hash: string) => void;
  onEnterSection: () => void;
  onGoToQuestion: (qid: string) => void;
}) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error" }
    | { phase: "done"; check: Check; hash: string }
  >({ phase: "loading" });
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (answeredCount === 0) return;
    if (started.current && attempt === 0) return;
    started.current = true;
    const ctrl = new AbortController();
    setState({ phase: "loading" });
    fetch("/api/ai/section-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, sectionId }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) =>
        setState({ phase: "done", check: d.check as Check, hash: d.answersHash })
      )
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ phase: "error" });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, sectionId, answeredCount > 0, attempt]);

  if (answeredCount === 0) return null;

  if (state.phase === "loading") {
    return (
      <p className="mt-3 text-xs text-ink-muted">
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-spirit align-middle" />
        Checking this section for completeness…
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <p className="mt-3 text-xs text-ink-muted">
        Completeness check unavailable.{" "}
        <button
          type="button"
          onClick={() => setAttempt((a) => a + 1)}
          className="font-semibold text-spirit-dark underline underline-offset-2"
        >
          Try again
        </button>
      </p>
    );
  }

  const { check, hash } = state;
  const confirmed = confirmedHash === hash;
  const gaps = check.items.filter(
    (i) => i.status === "partial" || i.status === "not_answered"
  ).length;

  return (
    <details className="group mt-3 border border-washline bg-wash/60">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3.5 py-2.5">
        <span
          className={`text-sm font-semibold ${
            check.sufficient ? "text-status-green" : "text-status-amber"
          }`}
        >
          {check.sufficient
            ? "Completeness check: this section looks sufficiently complete"
            : `Completeness check: ${gaps} item${gaps === 1 ? "" : "s"} could use more detail`}
        </span>
        {confirmed && (
          <span className="text-xs font-semibold text-status-green">
            · Summary confirmed ✓
          </span>
        )}
        <span className="ml-auto inline-block text-xs text-spirit-dark transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="border-t border-washline px-3.5 pb-4 pt-3">
        <p className="max-w-measure text-sm leading-relaxed text-ink-soft">
          {check.summary}
        </p>

        {check.items.length > 0 && (
          <div className="mt-3 divide-y divide-washline border-y border-washline">
            {check.items.map((i) => (
              <button
                key={i.qid}
                type="button"
                onClick={() => onGoToQuestion(i.qid)}
                title="Go to this question"
                className="grid w-full gap-x-3 gap-y-0.5 py-2 text-left transition-colors hover:bg-wash sm:grid-cols-[minmax(8rem,13rem)_auto_1fr] sm:items-baseline"
              >
                <span className="text-xs font-semibold text-spirit-dark underline decoration-washline underline-offset-2">
                  {i.question}
                </span>
                <span
                  className={`justify-self-start whitespace-nowrap rounded-sm border px-1.5 py-px text-[11px] font-semibold ${STATUS_STYLE[i.status]}`}
                >
                  {STATUS_LABEL[i.status]}
                </span>
                <span className="text-xs text-ink-muted">{i.missing}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Click any question to go straight to it.
        </p>

        <div className="mt-4 border-l-2 border-heritage bg-white px-3 py-2.5">
          <p className="max-w-measure text-sm leading-relaxed text-ink">
            {check.checkpoint}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {confirmed ? (
              <span className="text-sm font-semibold text-status-green">
                Confirmed ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onConfirm(hash)}
                className="rounded-md bg-heritage px-4 py-1.5 text-sm font-semibold text-white hover:bg-heritage-deep"
              >
                Yes, this is accurate
              </button>
            )}
            <button
              type="button"
              onClick={onEnterSection}
              className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
            >
              I want to clarify something
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}
