import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsView } from "@/components/results/ResultsView";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title, version")
    .eq("id", id)
    .maybeSingle();

  if (!assessment) redirect("/dashboard");
  if (assessment.version !== "diagnostic") redirect(`/a/${id}`);

  return <ResultsView assessmentId={assessment.id} title={assessment.title} />;
}
