"use client";

import Link from "next/link";
import type { Instrument } from "@/lib/instrument";
import { isAnswered, type AnswerMap } from "@/lib/steps";

type SectionSummary = {
  id: string;
  label: string;
  total: number;
  unanswered: number;
  idk: number;
};

export function ReviewStep({
  instrument,
  answers,
  onJump,
  onBack,
}: {
  instrument: Instrument;
  answers: AnswerMap;
  onJump: (sectionId: string) => void;
  onBack: () => void;
}) {
  const summaries: SectionSummary[] = [];

  for (const s of instrument.sections) {
    if (s.type === "text") {
      const ids = s.questions.map((q) => q.id);
      summaries.push({
        id: s.id,
        label: s.subtitle ? `${s.title} — ${s.subtitle}` : s.title,
        total: ids.length,
        unanswered: ids.filter((id) => !isAnswered(answers[id])).length,
        idk: ids.filter((id) => answers[id]?.idk).length,
      });
    } else if (s.type === "likert") {
      const ids = s.items.map((i) => i.id);
      summaries.push({
        id: s.id,
        label: `${s.id} · ${s.title}`,
        total: ids.length,
        unanswered: ids.filter((id) => !isAnswered(answers[id])).length,
        idk: ids.filter((id) => answers[id]?.idk).length,
      });
    }
  }

  const totalGaps = summaries.reduce((n, s) => n + s.unanswered, 0);
  const totalIdk = summaries.reduce((n, s) => n + s.idk, 0);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        Review
      </p>
      <h1 className="mt-3 text-2xl font-bold text-heritage">
        Almost there — a quick check
      </h1>
      <p className="mt-2 max-w-measure text-sm text-ink-soft">
        {totalGaps === 0 && totalIdk === 0
          ? "Every question is answered. Nice work."
          : `You have ${totalGaps} unanswered and ${totalIdk} "don't know" ${
              totalGaps + totalIdk === 1 ? "answer" : "answers"
            }. That's fine — you can still finish. Jump back if your team wants to fill any in.`}
      </p>

      <ul className="mt-6 space-y-2">
        {summaries.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-3"
          >
            <span className="text-sm font-semibold text-ink">{s.label}</span>
            <span className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="tabular-nums">
                {s.total - s.unanswered}/{s.total} answered
                {s.idk > 0 && ` · ${s.idk} don't know`}
              </span>
              {(s.unanswered > 0 || s.idk > 0) && (
                <button
                  type="button"
                  onClick={() => onJump(s.id)}
                  className="font-semibold text-spirit-dark underline underline-offset-2"
                >
                  Go to section
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-xl border border-washline bg-wash p-5">
        <h2 className="font-bold text-heritage">Next: your readiness results</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          The AI-generated readiness table — a rating for each of the four
          elements with the reasoning behind it, plus a suggested follow-up
          list — is the next build step. Your answers are all saved and will
          feed straight into it.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
        >
          Back
        </button>
        <Link
          href="/dashboard"
          className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
