"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TeamOnboarding({ userId }: { userId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy("join");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("join_team", { code: code.trim() });
    setBusy(null);
    if (error) {
      setError(
        error.message.includes("invalid invite code")
          ? "That invite code doesn't match any team. Check it with whoever shared it — codes are 8 characters."
          : error.message
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .insert({ name: teamName.trim(), created_by: userId });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-5">
      {error && (
        <p className="rounded-md bg-status-redbg px-3 py-2 text-sm text-status-red">
          {error}
        </p>
      )}

      <form
        onSubmit={joinTeam}
        className="rounded-xl border border-line p-5 transition-colors focus-within:border-spirit"
      >
        <h2 className="font-bold text-heritage">I have an invite code</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A teammate can find it at the top of your team&apos;s dashboard.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7DMPX2R"
            maxLength={8}
            className="w-40 rounded-md border border-line px-3 py-2 font-mono tracking-widest"
            aria-label="Invite code"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-md bg-heritage px-4 py-2 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy === "join" ? "Joining…" : "Join team"}
          </button>
        </div>
      </form>

      <form
        onSubmit={createTeam}
        className="rounded-xl border border-line p-5 transition-colors focus-within:border-spirit"
      >
        <h2 className="font-bold text-heritage">Create a new team</h2>
        <p className="mt-1 text-sm text-ink-muted">
          You&apos;ll get an invite code to share with colleagues.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. National CRVS Unit"
            maxLength={120}
            className="flex-1 rounded-md border border-line px-3 py-2"
            aria-label="Team name"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-md bg-heritage px-4 py-2 font-semibold text-white transition-colors hover:bg-heritage-deep disabled:opacity-50"
          >
            {busy === "create" ? "Creating…" : "Create team"}
          </button>
        </div>
      </form>
    </div>
  );
}
