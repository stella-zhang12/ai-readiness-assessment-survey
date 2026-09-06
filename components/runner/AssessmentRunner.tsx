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
import { SummaryStep } from "./SummaryStep";
import type { AiSummarySection } from "@/lib/instrument";

/** Quick-check recap shown on milestone screens (PRD §7.2, fail-silent). */
function MilestoneRecap({
  assessmentId,
  sectionId,
  guest,
}: {
  assessmentId: string;
  sectionId: string;
  guest?: boolean;
}) {
  const [recap, setRecap] = useState<string | null>(null);
  useEffect(() => {
    if (guest) return; // AI features need an account
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 9000);
    fetch("/api/ai/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, sectionId }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.recap && setRecap(d.recap))
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [assessmentId, sectionId, guest]);

  if (!recap) return null;
  return (
    <div className="relative mx-auto mt-6 max-w-md rounded-xl border border-washline bg-wash p-4 text-left">
      <span className="absolute -top-2.5 right-3 rounded-full bg-spirit px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        AI-generated
      </span>
      <p className="text-xs font-semibold text-spirit-dark">
        Quick check before you continue
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{recap}</p>
    </div>
  );
}

type Props = {
  assessmentId: string;
  version: "brainstorm" | "diagnostic";
  title: string;
  userId: string;
  initialAnswers: AnswerMap;
  initialStepKey: string | null;
  /** Guest mode: nothing is written to the database (see /try). */
  guest?: boolean;
};

export function AssessmentRunner({
  assessmentId,
  version,
  title,
  userId,
  initialAnswers,
  initialStepKey,
  guest = false,
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
  const stepKeyRef = useRef(steps[stepIndexForKey(steps, initialStepKey)].key);

  // ------------------------------------------------------------------ saving

  const persist = useCallback(
    async (questionId: string, value: AnswerValue) => {
      if (guest) return; // guest mode: nothing leaves the browser
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

  // Guest sessions survive an accidental refresh via sessionStorage only.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const storeGuest = useCallback(
    (stepKey: string) => {
      if (!guest) return;
      try {
        sessionStorage.setItem(
          `guest:${version}`,
          JSON.stringify({ answers: answersRef.current, stepKey })
        );
      } catch {}
    },
    [guest, version]
  );

  /** Update local state immediately; write to the database debounced. */
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
    if (guest) return; // no timing collection for guests
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
  }, [flushTiming, guest]);

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
      stepKeyRef.current = steps[clamped].key;
      window.scrollTo({ top: 0 });
      if (guest) {
        storeGuest(steps[clamped].key);
        return;
      }
      void supabase
        .from("assessments")
        .update({ current_step: steps[clamped].key, updated_by: userId })
        .eq("id", assessmentId);
    },
    [steps, supabase, assessmentId, userId, flushTiming, guest, storeGuest]
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
        {guest ? (
          <>
            <span className="rounded-full border border-status-amber bg-status-amberbg px-2.5 py-0.5 font-semibold text-status-amber">
              Guest — nothing is saved
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
          </>
        )}
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
            <MilestoneRecap
              assessmentId={assessmentId}
              sectionId={step.key.replace("milestone:", "")}
              guest={guest}
            />
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
          <SummaryStep
            section={
              instrument.sections.find(
                (s): s is AiSummarySection => s.type === "ai_summary"
              )!
            }
            assessmentId={assessmentId}
            summaryText={answers["C.summary_final"]?.text}
            c1Rating={answers["C1"]?.rating}
            fallbackText={(() => {
              const a1 = answers["A1"]?.text?.split(/(?<=\.)\s/)[0] ?? "";
              const a2 = answers["A2"]?.text?.split(/(?<=\.)\s/)[0] ?? "";
              return [
                a1 && `You told us: ${a1}`,
                a2 && `The main challenge is: ${a2}`,
              ]
                .filter(Boolean)
                .join(" ");
            })()}
            onSaveText={(t) => setAnswer("C.summary_final", { text: t })}
            onRateC1={(v) => setAnswer("C1", { rating: v }, 150)}
            onContinue={() => goTo(idx + 1)}
            onBack={() => goTo(idx - 1)}
            guest={guest}
          />
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
            assessmentId={assessmentId}
            onJump={jumpToSection}
            onBack={() => goTo(idx - 1)}
            guest={guest}
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
            guest={guest}
          />
        )}
      </main>
    </div>
  );
}
