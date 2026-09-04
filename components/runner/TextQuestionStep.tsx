"use client";

import { useEffect, useRef, useState } from "react";
import type { AnswerValue, Step } from "@/lib/steps";
import type { ExampleVariant } from "@/lib/instrument";

type QuestionStep = Extract<Step, { kind: "question" }>;

function ExampleToggle({
  examples,
}: {
  examples: { crvs?: ExampleVariant; healthcare?: ExampleVariant };
}) {
  const tabs = [
    examples.healthcare ? ("healthcare" as const) : null,
    examples.crvs ? ("crvs" as const) : null,
  ].filter(Boolean) as ("healthcare" | "crvs")[];
  const [active, setActive] = useState<"healthcare" | "crvs">(tabs[0]);
  if (tabs.length === 0) return null;
  const current = examples[active];

  return (
    <details className="group mt-4 rounded-lg border border-washline bg-wash">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-spirit-dark">
        Show me an example{" "}
        <span className="inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-washline px-4 pb-4 pt-3">
        {tabs.length > 1 && (
          <div className="mb-3 flex gap-1.5" role="tablist">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active === t}
                onClick={() => setActive(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active === t
                    ? "bg-heritage text-white"
                    : "border border-washline bg-white text-ink-soft"
                }`}
              >
                {t === "healthcare" ? "Healthcare" : "CRVS"}
              </button>
            ))}
          </div>
        )}
        <div className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {current?.text}
        </div>
      </div>
    </details>
  );
}

export function TextQuestionStep({
  step,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  step: QuestionStep;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const { q } = step;
  const text = value?.text ?? "";
  const skipped = value?.idk === true;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [q.id]);

  function insertChip(label: string) {
    const heading = `${label}: `;
    const next = text.length === 0 ? heading : `${text.trimEnd()}\n\n${heading}`;
    onChange({ text: next });
    ref.current?.focus();
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        {step.sectionTitle} · {step.indexInSection + 1} of {step.sectionSize}
      </p>

      <h1 className="mt-3 text-2xl font-bold leading-snug text-heritage">
        {q.prompt}
      </h1>

      {(q.helper ?? q.guidance) && (
        <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink-muted">
          {q.helper ?? q.guidance}
        </p>
      )}

      {q.openerNudge && (
        <p className="mt-2 text-sm font-semibold text-heritage">{q.openerNudge}</p>
      )}

      {q.chips && q.chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {q.chips.map((c) => (
            <button
              key={c.label}
              type="button"
              title={c.hint}
              onClick={() => insertChip(c.label)}
              disabled={text.includes(`${c.label}:`)}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-spirit hover:text-spirit-dark disabled:border-dashed disabled:text-ink-muted"
            >
              + {c.label}
            </button>
          ))}
        </div>
      )}

      {skipped ? (
        <div className="mt-5 rounded-lg border border-washline bg-wash p-4 text-sm text-ink-soft">
          Marked as{" "}
          <strong className="text-heritage">&ldquo;I don&apos;t know&rdquo;</strong>{" "}
          — it will show up in your follow-up list.{" "}
          <button
            type="button"
            onClick={() => onChange({ text: "" })}
            className="font-semibold text-spirit-dark underline underline-offset-2"
          >
            Answer instead
          </button>
        </div>
      ) : (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onChange({ text: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onContinue();
            }
          }}
          rows={5}
          placeholder="Type your answer…"
          className="mt-5 w-full resize-y rounded-lg border border-line p-3.5 text-base leading-relaxed focus:border-spirit focus:outline-none"
        />
      )}

      {q.exampleChips && q.exampleChips.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-ink-muted">
            Example use cases:
          </p>
          <ul className="space-y-0.5 text-sm text-ink-soft">
            {q.exampleChips.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
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
        <span className="text-xs text-ink-muted">⌘/Ctrl + Enter</span>
        {!skipped && (
          <button
            type="button"
            onClick={() => {
              onChange({ idk: true });
              onContinue();
            }}
            className="ml-auto text-sm text-ink-muted underline underline-offset-2 hover:text-ink-soft"
          >
            Skip — I don&apos;t know
          </button>
        )}
      </div>
    </section>
  );
}
