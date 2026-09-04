import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/instrument";
import { callStructured, MODEL, PROMPT_VERSION } from "@/lib/ai/claude";
import { SUMMARY_SCHEMA, summaryPrompts } from "@/lib/ai/prompts";
import { loadAiContext, storeAiOutput } from "@/lib/ai/context";

export async function POST(req: Request) {
  const { assessmentId } = await req.json().catch(() => ({}));
  const ctx = await loadAiContext(assessmentId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (ctx.assessment.version !== "diagnostic") {
    return NextResponse.json({ error: "diagnostic only" }, { status: 400 });
  }

  const instrument = getInstrument("diagnostic");
  const { system, user } = summaryPrompts(instrument, ctx.answers);

  try {
    const out = await callStructured<{ summary: string }>({
      system,
      user,
      schema: SUMMARY_SCHEMA,
      maxTokens: 400,
      effort: "low",
    });
    await storeAiOutput(ctx, "summary", out, MODEL, PROMPT_VERSION, "C");
    return NextResponse.json({ summary: out.summary });
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
