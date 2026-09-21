/**
 * Completeness check for one section of the combined instrument, shown on
 * the progress page. Statuses are split for consistency:
 *
 *   - "not_answered" and "not_applicable" are decided deterministically in
 *     code (an unanswered question can never flip status between runs);
 *   - the model only grades ANSWERED questions as complete vs partial and
 *     explains what is missing, at temperature 0.
 *
 * Prompt wording follows the lab's specification (2026-09-13): summarize,
 * assess completeness, explain gaps, end with a checkpoint the respondent
 * confirms.
 */

import type { SurveySection, SurveyQuestion } from "@/lib/instrument";
import { isAnswered, type AnswerMap, type AnswerValue } from "@/lib/steps";

export type CheckItem = {
  qid: string;
  question: string;
  status: "complete" | "partial" | "not_answered" | "not_applicable";
  missing: string;
};

export type SectionCheck = {
  summary: string;
  items: CheckItem[];
  sufficient: boolean;
  checkpoint: string;
};

/** What the model itself returns (answered questions only). */
export type ModelCheck = {
  summary: string;
  items: { qid: string; status: "complete" | "partial"; missing: string }[];
  checkpoint: string;
};

export const CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description:
        "2 to 4 sentence plain-language summary of what the respondent said in this section",
    },
    items: {
      type: "array",
      description: "One row per ANSWERED question listed in the transcript",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          qid: {
            type: "string",
            description: "The question id shown in the transcript",
          },
          status: { type: "string", enum: ["complete", "partial"] },
          missing: {
            type: "string",
            description:
              "For partial answers: what specifically to elaborate, building on what the respondent wrote (one or two short sentences). Empty string when status is complete",
          },
        },
        required: ["qid", "status", "missing"],
      },
    },
    checkpoint: {
      type: "string",
      description:
        "One checkpoint message: 'Based on your responses, my understanding is: [summary]. Is this accurate, or is there anything you would like to clarify before moving on?'",
    },
  },
  required: ["summary", "items", "checkpoint"],
} as const;

/** Per-section review criteria, from the lab's prompt spec. */
const CRITERIA: Record<string, { bullets: string[]; extra?: string }> = {
  S1: {
    bullets: [
      "The task or problem AI would address",
      "How the task is currently performed",
      "The main challenges",
      "Why AI may be needed rather than a simpler rule-based solution",
      "The primary users and their comfort with AI",
      "Information that would be provided to the AI",
      "Expected AI outputs",
      "How the outputs would be reviewed or used",
      "Specific measures of success",
    ],
  },
  S2: {
    bullets: [
      "Whether relevant historical data are available",
      "What data are available",
      "Data format and storage location",
      "Whether the team could get permission to use the data",
      "Amount and time period of available data",
      "Whether and how frequently data are still collected",
      "Whether records include final, confirmed outcomes the AI could learn from",
      "Whether the data are sufficiently digital, complete, consistent, geographically representative, population-representative, and inclusive of important less-common situations",
      "Whether processes exist to identify incorrect or unusual data",
    ],
    extra:
      "Highlight any data limitations that could affect development, testing, or implementation of the proposed AI solution.",
  },
  S3: {
    bullets: [
      "Where human review or approval would occur",
      "Which AI outputs or decisions require human oversight",
      "Relevant requirements for privacy, security, data sharing, legal data use, and regulatory compliance",
      "How the tool's accuracy would be monitored in use",
      "What would happen when the AI makes a mistake",
    ],
    extra:
      "Highlight any important safety or governance questions that remain unresolved.",
  },
  S4: {
    bullets: [
      "Leadership and government support",
      "Relevant national or regional AI, data protection, privacy, and data-sharing policies",
      "Availability of devices, software, connectivity, and data-storage infrastructure",
      "Availability of staff with the skills to implement, operate, and maintain the solution",
      "Regulatory, financial, staffing, infrastructure, or technical constraints",
      "Whether identified gaps could realistically be addressed",
    ],
  },
};

export const SECTION_CHECK_SYSTEM = `You are helping a health team assess readiness for a potential AI solution. You are reviewing one section of their intake questionnaire.

Only the ANSWERED questions are shown to you in full; unanswered questions are listed separately for context and are handled by the system, not by you.

Your tasks:
1. Summarize what the respondent has said so far in 2 to 4 sentences, in your own words. Interpret, do not just restate: reflect what their answers imply about the use case and note anything important that stays vague.
2. For each ANSWERED question, engage with the substance of the answer and grade it:
   - complete: the answer addresses every part of the question with enough specific detail (names, numbers, systems, roles, places, timeframes where relevant) that a scoping report could rely on it.
   - partial: the answer is vague or generic, covers only part of the question, leaves an obvious follow-on question hanging, or contains an unknown.
   For partial answers, the missing field must build on what they DID write and say specifically what to elaborate. Refer to their own words and name the concrete detail that would make the answer usable, for example: "You mention paper forms, but not how many records exist or who holds them." One or two short sentences.
3. End with a checkpoint asking the respondent to confirm your summary is accurate, in this form: "Based on your responses, my understanding is: [1-2 sentence summary]. Is this accurate, or is there anything you would like to clarify before moving on?"

Rules:
- Use simple, nontechnical language.
- Do not invent information. Base everything only on what the respondent wrote or selected.
- Grade each answer ONLY against what its own question asks. The other questions in this section are listed with their full wording; if a detail is the subject of a different question (for example challenges, users, data, or success measures asked separately), never request it here and never mark an answer partial for lacking it. An answer is complete when it covers its own question, even if related topics are still open elsewhere.
- Some answered questions include a worked example labeled "Expected level of detail". That example IS the bar for complete: an answer with comparable specificity is complete, an answer that matches or closely paraphrases the example is complete, and you must never ask for more detail than the example itself contains.
- Grade the same answer the same way every time. Specificity is the test: a one-line answer to a multi-part question is partial.
- An answer of "Not sure", "I don't know", or a selection without the requested detail is partial, with the open unknown named.
- For rating statements: a rating alone can be complete, but a rating of Partially or Not at all with no note explaining why is partial; ask what is behind the rating.
- Write in plain sentences. Never use em dashes; use commas, colons, or separate sentences instead.`;

/** Short display label for every answerable id in a section. */
export function questionLabels(section: SurveySection): Map<string, string> {
  const map = new Map<string, string>();
  for (const q of section.questions) {
    if (q.kind === "grid") {
      for (const st of q.statements) map.set(st.id, st.label);
    } else {
      map.set(q.id, q.handle);
    }
  }
  return map;
}

/** Full question wording per answerable id, for scope boundaries. */
function questionPrompts(section: SurveySection): Map<string, string> {
  const map = new Map<string, string>();
  for (const q of section.questions) {
    if (q.kind === "grid") {
      for (const st of q.statements) map.set(st.id, st.statement);
    } else {
      map.set(q.id, q.prompt);
    }
  }
  return map;
}

/** Deterministic split: which ids the model grades vs fixed statuses. */
export function classifySection(
  section: SurveySection,
  answers: AnswerMap
): { answeredIds: string[]; fixed: CheckItem[] } {
  const labels = questionLabels(section);
  const answeredIds: string[] = [];
  const fixed: CheckItem[] = [];
  for (const [qid, label] of labels) {
    const v = answers[qid];
    if (v?.na) {
      fixed.push({
        qid,
        question: label,
        status: "not_applicable",
        missing: "",
      });
    } else if (isAnswered(v)) {
      answeredIds.push(qid);
    } else {
      fixed.push({
        qid,
        question: label,
        status: "not_answered",
        missing: "Not answered yet.",
      });
    }
  }
  return { answeredIds, fixed };
}

export function answerLines(
  q: SurveyQuestion,
  answers: AnswerMap,
  include: Set<string>
): string[] {
  const lines: string[] = [];
  const optionLabel = (
    opts: { value: string; label: string }[] | undefined,
    v?: string
  ) => opts?.find((o) => o.value === v)?.label;

  if (q.kind === "grid") {
    const rows = q.statements.filter((st) => include.has(st.id));
    if (rows.length === 0) return lines;
    lines.push(`${q.id} · ${q.prompt}`);
    for (const st of rows) {
      const v = answers[st.id];
      let rating = "(not answered)";
      if (v?.idk) rating = q.scale.idk.label;
      else if (v?.rating !== undefined)
        rating =
          q.scale.options.find((o) => o.value === v.rating)?.label ??
          String(v.rating);
      lines.push(`  ${st.id} · ${st.label}: ${st.statement}`);
      lines.push(`    Rating: ${rating}`);
      if (v?.note?.trim()) lines.push(`    Note: ${v.note.trim()}`);
    }
    return lines;
  }

  if (!include.has(q.id)) return lines;
  const v: AnswerValue | undefined = answers[q.id];
  lines.push(`${q.id} · ${q.prompt}`);

  if (q.kind === "goals") {
    const filled = (v?.goals ?? []).filter(
      (g) => g.metric.trim() || g.before.trim() || g.after.trim()
    );
    if (v?.idk)
      lines.push(`  Answer: (skipped, respondent selected "I don't know")`);
    else if (filled.length > 0) {
      filled.forEach((g, i) => {
        lines.push(
          `  Goal ${i + 1}: ${g.metric.trim() || "(not named)"} | Before: ${
            g.before.trim() || "(blank)"
          } | After: ${g.after.trim() || "(blank)"}`
        );
      });
    } else if (v?.text?.trim()) lines.push(`  Answer: ${v.text.trim()}`);
    else lines.push("  Answer: (not answered)");
    return lines;
  }

  if (q.kind === "text") {
    if (v?.idk)
      lines.push(`  Answer: (skipped, respondent selected "I don't know")`);
    else if (v?.text?.trim()) lines.push(`  Answer: ${v.text.trim()}`);
    else lines.push("  Answer: (not answered)");
    if (q.scale) {
      lines.push(
        v?.scale !== undefined
          ? `  ${q.scale.prompt} Rating: ${v.scale} (scale ${q.scale.min}-${q.scale.max}, ${q.scale.minLabel}; ${q.scale.maxLabel})`
          : `  ${q.scale.prompt} (no rating given)`
      );
    }
  }

  if (q.kind === "select_one") {
    const label = optionLabel(q.options, v?.choice);
    lines.push(`  Selected: ${label ?? "(not answered)"}`);
    if (q.followup && v?.choice === q.followup.when) {
      if (q.followup.type === "text") {
        lines.push(
          `  ${q.followup.prompt} ${v?.followupText?.trim() ? v.followupText.trim() : "(not answered)"}`
        );
      } else {
        const fl = optionLabel(q.followup.options, v?.followupChoice);
        lines.push(`  ${q.followup.prompt} ${fl ?? "(not answered)"}`);
        if (v?.followupOther?.trim())
          lines.push(`    Other: ${v.followupOther.trim()}`);
      }
    }
    if (q.optionalText && v?.followupText?.trim())
      lines.push(`  ${q.optionalText} ${v.followupText.trim()}`);
  }

  if (q.kind === "select_many") {
    const labels = (v?.choices ?? [])
      .map((c) => optionLabel(q.options, c))
      .filter(Boolean);
    lines.push(
      labels.length
        ? `  Selected: ${labels.join("; ")}`
        : "  Selected: (not answered)"
    );
    if (v?.other?.trim()) lines.push(`  Other: ${v.other.trim()}`);
  }

  return lines;
}

export function buildSectionCheckUser(
  section: SurveySection,
  sectionNumber: number,
  answers: AnswerMap,
  answeredIds: string[],
  fixed: CheckItem[]
): string {
  const c = CRITERIA[section.id] ?? { bullets: [] };
  const include = new Set(answeredIds);
  const prompts = questionPrompts(section);
  const transcript = section.questions
    .flatMap((q) => {
      const lines = answerLines(q, answers, include);
      // Calibrate grading: the worked example sets the expected depth.
      if (lines.length > 0 && (q.kind === "text" || q.kind === "goals")) {
        const ex = q.examples?.crvs?.text ?? q.examples?.healthcare?.text;
        if (ex) lines.push(`  Expected level of detail (worked example): ${ex}`);
      }
      return lines;
    })
    .join("\n");
  const unanswered = fixed
    .filter((f) => f.status === "not_answered")
    .map((f) => `- ${f.qid} · ${prompts.get(f.qid) ?? f.question}`)
    .join("\n");
  return `Section ${sectionNumber}: ${section.title}
${section.purpose}

This section as a whole checks whether the responses establish:
${c.bullets.map((b) => `- ${b}`).join("\n")}
${c.extra ? `\n${c.extra}\n` : ""}
Answered questions to grade (one item per qid below):

${transcript || "(none)"}

Questions asked separately later in this section (not yet answered; do not grade them, and do not request their subject matter under any answered question above):
${unanswered || "(none)"}`;
}

/** Sort object keys so client state and jsonb round-trips hash alike. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])])
    );
  }
  return v;
}

/** Stable hash of a section's answers, used to reuse unchanged checks.
 * Computed identically on the client (skip re-fetch) and server (cache). */
export function hashSectionAnswers(ids: string[], answers: AnswerMap): string {
  const payload = JSON.stringify(
    ids.map((id) => [id, canonical(answers[id] ?? null)])
  );
  let h = 5381;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
