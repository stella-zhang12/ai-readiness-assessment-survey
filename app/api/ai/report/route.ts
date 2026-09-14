import { NextResponse } from "next/server";
import { combined } from "@/lib/instrument";
import { answerableIds } from "@/lib/instrument";
import { loadAiContext, storeAiOutput } from "@/lib/ai/context";
import { callStructured, PROMPT_VERSION } from "@/lib/ai/claude";

// Sonnet generates the report in roughly half Opus's time with near-equal
// quality on this heavily structured task; the prompt does the reasoning
// scaffolding.
const REPORT_MODEL = "claude-sonnet-5";
import { hashSectionAnswers } from "@/lib/ai/sectionCheck";
import {
  buildReportUser,
  REPORT_SCHEMA,
  REPORT_SYSTEM,
  type Report,
} from "@/lib/ai/report";

export const maxDuration = 120;

const AREAS = ["use_case", "data", "safety", "country"] as const;

// Bumped when the stored report shape changes; old cache rows regenerate.
const REPORT_SHAPE = 2;

/**
 * Generates (or returns the cached) AI Solution Scoping Report from all
 * four sections' answers. Cached against a hash of every answer; pass
 * regenerate: true to force a fresh one. First successful generation
 * marks the assessment complete.
 */
export async function POST(request: Request) {
  let body: { assessmentId?: string; regenerate?: boolean };
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

  const ids = answerableIds(combined);
  const answersHash = hashSectionAnswers(ids, ctx.answers);

  if (!body.regenerate) {
    const { data: prior } = await ctx.supabase
      .from("ai_outputs")
      .select("content, created_at")
      .eq("assessment_id", ctx.assessment.id)
      .eq("kind", "report")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const priorContent = prior?.content as
      | { answersHash?: string; shape?: number; report?: Report }
      | null;
    if (
      priorContent?.answersHash === answersHash &&
      priorContent.shape === REPORT_SHAPE &&
      priorContent.report
    ) {
      return NextResponse.json({
        report: priorContent.report,
        answersHash,
        cached: true,
        generatedAt: prior?.created_at ?? null,
      });
    }
  }

  try {
    const raw = await callStructured<Report>({
      system: REPORT_SYSTEM,
      user: buildReportUser(combined, ctx.answers),
      schema: REPORT_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 4000,
      effort: "medium",
      model: REPORT_MODEL,
    });

    // Enforce shape limits in code (schema keeps to the supported subset):
    // at most three options, exactly one row per readiness area.
    const byArea = new Map(raw.readiness.map((r) => [r.area, r]));
    const report: Report = {
      ...raw,
      options: raw.options.slice(0, 3),
      readiness: AREAS.map(
        (area) =>
          byArea.get(area) ?? {
            area,
            assessment: "unable" as const,
            findings: "Not assessed.",
          }
      ),
    };

    await storeAiOutput(
      ctx,
      "report",
      { answersHash, shape: REPORT_SHAPE, report },
      REPORT_MODEL,
      PROMPT_VERSION
    );

    // A generated report marks the assessment complete (still editable;
    // regenerating after edits refreshes the report).
    await ctx.supabase
      .from("assessments")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", ctx.assessment.id);

    return NextResponse.json({
      report,
      answersHash,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("report generation failed:", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
