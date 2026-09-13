import { NextResponse } from "next/server";
import { combined, surveyQuestionIds, surveySections } from "@/lib/instrument";
import { loadAiContext, storeAiOutput } from "@/lib/ai/context";
import { callStructured, PROMPT_VERSION } from "@/lib/ai/claude";
import {
  buildSectionCheckUser,
  classifySection,
  hashSectionAnswers,
  questionLabels,
  CHECK_SCHEMA,
  SECTION_CHECK_SYSTEM,
  type ModelCheck,
  type SectionCheck,
} from "@/lib/ai/sectionCheck";

export const maxDuration = 60;

// Latency matters here (the progress page waits on it visually) and the
// task is light summarization, so this endpoint runs on Haiku at
// temperature 0 for repeatable grades.
const CHECK_MODEL = "claude-haiku-4-5";

// Bumped when the stored check shape changes; old cache rows regenerate.
const CHECK_SHAPE = 2;

/**
 * Completeness check for one progress-page section. "Not answered" and
 * "N/A" statuses are decided in code; the model grades only answered
 * questions. Results are cached against a hash of the section's answers.
 */
export async function POST(request: Request) {
  let body: { assessmentId?: string; sectionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const ctx = await loadAiContext(body.assessmentId ?? "");
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (ctx.assessment.version !== "combined") {
    return NextResponse.json({ error: "wrong version" }, { status: 400 });
  }

  const sections = surveySections(combined);
  const index = sections.findIndex((s) => s.id === body.sectionId);
  if (index < 0) {
    return NextResponse.json({ error: "unknown section" }, { status: 400 });
  }
  const section = sections[index];

  const ids = surveyQuestionIds(section);
  const answersHash = hashSectionAnswers(ids, ctx.answers);

  // Serve the stored check when nothing in this section changed.
  const { data: prior } = await ctx.supabase
    .from("ai_outputs")
    .select("content")
    .eq("assessment_id", ctx.assessment.id)
    .eq("kind", "section_check")
    .eq("section_id", section.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const priorContent = prior?.content as
    | { answersHash?: string; shape?: number; check?: SectionCheck }
    | null;
  if (
    priorContent?.answersHash === answersHash &&
    priorContent.shape === CHECK_SHAPE &&
    priorContent.check
  ) {
    return NextResponse.json({
      check: priorContent.check,
      answersHash,
      cached: true,
    });
  }

  const { answeredIds, fixed } = classifySection(section, ctx.answers);
  const labels = questionLabels(section);

  try {
    const model = await callStructured<ModelCheck>({
      system: SECTION_CHECK_SYSTEM,
      user: buildSectionCheckUser(
        section,
        index + 1,
        ctx.answers,
        answeredIds,
        fixed
      ),
      schema: CHECK_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1400,
      model: CHECK_MODEL,
      temperature: 0,
    });

    // Merge: model grades for answered ids, deterministic rows for the
    // rest, in instrument order. Model rows for unknown ids are dropped;
    // answered ids the model skipped default to complete.
    const graded = new Map(
      model.items
        .filter((i) => answeredIds.includes(i.qid))
        .map((i) => [i.qid, i])
    );
    const fixedById = new Map(fixed.map((f) => [f.qid, f]));
    const items = ids.map((qid) => {
      const fx = fixedById.get(qid);
      if (fx) return fx;
      const g = graded.get(qid);
      return {
        qid,
        question: labels.get(qid) ?? qid,
        status: g?.status ?? ("complete" as const),
        missing: g?.status === "partial" ? g.missing : "",
      };
    });

    const check: SectionCheck = {
      summary: model.summary,
      items,
      sufficient: items.every(
        (i) => i.status === "complete" || i.status === "not_applicable"
      ),
      checkpoint: model.checkpoint,
    };

    await storeAiOutput(
      ctx,
      "section_check",
      { answersHash, shape: CHECK_SHAPE, check },
      CHECK_MODEL,
      PROMPT_VERSION,
      section.id
    );

    return NextResponse.json({ check, answersHash, cached: false });
  } catch (e) {
    console.error("section-check generation failed:", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
