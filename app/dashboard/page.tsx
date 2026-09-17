import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_TEAM_COOKIE } from "@/lib/activeTeam";
import { AppHeader } from "@/components/AppHeader";
import { InviteCode } from "@/components/InviteCode";
import { DeleteAssessmentButton } from "@/components/DeleteAssessmentButton";
import { RefreshOnReturn } from "@/components/RefreshOnReturn";
import { getInstrument } from "@/lib/instrument";

type AssessmentRow = {
  id: string;
  title: string;
  version: "brainstorm" | "diagnostic" | "combined";
  status: "draft" | "complete";
  current_step: string | null;
  created_by: string;
  updated_by: string | null;
  updated_at: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, teams (id, name, invite_code)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const allTeams = (memberships ?? [])
    .map(
      (m) =>
        m.teams as unknown as
          | { id: string; name: string; invite_code: string }
          | null
    )
    .filter(Boolean) as { id: string; name: string; invite_code: string }[];
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value;
  const team = allTeams.find((t) => t.id === preferred) ?? allTeams[0];
  if (!team) redirect("/team");

  const { data: memberRows } = await supabase
    .from("team_members")
    .select("user_id, joined_at, profiles (full_name)")
    .eq("team_id", team.id)
    .order("joined_at", { ascending: true });
  const members = (memberRows ?? []).map((m) => ({
    id: m.user_id as string,
    name:
      (m.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? "A teammate",
  }));

  const { data: assessments } = await supabase
    .from("assessments")
    .select(
      "id, title, version, status, current_step, created_by, updated_by, updated_at"
    )
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false });

  const rows = (assessments ?? []) as AssessmentRow[];

  const editorIds = [
    ...new Set(rows.flatMap((a) => [a.created_by, a.updated_by].filter(Boolean))),
  ] as string[];
  const { data: profiles } = editorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", editorIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null }) => [
      p.id,
      p.full_name ?? "a teammate",
    ])
  );

  return (
    <>
      <RefreshOnReturn />
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-heritage">
              {team.name}
              <Link
                href="/team"
                className="ml-3 align-middle text-xs font-semibold text-spirit-dark underline underline-offset-2"
              >
                {allTeams.length > 1
                  ? `Manage teams (${allTeams.length})`
                  : "Manage teams"}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Anyone on the team can open an assessment and pick up where it was
              left off.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Members
              </span>
              {members.map((m) => (
                <span
                  key={m.id}
                  className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-semibold text-ink-soft"
                >
                  {m.name}
                  {m.id === user.id && (
                    <span className="text-ink-muted"> (you)</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <InviteCode code={team.invite_code} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Assessments
          </h2>
          <Link
            href="/new"
            className="rounded-md bg-heritage px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep"
          >
            Start new assessment
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center">
            <p className="font-semibold text-ink-soft">No assessments yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
              Start your first assessment. It covers four sections: use case
              definition, data readiness, safety and responsible use, and
              country-level readiness.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((a) => {
              const instrument = getInstrument(a.version);
              const editor = a.updated_by ?? a.created_by;
              const resultsHref =
                a.status === "complete"
                  ? a.version === "diagnostic"
                    ? `/a/${a.id}/results`
                    : a.version === "combined"
                      ? `/a/${a.id}/report`
                      : null
                  : null;
              return (
                <li key={a.id}>
                  <Link
                    href={resultsHref ?? `/a/${a.id}`}
                    className="block rounded-xl border border-line p-4 transition-colors hover:border-spirit"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-heritage">{a.title}</span>
                      <span className="flex items-center gap-2">
                        <span className="rounded border border-washline bg-wash px-2 py-0.5 text-xs font-semibold text-spirit-dark">
                          {instrument.title}
                        </span>
                        <DeleteAssessmentButton
                          assessmentId={a.id}
                          title={a.title}
                        />
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-muted">
                      {a.status === "complete"
                        ? "Complete"
                        : a.current_step
                          ? `In progress · ${a.current_step}`
                          : "Not started"}
                      {" · "}last edited by {names.get(editor) ?? "a teammate"}{" "}
                      on {formatWhen(a.updated_at)}
                      {resultsHref && (
                        <span className="ml-1.5 font-semibold text-spirit-dark">
                          · View {a.version === "combined" ? "report" : "results"} →
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
