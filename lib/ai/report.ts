/**
 * The AI Solution Scoping Report: the survey's final output, generated
 * from all four sections' answers. Prompt structure follows the lab's
 * specification (2026-09-13) verbatim where possible. Solution-neutral by
 * design: the model must consider non-AI and hybrid approaches and never
 * assume AI is the right answer.
 */

import type { Instrument } from "@/lib/instrument";
import { surveyQuestionIds, surveySections } from "@/lib/instrument";
import type { AnswerMap } from "@/lib/steps";
import { answerLines } from "./sectionCheck";

export type Report = {
  use_case_summary: {
    problem: string;
    current_process: string;
    users: string;
    inputs: string;
    outputs: string;
    output_use: string;
    desired_outcomes: string;
  };
  approach: {
    classification: "ai" | "hybrid" | "non_ai" | "insufficient";
    reasoning: string;
    ai_capability:
      | "classification"
      | "prediction"
      | "information_extraction"
      | "summarization"
      | "generation"
      | "pattern_recognition"
      | "other"
      | "none";
  };
  options: {
    title: string;
    how_it_works: string;
    best_if: string;
    advantages: string[];
    limitations: string[];
    requirements: string[];
    cost: {
      setup: "low" | "moderate" | "high";
      ongoing: "low" | "moderate" | "high";
      note: string;
    };
  }[];
  readiness: {
    area: "use_case" | "data" | "safety" | "country";
    assessment: "ready" | "some_gaps" | "major_gaps" | "unable";
    findings: string;
  }[];
  gaps: { title: string; why_it_matters: string }[];
  next_steps: {
    action: string;
    priority: "immediate" | "before_pilot" | "before_scale";
    gap: string;
  }[];
  overall: {
    verdict: "proceed" | "proceed_after_gaps" | "simpler_first" | "more_scoping";
    explanation: string;
  };
};

export const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    use_case_summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        problem: { type: "string", description: "The problem or task" },
        current_process: {
          type: "string",
          description: "Current process and main challenges",
        },
        users: { type: "string", description: "Primary users" },
        inputs: {
          type: "string",
          description: "Information provided to the system",
        },
        outputs: { type: "string", description: "Expected outputs" },
        output_use: {
          type: "string",
          description: "How outputs would be used",
        },
        desired_outcomes: { type: "string", description: "Desired outcomes" },
      },
      required: [
        "problem",
        "current_process",
        "users",
        "inputs",
        "outputs",
        "output_use",
        "desired_outcomes",
      ],
    },
    approach: {
      type: "object",
      additionalProperties: false,
      properties: {
        classification: {
          type: "string",
          enum: ["ai", "hybrid", "non_ai", "insufficient"],
        },
        reasoning: { type: "string" },
        ai_capability: {
          type: "string",
          enum: [
            "classification",
            "prediction",
            "information_extraction",
            "summarization",
            "generation",
            "pattern_recognition",
            "other",
            "none",
          ],
          description: "none when classification is non_ai or insufficient",
        },
      },
      required: ["classification", "reasoning", "ai_capability"],
    },
    options: {
      type: "array",
      description:
        "Up to three realistic options including AI, hybrid, or non-AI alternatives where appropriate",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          how_it_works: { type: "string" },
          best_if: {
            type: "string",
            description:
              "One sentence starting with 'Best if' saying when this option is the right choice",
          },
          advantages: { type: "array", items: { type: "string" } },
          limitations: { type: "array", items: { type: "string" } },
          requirements: { type: "array", items: { type: "string" } },
          cost: {
            type: "object",
            additionalProperties: false,
            properties: {
              setup: { type: "string", enum: ["low", "moderate", "high"] },
              ongoing: { type: "string", enum: ["low", "moderate", "high"] },
              note: {
                type: "string",
                description:
                  "One sentence naming the main cost drivers; no currency amounts unless the respondent provided figures",
              },
            },
            required: ["setup", "ongoing", "note"],
          },
        },
        required: [
          "title",
          "how_it_works",
          "best_if",
          "advantages",
          "limitations",
          "requirements",
          "cost",
        ],
      },
    },
    readiness: {
      type: "array",
      description: "Exactly four rows: use_case, data, safety, country",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          area: {
            type: "string",
            enum: ["use_case", "data", "safety", "country"],
          },
          assessment: {
            type: "string",
            enum: ["ready", "some_gaps", "major_gaps", "unable"],
          },
          findings: { type: "string", description: "Key findings, 1-3 sentences" },
        },
        required: ["area", "assessment", "findings"],
      },
    },
    gaps: {
      type: "array",
      description:
        "Only the most important gaps that could affect development, implementation, or scale-up",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          why_it_matters: { type: "string" },
        },
        required: ["title", "why_it_matters"],
      },
    },
    next_steps: {
      type: "array",
      description: "A specific, practical next step for each major gap",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          priority: {
            type: "string",
            enum: ["immediate", "before_pilot", "before_scale"],
          },
          gap: {
            type: "string",
            description:
              "The exact title of the gap this step addresses, or an empty string for general steps",
          },
        },
        required: ["action", "priority", "gap"],
      },
    },
    overall: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: {
          type: "string",
          enum: [
            "proceed",
            "proceed_after_gaps",
            "simpler_first",
            "more_scoping",
          ],
        },
        explanation: { type: "string" },
      },
      required: ["verdict", "explanation"],
    },
  },
  required: [
    "use_case_summary",
    "approach",
    "options",
    "readiness",
    "gaps",
    "next_steps",
    "overall",
  ],
} as const;

export const REPORT_SYSTEM = `Using all responses from Sections 1-4, generate an AI Solution Scoping Report.

Do not assume that AI is the best solution. Evaluate whether the proposed use case is better suited to an AI solution, a hybrid AI + rule-based approach, or a simpler non-AI digital solution. Base all conclusions only on the information provided by the respondent. Clearly identify any uncertainties or missing information; questions shown as "(not answered)" were not answered, and you must not fill them in with assumptions.

Structure the report as follows:

1. Use Case Summary. Briefly summarize: the problem or task; current process and main challenges; primary users; information provided to the system; expected outputs; how outputs would be used; desired outcomes.

2. Recommended Solution Approach. Classify the use case as one of: AI solution appears appropriate; hybrid AI + non-AI approach may be appropriate; a non-AI digital solution may be sufficient; insufficient information to determine. Briefly explain the reasoning. If AI is appropriate, identify the main AI capability required (classification, prediction, information extraction, summarization, generation, pattern recognition, or other).

3. Potential Solution Options. Provide up to three realistic options. Include AI, hybrid, or non-AI alternatives where appropriate. For each option describe how it would work, one "best if" sentence saying when it is the right choice, main advantages, main limitations, and key requirements. Also estimate relative costs: rate set-up cost and ongoing cost each as low, moderate, or high, comparing the options with each other, with a one-sentence note naming the main cost drivers (staffing, licensing, integration, training, maintenance). Ground cost reasoning in the respondent's context where given. Never state currency amounts unless the respondent provided budget figures.

4. Readiness Assessment. Assess each of the four areas (use case, data readiness, safety and responsible use, country-level readiness) as Ready, Some gaps, Major gaps, or Unable to assess, with key findings. Do not calculate an overall numerical readiness score.

5. Key Gaps and Risks. Identify only the most important gaps that could affect successful development, implementation, or scale-up. Consider: data availability or quality, representativeness, human oversight, privacy and data governance, regulatory requirements, infrastructure, workforce skills, funding and sustainability, leadership support, and user readiness.

6. Recommended Next Steps. For each major gap, provide a specific and practical next step, prioritized as immediate, before development or piloting, or before wider implementation. Tag each step with the exact title of the gap it addresses (empty string for general steps), so gaps and their actions can be shown together.

7. Overall Recommendation. Conclude with one of: proceed to technical design/pilot; proceed after addressing key gaps; explore a simpler or hybrid solution first; further scoping is needed before proceeding. Provide a brief explanation.

Use clear, nontechnical language appropriate for health program teams, government stakeholders, and implementing partners in low- and middle-income country settings. Be concise, practical, and transparent about uncertainty. Write in plain sentences. Never use em dashes; use commas, colons, or separate sentences instead.`;

/** Full transcript of every question and answer across all four sections. */
export function buildReportUser(
  instrument: Instrument,
  answers: AnswerMap
): string {
  const parts: string[] = [];
  const sections = surveySections(instrument);
  sections.forEach((s, i) => {
    const include = new Set(surveyQuestionIds(s));
    const lines = s.questions.flatMap((q) => answerLines(q, answers, include));
    parts.push(`## Section ${i + 1}: ${s.title}\n${s.purpose}\n\n${lines.join("\n")}`);
  });
  return `Respondent's full questionnaire (questions with no answer are shown as "(not answered)"):\n\n${parts.join("\n\n")}`;
}
