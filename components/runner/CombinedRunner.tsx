"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { combined, surveySections } from "@/lib/instrument";
import {
  buildCombinedSteps,
  isAnswered,
  sectionProgress,
  type AnswerMap,
  type AnswerValue,
} from "@/lib/steps";
import { SectionHub } from "./SectionHub";
import { TextQuestionStep } from "./TextQuestionStep";
import { SelectOneStep } from "./SelectOneStep";
import { SelectManyStep } from "./SelectManyStep";
import { GridStep } from "./GridStep";

const HUB_KEY = "hub";

type Props = {
  assessmentId: string;
  title: string;
  userId: string;
  initialAnswers: AnswerMap;
  initialStepKey: string | null;
  /** Guest mode: nothing is written to the database (see /try). */
  guest?: boolean;
};

/**
 * Runner for the combined (single-version) instrument. Navigation is
 * hub-centric: a section summary page lists the four sections, each section
 * runs one question at a time, and finishing (or backing out of) a section
 * returns to the hub. AI summary and results are paused by design.
 */
export function CombinedRunner({
  assessmentId,
  title,
  userId,
  initialAnswers,
  initialStepKey,
  guest = false,
}: Props) {
  const steps = useMemo(() => buildCombinedSteps(combined), []);
  const sections = useMemo(() => surveySections(combined), []);

  const initialIdx = useMemo(() => {
    if (!initialStepKey || initialStepKey === HUB_KEY) return null;
    const i = steps.findIndex((s) => s.key === initialStepKey);
    return i >= 0 ? i : null;
  }, [steps, initialStepKey]);

  const [idx, setIdx] = useState<number | null>(initialIdx); // null = hub
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const supabase = useMemo(() => createClient(), []);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stepKeyRef = useRef(initialIdx === null ? HUB_KEY : steps[initialIdx].key);

  // ------------------------------------------------------------------ saving

  const persist = useCallback(
    async (questionId: string, value: AnswerValue) => {
      if (guest) return;
      setSaveState("saving");
      const { error } = await supabase.from("responses").upsert(
        {
          assessment_id: assessmentId,
          question_id: questionId,
          value,
          updated_by: userId,
        },
        { onConflict: "assessment_id,question_id" }
      );
      setSaveState(error ? "error" : "saved");
    },
    [supabase, assessmentId, userId, guest]
  );

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const storeGuest = useCallback(
    (stepKey: string) => {
      if (!guest) return;
      try {
        sessionStorage.setItem(
          "guest:combined",
          JSON.stringify({ answers: answersRef.current, stepKey })
        );
      } catch {}
    },
    [guest]
  );

  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue, debounceMs = 700) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (guest) {
        answersRef.current = { ...answersRef.current, [questionId]: value };
        storeGuest(stepKeyRef.current);
        return;
      }
      const existing = timers.current.get(questionId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        questionId,
        setTimeout(() => persist(questionId, value), debounceMs)
      );
    },
    [persist, guest, storeGuest]
  );

  // ------------------------------------------------------- timing (PRD §10)

  const activeSeconds = useRef(0);
  const currentSection = useRef(
    initialIdx === null ? HUB_KEY : steps[initialIdx].sectionId
  );

  const flushTiming = useCallback(
    (sectionId: string) => {
      const seconds = Math.round(activeSeconds.current);
      activeSeconds.current = 0;
      if (seconds < 3) return;
      void supabase.from("timing_events").insert({
        assessment_id: assessmentId,
        user_id: userId,
        section_id: sectionId,
        seconds_active: Math.min(seconds, 3600),
      });
    },
    [supabase, assessmentId, userId]
  );

  useEffect(() => {
    if (guest) return;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") activeSeconds.current += 1;
    }, 1000);
    const periodic = setInterval(() => {
      if (activeSeconds.current >= 30) flushTiming(currentSection.current);
    }, 30_000);
    const onHide = () => {
      if (document.visibilityState === "hidden")
        flushTiming(currentSection.current);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      clearInterval(periodic);
      document.removeEventListener("visibilitychange", onHide);
      flushTiming(currentSection.current);
    };
  }, [flushTiming, guest]);

  // -------------------------------------------------------------- navigation

  /** Write any debounced answers immediately, so the completeness check
   * (which reads the database) never grades a stale answer set. */
  const flushPendingSaves = useCallback(() => {
    if (guest) return;
    for (const [questionId, timer] of timers.current) {
      clearTimeout(timer);
      const value = answersRef.current[questionId];
      if (value !== undefined) void persist(questionId, value);
    }
    timers.current.clear();
  }, [guest, persist]);

  const setLocation = useCallback(
    (nextIdx: number | null) => {
      flushPendingSaves();
      const key = nextIdx === null ? HUB_KEY : steps[nextIdx].key;
      const nextSection = nextIdx === null ? HUB_KEY : steps[nextIdx].sectionId;
      if (nextSection !== currentSection.current) {
        flushTiming(currentSection.current);
        currentSection.current = nextSection;
      }
      setIdx(nextIdx);
      stepKeyRef.current = key;
      window.scrollTo({ top: 0 });
      if (guest) {
        storeGuest(key);
        return;
      }
      void supabase
        .from("assessments")
        .update({ current_step: key, updated_by: userId })
        .eq("id", assessmentId);
    },
    [
      steps,
      supabase,
      assessmentId,
      userId,
      flushTiming,
      guest,
      storeGuest,
      flushPendingSaves,
    ]
  );

  const goToQuestion = useCallback(
    (qid: string) => {
      const i = steps.findIndex(
        (s) =>
          s.q.id === qid ||
          (s.q.kind === "grid" && s.q.statements.some((st) => st.id === qid))
      );
      if (i >= 0) setLocation(i);
    },
    [steps, setLocation]
  );

  const enterSection = useCallback(
    (sectionId: string) => {
      const inSection = steps
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.sectionId === sectionId);
      if (inSection.length === 0) return;
      const firstUnanswered = inSection.find(({ s }) => {
        if (s.q.kind === "grid")
          return s.q.statements.some((st) => !isAnswered(answers[st.id]));
        return !isAnswered(answers[s.q.id]);
      });
      setLocation((firstUnanswered ?? inSection[0]).i);
    },
    [steps, answers, setLocation]
  );

  const step = idx === null ? null : steps[idx];

  const next = useCallback(() => {
    if (idx === null || !step) return;
    const last = step.indexInSection === step.sectionSize - 1;
    setLocation(last ? null : idx + 1);
  }, [idx, step, setLocation]);

  const back = useCallback(() => {
    if (idx === null || !step) return;
    setLocation(step.indexInSection === 0 ? null : idx - 1);
  }, [idx, step, setLocation]);

  // ---------------------------------------------------------------- progress

  let progress = 0;
  if (step) {
    progress = ((step.indexInSection + 1) / step.sectionSize) * 100;
  } else {
    const totals = sections.map((s) => sectionProgress(s, answers));
    const answered = totals.reduce((a, t) => a + t.answered, 0);
    const total = totals.reduce((a, t) => a + t.total, 0);
    progress = total > 0 ? (answered / total) * 100 : 0;
  }

  const position = step
    ? `${step.indexInSection + 1} of ${step.sectionSize}`
    : "";

  // ------------------------------------------------------------------ render

  return (
    <div className="min-h-screen">
      <div className="no-print fixed inset-x-0 top-0 z-10 h-1.5 bg-line">
        <div
          className="h-full rounded-r-full bg-heritage transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="no-print fixed right-4 top-3 z-10 flex items-center gap-4 text-xs text-ink-muted">
        {guest ? (
          <>
            <span className="rounded-full border border-status-amber bg-status-amberbg px-2.5 py-0.5 font-semibold text-status-amber">
              Guest: nothing is saved
            </span>
            <Link
              href="/signup"
              className="font-semibold text-spirit-dark underline underline-offset-2"
            >
              Sign up to save
            </Link>
          </>
        ) : (
          <>
            <span aria-live="polite">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved ✓"}
              {saveState === "error" && (
                <span className="font-semibold text-status-red">
                  Couldn&apos;t save. Check your connection
                </span>
              )}
            </span>
            <Link
              href="/dashboard"
              className="font-semibold text-spirit-dark underline underline-offset-2"
            >
              Save &amp; finish later
            </Link>
          </>
        )}
      </div>

      <div className="no-print fixed left-4 top-3 z-10 flex max-w-[45%] items-center gap-2 text-xs text-ink-muted">
        {step ? (
          <button
            type="button"
            onClick={() => setLocation(null)}
            className="shrink-0 font-semibold text-spirit-dark underline-offset-2 hover:underline"
          >
            ← All sections
          </button>
        ) : (
          <Link
            href={guest ? "/" : "/dashboard"}
            className="shrink-0 font-semibold text-spirit-dark underline-offset-2 hover:underline"
          >
            ← {guest ? "Home" : "Dashboard"}
          </Link>
        )}
        <span aria-hidden="true">·</span>
        <span className="truncate">{title}</span>
      </div>

      <main
        className={`mx-auto w-full max-w-2xl px-6 ${
          step && step.q.kind !== "grid"
            ? "flex min-h-[88vh] flex-col justify-center py-20"
            : "pb-24 pt-20"
        }`}
      >
        {!step && (
          <SectionHub
            instrument={combined}
            title={title}
            answers={answers}
            onEnterSection={enterSection}
            assessmentId={assessmentId}
            guest={guest}
            onConfirmCheck={(sectionId, hash) =>
              setAnswer(`${sectionId}.check_confirmed`, { choice: hash }, 150)
            }
            onGoToQuestion={goToQuestion}
          />
        )}

        {step && step.q.kind === "text" && (
          <TextQuestionStep
            key={step.key}
            step={{
              kind: "question",
              key: step.key,
              sectionId: step.sectionId,
              sectionTitle: step.sectionTitle,
              q: step.q,
              indexInSection: step.indexInSection,
              sectionSize: step.sectionSize,
            }}
            value={answers[step.q.id]}
            onChange={(v) => setAnswer(step.q.id, v)}
            onContinue={next}
            onBack={back}
          />
        )}

        {step && step.q.kind === "select_one" && (
          <SelectOneStep
            key={step.key}
            q={step.q}
            sectionTitle={step.sectionTitle}
            position={position}
            value={answers[step.q.id]}
            onChange={(v) => setAnswer(step.q.id, v, 300)}
            onContinue={next}
            onBack={back}
          />
        )}

        {step && step.q.kind === "select_many" && (
          <SelectManyStep
            key={step.key}
            q={step.q}
            sectionTitle={step.sectionTitle}
            position={position}
            value={answers[step.q.id]}
            onChange={(v) => setAnswer(step.q.id, v, 300)}
            onContinue={next}
            onBack={back}
          />
        )}

        {step && step.q.kind === "grid" && (
          <GridStep
            key={step.key}
            q={step.q}
            sectionTitle={step.sectionTitle}
            position={position}
            answers={answers}
            onRate={(id, v) => setAnswer(id, v, 300)}
            onContinue={next}
            onBack={back}
          />
        )}
      </main>
    </div>
  );
}
