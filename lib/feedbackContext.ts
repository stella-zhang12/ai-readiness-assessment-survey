/**
 * Lightweight client-side record of where the user currently is inside
 * the survey, so the global feedback widget can attach question context
 * automatically. Set by the runner, read by SiteFeedback at submit time.
 */

export type FeedbackContext = {
  assessmentId?: string;
  sectionId?: string;
  questionId?: string;
  questionText?: string;
};

let current: FeedbackContext = {};

export function setFeedbackContext(ctx: FeedbackContext) {
  current = ctx;
}

export function clearFeedbackContext() {
  current = {};
}

export function getFeedbackContext(): FeedbackContext {
  return current;
}
