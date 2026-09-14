"use client";

import type { GoalsQuestion } from "@/lib/instrument";
import type { AnswerValue } from "@/lib/steps";
import { ExampleToggle } from "./TextQuestionStep";

type Goal = { metric: string; before: string; after: string };

const EMPTY: Goal = { metric: "", before: "", after: "" };

/**
 * Structured builder for the success-outcomes question: goals are added
 * one at a time, each pairing what would improve with a side-by-side
 * before (today) and after (with the solution).
 */
export function GoalsQuestionStep({
  q,
  sectionTitle,
  position,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  q: GoalsQuestion;
  sectionTitle: string;
  position: string;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const goals: Goal[] = value?.goals ?? [];
  const skipped = value?.idk === true;

  function merge(patch: Partial<AnswerValue>): AnswerValue {
    const base = { ...value };
    delete base.idk;
    return { ...base, ...patch };
  }

  const setGoals = (next: Goal[]) => onChange(merge({ goals: next }));
  const update = (i: number, field: keyof Goal, v: string) =>
    setGoals(goals.map((g, j) => (j === i ? { ...g, [field]: v } : g)));

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        {sectionTitle} · {position}
      </p>

      <h1 className="mt-3 text-2xl font-bold leading-snug text-heritage">
        {q.prompt}
      </h1>

      {q.helper && (
        <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink-muted">
          {q.helper}
        </p>
      )}

      {skipped ? (
        <div className="mt-5 rounded-lg border border-washline bg-wash p-4 text-sm text-ink-soft">
          Marked as{" "}
          <strong className="text-heritage">&ldquo;I don&apos;t know&rdquo;</strong>{" "}
          and will appear in your follow-up list.{" "}
          <button
            type="button"
            onClick={() => onChange({ goals: [] })}
            className="font-semibold text-spirit-dark underline underline-offset-2"
          >
            Answer instead
          </button>
        </div>
      ) : (
        <>
          {value?.text?.trim() && goals.length === 0 && (
            <p className="mt-4 rounded-md border border-washline bg-wash px-3 py-2 text-xs text-ink-soft">
              Written earlier: {value.text}
            </p>
          )}

          <div className="mt-5 space-y-4">
            {goals.map((g, i) => (
              <div key={i} className="border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-spirit-dark">
                    Goal {i + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => setGoals(goals.filter((_, j) => j !== i))}
                    className="text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-status-red"
                  >
                    Remove
                  </button>
                </div>

                <label className="mt-3 block text-xs font-semibold text-ink">
                  {q.labels.metric}
                  <input
                    type="text"
                    value={g.metric}
                    autoFocus={i === goals.length - 1 && g.metric === ""}
                    onChange={(e) => update(i, "metric", e.target.value)}
                    className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-normal focus:border-spirit focus:outline-none"
                  />
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-ink">
                    {q.labels.before}
                    <textarea
                      rows={3}
                      value={g.before}
                      onChange={(e) => update(i, "before", e.target.value)}
                      className="mt-1 w-full resize-y rounded-md border border-line px-3 py-2 text-sm font-normal leading-relaxed focus:border-spirit focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-ink">
                    {q.labels.after}
                    <textarea
                      rows={3}
                      value={g.after}
                      onChange={(e) => update(i, "after", e.target.value)}
                      className="mt-1 w-full resize-y rounded-md border border-line px-3 py-2 text-sm font-normal leading-relaxed focus:border-spirit focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setGoals([...goals, { ...EMPTY }])}
            className="mt-4 rounded-md border border-heritage px-4 py-2 text-sm font-semibold text-heritage transition-colors hover:bg-wash"
          >
            + {q.labels.add}
          </button>
        </>
      )}

      {q.examples && <ExampleToggle examples={q.examples} />}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
        >
          Continue
        </button>
        {!skipped && (
          <button
            type="button"
            onClick={() => {
              onChange({ idk: true });
              onContinue();
            }}
            className="ml-auto text-sm text-ink-muted underline underline-offset-2 hover:text-ink-soft"
          >
            Skip (I don&apos;t know)
          </button>
        )}
      </div>
    </section>
  );
}
