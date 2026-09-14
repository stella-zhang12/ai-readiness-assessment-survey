"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Choose a new password. Reached from the dashboard header (signed in) or
 * from an emailed reset link (which signs the user in on the way here).
 */
export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "That's already your current password; choose a different one."
          : error.message
      );
      return;
    }
    setDone(true);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold text-heritage">
        Choose a new password
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        It takes effect immediately; you stay signed in.
      </p>

      {done ? (
        <div className="mt-8 rounded-lg border border-washline bg-wash p-4">
          <p className="font-semibold text-status-green">Password updated ✓</p>
          <p className="mt-1 text-sm text-ink-soft">
            Use it the next time you sign in.
          </p>
          <Link
            href="/dashboard"
            className="mt-3 inline-block rounded-md bg-heritage px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep"
          >
            Back to the dashboard
          </Link>
        </div>
      ) : (
        <form onSubmit={save} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">
              New password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">
              Repeat new password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-heritage px-4 py-2.5 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </main>
  );
}
