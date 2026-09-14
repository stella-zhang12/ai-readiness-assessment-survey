import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentRunner } from "@/components/runner/AssessmentRunner";
import { CombinedRunner } from "@/components/runner/CombinedRunner";
import type { AnswerMap, AnswerValue } from "@/lib/steps";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Hot path: the middleware verified this request's session moments ago,
  // so read the user from the cookie instead of a second auth round trip.
  // RLS still guards every query below regardless.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  const [{ data: assessment }, { data: rows }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, title, version, current_step")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("responses")
      .select("question_id, value")
      .eq("assessment_id", id),
  ]);

  // RLS returns nothing for assessments outside the user's team.
  if (!assessment) redirect("/dashboard");

  const initialAnswers: AnswerMap = {};
  for (const r of rows ?? []) {
    initialAnswers[r.question_id as string] = r.value as AnswerValue;
  }

  if (assessment.version === "combined") {
    return (
      <CombinedRunner
        assessmentId={assessment.id}
        title={assessment.title}
        userId={user.id}
        initialAnswers={initialAnswers}
        initialStepKey={assessment.current_step}
      />
    );
  }

  // Legacy Brainstorm/Diagnostic assessments keep their original flow.
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
