import { createClient } from "@/lib/supabase/server";
import type { AnswerMap, AnswerValue } from "@/lib/steps";

export type AiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  assessment: { id: string; title: string; version: "brainstorm" | "diagnostic" };
  answers: AnswerMap;
};

/**
 * Authenticates the caller and loads the assessment + answers through the
 * user's own row-level-security context — a user can only ever reach their
 * team's assessments here, same as everywhere else.
 */
export async function loadAiContext(
  assessmentId: string
): Promise<AiContext | { error: string; status: number }> {
  if (!assessmentId || typeof assessmentId !== "string") {
    return { error: "assessmentId required", status: 400 };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated", status: 401 };

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title, version")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) return { error: "not found", status: 404 };

  const { data: rows } = await supabase
    .from("responses")
    .select("question_id, value")
    .eq("assessment_id", assessmentId);

  const answers: AnswerMap = {};
  for (const r of rows ?? []) {
    answers[r.question_id as string] = r.value as AnswerValue;
  }

  return {
    supabase,
    userId: user.id,
    assessment: assessment as AiContext["assessment"],
    answers,
  };
}

export async function storeAiOutput(
  ctx: AiContext,
  kind: "summary" | "recap" | "followups" | "final",
  content: unknown,
  model: string,
  promptVersion: string,
  sectionId?: string
) {
  await ctx.supabase.from("ai_outputs").insert({
    assessment_id: ctx.assessment.id,
    kind,
    section_id: sectionId ?? null,
    content,
    model,
    prompt_version: promptVersion,
    created_by: ctx.userId,
  });
}
