"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiSummarySection } from "@/lib/instrument";

export function SummaryStep({
  section,
  assessmentId,
  summaryText,
  c1Rating,
  fallbackText,
  onSaveText,
  onRateC1,
  onContinue,
  onBack,
}: {
  section: AiSummarySection;
  assessmentId: string;
  summaryText: string | undefined;
  c1Rating: number | undefined;
  fallbackText: string;
  onSaveText: (text: string) => void;
  onRateC1: (v: number) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const generate = useCallback(
    async (isRetry: boolean) => {
      setGenerating(true);
      setFailed(false);
      try {
        const res = await fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId }),
        });
        if (!res.ok) throw new Error("failed");
        const { summary } = await res.json();
        onSaveText(summary);
      } catch {
        setFailed(true);
        // PRD §7.1: never block — offer an editable stitched template instead.
        if (!isRetry && !summaryText) onSaveText(fallbackText);
      } finally {
        setGenerating(false);
      }
    },
    [assessmentId, onSaveText, fallbackText, summaryText]
  );

  useEffect(() => {
    if (!summaryText && !started.current) {
      started.current = true;
      void generate(false);
    }
  }, [summaryText, generate]);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        Section C · {section.title}
      </p>
      <h1 className="mt-3 text-2xl font-bold leading-snug text-heritage">
        Did we understand your problem correctly?
      </h1>
      <p className="mt-2 max-w-measure text-sm text-ink-muted">
        {failed
          ? "The AI summary couldn't be generated just now — here's a starting point stitched from your answers. Edit it freely."
          : section.aiLabel + " Edit it until it's right — your edited version is what the readiness judgment uses."}
      </p>

      {generating ? (
        <div className="mt-6 rounded-xl border border-washline bg-wash p-6 text-sm text-ink-soft">
          Reading your Section A answers and drafting a summary…
        </div>
      ) : (
        <>
          <div className="relative mt-6">
            <textarea
              value={summaryText ?? ""}
              onChange={(e) => onSaveText(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-lg border border-line p-3.5 text-base leading-relaxed focus:border-spirit focus:outline-none"
            />
            {!failed && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-spirit px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                AI-generated
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => generate(true)}
            className="mt-2 text-xs font-semibold text-spirit-dark underline underline-offset-2"
          >
            Generate again
          </button>
        </>
      )}

      <div className="mt-7">
        <p className="text-sm font-semibold text-ink">
          {section.confirmation.prompt}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup">
          {[...section.confirmation.options]
            .sort((a, b) => b.value - a.value)
            .map((o) => {
              const selected = c1Rating === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onRateC1(o.value)}
                  className={`rounded-md border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-heritage bg-wash text-heritage"
                      : "border-line text-ink-soft hover:border-spirit"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
        </div>
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
          disabled={generating}
          className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep disabled:opacity-50"
        >
          Continue to ratings
        </button>
      </div>
    </section>
  );
}
