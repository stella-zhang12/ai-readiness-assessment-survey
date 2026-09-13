"use client";

import Link from "next/link";
import type { Instrument, SurveySection } from "@/lib/instrument";
import { surveyQuestionIds, surveySections } from "@/lib/instrument";
import { sectionProgress, type AnswerMap } from "@/lib/steps";
import { hashSectionAnswers } from "@/lib/ai/sectionCheck";
import { SectionCheck } from "./SectionCheck";

/**
 * The structured section summary page (the survey's home screen).
 * Lists the four sections with answered/total counts; each expands to show
 * the section's definition and an overview of its questions, and (for
 * signed-in teams) an AI completeness check of what has been entered so
 * far. Every question page links back here.
 */
export function SectionHub({
  instrument,
  title,
  answers,
  onEnterSection,
  assessmentId,
  guest = false,
  onConfirmCheck,
  onGoToQuestion,
}: {
  instrument: Instrument;
  title: string;
  answers: AnswerMap;
  onEnterSection: (sectionId: string) => void;
  assessmentId: string;
  guest?: boolean;
  onConfirmCheck: (sectionId: string, hash: string) => void;
  onGoToQuestion: (qid: string) => void;
}) {
  const sections = surveySections(instrument);
  const totals = sections.map((s) => sectionProgress(s, answers));
  const allDone =
    totals.length > 0 && totals.every((t) => t.answered === t.total);

  function questionCount(s: SurveySection): number {
    return sectionProgress(s, answers).total;
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        {instrument.title}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-heritage">
        {title}
      </h1>
      <div className="mt-6 grid gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-spirit-dark">
            1 · Complete the four sections
          </p>
          <p className="mt-1 text-sm leading-snug text-ink-soft">
            Work through Use Case, Data, Safety, and Country Context in any
            order.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-spirit-dark">
            2 · Pause and return anytime
          </p>
          <p className="mt-1 text-sm leading-snug text-ink-soft">
            Your progress is saved as you go, so you or your teammates can
            continue later.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-spirit-dark">
            3 · Review and close gaps
          </p>
          <p className="mt-1 text-sm leading-snug text-ink-soft">
            {guest
              ? "Progress counts below show which sections are complete and which still need answers."
              : "Each time you return, you'll see a short summary of what is complete and what information is still missing in each section."}
          </p>
        </div>
      </div>

      {allDone && (
        <p className="mt-4 border-l-2 border-status-green bg-status-greenbg px-3 py-2 text-sm font-semibold text-status-green">
          All sections complete. You can still revisit and edit any answer.
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-muted">
        Progress by section
      </h2>
      <div className="mt-2 divide-y divide-line border-y border-line">
        {sections.map((s, i) => {
          const { answered, total } = totals[i];
          const started = answered > 0;
          const done = answered === total;
          return (
            <div key={s.id} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-heritage">
                    {i + 1}. {s.title}
                  </h2>
                  <p
                    className={`mt-0.5 text-xs tabular-nums ${
                      done
                        ? "font-semibold text-status-green"
                        : "text-ink-muted"
                    }`}
                  >
                    {answered} of {total} questions answered
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEnterSection(s.id)}
                  className={`shrink-0 rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
                    done
                      ? "border border-heritage text-heritage hover:bg-wash"
                      : "bg-heritage text-white hover:bg-heritage-deep"
                  }`}
                >
                  {done ? "Review" : started ? "Continue" : "Start"}
                </button>
              </div>

              <details className="group mt-2">
                <summary className="cursor-pointer list-none text-sm font-semibold text-spirit-dark">
                  <span className="underline underline-offset-2">
                    About this section
                  </span>{" "}
                  <span className="inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <div className="mt-2 max-w-measure">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {s.purpose}
                  </p>
                  {s.intro && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {s.intro}
                    </p>
                  )}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    The questions ({questionCount(s)})
                  </p>
                  <ol className="mt-1.5 space-y-1">
                    {s.questions.map((q) => (
                      <li key={q.id} className="text-sm text-ink-soft">
                        · {q.prompt}
                        {q.kind === "grid" && (
                          <span className="text-ink-muted">
                            {" "}
                            ({q.statements.length} statements)
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>

              {!guest && (
                <SectionCheck
                  assessmentId={assessmentId}
                  sectionId={s.id}
                  answeredCount={answered}
                  answersHash={hashSectionAnswers(
                    surveyQuestionIds(s),
                    answers
                  )}
                  confirmedHash={answers[`${s.id}.check_confirmed`]?.choice}
                  onConfirm={(hash) => onConfirmCheck(s.id, hash)}
                  onEnterSection={() => onEnterSection(s.id)}
                  onGoToQuestion={onGoToQuestion}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 border-l-2 border-heritage bg-wash p-5">
        <h2 className="font-bold text-heritage">Solution scoping report</h2>
        <p className="mt-1 max-w-measure text-sm leading-relaxed text-ink-soft">
          When you are ready, your answers are turned into a scoping report:
          whether this use case fits an AI, hybrid, or simpler non-AI
          solution, realistic options, a readiness assessment across the four
          areas, and prioritized next steps.
        </p>
        {guest ? (
          <p className="mt-3 text-sm font-semibold text-ink-muted">
            The report needs an account, so it is not available in guest mode.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/a/${assessmentId}/report`}
              className="rounded-md bg-heritage px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep"
            >
              {allDone ? "Generate the report" : "Generate report anyway"}
            </Link>
            {!allDone && (
              <span className="text-xs text-ink-muted">
                Some sections are incomplete; the report will flag what is
                missing.
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
