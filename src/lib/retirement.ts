import {
  ContinuationResponse,
  Highlight,
  OutcomeSummary,
  PebbleHistoryEntry,
  Profile,
} from "./schemas";

type RetirementNext = Extract<
  ContinuationResponse["next"],
  { type: "RETIREMENT" }
>;

// Pull up to N evenly-spaced {chapter, note} entries from the history, using
// the outcome_headline each entry carries forward. Always include the most
// recent (the current in-progress outcome) as the closing chapter.
export function computeHighlights(
  history: PebbleHistoryEntry[],
  currentHeadline: string,
  currentAge: number,
  max = 5,
): Highlight[] {
  const entries: Array<{ age: number; headline: string }> = [];
  for (const h of history) {
    if (h.outcome_headline) entries.push({ age: h.age, headline: h.outcome_headline });
  }
  if (currentHeadline) entries.push({ age: currentAge, headline: currentHeadline });

  if (entries.length === 0) {
    return [
      {
        chapter: `age ${currentAge}`,
        note: "A life lived on your own terms — the shape of the arc is yours.",
      },
    ];
  }

  const n = entries.length;
  const picked: Array<{ age: number; headline: string }> = [];
  if (n <= max) {
    picked.push(...entries);
  } else {
    // Evenly sample max entries across the span.
    for (let i = 0; i < max; i++) {
      const idx = Math.min(n - 1, Math.round((i * (n - 1)) / (max - 1)));
      picked.push(entries[idx]);
    }
  }

  // Deduplicate (rounding can pick the same index twice for small spans).
  const seen = new Set<number>();
  const uniq = picked.filter((p) => (seen.has(p.age) ? false : (seen.add(p.age), true)));

  return uniq.map((e) => ({
    chapter: `age ${e.age}`,
    note: e.headline,
  }));
}

// History-based achievements. Counts, not averages. Max 4.
export function computeAchievements(
  history: PebbleHistoryEntry[],
  profile: Profile,
): RetirementNext["achievements"] {
  const ach: RetirementNext["achievements"] = [];
  const decisionCount = history.length;
  const openCount = history.filter((h) => h.type === "OPEN").length;
  const mcqCount = history.filter((h) => h.type === "MCQ").length;
  const ages = history.map((h) => h.age);
  const yearSpan = ages.length ? Math.max(...ages) - Math.min(...ages) : 0;

  if (decisionCount >= 10)
    ach.push({ id: "long_path", label: `Walked ${decisionCount} decision points` });
  else if (decisionCount >= 4)
    ach.push({ id: "full_path", label: `${decisionCount} decisions committed to` });

  if (openCount >= 3)
    ach.push({ id: "reflective", label: "Paused to reflect when it mattered" });

  if (yearSpan >= 20)
    ach.push({ id: "long_arc", label: `${yearSpan} years, one arc` });
  else if (yearSpan >= 10)
    ach.push({ id: "decade_arc", label: `A decade, told honestly` });

  if (mcqCount >= 6)
    ach.push({ id: "committed", label: "Made the call, each time" });

  if (ach.length === 0)
    ach.push({ id: "a_life_lived", label: "A life lived on your own terms" });

  return ach.slice(0, 4);
}

// Plain fallback recap used when the LLM didn't author one (coercion path).
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

// Full deterministic RETIREMENT payload. Used on the coercion path when
// the LLM returned MCQ/OPEN despite being past retirement.
export function synthesizeRetirement(
  profile: Profile,
  finalAge: number,
  currentOutcome: OutcomeSummary,
  history: PebbleHistoryEntry[],
): RetirementNext {
  const decisionCount = history.length + 1;
  const highlights = computeHighlights(
    history,
    currentOutcome.headline,
    profile.age + Math.max(0, finalAge - profile.age),
  );
  const achievements = computeAchievements(history, profile);
  const recap = fallbackRecap(profile, finalAge, decisionCount);
  return {
    type: "RETIREMENT",
    final_age: finalAge,
    recap,
    highlights,
    achievements,
    // Coerced retirement — deterministic recap text isn't grounded in any
    // specific report, so leave citations empty rather than guess.
    sources: [],
  };
}
