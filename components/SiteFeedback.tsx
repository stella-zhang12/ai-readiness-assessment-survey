"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFeedbackContext } from "@/lib/feedbackContext";

const TYPES = [
  { value: "question_unclear", label: "A question is unclear or confusing" },
  { value: "options_dont_fit", label: "The answer options don't fit" },
  { value: "design", label: "Design or layout issue" },
  { value: "navigation", label: "Hard to find or navigate something" },
  { value: "broken", label: "Something is broken or not working" },
  { value: "suggestion", label: "Suggestion or idea" },
  { value: "other", label: "Other" },
] as const;

/**
 * Global pilot-feedback widget: a fixed Feedback button on every page.
 * The panel triages by issue type; when the user is on a survey question,
 * that question's context is attached to the report automatically.
 * Submitting never touches answers or navigation, and works signed out.
 */
export function SiteFeedback() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit() {
    if (!type) return;
    setPhase("sending");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ctx = getFeedbackContext();
    const { error } = await supabase.from("site_feedback").insert({
      user_id: user?.id ?? null,
      page: pathname ?? "/",
      assessment_id: ctx.assessmentId ?? null,
      section_id: ctx.sectionId ?? null,
      question_id: ctx.questionId ?? null,
      question_text: ctx.questionText ?? null,
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
    <div className="no-print fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-2 w-80 max-w-[calc(100vw-2rem)] border border-line bg-white p-4 text-left shadow-lg">
          {phase === "done" ? (
            <p className="text-sm font-semibold text-status-green">
              Thanks, your feedback has been recorded.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">
                Is something unclear or not working?
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                This is a pilot; every report helps us improve it.
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

      <button
        type="button"
        onClick={() => {
          setPhase("idle");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="rounded-md bg-heritage px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-heritage-deep"
      >
        {open ? "Close" : "Survey feedback"}
      </button>
    </div>
  );
}
