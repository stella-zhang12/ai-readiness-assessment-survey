import { NextResponse } from "next/server";
import { combined, surveyQuestionIds, surveySections } from "@/lib/instrument";
import { loadAiContext, storeAiOutput } from "@/lib/ai/context";
import { callStructured, PROMPT_VERSION } from "@/lib/ai/claude";

// Latency matters here (the hub blocks on it visually), and the task is
// light summarization, so this endpoint runs on Haiku rather than Opus.
const CHECK_MODEL = "claude-haiku-4-5";
import {
  buildSectionCheckUser,
  hashSectionAnswers,
  CHECK_SCHEMA,
  SECTION_CHECK_SYSTEM,
  type SectionCheck,
} from "@/lib/ai/sectionCheck";

export const maxDuration = 60;

/**
 * AI completeness check for one hub section. Results are cached against a
 * hash of the section's answers: revisiting the hub with unchanged answers
 * returns the stored check instantly; any edit triggers a fresh one.
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
    | { answersHash?: string; check?: SectionCheck }
    | null;
  if (priorContent?.answersHash === answersHash && priorContent.check) {
    return NextResponse.json({
      check: priorContent.check,
      answersHash,
      cached: true,
    });
  }

  try {
    const check = await callStructured<SectionCheck>({
      system: SECTION_CHECK_SYSTEM,
      user: buildSectionCheckUser(section, index + 1, ctx.answers),
      schema: CHECK_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1600,
      model: CHECK_MODEL,
    });

    // Keep only rows for real question ids and cap follow-ups at five.
    const validIds = new Set(ids);
    const cleaned: SectionCheck = {
      ...check,
      items: check.items.filter((i) => validIds.has(i.qid)),
      followups: check.followups.slice(0, 5),
    };

    await storeAiOutput(
      ctx,
      "section_check",
      { answersHash, check: cleaned },
      CHECK_MODEL,
      PROMPT_VERSION,
      section.id
    );

    return NextResponse.json({ check: cleaned, answersHash, cached: false });
  } catch (e) {
    console.error("section-check generation failed:", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
