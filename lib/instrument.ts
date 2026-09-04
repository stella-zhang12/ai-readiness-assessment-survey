/**
 * Typed access to the assessment instrument content.
 *
 * The JSON files under content/instrument/ are the single source of truth for
 * every question, guidance paragraph, example, and scale label (transcribed
 * from "Revised Version of AI Readiness (Re-Scoped).docx" — see PRD §4).
 * Code renders content; it never hard-codes it.
 */

import brainstormJson from "@/content/instrument/brainstorm.v1.json";
import diagnosticJson from "@/content/instrument/diagnostic.v1.json";
import feedbackJson from "@/content/instrument/feedback.v1.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExampleVariant = {
  text: string;
  /** Claude-drafted placeholder awaiting lab review (PRD §4). */
  draft?: boolean;
  note?: string;
};

export type QuestionChip = { label: string; hint?: string };

export type TextQuestion = {
  id: string;
  handle: string;
  prompt: string;
  guidance?: string;
  helper?: string;
  helperDraft?: boolean;
  opener?: boolean;
  openerNudge?: string;
  exampleChips?: string[];
  chips?: QuestionChip[];
  examples?: { crvs?: ExampleVariant; healthcare?: ExampleVariant };
};

export type LikertItem = {
  id: string;
  parent: string | null;
  statement: string;
  guidance?: string;
  na?: { label: string; helper?: string };
};

export type ScaleOption = {
  value: number;
  label: string;
  short: string;
  color: "green" | "amber" | "red";
};

export type TextSection = {
  id: string;
  type: "text";
  title: string;
  subtitle?: string;
  purpose?: string;
  questions: TextQuestion[];
};

export type LikertSection = {
  id: string;
  type: "likert";
  title: string;
  question: string;
  items: LikertItem[];
};

export type AiSummarySection = {
  id: string;
  type: "ai_summary";
  title: string;
  purpose?: string;
  aiLabel: string;
  editable: boolean;
  confirmation: {
    id: string;
    prompt: string;
    options: { value: number; label: string }[];
  };
};

export type ResultsElement = {
  id: string;
  label: string;
  docId: string;
  source: "D1" | "D2" | "D3" | "AB";
};

export type ResultsSection = {
  id: string;
  type: "results";
  title: string;
  aiLabel: string;
  presentation: "table";
  elements: ResultsElement[];
  anchor: {
    thresholds: { redBelow: number; amberBelow: number };
    maxDeviationBands: number;
    lowConfidenceIdkRatio: number;
  };
};

export type Section =
  | TextSection
  | LikertSection
  | AiSummarySection
  | ResultsSection;

export type Instrument = {
  id: "brainstorm" | "diagnostic";
  version: number;
  title: string;
  chooserDescription: string;
  estimatedMinutes: string;
  disclaimer: string;
  sections: Section[];
  scale?: { options: ScaleOption[]; idk: { label: string; short: string } };
  promptRules?: string[];
  workedExample?: { title: string; text: string };
};

export type FeedbackQuestion =
  | {
      id: string;
      type: "rating";
      prompt: string;
      min: number;
      max: number;
      minLabel: string;
      maxLabel: string;
    }
  | { id: string; type: "text"; prompt: string };

export type FeedbackSurvey = {
  id: "feedback";
  version: number;
  title: string;
  intro: string;
  questions: FeedbackQuestion[];
};

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

export const brainstorm = brainstormJson as unknown as Instrument;
export const diagnostic = diagnosticJson as unknown as Instrument;
export const feedbackSurvey = feedbackJson as unknown as FeedbackSurvey;

export function getInstrument(id: string): Instrument {
  if (id === "brainstorm") return brainstorm;
  if (id === "diagnostic") return diagnostic;
  throw new Error(`Unknown instrument: ${id}`);
}

/** e.g. "diagnostic.v1" — stored on each assessment row. */
export function instrumentVersionTag(instrument: Instrument): string {
  return `${instrument.id}.v${instrument.version}`;
}

export function textSections(i: Instrument): TextSection[] {
  return i.sections.filter((s): s is TextSection => s.type === "text");
}

export function likertSections(i: Instrument): LikertSection[] {
  return i.sections.filter((s): s is LikertSection => s.type === "likert");
}

/** Every answerable question id, in instrument order (for progress math). */
export function answerableIds(i: Instrument): string[] {
  const ids: string[] = [];
  for (const s of i.sections) {
    if (s.type === "text") ids.push(...s.questions.map((q) => q.id));
    else if (s.type === "likert") ids.push(...s.items.map((it) => it.id));
    else if (s.type === "ai_summary") ids.push(s.confirmation.id);
  }
  return ids;
}
