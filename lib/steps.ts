import type {
  Instrument,
  LikertSection,
  SurveyQuestion,
  SurveySection,
  TextQuestion,
  TextSection,
} from "./instrument";
import { surveyQuestionIds, surveySections } from "./instrument";

/** One saved answer. Free-text and rating fields as in the PRD; the combined
 * instrument adds selection fields (choice/choices/other), conditional
 * follow-up fields, a companion numeric scale, and per-statement notes. */
export type AnswerValue = {
  text?: string;
  rating?: number; // hidden 0/1/2 — labels live in the instrument JSON
  idk?: true;
  na?: true;
  choice?: string;
  choices?: string[];
  other?: string;
  followupText?: string;
  followupChoice?: string;
  followupOther?: string;
  scale?: number;
  note?: string;
};

export type AnswerMap = Record<string, AnswerValue>;

export type Step =
  | {
      kind: "question";
      key: string;
      sectionId: string;
      sectionTitle: string;
      q: TextQuestion;
      indexInSection: number;
      sectionSize: number;
    }
  | {
      kind: "milestone";
      key: string;
      doneTitle: string;
      nextTitle: string;
    }
  | { kind: "likert"; key: string; section: LikertSection }
  | { kind: "summary_placeholder"; key: string }
  | { kind: "review"; key: string }
  | { kind: "transcript"; key: string };

/**
 * Flatten an instrument into the runner's step list.
 * Text sections -> one step per question, with a milestone between sections.
 * Likert sections -> one step per sub-section (all rows together, per the
 * instrument's instruction). Diagnostic ends in review; Brainstorm in the
 * printable transcript.
 */
export function buildSteps(instrument: Instrument): Step[] {
  const steps: Step[] = [];
  const sections = instrument.sections;

  sections.forEach((s, si) => {
    if (s.type === "text") {
      const ts = s as TextSection;
      ts.questions.forEach((q, qi) => {
        steps.push({
          kind: "question",
          key: q.id,
          sectionId: ts.id,
          sectionTitle: ts.subtitle ? `${ts.title} · ${ts.subtitle}` : ts.title,
          q,
          indexInSection: qi,
          sectionSize: ts.questions.length,
        });
      });
      const next = sections[si + 1];
      if (next && next.type === "text") {
        steps.push({
          kind: "milestone",
          key: `milestone:${ts.id}`,
          doneTitle: ts.title,
          nextTitle: next.title,
        });
      }
    } else if (s.type === "likert") {
      steps.push({ kind: "likert", key: s.id, section: s as LikertSection });
    } else if (s.type === "ai_summary") {
      steps.push({ kind: "summary_placeholder", key: s.id });
    }
    // results section renders on its own page later (AI slice)
  });

  if (instrument.id === "diagnostic") {
    steps.push({ kind: "review", key: "review" });
  } else {
    steps.push({ kind: "transcript", key: "transcript" });
  }
  return steps;
}

export function stepIndexForKey(steps: Step[], key: string | null): number {
  if (!key) return 0;
  const i = steps.findIndex((s) => s.key === key);
  return i >= 0 ? i : 0;
}

/** The section a step belongs to, for timing attribution. */
export function stepSectionId(step: Step): string {
  switch (step.kind) {
    case "question":
      return step.sectionId;
    case "likert":
      return step.section.id;
    case "milestone":
      return step.key.replace("milestone:", "");
    case "summary_placeholder":
      return "C";
    case "review":
      return "review";
    case "transcript":
      return "transcript";
  }
}

// ---------------------------------------------------------------------------
// Combined instrument (hub-based navigation)
// ---------------------------------------------------------------------------

/** One page of the combined survey: a single question or one statement grid. */
export type CombinedStep = {
  key: string;
  sectionId: string;
  sectionTitle: string;
  q: SurveyQuestion;
  indexInSection: number;
  sectionSize: number;
};

export function buildCombinedSteps(instrument: Instrument): CombinedStep[] {
  const steps: CombinedStep[] = [];
  for (const s of surveySections(instrument)) {
    s.questions.forEach((q, qi) => {
      steps.push({
        key: q.id,
        sectionId: s.id,
        sectionTitle: s.title,
        q,
        indexInSection: qi,
        sectionSize: s.questions.length,
      });
    });
  }
  return steps;
}

/** Answered/total across a survey section (grid statements count singly). */
export function sectionProgress(
  section: SurveySection,
  answers: AnswerMap
): { answered: number; total: number } {
  const ids = surveyQuestionIds(section);
  return {
    answered: ids.filter((id) => isAnswered(answers[id])).length,
    total: ids.length,
  };
}

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (!v) return false;
  return Boolean(
    (v.text && v.text.trim().length > 0) ||
      v.rating !== undefined ||
      v.idk ||
      v.na ||
      v.choice !== undefined ||
      (v.choices && v.choices.length > 0) ||
      v.scale !== undefined
  );
}
