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
import combinedJson from "@/content/instrument/combined.v1.json";
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
  /** Collapsible explainer shown under the helper (combined instrument). */
  info?: { title: string; body: string[] };
  /** Companion numeric rating shown under the text box (combined instrument). */
  scale?: {
    prompt: string;
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
};

// ------------------------------------------------------- combined instrument

export type SelectOption = { value: string; label: string };

export type SelectOneQuestion = {
  kind: "select_one";
  id: string;
  handle: string;
  prompt: string;
  helper?: string;
  options: SelectOption[];
  /** Conditional follow-up shown when the chosen option matches `when`. */
  followup?: {
    when: string;
    type: "text" | "select_one";
    prompt: string;
    options?: SelectOption[];
    otherValue?: string;
  };
  /** Always-visible optional free-text line under the options. */
  optionalText?: string;
};

export type SelectManyQuestion = {
  kind: "select_many";
  id: string;
  handle: string;
  prompt: string;
  helper?: string;
  options: SelectOption[];
  /** Option value that reveals a write-in field. */
  otherValue?: string;
  /** Option values that clear all other selections when chosen. */
  exclusive?: string[];
};

export type GridStatement = { id: string; label: string; statement: string };

export type GridQuestion = {
  kind: "grid";
  id: string;
  handle: string;
  prompt: string;
  helper?: string;
  scale: {
    options: { value: number; label: string; color: "green" | "amber" | "red" }[];
    idk: { label: string };
    na: { label: string };
  };
  explainLabel?: string;
  statements: GridStatement[];
};

export type GoalsQuestion = {
  kind: "goals";
  id: string;
  handle: string;
  prompt: string;
  helper?: string;
  /** UI labels for the goal builder (content lives in the JSON). */
  labels: { metric: string; before: string; after: string; add: string };
  examples?: { crvs?: ExampleVariant; healthcare?: ExampleVariant };
};

export type SurveyQuestion =
  | (TextQuestion & { kind: "text" })
  | SelectOneQuestion
  | SelectManyQuestion
  | GridQuestion
  | GoalsQuestion;

export type SurveySection = {
  id: string;
  type: "survey";
  title: string;
  /** The element definition shown on the section hub. */
  purpose: string;
  /** Extra intro paragraph (Data Readiness). */
  intro?: string;
  questions: SurveyQuestion[];
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
  | ResultsSection
  | SurveySection;

export type Instrument = {
  id: "brainstorm" | "diagnostic" | "combined";
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
export const combined = combinedJson as unknown as Instrument;
export const feedbackSurvey = feedbackJson as unknown as FeedbackSurvey;

export function getInstrument(id: string): Instrument {
  if (id === "brainstorm") return brainstorm;
  if (id === "diagnostic") return diagnostic;
  if (id === "combined") return combined;
  throw new Error(`Unknown instrument: ${id}`);
}

export function surveySections(i: Instrument): SurveySection[] {
  return i.sections.filter((s): s is SurveySection => s.type === "survey");
}

/** Every answerable id in a survey section; grid statements count singly. */
export function surveyQuestionIds(s: SurveySection): string[] {
  return s.questions.flatMap((q) =>
    q.kind === "grid" ? q.statements.map((st) => st.id) : [q.id]
  );
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
    else if (s.type === "survey") ids.push(...surveyQuestionIds(s));
  }
  return ids;
}
