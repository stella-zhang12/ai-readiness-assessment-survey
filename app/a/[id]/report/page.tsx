import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportView } from "@/components/report/ReportView";

export default async function ReportPage({
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
  if (assessment.version !== "combined") redirect(`/a/${id}`);

  return <ReportView assessmentId={assessment.id} title={assessment.title} />;
}
