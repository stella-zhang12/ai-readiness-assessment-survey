"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { combined, instrumentVersionTag } from "@/lib/instrument";

export function NewAssessmentForm({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assessments")
      .insert({
        team_id: teamId,
        title: title.trim() || "Untitled assessment",
        version: "combined",
        instrument_version: instrumentVersionTag(combined),
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      setError(error?.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push(`/a/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
          New assessment
        </p>
        <h1 className="mt-3 text-2xl font-bold text-heritage">
          Name your assessment
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          A working name for the use case; you can change it later. The
          assessment covers four sections: use case definition, data
          readiness, safety and responsible use, and country-level readiness.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-status-redbg px-3 py-2 text-sm text-status-red">
            {error}
          </p>
        )}

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void create();
          }}
        >
          <input
            type="text"
            autoFocus
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Verbal autopsy coding"
            className="flex-1 rounded-md border border-line px-3.5 py-2.5 focus:border-spirit focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-heritage px-5 py-2.5 font-semibold text-white hover:bg-heritage-deep disabled:opacity-60"
          >
            {busy ? "Creating…" : "Start"}
          </button>
        </form>
      </section>
    </main>
  );
}
