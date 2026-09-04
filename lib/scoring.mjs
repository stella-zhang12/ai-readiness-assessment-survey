/**
 * Deterministic anchor scoring for the AI readiness judgment (PRD §7.4).
 *
 * Plain JS (not TS) so the same module is imported by both the Next.js
 * routes and the node test script. The anchor is a server-side guardrail:
 * the AI's per-element rating may deviate from it by at most one band, and
 * the anchor is stored with every generation for the pilot audit. It is
 * never shown to users.
 */

export const THRESHOLDS = { redBelow: 0.75, amberBelow: 1.5 };
export const LEVELS = ["red", "amber", "green"];

/**
 * @param {Array<{id: string}>} items likert items of one element (D1/D2/D3)
 * @param {Record<string, {rating?: number, idk?: boolean, na?: boolean}>} answers
 * @returns {{band: "red"|"amber"|"green"|null, mean: number|null,
 *   counts: {rated: number, idk: number, na: number, unanswered: number},
 *   idkRatio: number}}
 */
export function anchorForElement(items, answers) {
  let sum = 0;
  let rated = 0;
  let idk = 0;
  let na = 0;
  for (const item of items) {
    const v = answers[item.id];
    if (!v) continue;
    if (v.na) na += 1;
    else if (v.idk) idk += 1;
    else if (typeof v.rating === "number") {
      sum += v.rating;
      rated += 1;
    }
  }
  const considered = items.length - na; // N/A excluded from the denominator
  const unanswered = considered - rated - idk;
  const idkRatio = considered > 0 ? idk / considered : 0;
  const mean = rated > 0 ? sum / rated : null;
  let band = null;
  if (mean !== null) {
    band =
      mean < THRESHOLDS.redBelow
        ? "red"
        : mean < THRESHOLDS.amberBelow
          ? "amber"
          : "green";
  }
  return { band, mean, counts: { rated, idk, na, unanswered }, idkRatio };
}

/** Band distance for the one-band deviation rule (null anchor = no rule). */
export function bandDistance(a, b) {
  const ia = LEVELS.indexOf(a);
  const ib = LEVELS.indexOf(b);
  if (ia < 0 || ib < 0) return null;
  return Math.abs(ia - ib);
}

export const LEVEL_LABEL = {
  red: "Absent",
  amber: "Partially Meets the Criteria",
  green: "Fully Meets the Criteria",
};
