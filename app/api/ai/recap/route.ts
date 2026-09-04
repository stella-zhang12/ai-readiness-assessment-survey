import { NextResponse } from "next/server";
import { getInstrument, type TextSection } from "@/lib/instrument";
import { callStructured, MODEL, PROMPT_VERSION } from "@/lib/ai/claude";
import { RECAP_SCHEMA, recapPrompts, answerText } from "@/lib/ai/prompts";
import { loadAiContext, storeAiOutput } from "@/lib/ai/context";

export async function POST(req: Request) {
  const { assessmentId, sectionId } = await req.json().catch(() => ({}));
  const ctx = await loadAiContext(assessmentId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const instrument = getInstrument(ctx.assessment.version);
  const section = instrument.sections.find(
    (s): s is TextSection => s.type === "text" && s.id === sectionId
  );
  if (!section) {
    return NextResponse.json({ error: "unknown section" }, { status: 400 });
  }

  // Nothing to recap if the section is essentially empty.
  const anyAnswer = section.questions.some(
    (q) => answerText(ctx.answers, q.id).state === "answered"
  );
  if (!anyAnswer) return NextResponse.json({ recap: null });

  const { system, user } = recapPrompts(section, ctx.answers);
  try {
    const out = await callStructured<{ recap: string }>({
      system,
      user,
      schema: RECAP_SCHEMA,
      maxTokens: 400,
      effort: "low",
    });
    await storeAiOutput(ctx, "recap", out, MODEL, PROMPT_VERSION, sectionId);
    return NextResponse.json({ recap: out.recap });
  } catch {
    // Recaps are motivational, not load-bearing (PRD §7.2) — fail silent.
    return NextResponse.json({ recap: null });
  }
}
