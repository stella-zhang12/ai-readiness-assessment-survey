"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPES = [
  { value: "confusing", label: "This question is confusing" },
  { value: "term", label: "I don't understand a term" },
  { value: "options_dont_fit", label: "The answer options don't fit" },
  { value: "not_working", label: "Something is not working" },
  { value: "other", label: "Other" },
] as const;

/**
 * Quiet per-question feedback trigger, shown at the top right of every
 * question page. Opens an inline panel; submitting records a row in
 * question_feedback and never touches the user's answers or position.
 */
export function QuestionFeedback({
  assessmentId,
  userId,
  sectionId,
  questionId,
  questionText,
}: {
  assessmentId: string;
  userId: string;
  sectionId: string;
  questionId: string;
  questionText: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh question page = fresh panel.
  useEffect(() => {
    setOpen(false);
    setType(null);
    setMessage("");
    setPhase("idle");
  }, [questionId]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  async function submit() {
    if (!type) return;
    setPhase("sending");
    const supabase = createClient();
    const { error } = await supabase.from("question_feedback").insert({
      assessment_id: assessmentId,
      user_id: userId,
      section_id: sectionId,
      question_id: questionId,
      question_text: questionText,
      feedback_type: type,
      message: message.trim() || null,
    });
    if (error) {
      setPhase("error");
      return;
    }
    setPhase("done");
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setType(null);
      setMessage("");
      setPhase("idle");
    }, 2500);
  }

  return (
    <div className="absolute right-0 top-0 z-20 text-right">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-ink-muted underline-offset-2 hover:text-spirit-dark hover:underline"
        >
          Something unclear?
        </button>
      ) : (
        <div className="w-72 border border-line bg-white p-4 text-left shadow-sm sm:w-80">
          {phase === "done" ? (
            <p className="text-sm font-semibold text-status-green">
              Thanks, your feedback has been recorded.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">
                Is something unclear or not working here?
              </p>
              <div className="mt-2.5 grid gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={type === t.value}
                    onClick={() => setType(t.value)}
                    className={`rounded-md border px-3 py-1.5 text-left text-xs transition-colors ${
                      type === t.value
                        ? "border-heritage bg-wash font-semibold text-heritage"
                        : "border-line text-ink-soft hover:border-spirit"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more (optional)"
                className="mt-2.5 w-full resize-y rounded-md border border-line px-2.5 py-1.5 text-xs leading-relaxed focus:border-spirit focus:outline-none"
              />
              {phase === "error" && (
                <p className="mt-1.5 text-xs text-status-red">
                  Couldn&apos;t send. Try again.
                </p>
              )}
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  type="button"
                  disabled={!type || phase === "sending"}
                  onClick={submit}
                  className="rounded-md bg-heritage px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-heritage-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {phase === "sending" ? "Sending…" : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-ink-muted underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
