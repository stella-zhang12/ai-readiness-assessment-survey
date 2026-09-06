"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { brainstorm, diagnostic } from "@/lib/instrument";
import { AssessmentRunner } from "@/components/runner/AssessmentRunner";
import type { AnswerMap } from "@/lib/steps";

const versions = [brainstorm, diagnostic];

type Saved = { answers: AnswerMap; stepKey: string | null };

function load(version: string): Saved {
  try {
    const raw = sessionStorage.getItem(`guest:${version}`);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {}
  return { answers: {}, stepKey: null };
}

export default function TryPage() {
  const [version, setVersion] = useState<"brainstorm" | "diagnostic" | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    if (version) setSaved(load(version));
  }, [version]);

  if (version && saved) {
    return (
      <AssessmentRunner
        key={version}
        assessmentId={`guest-${version}`}
        version={version}
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
        Guest mode — nothing is saved
      </h1>
      <div className="mt-4 rounded-xl border border-status-amber bg-status-amberbg p-4 text-sm text-status-amber">
        <p className="font-semibold">Before you start:</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            Your answers live only in this browser tab — closing it discards
            everything.
          </li>
          <li>No team sharing, no resuming later, no saved results.</li>
          <li>
            The AI features (problem summary and the readiness results) need
            an account.
          </li>
        </ul>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Want your work kept?{" "}
        <Link
          href="/signup"
          className="font-semibold text-spirit-dark underline underline-offset-2"
        >
          Create a free account
        </Link>{" "}
        instead — it takes a minute.
      </p>

      <div className="mt-8 grid gap-4">
        {versions.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVersion(v.id)}
            className="rounded-xl border border-line p-5 text-left transition-colors hover:border-spirit"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-heritage">{v.title}</span>
              <span className="text-sm text-ink-muted">
                ~{v.estimatedMinutes} min
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{v.chooserDescription}</p>
          </button>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-semibold text-spirit-dark underline underline-offset-2"
      >
        ← Back
      </Link>
    </main>
  );
}
