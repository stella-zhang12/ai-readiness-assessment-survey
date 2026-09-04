import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { NewAssessmentForm } from "@/components/NewAssessmentForm";

export default async function NewAssessmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, teams (name)")
    .order("joined_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) redirect("/team");
  const teamName = (membership.teams as unknown as { name: string } | null)
    ?.name;

  return (
    <>
      <AppHeader teamName={teamName} />
      <NewAssessmentForm teamId={membership.team_id} userId={user.id} />
    </>
  );
}
