"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInstrument } from "@/lib/instrument";
import {
  buildSteps,
  isAnswered,
  stepIndexForKey,
  stepSectionId,
  type AnswerMap,
  type AnswerValue,
} from "@/lib/steps";
import { TextQuestionStep } from "./TextQuestionStep";
import { LikertSectionStep } from "./LikertSectionStep";
import { ReviewStep } from "./ReviewStep";
import { TranscriptStep } from "./TranscriptStep";

type Props = {
  assessmentId: string;
  version: "brainstorm" | "diagnostic";
  title: string;
  userId: string;
  initialAnswers: AnswerMap;
  initialStepKey: string | null;
};

export function AssessmentRunner({
  assessmentId,
  version,
  title,
  userId,
  initialAnswers,
  initialStepKey,
}: Props) {
  const instrument = useMemo(() => getInstrument(version), [version]);
  const steps = useMemo(() => buildSteps(instrument), [instrument]);

  const [idx, setIdx] = useState(() => stepIndexForKey(steps, initialStepKey));
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const supabase = useMemo(() => createClient(), []);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ------------------------------------------------------------------ saving

  const persist = useCallback(
    async (questionId: string, value: AnswerValue) => {
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
    [supabase, assessmentId, userId]
  );

  /** Update local state immediately; write to the database debounced. */
  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue, debounceMs = 700) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      const existing = timers.current.get(questionId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        questionId,
        setTimeout(() => persist(questionId, value), debounceMs)
      );
    },
    [persist]
  );

  // ------------------------------------------------------- timing (PRD §10)

  const activeSeconds = useRef(0);
  const currentSection = useRef(stepSectionId(steps[idx]));

  const flushTiming = useCallback(
    (sectionId: string) => {
      const seconds = Math.round(activeSeconds.current);
      activeSeconds.current = 0;
      if (seconds < 3) return; // ignore noise
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
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") activeSeconds.current += 1;
    }, 1000);
    const periodic = setInterval(() => {
      if (activeSeconds.current >= 30) flushTiming(currentSection.current);
    }, 30_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flushTiming(currentSection.current);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      clearInterval(periodic);
      document.removeEventListener("visibilitychange", onHide);
      // component unmount = leaving the assessment
      flushTiming(currentSection.current);
    };
  }, [flushTiming]);

  // -------------------------------------------------------------- navigation

  const goTo = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, nextIdx));
      const nextSection = stepSectionId(steps[clamped]);
      if (nextSection !== currentSection.current) {
        flushTiming(currentSection.current);
        currentSection.current = nextSection;
      }
      setIdx(clamped);
      window.scrollTo({ top: 0 });
      void supabase
        .from("assessments")
        .update({ current_step: steps[clamped].key, updated_by: userId })
        .eq("id", assessmentId);
    },
    [steps, supabase, assessmentId, userId, flushTiming]
  );

  const jumpToSection = useCallback(
    (sectionId: string) => {
      const target = steps.findIndex((s) => stepSectionId(s) === sectionId);
      if (target >= 0) goTo(target);
    },
    [steps, goTo]
  );

  const step = steps[idx];
  const progress = ((idx + 1) / steps.length) * 100;

  // ---------------------------------------------------------------- render

  return (
    <div className="min-h-screen">
      <div className="no-print fixed inset-x-0 top-0 z-10 h-1 bg-line">
        <div
          className="h-full bg-heritage transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="no-print fixed right-4 top-3 z-10 flex items-center gap-4 text-xs text-ink-muted">
        <span aria-live="polite">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved ✓"}
          {saveState === "error" && (
            <span className="font-semibold text-status-red">
              Couldn&apos;t save — check your connection
            </span>
          )}
        </span>
        <Link
          href="/dashboard"
          className="font-semibold text-spirit-dark underline underline-offset-2"
        >
          Save &amp; finish later
        </Link>
      </div>

      <div className="no-print fixed left-4 top-3 z-10 max-w-[40%] truncate text-xs text-ink-muted">
        {title}
      </div>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-20">
        {step.kind === "question" && (
          <TextQuestionStep
            key={step.key}
            step={step}
            value={answers[step.q.id]}
            onChange={(v) => setAnswer(step.q.id, v)}
            onContinue={() => goTo(idx + 1)}
            onBack={idx > 0 ? () => goTo(idx - 1) : undefined}
          />
        )}

        {step.kind === "milestone" && (
          <section className="py-16 text-center">
            <p className="text-5xl" aria-hidden="true">
              ✓
            </p>
            <h1 className="mt-5 text-2xl font-bold text-heritage">
              {step.doneTitle} — done
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-ink-soft">
              Next up: {step.nextTitle}. Everything so far is saved.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goTo(idx - 1)}
                className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goTo(idx + 1)}
                className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step.kind === "summary_placeholder" && (
          <section className="py-16 text-center">
            <h1 className="text-2xl font-bold text-heritage">
              Your AI problem summary will appear here
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              In the finished tool, this screen shows a short AI-written
              summary of your Section A answers for you to confirm or edit.
              The AI features are the next build step — continue to the
              readiness ratings for now.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goTo(idx - 1)}
                className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goTo(idx + 1)}
                className="rounded-md bg-heritage px-6 py-2.5 font-semibold text-white hover:bg-heritage-deep"
              >
                Continue to ratings
              </button>
            </div>
          </section>
        )}

        {step.kind === "likert" && (
          <LikertSectionStep
            key={step.key}
            section={step.section}
            scale={instrument.scale!}
            answers={answers}
            onRate={(itemId, v) => setAnswer(itemId, v, 150)}
            onContinue={() => goTo(idx + 1)}
            onBack={() => goTo(idx - 1)}
          />
        )}

        {step.kind === "review" && (
          <ReviewStep
            instrument={instrument}
            answers={answers}
            onJump={jumpToSection}
            onBack={() => goTo(idx - 1)}
          />
        )}

        {step.kind === "transcript" && (
          <TranscriptStep
            instrument={instrument}
            title={title}
            answers={answers}
            assessmentId={assessmentId}
            userId={userId}
            onBack={() => goTo(idx - 1)}
          />
        )}
      </main>
    </div>
  );
}
