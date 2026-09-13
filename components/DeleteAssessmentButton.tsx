"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Two-step delete for a dashboard assessment card. First click arms it
 * ("Really delete?" for a few seconds), second click deletes the assessment
 * and everything under it (responses, checks, timing) via FK cascade.
 */
export function DeleteAssessmentButton({
  assessmentId,
  title,
}: {
  assessmentId: string;
  title: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (disarm.current) clearTimeout(disarm.current);
  }, []);

  async function onClick(e: React.MouseEvent) {
    // The card itself is a link; keep clicks from opening the assessment.
    e.preventDefault();
    e.stopPropagation();
    setError(false);

    if (!armed) {
      setArmed(true);
      disarm.current = setTimeout(() => setArmed(false), 5000);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", assessmentId)
      .select("id");
    setBusy(false);
    setArmed(false);
    if (error || !data || data.length === 0) {
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={
        armed ? `Confirm deleting ${title}` : `Delete ${title}`
      }
      className={`rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors ${
        error
          ? "border-status-red text-status-red"
          : armed
            ? "border-status-red bg-status-redbg text-status-red"
            : "border-line text-ink-muted hover:border-status-red hover:text-status-red"
      }`}
    >
      {busy
        ? "Deleting…"
        : error
          ? "Couldn't delete"
          : armed
            ? "Really delete?"
            : "Delete"}
    </button>
  );
}
