import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamOnboarding } from "@/components/TeamOnboarding";
import { TeamSwitchButton } from "@/components/TeamSwitchButton";
import { ACTIVE_TEAM_COOKIE } from "@/lib/activeTeam";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, joined_at, teams (id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const teams = (memberships ?? [])
    .map((m) => m.teams as unknown as { id: string; name: string } | null)
    .filter(Boolean) as { id: string; name: string }[];

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value;
  const activeId = teams.some((t) => t.id === preferred)
    ? preferred
    : teams[0]?.id;

  if (teams.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold text-heritage">Join your team</h1>
        <p className="mt-2 max-w-measure text-ink-soft">
          Assessments belong to a team, so colleagues can fill them out
          together and pick up where anyone left off.
        </p>
        <TeamOnboarding userId={user.id} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-spirit-dark underline underline-offset-2"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-heritage">Your teams</h1>
      <p className="mt-2 max-w-measure text-sm text-ink-soft">
        The dashboard shows one team at a time. Switch below, or add another
        team.
      </p>

      <div className="mt-6 divide-y divide-line border-y border-line">
        {teams.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
          >
            <span className="font-bold text-heritage">{t.name}</span>
            <TeamSwitchButton teamId={t.id} current={t.id === activeId} />
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold text-heritage">
        Add another team
      </h2>
      <p className="mt-1 max-w-measure text-sm text-ink-muted">
        Join a colleague&apos;s team with their invite code, or create a new
        one. You keep access to all your teams.
      </p>
      <TeamOnboarding userId={user.id} />
    </main>
  );
}
