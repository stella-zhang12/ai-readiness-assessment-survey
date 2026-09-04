"use client";

import type { LikertItem, LikertSection, ScaleOption } from "@/lib/instrument";
import { isAnswered, type AnswerMap, type AnswerValue } from "@/lib/steps";

type Scale = { options: ScaleOption[]; idk: { label: string; short: string } };

function Rail({
  item,
  scale,
  value,
  onRate,
}: {
  item: LikertItem;
  scale: Scale;
  value: AnswerValue | undefined;
  onRate: (v: AnswerValue) => void;
}) {
  // Render worst -> best (Absent, Partially, Fully) then Don't know (+ N/A).
  const ordered = [...scale.options].sort((a, b) => a.value - b.value);

  const selectedClasses: Record<string, string> = {
    red: "bg-status-redbg text-status-red border-status-red",
    amber: "bg-status-amberbg text-status-amber border-status-amber",
    green: "bg-status-greenbg text-status-green border-status-green",
  };

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="radiogroup"
      aria-label={item.statement}
    >
      {ordered.map((o) => {
        const selected = value?.rating === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={o.label}
            onClick={() => onRate({ rating: o.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selected
                ? selectedClasses[o.color]
                : "border-line bg-white text-ink-soft hover:border-spirit"
            }`}
          >
            {o.short}
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={value?.idk === true}
        onClick={() => onRate({ idk: true })}
        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
          value?.idk
            ? "border-spirit-dark bg-wash text-spirit-dark"
            : "border-line bg-white text-ink-muted hover:border-spirit"
        }`}
      >
        {scale.idk.short}
      </button>
      {item.na && (
        <button
          type="button"
          role="radio"
          aria-checked={value?.na === true}
          title={item.na.helper}
          onClick={() => onRate({ na: true })}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value?.na
              ? "border-ink-muted bg-line/40 text-ink-soft"
              : "border-line bg-white text-ink-muted hover:border-spirit"
          }`}
        >
          N/A
        </button>
      )}
    </div>
  );
}

export function LikertSectionStep({
  section,
  scale,
  answers,
  onRate,
  onContinue,
  onBack,
}: {
  section: LikertSection;
  scale: Scale;
  answers: AnswerMap;
  onRate: (itemId: string, v: AnswerValue) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const answered = section.items.filter((i) => isAnswered(answers[i.id])).length;

  // Group: each parent item followed by its children.
  const parents = section.items.filter((i) => i.parent === null);
  const childrenOf = (id: string) =>
    section.items.filter((i) => i.parent === id);

  return (
    <section>
      <div className="sticky top-1 z-[5] -mx-2 mb-2 flex items-baseline justify-between rounded-b-lg bg-white/95 px-2 py-2 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
          {section.id} · {section.title}
        </p>
        <p className="text-xs tabular-nums text-ink-muted">
          {answered} of {section.items.length} rated
        </p>
      </div>

      <h1 className="text-2xl font-bold leading-snug text-heritage">
        {section.question}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Rate each statement for your use case. If your team doesn&apos;t know,
        say so — that&apos;s useful information too.
      </p>

      <div className="mt-6 space-y-6">
        {parents.map((parent) => {
          const kids = childrenOf(parent.id);
          return (
            <div
              key={parent.id}
              className="rounded-xl border border-line p-4 sm:p-5"
            >
              <p className="font-semibold leading-snug text-ink">
                {parent.statement}
              </p>
              {parent.guidance && (
                <details className="group mt-1.5">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-spirit-dark">
                    Why we ask{" "}
                    <span className="inline-block transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <p className="mt-1.5 max-w-measure text-sm leading-relaxed text-ink-muted">
                    {parent.guidance}
                  </p>
                </details>
              )}
              <div className="mt-3">
                <Rail
                  item={parent}
                  scale={scale}
                  value={answers[parent.id]}
                  onRate={(v) => onRate(parent.id, v)}
                />
              </div>

              {kids.length > 0 && (
                <ul className="mt-4 space-y-4 border-l-2 border-washline pl-4">
                  {kids.map((kid) => (
                    <li key={kid.id}>
                      <p className="text-sm leading-snug text-ink-soft">
                        {kid.statement}
                      </p>
                      {kid.na?.helper && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {kid.na.helper}
                        </p>
                      )}
                      <div className="mt-2">
                        <Rail
                          item={kid}
                          scale={scale}
                          value={answers[kid.id]}
                          onRate={(v) => onRate(kid.id, v)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
        >
          Continue
        </button>
        {answered < section.items.length && (
          <span className="text-xs text-ink-muted">
            You can continue with unrated statements — they&apos;ll show on the
            review screen.
          </span>
        )}
      </div>
    </section>
  );
}
