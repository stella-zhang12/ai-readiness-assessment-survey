"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brainstorm, diagnostic, instrumentVersionTag } from "@/lib/instrument";

const versions = [brainstorm, diagnostic];

export function NewAssessmentForm({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<"title" | "version">("title");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(versionId: "brainstorm" | "diagnostic") {
    setBusy(versionId);
    setError(null);
    const instrument = versionId === "brainstorm" ? brainstorm : diagnostic;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("assessments")
      .insert({
        team_id: teamId,
        title: title.trim() || "Untitled assessment",
        version: versionId,
        instrument_version: instrumentVersionTag(instrument),
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(null);
      setError(error?.message ?? "Something went wrong — try again.");
      return;
    }
    router.push(`/a/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      {stage === "title" ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
            New assessment
          </p>
          <h1 className="mt-3 text-2xl font-bold text-heritage">
            What should we call this project?
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Just a working name — you can change it later.
          </p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setStage("version");
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
              className="rounded-md bg-heritage px-5 py-2.5 font-semibold text-white hover:bg-heritage-deep"
            >
              Next
            </button>
          </form>
        </section>
      ) : (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
            {title}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-heritage">
            How deep do you want to go?
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Not sure? Start with the Brainstorm — you can always run the
            Diagnostic afterwards.
          </p>

          {error && (
            <p className="mt-4 rounded-md bg-status-redbg px-3 py-2 text-sm text-status-red">
              {error}
            </p>
          )}

          <div className="mt-6 grid gap-4">
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={busy !== null}
                onClick={() => create(v.id)}
                className="rounded-xl border border-line p-5 text-left transition-colors hover:border-spirit disabled:opacity-60"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-heritage">
                    {busy === v.id ? "Creating…" : v.title}
                  </span>
                  <span className="text-sm text-ink-muted">
                    ~{v.estimatedMinutes} min
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">
                  {v.chooserDescription}
                </p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStage("title")}
            className="mt-6 text-sm font-semibold text-spirit-dark underline underline-offset-2"
          >
            Back
          </button>
        </section>
      )}
    </main>
  );
}
