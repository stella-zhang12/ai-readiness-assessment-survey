import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentRunner } from "@/components/runner/AssessmentRunner";
import type { AnswerMap, AnswerValue } from "@/lib/steps";

export default async function AssessmentPage({
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
    .select("id, title, version, current_step")
    .eq("id", id)
    .maybeSingle();

  // RLS returns nothing for assessments outside the user's team.
  if (!assessment) redirect("/dashboard");

  const { data: rows } = await supabase
    .from("responses")
    .select("question_id, value")
    .eq("assessment_id", id);

  const initialAnswers: AnswerMap = {};
  for (const r of rows ?? []) {
    initialAnswers[r.question_id as string] = r.value as AnswerValue;
  }

  return (
    <AssessmentRunner
      assessmentId={assessment.id}
      version={assessment.version as "brainstorm" | "diagnostic"}
      title={assessment.title}
      userId={user.id}
      initialAnswers={initialAnswers}
      initialStepKey={assessment.current_step}
    />
  );
}
