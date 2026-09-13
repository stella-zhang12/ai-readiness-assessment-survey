"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Delete button for a dashboard assessment card. Opens an Are-you-sure
 * dialog; confirming deletes the assessment and everything under it
 * (responses, checks, timing) via FK cascade.
 */
export function DeleteAssessmentButton({
  assessmentId,
  title,
}: {
  assessmentId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function confirmDelete() {
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", assessmentId)
      .select("id");
    setBusy(false);
    if (error || !data || data.length === 0) {
      setError(true);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // The card itself is a link; keep this click from opening it.
          e.preventDefault();
          e.stopPropagation();
          setError(false);
          setOpen(true);
        }}
        aria-label={`Delete ${title}`}
        className="rounded-md border border-line px-2 py-0.5 text-xs font-semibold text-ink-muted transition-colors hover:border-status-red hover:text-status-red"
      >
        Delete
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-6"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-full max-w-sm border border-line bg-white p-6 shadow-lg">
              <h2
                id="delete-dialog-title"
                className="text-lg font-bold text-heritage"
              >
                Delete this assessment?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Are you sure? &ldquo;{title}&rdquo; and all of its saved
                answers will be permanently deleted. This cannot be undone.
              </p>
              {error && (
                <p className="mt-3 rounded-md bg-status-redbg px-3 py-2 text-sm text-status-red">
                  Couldn&apos;t delete. Try again.
                </p>
              )}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmDelete}
                  className="rounded-md bg-status-red px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-ink-muted underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
