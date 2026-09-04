"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback?next=/team`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in this project - straight in.
      router.push("/team");
      router.refresh();
    } else {
      setConfirmSent(true);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold text-heritage">Create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        AI Use Case Scoping &amp; Readiness Assessment (Beta)
      </p>

      {confirmSent ? (
        <div className="mt-8 rounded-lg border border-washline bg-wash p-4">
          <p className="font-semibold text-heritage">Check your email</p>
          <p className="mt-1 text-sm text-ink-soft">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            finish creating your account — it will bring you back here to join
            your team.
          </p>
        </div>
      ) : (
        <form onSubmit={signUp} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">Name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
            />
            <span className="mt-1 block text-xs text-ink-muted">
              At least 8 characters.
            </span>
          </label>

          {error && <p className="text-sm text-status-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-heritage px-4 py-2.5 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-spirit-dark underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </main>
  );
}
