// Unit tests for the anchor math (PRD §15 step 8: "anchor math unit-tested
// against hand-computed fixtures"). Run: node scripts/test-scoring.mjs
import { anchorForElement, bandDistance } from "../lib/scoring.mjs";

let failures = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "ok " : "FAIL"}  ${label}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
};

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: `Q${i}` }));

// All twos -> green, mean 2
let r = anchorForElement(items(4), { Q0: { rating: 2 }, Q1: { rating: 2 }, Q2: { rating: 2 }, Q3: { rating: 2 } });
eq("all 2s -> green", [r.band, r.mean], ["green", 2]);

// All zeros -> red
r = anchorForElement(items(2), { Q0: { rating: 0 }, Q1: { rating: 0 } });
eq("all 0s -> red", [r.band, r.mean], ["red", 0]);

// Boundary: mean exactly 1.5 -> green (amberBelow is exclusive)
r = anchorForElement(items(2), { Q0: { rating: 1 }, Q1: { rating: 2 } });
eq("mean 1.5 -> green", r.band, "green");

// Boundary: mean exactly 0.75 -> amber (redBelow is exclusive)
r = anchorForElement(items(4), { Q0: { rating: 0 }, Q1: { rating: 1 }, Q2: { rating: 1 }, Q3: { rating: 1 } });
eq("mean 0.75 -> amber", r.band, "amber");

// N/A excluded entirely: 1 NA + [2,2] -> mean 2, considered=2
r = anchorForElement(items(3), { Q0: { na: true }, Q1: { rating: 2 }, Q2: { rating: 2 } });
eq("NA excluded", [r.band, r.mean, r.counts.na], ["green", 2, 1]);

// IDK excluded from mean but counted in ratio: [idk, idk, 2, 0] -> mean 1, idkRatio .5
r = anchorForElement(items(4), { Q0: { idk: true }, Q1: { idk: true }, Q2: { rating: 2 }, Q3: { rating: 0 } });
eq("IDK ratio", [r.mean, r.idkRatio, r.band], [1, 0.5, "amber"]);

// Nothing rated -> null band
r = anchorForElement(items(2), { Q0: { idk: true } });
eq("nothing rated -> null band", [r.band, r.mean, r.counts.unanswered], [null, null, 1]);

// Demo-script fixture: D3 = [1,1,1,0] -> mean 0.75 -> amber
r = anchorForElement(items(4), { Q0: { rating: 1 }, Q1: { rating: 1 }, Q2: { rating: 1 }, Q3: { rating: 0 } });
eq("demo D3 -> amber", r.band, "amber");

// Band distance
eq("distance red->green", bandDistance("red", "green"), 2);
eq("distance amber->green", bandDistance("amber", "green"), 1);
eq("distance vs null", bandDistance(null, "green"), null);

if (failures) {
  console.error(`\n${failures} failing`);
  process.exit(1);
}
console.log("\nAll scoring tests passed.");
