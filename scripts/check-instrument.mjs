// Sanity checks on the instrument content (roadmap step 0 verification):
// question counts must match the source docx, ids must be unique, and every
// Diagnostic A/B question must carry both example variants.
import { readFileSync } from "node:fs";

const load = (p) => JSON.parse(readFileSync(new URL(`../content/instrument/${p}`, import.meta.url)));
const brainstorm = load("brainstorm.v1.json");
const diagnostic = load("diagnostic.v1.json");
const feedback = load("feedback.v1.json");

let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? "ok " : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

// --- Brainstorm: 17 questions across 4 sections --------------------------
const v1Questions = brainstorm.sections.flatMap((s) => s.questions);
check("brainstorm has 4 sections", brainstorm.sections.length === 4);
check("brainstorm has 17 questions", v1Questions.length === 17);
check(
  "brainstorm: every question has a helper sentence",
  v1Questions.every((q) => typeof q.helper === "string" && q.helper.length > 0)
);
check(
  "brainstorm: every question has crvs + healthcare examples",
  v1Questions.every((q) => q.examples?.crvs?.text && q.examples?.healthcare?.text)
);
check(
  "brainstorm: pain-point and constraint questions have chips",
  (brainstorm.sections[0].questions.find((q) => q.id === "V1-S1.Q2")?.chips?.length ?? 0) >= 5 &&
    (brainstorm.sections[0].questions.find((q) => q.id === "V1-S1.Q5")?.chips?.length ?? 0) >= 5
);

// --- Diagnostic ------------------------------------------------------------
const secs = Object.fromEntries(diagnostic.sections.map((s) => [s.id, s]));
check("diagnostic sections A,B,C,D1,D2,D3,E present",
  ["A", "B", "C", "D1", "D2", "D3", "E"].every((id) => secs[id]));
check("A has 6 questions", secs.A.questions.length === 6);
check("B has 3 questions", secs.B.questions.length === 3);
check("D1 has 18 items", secs.D1.items.length === 18);
check("D2 has 2 items", secs.D2.items.length === 2);
check("D3 has 4 items", secs.D3.items.length === 4);
check("E has 4 elements", secs.E.elements.length === 4);
check(
  "only D1.1.4 offers N/A",
  [...secs.D1.items, ...secs.D2.items, ...secs.D3.items]
    .filter((i) => i.na).map((i) => i.id).join() === "D1.1.4"
);
check(
  "every D parent statement has guidance",
  [...secs.D1.items, ...secs.D2.items, ...secs.D3.items]
    .filter((i) => i.parent === null)
    .every((i) => typeof i.guidance === "string" && i.guidance.length > 0)
);
check(
  "every A/B question has crvs + healthcare examples",
  [...secs.A.questions, ...secs.B.questions].every(
    (q) => q.examples?.crvs?.text && q.examples?.healthcare?.text
  )
);
check(
  "scale labels match the instrument",
  diagnostic.scale.options.map((o) => o.label).join("|") ===
    "Fully Meets the Criteria|Partially Meets the Criteria|Absent"
);

// --- Uniqueness across both instruments ------------------------------------
const ids = [
  ...v1Questions.map((q) => q.id),
  ...secs.A.questions.map((q) => q.id),
  ...secs.B.questions.map((q) => q.id),
  ...[...secs.D1.items, ...secs.D2.items, ...secs.D3.items].map((i) => i.id),
];
check("all question/item ids unique", new Set(ids).size === ids.length);

// --- Combined (Questions_final.docx, 2026-09-13) ----------------------------
const combined = load("combined.v1.json");
const cSecs = Object.fromEntries(combined.sections.map((s) => [s.id, s]));
check("combined has 4 survey sections S1-S4",
  ["S1", "S2", "S3", "S4"].every((id) => cSecs[id]?.type === "survey"));
check("S1 has 9 questions", cSecs.S1.questions.length === 9);
check("S2 has 8 questions", cSecs.S2.questions.length === 8);
check("S3 has 4 questions", cSecs.S3.questions.length === 4);
check("S4 has 5 questions", cSecs.S4.questions.length === 5);
check("every combined section has a purpose (element definition)",
  Object.values(cSecs).every((s) => typeof s.purpose === "string" && s.purpose.length > 0));
check("S1 questions are open text (goal builder on S1.Q9)",
  cSecs.S1.questions.every((q) =>
    q.id === "S1.Q9" ? q.kind === "goals" : q.kind === "text"));
check("S1.Q9 goal builder has all four labels",
  (() => {
    const l = cSecs.S1.questions.find((q) => q.id === "S1.Q9")?.labels;
    return Boolean(l?.metric && l?.before && l?.after && l?.add);
  })());
check("S1.Q4 carries the rule-based vs AI explainer",
  (cSecs.S1.questions.find((q) => q.id === "S1.Q4")?.info?.body?.length ?? 0) === 3);
check("S1.Q5 carries the 0-5 comfort scale",
  (() => {
    const s = cSecs.S1.questions.find((q) => q.id === "S1.Q5")?.scale;
    return s?.min === 0 && s?.max === 5;
  })());
const grid = cSecs.S2.questions.find((q) => q.kind === "grid");
check("S2 grid has 7 statements", grid?.statements.length === 7);
check("S2 grid scale is Fully/Partially/Not at all + Not sure + N/A",
  grid?.scale.options.map((o) => o.label).join("|") === "Fully|Partially|Not at all" &&
    grid?.scale.idk.label === "Not sure" && grid?.scale.na.label === "Not applicable");
check("every combined select question has at least 3 options",
  [...cSecs.S2.questions].filter((q) => q.kind === "select_one" || q.kind === "select_many")
    .every((q) => (q.options?.length ?? 0) >= 3));
check("S2.Q1 and S2.Q6 have conditional follow-ups",
  cSecs.S2.questions.find((q) => q.id === "S2.Q1")?.followup?.when === "yes" &&
    cSecs.S2.questions.find((q) => q.id === "S2.Q6")?.followup?.when === "yes");
check("S3/S4 questions are all open text",
  [...cSecs.S3.questions, ...cSecs.S4.questions].every((q) => q.kind === "text"));
check("every combined text/goals question has crvs + healthcare examples",
  [...cSecs.S1.questions, ...cSecs.S3.questions, ...cSecs.S4.questions]
    .filter((q) => q.kind === "text" || q.kind === "goals")
    .every((q) => q.examples?.crvs?.text && q.examples?.healthcare?.text));
check("challenges and constraints questions have 5 chips",
  (cSecs.S1.questions.find((q) => q.id === "S1.Q3")?.chips?.length ?? 0) === 5 &&
    (cSecs.S4.questions.find((q) => q.id === "S4.Q5")?.chips?.length ?? 0) === 5);
const combinedIds = combined.sections.flatMap((s) =>
  s.questions.flatMap((q) => (q.kind === "grid" ? [q.id, ...q.statements.map((st) => st.id)] : [q.id])));
check("combined ids unique", new Set(combinedIds).size === combinedIds.length);
check("combined has no AI summary or results section",
  combined.sections.every((s) => s.type === "survey"));
check("no em dashes in combined content",
  !JSON.stringify(combined).includes("—"));

// --- Feedback ---------------------------------------------------------------
check("feedback has 5 questions", feedback.questions.length === 5);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll instrument checks passed.");
