/**
 * AI completeness check for one section of the combined instrument,
 * shown on the section summary page (the hub). Prompt wording follows the
 * lab's specification (2026-09-13): summarize, assess per-question
 * completeness, surface gaps, ask at most five follow-ups, end with a
 * checkpoint the respondent confirms.
 */

import type { SurveySection, SurveyQuestion } from "@/lib/instrument";
import type { AnswerMap, AnswerValue } from "@/lib/steps";

export type SectionCheck = {
  summary: string;
  items: {
    qid: string;
    question: string;
    status: "complete" | "partial" | "not_answered" | "not_applicable";
    missing: string;
  }[];
  followups: string[];
  sufficient: boolean;
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
      description: "One row per question (and per grid statement)",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          qid: { type: "string", description: "The question id shown in the transcript" },
          question: { type: "string", description: "A very short label for the question" },
          status: {
            type: "string",
            enum: ["complete", "partial", "not_answered", "not_applicable"],
          },
          missing: {
            type: "string",
            description: "What is missing or unclear; empty string if nothing",
          },
        },
        required: ["qid", "question", "status", "missing"],
      },
    },
    followups: {
      type: "array",
      description:
        "Only the follow-up questions needed to resolve important gaps, five at most; empty if none",
      items: { type: "string" },
    },
    sufficient: {
      type: "boolean",
      description: "True when the section is sufficiently complete to proceed",
    },
    checkpoint: {
      type: "string",
      description:
        "One checkpoint message: 'Based on your responses, my understanding is: [summary]. Is this accurate, or is there anything you would like to clarify before moving on?'",
    },
  },
  required: ["summary", "items", "followups", "sufficient", "checkpoint"],
} as const;

/** Per-section review criteria, verbatim from the lab's prompt spec. */
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

Your tasks:
1. Summarize the respondent's answers in 2 to 4 sentences.
2. Assess the completeness of each question as: complete, partial (partially complete), not_answered, or not_applicable.
3. Identify important gaps or unclear information.
4. Ask only the follow-up questions needed to fill those gaps (maximum 5 at a time). If there are no important gaps, return no follow-up questions and mark the section sufficient.
5. End with a checkpoint asking the respondent to confirm your summary is accurate, in this form: "Based on your responses, my understanding is: [1-2 sentence summary]. Is this accurate, or is there anything you would like to clarify before moving on?"

Rules:
- Use simple, nontechnical language.
- Do not invent information. Base everything only on what the respondent wrote or selected.
- Do not ask the respondent to repeat information they have already provided.
- An answer of "Not sure" or a skipped question counts as an open unknown: use status partial (if partly answered) or not_answered, and note what is unknown.
- Use not_applicable only where the respondent chose a Not applicable option or the question clearly does not apply to this use case.
- Keep follow-up questions specific and answerable by a program team without technical AI knowledge.
- Write in plain sentences. Never use em dashes; use commas, colons, or separate sentences instead.`;

function answerLines(q: SurveyQuestion, answers: AnswerMap): string[] {
  const lines: string[] = [];
  const optionLabel = (opts: { value: string; label: string }[] | undefined, v?: string) =>
    opts?.find((o) => o.value === v)?.label;

  if (q.kind === "grid") {
    lines.push(`${q.id} · ${q.prompt}`);
    for (const st of q.statements) {
      const v = answers[st.id];
      let rating = "(not answered)";
      if (v?.idk) rating = q.scale.idk.label;
      else if (v?.na) rating = q.scale.na.label;
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

  const v: AnswerValue | undefined = answers[q.id];
  lines.push(`${q.id} · ${q.prompt}`);

  if (q.kind === "text") {
    if (v?.idk) lines.push(`  Answer: (skipped, respondent selected "I don't know")`);
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
        if (v?.followupOther?.trim()) lines.push(`    Other: ${v.followupOther.trim()}`);
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
      labels.length ? `  Selected: ${labels.join("; ")}` : "  Selected: (not answered)"
    );
    if (v?.other?.trim()) lines.push(`  Other: ${v.other.trim()}`);
  }

  return lines;
}

export function buildSectionCheckUser(
  section: SurveySection,
  sectionNumber: number,
  answers: AnswerMap
): string {
  const c = CRITERIA[section.id] ?? { bullets: [] };
  const transcript = section.questions
    .flatMap((q) => answerLines(q, answers))
    .join("\n");
  return `Section ${sectionNumber}: ${section.title}
${section.purpose}

Check whether the responses clearly establish:
${c.bullets.map((b) => `- ${b}`).join("\n")}
${c.extra ? `\n${c.extra}\n` : ""}
Respondent's answers (questions with no answer are shown as "(not answered)"):

${transcript}`;
}

/** Stable hash of a section's answers, used to reuse unchanged checks. */
export function hashSectionAnswers(
  ids: string[],
  answers: AnswerMap
): string {
  const payload = JSON.stringify(ids.map((id) => [id, answers[id] ?? null]));
  let h = 5381;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
