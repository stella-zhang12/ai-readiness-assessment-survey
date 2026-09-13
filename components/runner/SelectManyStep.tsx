"use client";

import type { SelectManyQuestion } from "@/lib/instrument";
import type { AnswerValue } from "@/lib/steps";

export function SelectManyStep({
  q,
  sectionTitle,
  position,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  q: SelectManyQuestion;
  sectionTitle: string;
  position: string;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const chosen = value?.choices ?? [];

  function toggle(v: string) {
    const exclusive = q.exclusive ?? [];
    let next: string[];
    if (chosen.includes(v)) {
      next = chosen.filter((c) => c !== v);
    } else if (exclusive.includes(v)) {
      next = [v]; // "Not sure" stands alone
    } else {
      next = [...chosen.filter((c) => !exclusive.includes(c)), v];
    }
    const patch: AnswerValue = { ...value, choices: next };
    if (q.otherValue && !next.includes(q.otherValue)) delete patch.other;
    onChange(patch);
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

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => {
          const active = chosen.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.value)}
              className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                active
                  ? "border-heritage bg-wash font-semibold text-heritage"
                  : "border-line text-ink-soft hover:border-spirit"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mr-2 inline-block h-3.5 w-3.5 rounded-sm border align-[-1px] ${
                  active ? "border-heritage bg-heritage" : "border-line"
                }`}
              />
              {o.label}
            </button>
          );
        })}
      </div>

      {q.otherValue && chosen.includes(q.otherValue) && (
        <input
          type="text"
          value={value?.other ?? ""}
          onChange={(e) => onChange({ ...value, other: e.target.value })}
          placeholder="Please specify…"
          className="mt-3 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-spirit focus:outline-none"
        />
      )}

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
      </div>
    </section>
  );
}
