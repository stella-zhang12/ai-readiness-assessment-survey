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

// --- Feedback ---------------------------------------------------------------
check("feedback has 5 questions", feedback.questions.length === 5);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll instrument checks passed.");
