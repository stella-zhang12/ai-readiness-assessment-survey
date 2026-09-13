"use client";

import type { GridQuestion } from "@/lib/instrument";
import type { AnswerMap, AnswerValue } from "@/lib/steps";

const RAIL_STYLE: Record<string, string> = {
  green: "border-status-green bg-status-greenbg text-status-green",
  amber: "border-status-amber bg-status-amberbg text-status-amber",
  red: "border-status-red bg-status-redbg text-status-red",
  neutral: "border-heritage bg-wash text-heritage",
};

export function GridStep({
  q,
  sectionTitle,
  position,
  answers,
  onRate,
  onContinue,
  onBack,
}: {
  q: GridQuestion;
  sectionTitle: string;
  position: string;
  answers: AnswerMap;
  onRate: (statementId: string, v: AnswerValue) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  // Highest score first in the JSON; render lowest → highest left to right.
  const scored = [...q.scale.options].sort((a, b) => a.value - b.value);

  function railFor(id: string) {
    const v = answers[id];
    const segments = [
      ...scored.map((o) => ({
        key: `v${o.value}`,
        label: o.label,
        active: v?.rating === o.value,
        style: RAIL_STYLE[o.color],
        set: () => onRate(id, { ...answers[id], rating: o.value, idk: undefined, na: undefined } as AnswerValue),
      })),
      {
        key: "idk",
        label: q.scale.idk.label,
        active: v?.idk === true,
        style: RAIL_STYLE.neutral,
        set: () => onRate(id, { note: answers[id]?.note, idk: true } as AnswerValue),
      },
      {
        key: "na",
        label: q.scale.na.label,
        active: v?.na === true,
        style: RAIL_STYLE.neutral,
        set: () => onRate(id, { note: answers[id]?.note, na: true } as AnswerValue),
      },
    ];
    return (
      <div
        className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5"
        role="radiogroup"
      >
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            role="radio"
            aria-checked={seg.active}
            onClick={seg.set}
            className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
              seg.active
                ? seg.style
                : "border-line text-ink-muted hover:border-spirit hover:text-ink-soft"
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>
    );
  }

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

      <div className="mt-6 space-y-7">
        {q.statements.map((st) => {
          const v = answers[st.id];
          return (
            <div key={st.id} className="border-l-2 border-line pl-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {st.label}
              </p>
              <p className="mt-1 max-w-measure text-sm font-semibold leading-relaxed text-ink">
                {st.statement}
              </p>
              {railFor(st.id)}
              <input
                type="text"
                value={v?.note ?? ""}
                onChange={(e) =>
                  onRate(st.id, { ...v, note: e.target.value } as AnswerValue)
                }
                placeholder={q.explainLabel ?? "Space to explain (optional)"}
                className="mt-2 w-full rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft placeholder:text-ink-muted focus:border-spirit focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
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
      </div>
    </section>
  );
}
