import {
  ContinuationResponse,
  OutcomeSummarySchema,
  PebbleHistoryEntry,
  Profile,
} from "./schemas";

type OutcomeSummary = ReturnType<typeof OutcomeSummarySchema.parse>;
type RetirementNext = Extract<
  ContinuationResponse["next"],
  { type: "RETIREMENT" }
>;

const DIMENSIONS = [
  "career",
  "fertility",
  "finances",
  "lifestyle",
  "emotional",
  "relationships",
] as const;

type Dimension = (typeof DIMENSIONS)[number];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Pull per-dimension scores from an OutcomeSummary into the flat shape history
// entries use.
function scoresFromOutcome(o: OutcomeSummary): Record<Dimension, number> {
  return {
    career: o.career.score,
    fertility: o.fertility.score,
    finances: o.finances.score,
    lifestyle: o.lifestyle.score,
    emotional: o.emotional.score,
    relationships: o.relationships.score,
  };
}

function collectScoreSets(
  history: PebbleHistoryEntry[],
  currentOutcome: OutcomeSummary,
): Array<Partial<Record<Dimension, number>>> {
  const historyScores = history
    .map((h) => h.outcome_scores)
    .filter((s): s is NonNullable<typeof s> => !!s);
  return [...historyScores, scoresFromOutcome(currentOutcome)];
}

// Deterministic per-dimension averages + fertility peak. Authoritative over
// anything the LLM returns (spec A3: "deterministic badges + LLM recap").
export function computeRetirementStats(
  history: PebbleHistoryEntry[],
  currentOutcome: OutcomeSummary,
): Record<string, number> {
  const allScoreSets = collectScoreSets(history, currentOutcome);
  const stats: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    const values = allScoreSets
      .map((s) => s[dim])
      .filter((n): n is number => typeof n === "number");
    stats[`${dim}_avg`] = values.length
      ? round1(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }
  const fertValues = allScoreSets
    .map((s) => s.fertility)
    .filter((n): n is number => typeof n === "number");
  stats.fertility_peak = fertValues.length ? Math.max(...fertValues) : 0;
  return stats;
}

// Threshold-based badges, capped at 4 (spec A3 says 2–4). Authoritative over
// anything the LLM returned.
export function computeAchievements(
  stats: Record<string, number>,
  decisionCount: number,
): RetirementNext["achievements"] {
  const achievements: RetirementNext["achievements"] = [];
  if (stats.career_avg >= 3.5) achievements.push({ id: "steady_career", label: "Steady career through the years" });
  if (stats.finances_avg >= 3.5) achievements.push({ id: "financial_resilience", label: "Built financial resilience" });
  if (stats.emotional_avg >= 3.5) achievements.push({ id: "emotional_steady", label: "Kept emotional steadiness" });
  if (stats.relationships_avg >= 4) achievements.push({ id: "relationships_endured", label: "Relationships that endured" });
  if (stats.fertility_peak >= 4) achievements.push({ id: "fertility_agency", label: "Navigated fertility with agency" });
  if (decisionCount >= 10) achievements.push({ id: "long_path", label: `Walked ${decisionCount} decision points` });
  if (achievements.length === 0) achievements.push({ id: "a_life_lived", label: "A life lived on your own terms" });
  return achievements.slice(0, 4);
}

// Plain fallback recap used when the LLM didn't author one (A2 coercion path).
// Follows scene-tone guardrails: no invented names, no prop flourishes.
export function fallbackRecap(
  profile: Profile,
  finalAge: number,
  decisionCount: number,
): string {
  const yearsLived = finalAge - profile.age;
  return (
    `You started at ${profile.age} and reached retirement at ${finalAge}. ` +
    `Across ${decisionCount} decision points and ${yearsLived} years, a life took shape — full of the trade-offs and turns any real path holds. ` +
    `Looking back, the choices that felt hardest often mattered most.`
  );
}

// Full deterministic RETIREMENT payload. Used on the A2 coercion path when
// the LLM returned MCQ/OPEN despite being past retirement.
export function synthesizeRetirement(
  profile: Profile,
  finalAge: number,
  currentOutcome: OutcomeSummary,
  history: PebbleHistoryEntry[],
): RetirementNext {
  const decisionCount = collectScoreSets(history, currentOutcome).length;
  const stats = computeRetirementStats(history, currentOutcome);
  const achievements = computeAchievements(stats, decisionCount);
  const recap = fallbackRecap(profile, finalAge, decisionCount);
  return {
    type: "RETIREMENT",
    final_age: finalAge,
    recap,
    stats,
    achievements,
  };
}
