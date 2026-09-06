"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Instrument } from "@/lib/instrument";
import { isAnswered, type AnswerMap } from "@/lib/steps";

type Todo = { qid: string | null; action: string; why: string };

export function TranscriptStep({
  instrument,
  title,
  answers,
  assessmentId,
  userId,
  onBack,
  guest = false,
}: {
  instrument: Instrument;
  title: string;
  answers: AnswerMap;
  assessmentId: string;
  userId: string;
  onBack: () => void;
  guest?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [completed, setCompleted] = useState(false);
  const [aiTodos, setAiTodos] = useState<Todo[] | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (guest || fetched.current) return;
    fetched.current = true;
    fetch("/api/ai/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.followups?.todos?.length && !d.followups.fallback) {
          setAiTodos(d.followups.todos);
        }
      })
      .catch(() => {});
  }, [assessmentId, guest]);

  async function markComplete() {
    await supabase
      .from("assessments")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", assessmentId);
    setCompleted(true);
  }

  const sections = instrument.sections.filter((s) => s.type === "text");
  const answeredCount = sections
    .flatMap((s) => (s.type === "text" ? s.questions : []))
    .filter((q) => isAnswered(answers[q.id]) && !answers[q.id]?.idk).length;
  const idkList = sections
    .flatMap((s) => (s.type === "text" ? s.questions : []))
    .filter((q) => answers[q.id]?.idk);

  return (
    <section>
      <div className="no-print">
        <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
          Brainstorm complete
        </p>
        <h1 className="mt-3 text-2xl font-bold text-heritage">
          Here&apos;s everything your team wrote
        </h1>
        <p className="mt-2 max-w-measure text-sm text-ink-soft">
          {answeredCount} of 17 questions answered. Print it, share it, or come
          back and edit — everything stays saved.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-heritage px-5 py-2 text-sm font-semibold text-white hover:bg-heritage-deep"
          >
            Print / Save as PDF
          </button>
          {!guest &&
            (!completed ? (
              <button
                type="button"
                onClick={markComplete}
                className="rounded-md border border-heritage px-5 py-2 text-sm font-semibold text-heritage hover:bg-wash"
              >
                Mark complete
              </button>
            ) : (
              <span className="text-sm font-semibold text-status-green">
                Marked complete ✓
              </span>
            ))}
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
          >
            Back
          </button>
          <Link
            href={guest ? "/" : "/dashboard"}
            className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
          >
            {guest ? "Home" : "Dashboard"}
          </Link>
        </div>
        {guest && (
          <p className="mt-3 text-xs font-semibold text-status-amber">
            Guest mode: this transcript disappears when the tab closes — print
            it now if you want to keep it.
          </p>
        )}
      </div>

      {/* Printable transcript */}
      <div className="mt-8 space-y-8 print:mt-0">
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm">
            AI Use Case Scoping &amp; Readiness Assessment (Beta) — Brainstorm
            transcript
          </p>
        </div>

        {sections.map(
          (s) =>
            s.type === "text" && (
              <div key={s.id}>
                <h2 className="border-b border-line pb-1 text-lg font-bold text-heritage">
                  {s.title}
                </h2>
                <dl className="mt-3 space-y-4">
                  {s.questions.map((q) => {
                    const v = answers[q.id];
                    return (
                      <div key={q.id}>
                        <dt className="text-sm font-semibold text-ink">
                          {q.prompt}
                        </dt>
                        <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                          {v?.idk
                            ? "— marked “I don't know”"
                            : v?.text?.trim() || "— not answered"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )
        )}

        {aiTodos ? (
          <div>
            <h2 className="border-b border-line pb-1 text-lg font-bold text-heritage">
              Suggested next steps{" "}
              <span className="align-middle text-[10px] font-bold uppercase tracking-wider text-spirit-dark">
                AI-generated
              </span>
            </h2>
            <ol className="mt-3 space-y-2">
              {aiTodos.map((t, i) => (
                <li key={i} className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{t.action}</span>{" "}
                  <span className="text-ink-muted">— {t.why}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          idkList.length > 0 && (
            <div>
              <h2 className="border-b border-line pb-1 text-lg font-bold text-heritage">
                To find out
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {idkList.map((q) => (
                  <li key={q.id}>{q.prompt}</li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </section>
  );
}
