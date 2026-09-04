"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const linkError = searchParams.get("error") === "link";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. Try again, or use a sign-in link instead."
          : error.message
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Enter your email first, then request the link.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: false,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold text-heritage">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        AI Use Case Scoping &amp; Readiness Assessment (Beta)
      </p>

      {linkError && (
        <p className="mt-4 rounded-md bg-status-redbg px-3 py-2 text-sm text-status-red">
          That sign-in link has expired or was already used. Request a fresh one
          below.
        </p>
      )}

      {magicSent ? (
        <div className="mt-8 rounded-lg border border-washline bg-wash p-4">
          <p className="font-semibold text-heritage">Check your email</p>
          <p className="mt-1 text-sm text-ink-soft">
            We sent a sign-in link to <strong>{email}</strong>. It signs you in
            and drops you exactly where you left off.
          </p>
        </div>
      ) : (
        <form onSubmit={signIn} className="mt-8 space-y-4">
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
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-heritage px-4 py-2.5 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={sendMagicLink}
            disabled={busy}
            className="w-full text-sm font-semibold text-spirit-dark underline underline-offset-2 disabled:opacity-50"
          >
            Email me a sign-in link instead
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-spirit-dark underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
