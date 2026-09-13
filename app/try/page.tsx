"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CombinedRunner } from "@/components/runner/CombinedRunner";
import type { AnswerMap } from "@/lib/steps";

type Saved = { answers: AnswerMap; stepKey: string | null };

function load(): Saved {
  try {
    const raw = sessionStorage.getItem("guest:combined");
    if (raw) return JSON.parse(raw) as Saved;
  } catch {}
  return { answers: {}, stepKey: null };
}

export default function TryPage() {
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    if (started) setSaved(load());
  }, [started]);

  if (started && saved) {
    return (
      <CombinedRunner
        assessmentId="guest-combined"
        title="Guest session"
        userId="guest"
        initialAnswers={saved.answers}
        initialStepKey={saved.stepKey}
        guest
      />
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-spirit-dark">
        Try the assessment
      </p>
      <h1 className="mt-3 text-2xl font-bold text-heritage">
        Guest mode: nothing is saved
      </h1>
      <div className="mt-4 rounded-xl border border-status-amber bg-status-amberbg p-4 text-sm text-status-amber">
        <p className="font-semibold">Before you start:</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            Your answers live only in this browser tab; closing it discards
            everything.
          </li>
          <li>No team sharing and no resuming later.</li>
        </ul>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Want your work kept?{" "}
        <Link
          href="/signup"
          className="font-semibold text-spirit-dark underline underline-offset-2"
        >
          Create a free account
        </Link>
        .
      </p>

      <button
        type="button"
        onClick={() => setStarted(true)}
        className="mt-8 rounded-md bg-heritage px-6 py-3 font-semibold text-white transition-colors hover:bg-heritage-deep"
      >
        Start the assessment
      </button>

      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
        >
          ← Back
        </Link>
      </p>
    </main>
  );
}
