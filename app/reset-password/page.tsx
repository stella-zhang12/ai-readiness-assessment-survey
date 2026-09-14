"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/account/password")}`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold text-heritage">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">
        We&apos;ll email you a link that signs you in so you can choose a new
        password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-washline bg-wash p-4">
          <p className="font-semibold text-heritage">Check your email</p>
          <p className="mt-1 text-sm text-ink-soft">
            If an account exists for <strong>{email}</strong>, a reset link is
            on its way. Open it in this browser, then choose your new
            password.
          </p>
        </div>
      ) : (
        <form onSubmit={send} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-heritage px-4 py-2.5 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a reset link"}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Remembered it after all?{" "}
        <Link
          href="/login"
          className="font-semibold text-spirit-dark underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
