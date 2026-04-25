// Tier 1 unit tests — pure-function boundary checks.
// Run: npx tsx tests/unit.test.ts  (from PebblePathCodeFiles root)
// Zero external dependencies beyond node:assert. No framework.

import assert from "node:assert/strict";
import { projectedAge } from "../src/lib/prompts";
import {
  computeAchievements,
  computeHighlights,
  fallbackRecap,
} from "../src/lib/retirement";
import { getFertilityBand } from "../src/lib/fertility";
import type { PebbleHistoryEntry, Profile } from "../src/lib/schemas";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(`       ${(e as Error).message}`);
  }
}

const mcqEntry = (age: number, choice: string, headline?: string): PebbleHistoryEntry => ({
  type: "MCQ",
  age,
  user_choice: choice,
  outcome_headline: headline ?? null,
});
const openEntry = (age: number, q: string, a: string, headline?: string): PebbleHistoryEntry => ({
  type: "OPEN",
  age,
  open_question: q,
  user_open_answer: a,
  outcome_headline: headline ?? null,
});
const profile: Profile = {
  age: 27,
  location: "Singapore",
  relationship_status: "dating",
  wants_children: "maybe",
  child_timeline: null,
  career_stage: "mid",
  income_band: "30k-50k",
  retirement_age: 65,
};

// ===== projectedAge =====

test("projectedAge: 6mo rounds up to +1 year", () => {
  assert.equal(projectedAge(27, 6), 28);
});
test("projectedAge: 12mo adds exactly 1 year", () => {
  assert.equal(projectedAge(27, 12), 28);
});
test("projectedAge: boundary — 64+6=65 trips retirement guard", () => {
  assert.equal(projectedAge(64, 6), 65);
});
test("projectedAge: 59+12=60 (no premature retirement)", () => {
  assert.equal(projectedAge(59, 12), 60);
});
test("projectedAge: past-retirement idempotency 65+6=66", () => {
  assert.equal(projectedAge(65, 6), 66);
});

// ===== computeHighlights =====

test("computeHighlights: empty history + headline → single starting chapter", () => {
  const hl = computeHighlights([], "", 27);
  assert.equal(hl.length, 1);
  assert.match(hl[0].chapter, /27/);
});

test("computeHighlights: passes through headlines from history", () => {
  const history = [
    mcqEntry(27, "A", "You stayed at the agency."),
    mcqEntry(29, "B", "You moved in together."),
    mcqEntry(31, "C", "You started therapy."),
  ];
  const hl = computeHighlights(history, "You took the London role.", 33);
  // 3 history entries + 1 current = 4 entries; max is 5 → all included.
  assert.equal(hl.length, 4);
  assert.equal(hl[hl.length - 1].chapter, "age 33");
  assert.equal(hl[hl.length - 1].note, "You took the London role.");
});

test("computeHighlights: large history evenly samples down to max", () => {
  const history: PebbleHistoryEntry[] = [];
  for (let a = 27; a <= 40; a++) history.push(mcqEntry(a, "x", `headline ${a}`));
  const hl = computeHighlights(history, "end headline", 41, 5);
  assert.ok(hl.length <= 5);
  // Must include the closing chapter
  assert.equal(hl[hl.length - 1].chapter, "age 41");
});

test("computeHighlights: history entries without headline are skipped", () => {
  const history = [
    mcqEntry(27, "A"), // no headline
    mcqEntry(29, "B", "Present headline"),
  ];
  const hl = computeHighlights(history, "current", 31);
  // Only 2 entries carry headlines (age 29 + current) → 2 highlights.
  assert.equal(hl.length, 2);
});

// ===== computeAchievements =====

test("computeAchievements: empty history → a_life_lived fallback", () => {
  const a = computeAchievements([], profile);
  assert.equal(a.length, 1);
  assert.equal(a[0].id, "a_life_lived");
});

test("computeAchievements: 10 decisions trips long_path", () => {
  const history: PebbleHistoryEntry[] = [];
  for (let a = 27; a < 37; a++) history.push(mcqEntry(a, "x"));
  const ach = computeAchievements(history, profile);
  const lp = ach.find((x) => x.id === "long_path");
  assert.ok(lp, "long_path should fire at decisionCount >= 10");
  assert.match(lp!.label, /10/);
});

test("computeAchievements: 3+ OPEN entries trips reflective", () => {
  const history = [
    openEntry(27, "q1", "a1"),
    openEntry(28, "q2", "a2"),
    openEntry(29, "q3", "a3"),
  ];
  const ach = computeAchievements(history, profile);
  assert.ok(ach.some((a) => a.id === "reflective"));
});

test("computeAchievements: 20-year span trips long_arc", () => {
  const history = [mcqEntry(27, "x"), mcqEntry(47, "y")];
  const ach = computeAchievements(history, profile);
  assert.ok(ach.some((a) => a.id === "long_arc"));
});

test("computeAchievements: capped at 4 results", () => {
  const history: PebbleHistoryEntry[] = [];
  for (let a = 27; a < 37; a++) history.push(mcqEntry(a, "x"));
  for (let a = 37; a <= 47; a++) history.push(openEntry(a, "q", "a"));
  const ach = computeAchievements(history, profile);
  assert.ok(ach.length <= 4);
});

// ===== fallbackRecap =====

test("fallbackRecap: contains starting age, final age, decision count", () => {
  const recap = fallbackRecap(profile, 65, 38);
  assert.match(recap, /\b27\b/);
  assert.match(recap, /\b65\b/);
  assert.match(recap, /38 decision/);
});

// ===== getFertilityBand (sanity check — not testing exact edges since
//       band labels changed from old test file) =====

test("getFertilityBand: returns a valid label for a young age", () => {
  const b = getFertilityBand(27);
  assert.ok(["peak", "strong", "moderate", "declining", "low"].includes(b.label));
});
test("getFertilityBand: returns a valid label for age 42", () => {
  const b = getFertilityBand(42);
  assert.ok(["peak", "strong", "moderate", "declining", "low"].includes(b.label));
});

// ===== Summary =====

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
