import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamOnboarding } from "@/components/TeamOnboarding";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .limit(1);

  if (memberships && memberships.length > 0) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold text-heritage">Join your team</h1>
      <p className="mt-2 max-w-measure text-ink-soft">
        Assessments belong to a team, so colleagues can fill them out together
        and pick up where anyone left off.
      </p>
      <TeamOnboarding userId={user.id} />
    </main>
  );
}
