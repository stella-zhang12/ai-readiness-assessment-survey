import { NextResponse } from "next/server";
import {
  getInstrument,
  likertSections,
  textSections,
  type Instrument,
} from "@/lib/instrument";
import { anchorForElement, bandDistance } from "@/lib/scoring.mjs";
import { callStructured, MODEL, PROMPT_VERSION } from "@/lib/ai/claude";
import {
  buildRatingBlocks,
  buildSectionsAB,
  answerText,
  followupsPrompts,
  judgmentPrompts,
  FOLLOWUPS_SCHEMA,
  JUDGMENT_SCHEMA,
  type Followups,
  type Judgment,
} from "@/lib/ai/prompts";
import { loadAiContext, storeAiOutput, type AiContext } from "@/lib/ai/context";
import type { AnswerMap } from "@/lib/steps";

type Anchor = ReturnType<typeof anchorForElement>;
type Anchors = Record<string, Anchor>;

const ELEMENT_SOURCES: Record<string, "D1" | "D2" | "D3" | "AB"> = {
  data_readiness: "D1",
  safety: "D2",
  country_readiness: "D3",
  use_case_readiness: "AB",
};

function computeAnchors(instrument: Instrument, answers: AnswerMap): Anchors {
  const anchors: Anchors = {};
  for (const [element, source] of Object.entries(ELEMENT_SOURCES)) {
    if (source === "AB") continue;
    const section = likertSections(instrument).find((s) => s.id === source);
    if (section) anchors[element] = anchorForElement(section.items, answers);
  }
  return anchors;
}

function allQids(instrument: Instrument): Set<string> {
  const ids = new Set<string>();
  for (const s of instrument.sections) {
    if (s.type === "text") s.questions.forEach((q) => ids.add(q.id));
    if (s.type === "likert") s.items.forEach((i) => ids.add(i.id));
  }
  return ids;
}

/** Enforce the PRD §7.4 guardrails. Returns a corrected judgment or null. */
function validateJudgment(
  j: Judgment,
  anchors: Anchors,
  valid: Set<string>
): Judgment | null {
  if (!Array.isArray(j.elements) || j.elements.length !== 4) return null;
  const seen = new Set(j.elements.map((e) => e.id));
  if (seen.size !== 4) return null;

  for (const el of j.elements) {
    el.drivers = (el.drivers ?? []).filter((d) => valid.has(d.qid));
    if (el.drivers.length < 2) return null;

    const anchor = anchors[el.id];
    if (anchor?.band) {
      const dist = bandDistance(anchor.band, el.level);
      if (dist !== null && dist > 1) return null;
      if (anchor.idkRatio >= 0.5) el.confidence = "low"; // forced, not optional
    }
  }
  return j;
}

function fallbackJudgment(anchors: Anchors): Judgment {
  const template = (id: Judgment["elements"][number]["id"]): Judgment["elements"][number] => {
    const anchor = anchors[id];
    return {
      id,
      level: anchor?.band ?? "amber",
      reasoning:
        "This rating is derived directly from your team's ratings; the AI explanation could not be generated. Use \"Generate again\" to retry.",
      drivers: [],
      confidence: anchor && anchor.idkRatio >= 0.5 ? "low" : "medium",
    };
  };
  return {
    elements: [
      template("data_readiness"),
      template("safety"),
      template("country_readiness"),
      template("use_case_readiness"),
    ],
    overall_note:
      "Ratings shown are computed from your answers; the AI reasoning is temporarily unavailable.",
    fallback: true,
  };
}

function buildGaps(instrument: Instrument, answers: AnswerMap): string {
  const lines: string[] = [];
  for (const s of textSections(instrument)) {
    for (const q of s.questions) {
      const a = answerText(answers, q.id);
      if (a.state === "idk") lines.push(`${q.id} — marked "I don't know": ${q.prompt}`);
      else if (a.state === "empty") lines.push(`${q.id} — not answered: ${q.prompt}`);
      else if (a.text.split(/\s+/).length < 15)
        lines.push(`${q.id} — very brief answer ("${a.text}"): ${q.prompt}`);
    }
  }
  for (const s of likertSections(instrument)) {
    for (const it of s.items) {
      const v = answers[it.id];
      if (v?.idk) lines.push(`${it.id} — rated "I don't know": ${it.statement}`);
      else if (v?.rating === 0) lines.push(`${it.id} — rated Absent: ${it.statement}`);
      else if (!v?.na && v?.rating === undefined)
        lines.push(`${it.id} — not rated: ${it.statement}`);
    }
  }
  return lines.length ? lines.join("\n") : "[no gaps — everything answered]";
}

function fallbackFollowups(instrument: Instrument, answers: AnswerMap): Followups {
  const todos: Followups["todos"] = [];
  for (const s of textSections(instrument)) {
    for (const q of s.questions) {
      if (answers[q.id]?.idk && todos.length < 8) {
        todos.push({
          qid: q.id,
          action: `Find out: ${q.prompt}`,
          why: 'Marked "I don\'t know" during the assessment.',
        });
      }
    }
  }
  for (const s of likertSections(instrument)) {
    for (const it of s.items) {
      if (answers[it.id]?.idk && todos.length < 8) {
        todos.push({
          qid: it.id,
          action: `Find out whether this holds: ${it.statement}`,
          why: 'Marked "I don\'t know" during the assessment.',
        });
      }
    }
  }
  return { todos, fallback: true };
}

async function latestOutput(ctx: AiContext, kind: "final" | "followups") {
  const { data } = await ctx.supabase
    .from("ai_outputs")
    .select("content, created_at")
    .eq("assessment_id", ctx.assessment.id)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.content ?? null;
}

export async function POST(req: Request) {
  const { assessmentId, regenerate } = await req.json().catch(() => ({}));
  const ctx = await loadAiContext(assessmentId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const instrument = getInstrument(ctx.assessment.version);
  const isDiagnostic = ctx.assessment.version === "diagnostic";

  // Serve stored results unless a regeneration is requested.
  if (!regenerate) {
    const [judgment, followups] = await Promise.all([
      isDiagnostic ? latestOutput(ctx, "final") : Promise.resolve(null),
      latestOutput(ctx, "followups"),
    ]);
    if ((judgment || !isDiagnostic) && followups) {
      return NextResponse.json({ judgment, followups, cached: true });
    }
  }

  const valid = allQids(instrument);
  const gaps = buildGaps(instrument, ctx.answers);

  // ---- follow-ups (both versions); runs concurrently with the judgment ----
  const followupsPromise: Promise<Followups> = (async () => {
    try {
      const { system, user } = followupsPrompts(gaps);
      const out = await callStructured<Followups>({
        system,
        user,
        schema: FOLLOWUPS_SCHEMA,
        maxTokens: 900,
        effort: "low",
      });
      out.todos = (out.todos ?? [])
        .filter((t) => !t.qid || valid.has(t.qid))
        .slice(0, 8);
      return out;
    } catch {
      return fallbackFollowups(instrument, ctx.answers);
    }
  })();

  if (!isDiagnostic) {
    const followups = await followupsPromise;
    await storeAiOutput(ctx, "followups", followups, MODEL, PROMPT_VERSION);
    return NextResponse.json({ judgment: null, followups });
  }

  // ---- final judgment (diagnostic only) ----
  const anchors = computeAnchors(instrument, ctx.answers);
  const scale = instrument.scale!;
  const label = (r: number) =>
    scale.options.find((o) => o.value === r)?.label ?? String(r);

  const c1 = ctx.answers["C1"]?.rating;
  const c1Label =
    c1 === 2 ? "accurate" : c1 === 1 ? "partially accurate" : c1 === 0 ? "not accurate" : null;

  const promptInput = {
    summary: ctx.answers["C.summary_final"]?.text ?? null,
    sectionsAB: buildSectionsAB(instrument, ctx.answers),
    ratingBlocks: buildRatingBlocks(likertSections(instrument), ctx.answers, label),
    aggregates: Object.entries(anchors)
      .map(([el, a]) => {
        const c = a.counts;
        return `${el}: mean ${a.mean === null ? "n/a" : a.mean.toFixed(2)} over ${c.rated} rated · ${c.idk} don't-know · ${c.na} N/A · ${c.unanswered} unanswered`;
      })
      .join("\n"),
    c1Label,
  };

  let judgment: Judgment | null = null;
  const { system, user } = judgmentPrompts(promptInput);
  for (let attempt = 0; attempt < 2 && !judgment; attempt++) {
    try {
      const raw = await callStructured<Judgment>({
        system,
        user:
          attempt === 0
            ? user
            : `${user}\n\nIMPORTANT: your previous attempt failed validation. Ratings must faithfully track the team's own ratings, and every element needs at least 2 drivers citing the exact question IDs provided above.`,
        schema: JUDGMENT_SCHEMA,
        maxTokens: 3000,
        effort: "medium",
      });
      judgment = validateJudgment(raw, anchors, valid);
    } catch {
      break;
    }
  }
  if (!judgment) judgment = fallbackJudgment(anchors);

  const followups = await followupsPromise;
  await storeAiOutput(ctx, "followups", followups, MODEL, PROMPT_VERSION);

  // Cap E1.4 confidence when the team said the summary missed the mark (PRD G3).
  if (c1 !== undefined && c1 <= 1) {
    const uc = judgment.elements.find((e) => e.id === "use_case_readiness");
    if (uc && uc.confidence === "high") uc.confidence = "medium";
  }

  // Anchor stored alongside for the pilot audit (PRD §7.4).
  await storeAiOutput(ctx, "final", { ...judgment, anchor: anchors }, MODEL, PROMPT_VERSION);

  await ctx.supabase
    .from("assessments")
    .update({ status: "complete", completed_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq("id", ctx.assessment.id);

  return NextResponse.json({ judgment, followups });
}
