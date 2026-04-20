// Tier 1 unit tests — pure-function boundary checks for A2/A3 math.
// Run: npx tsx tests/unit.test.ts  (from TroveCodeFiles root)
// Zero external dependencies beyond node:assert. No framework.

import assert from "node:assert/strict";
import { projectedAge } from "../src/lib/prompts";
import {
  computeAchievements,
  computeRetirementStats,
  fallbackRecap,
} from "../src/lib/retirement";
import { getFertilityBand } from "../src/lib/fertility";

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

// DimensionSchema requires range_note to include "%".
const dim = (score: number) => ({
  score,
  label: "x",
  narrative: "y",
  range_note: "typical for 50% of women this age",
});
const outcome = (s: Record<string, number>) => ({
  career: dim(s.career),
  fertility: dim(s.fertility),
  finances: dim(s.finances),
  lifestyle: dim(s.lifestyle),
  emotional: dim(s.emotional),
  relationships: dim(s.relationships),
});

// ===== projectedAge =====

test("projectedAge: 6mo rounds up to +1 year", () => {
  assert.equal(projectedAge(27, 6), 28);
});

test("projectedAge: 12mo adds exactly 1 year", () => {
  assert.equal(projectedAge(27, 12), 28);
});

test("projectedAge: A2 boundary — 64+6=65 trips the guard", () => {
  assert.equal(projectedAge(64, 6), 65);
});

test("projectedAge: 64+12=65", () => {
  assert.equal(projectedAge(64, 12), 65);
});

test("projectedAge: 59+12=60 (no premature retirement)", () => {
  assert.equal(projectedAge(59, 12), 60);
});

test("projectedAge: past-retirement idempotency 65+6=66", () => {
  assert.equal(projectedAge(65, 6), 66);
});

// ===== computeRetirementStats =====

test("computeRetirementStats: empty history uses only current outcome", () => {
  const stats = computeRetirementStats(
    [],
    outcome({ career: 4, fertility: 3, finances: 4, lifestyle: 2, emotional: 3, relationships: 3 }),
  );
  assert.equal(stats.career_avg, 4);
  assert.equal(stats.fertility_peak, 3);
  assert.equal(stats.relationships_avg, 3);
});

test("computeRetirementStats: history entries without outcome_scores are skipped", () => {
  const stats = computeRetirementStats(
    [
      { type: "MCQ", age: 30, user_choice: "x" },
      { type: "MCQ", age: 31, user_choice: "y" },
    ],
    outcome({ career: 4, fertility: 3, finances: 4, lifestyle: 2, emotional: 3, relationships: 3 }),
  );
  assert.equal(stats.career_avg, 4);
  assert.equal(stats.fertility_peak, 3);
});

test("computeRetirementStats: history with outcome_scores averages correctly", () => {
  const stats = computeRetirementStats(
    [
      {
        type: "MCQ", age: 30, user_choice: "x",
        outcome_scores: { career: 2, fertility: 2, finances: 2, lifestyle: 2, emotional: 2, relationships: 2 },
      },
      {
        type: "MCQ", age: 31, user_choice: "y",
        outcome_scores: { career: 3, fertility: 3, finances: 3, lifestyle: 3, emotional: 3, relationships: 3 },
      },
      {
        type: "MCQ", age: 32, user_choice: "z",
        outcome_scores: { career: 5, fertility: 5, finances: 5, lifestyle: 5, emotional: 5, relationships: 5 },
      },
    ],
    outcome({ career: 4, fertility: 4, finances: 4, lifestyle: 4, emotional: 4, relationships: 4 }),
  );
  // (2+3+5+4)/4 = 3.5
  assert.equal(stats.career_avg, 3.5);
});

test("computeRetirementStats: fertility_peak is max, not mean", () => {
  const stats = computeRetirementStats(
    [
      {
        type: "MCQ", age: 30, user_choice: "x",
        outcome_scores: { career: 2, fertility: 2, finances: 2, lifestyle: 2, emotional: 2, relationships: 2 },
      },
      {
        type: "MCQ", age: 31, user_choice: "y",
        outcome_scores: { career: 5, fertility: 5, finances: 5, lifestyle: 5, emotional: 5, relationships: 5 },
      },
      {
        type: "MCQ", age: 32, user_choice: "z",
        outcome_scores: { career: 3, fertility: 3, finances: 3, lifestyle: 3, emotional: 3, relationships: 3 },
      },
    ],
    outcome({ career: 4, fertility: 4, finances: 4, lifestyle: 4, emotional: 4, relationships: 4 }),
  );
  assert.equal(stats.fertility_peak, 5);
});

// ===== computeAchievements =====

test("computeAchievements: all 3.0 scores → only a_life_lived fallback", () => {
  const a = computeAchievements(
    { career_avg: 3, fertility_avg: 3, finances_avg: 3, lifestyle_avg: 3, emotional_avg: 3, relationships_avg: 3, fertility_peak: 3 },
    8,
  );
  assert.equal(a.length, 1);
  assert.equal(a[0].id, "a_life_lived");
});

test("computeAchievements: career_avg 3.5 trips steady_career, 3.4 doesn't", () => {
  const hit = computeAchievements({ career_avg: 3.5, fertility_peak: 0 }, 0);
  assert.ok(hit.some((x) => x.id === "steady_career"));
  const miss = computeAchievements({ career_avg: 3.4, fertility_peak: 0 }, 0);
  assert.ok(!miss.some((x) => x.id === "steady_career"));
});

test("computeAchievements: relationships_avg 4.0 trips, 3.9 doesn't", () => {
  const hit = computeAchievements({ relationships_avg: 4, fertility_peak: 0 }, 0);
  assert.ok(hit.some((x) => x.id === "relationships_endured"));
  const miss = computeAchievements({ relationships_avg: 3.9, fertility_peak: 0 }, 0);
  assert.ok(!miss.some((x) => x.id === "relationships_endured"));
});

test("computeAchievements: fertility_peak 4 trips fertility_agency", () => {
  const hit = computeAchievements({ fertility_peak: 4 }, 0);
  assert.ok(hit.some((x) => x.id === "fertility_agency"));
});

test("computeAchievements: decisionCount 10 trips long_path with label containing 10", () => {
  const hit = computeAchievements({ fertility_peak: 0 }, 10);
  const lp = hit.find((x) => x.id === "long_path");
  assert.ok(lp, "long_path should fire at decisionCount=10");
  assert.match(lp!.label, /10/);
});

test("computeAchievements: all six thresholds trip → result capped at 4", () => {
  const all = computeAchievements(
    {
      career_avg: 4,
      finances_avg: 4,
      emotional_avg: 4,
      relationships_avg: 4,
      fertility_peak: 5,
    },
    20,
  );
  assert.equal(all.length, 4);
});

// ===== fallbackRecap =====

test("fallbackRecap: contains starting age, final age, decision count, years", () => {
  const recap = fallbackRecap({ age: 27 } as never, 65, 38);
  assert.match(recap, /\b27\b/);
  assert.match(recap, /\b65\b/);
  assert.match(recap, /38 decision/);
  assert.match(recap, /38 years/);
});

// ===== getFertilityBand (band edges) =====

test("getFertilityBand: 29 → low, 30 → low-moderate", () => {
  assert.equal(getFertilityBand(29).label, "low");
  assert.equal(getFertilityBand(30).label, "low-moderate");
});

test("getFertilityBand: 32 → low-moderate, 33 → moderate", () => {
  assert.equal(getFertilityBand(32).label, "low-moderate");
  assert.equal(getFertilityBand(33).label, "moderate");
});

test("getFertilityBand: 35 → moderate, 36 → moderate-high", () => {
  assert.equal(getFertilityBand(35).label, "moderate");
  assert.equal(getFertilityBand(36).label, "moderate-high");
});

test("getFertilityBand: 38 → moderate-high, 39 → high", () => {
  assert.equal(getFertilityBand(38).label, "moderate-high");
  assert.equal(getFertilityBand(39).label, "high");
});

// ===== Summary =====

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
