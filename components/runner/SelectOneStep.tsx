"use client";

import type { SelectOneQuestion } from "@/lib/instrument";
import type { AnswerValue } from "@/lib/steps";

export function SelectOneStep({
  q,
  sectionTitle,
  position,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  q: SelectOneQuestion;
  sectionTitle: string;
  position: string;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const choice = value?.choice;
  const followupActive = q.followup && choice === q.followup.when;

  function set(patch: Partial<AnswerValue>) {
    onChange({ ...value, ...patch });
  }

  function pick(v: string) {
    const next: AnswerValue = { ...value, choice: v };
    // A change away from the follow-up trigger clears the follow-up answer.
    if (q.followup && v !== q.followup.when) {
      delete next.followupText;
      delete next.followupChoice;
      delete next.followupOther;
    }
    onChange(next);
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

      <div className="mt-5 grid gap-2" role="radiogroup" aria-label={q.prompt}>
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={choice === o.value}
            onClick={() => pick(o.value)}
            className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
              choice === o.value
                ? "border-heritage bg-wash font-semibold text-heritage"
                : "border-line text-ink-soft hover:border-spirit"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {followupActive && q.followup!.type === "text" && (
        <div className="mt-4 rounded-md border border-washline bg-wash p-4">
          <label
            htmlFor={`${q.id}-followup`}
            className="text-sm font-semibold text-ink"
          >
            {q.followup!.prompt}
          </label>
          <textarea
            id={`${q.id}-followup`}
            rows={3}
            value={value?.followupText ?? ""}
            onChange={(e) => set({ followupText: e.target.value })}
            placeholder="Type your answer…"
            className="mt-2 w-full resize-y rounded-md border border-line bg-white p-3 text-sm leading-relaxed focus:border-spirit focus:outline-none"
          />
        </div>
      )}

      {followupActive && q.followup!.type === "select_one" && (
        <div className="mt-4 rounded-md border border-washline bg-wash p-4">
          <p className="text-sm font-semibold text-ink">{q.followup!.prompt}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(q.followup!.options ?? []).map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={value?.followupChoice === o.value}
                onClick={() => set({ followupChoice: o.value })}
                className={`rounded-md border px-3.5 py-1.5 text-sm transition-colors ${
                  value?.followupChoice === o.value
                    ? "border-heritage bg-heritage font-semibold text-white"
                    : "border-line bg-white text-ink-soft hover:border-spirit"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {q.followup!.otherValue &&
            value?.followupChoice === q.followup!.otherValue && (
              <input
                type="text"
                value={value?.followupOther ?? ""}
                onChange={(e) => set({ followupOther: e.target.value })}
                placeholder="Please specify…"
                className="mt-2.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-spirit focus:outline-none"
              />
            )}
        </div>
      )}

      {q.optionalText && (
        <div className="mt-4">
          <label
            htmlFor={`${q.id}-optional`}
            className="text-sm text-ink-muted"
          >
            {q.optionalText}
          </label>
          <input
            id={`${q.id}-optional`}
            type="text"
            value={value?.followupText ?? ""}
            onChange={(e) => set({ followupText: e.target.value })}
            className="mt-1.5 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-spirit focus:outline-none"
          />
        </div>
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
