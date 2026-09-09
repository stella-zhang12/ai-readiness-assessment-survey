"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { feedbackSurvey } from "@/lib/instrument";

type Status = "idle" | "open" | "saving" | "done" | "already" | "error";

/**
 * End-of-assessment feedback survey (PRD section 11). Collapsed behind a
 * button; skippable; one submission per person per assessment (the table's
 * unique constraint). Research team reads submissions via the Supabase
 * dashboard; there is no client read policy.
 */
export function FeedbackPanel({ assessmentId }: { assessmentId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("idle");
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  const answered = Object.values(answers).some(
    (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "")
  );

  async function submit() {
    setStatus("saving");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("error");
      return;
    }
    const clean: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === "number") clean[k] = v;
      else if (v.trim() !== "") clean[k] = v.trim();
    }
    const { error } = await supabase.from("feedback").insert({
      assessment_id: assessmentId,
      user_id: user.id,
      answers: { surveyVersion: `feedback.v${feedbackSurvey.version}`, ...clean },
    });
    if (!error) setStatus("done");
    else if (error.code === "23505") setStatus("already");
    else setStatus("error");
  }

  if (status === "done" || status === "already") {
    return (
      <section className="no-print mt-10 border-y border-line py-5">
        <p className="text-sm font-semibold text-heritage">
          {status === "done"
            ? "Thank you. Your feedback was recorded."
            : "You already sent feedback for this assessment. Thank you."}
        </p>
      </section>
    );
  }

  if (status === "idle") {
    return (
      <section className="no-print mt-10 border-y border-line py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-heritage">{feedbackSurvey.title}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {feedbackSurvey.intro}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("open")}
            className="rounded-md border border-heritage px-4 py-2 text-sm font-semibold text-heritage transition-colors hover:bg-wash"
          >
            Give feedback
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="no-print mt-10 border-y border-line py-6">
      <h2 className="font-bold text-heritage">{feedbackSurvey.title}</h2>
      <p className="mt-0.5 text-sm text-ink-muted">{feedbackSurvey.intro}</p>

      <div className="mt-5 space-y-6">
        {feedbackSurvey.questions.map((q) =>
          q.type === "rating" ? (
            <fieldset key={q.id}>
              <legend className="text-sm font-semibold text-ink">
                {q.prompt}
              </legend>
              <div className="mt-2 flex items-center gap-3">
                <span className="w-20 text-right text-xs text-ink-muted">
                  {q.minLabel}
                </span>
                <div className="flex gap-1.5">
                  {Array.from(
                    { length: q.max - q.min + 1 },
                    (_, i) => q.min + i
                  ).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={answers[q.id] === n}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: n }))
                      }
                      className={`h-9 w-9 rounded-md border text-sm font-semibold tabular-nums transition-colors ${
                        answers[q.id] === n
                          ? "border-heritage bg-heritage text-white"
                          : "border-line text-ink-soft hover:border-spirit"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="w-20 text-xs text-ink-muted">
                  {q.maxLabel}
                </span>
              </div>
            </fieldset>
          ) : (
            <div key={q.id}>
              <label
                htmlFor={`fb-${q.id}`}
                className="text-sm font-semibold text-ink"
              >
                {q.prompt}
              </label>
              <textarea
                id={`fb-${q.id}`}
                rows={3}
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                className="mt-2 w-full max-w-measure rounded-md border border-line px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-spirit"
              />
            </div>
          )
        )}
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm text-status-red">
          Something went wrong saving your feedback. Try again.
        </p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={!answered || status === "saving"}
          onClick={submit}
          className="rounded-md bg-heritage px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "saving" ? "Sending…" : "Send feedback"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-sm font-semibold text-ink-muted underline underline-offset-2"
        >
          Skip
        </button>
      </div>
    </section>
  );
}
