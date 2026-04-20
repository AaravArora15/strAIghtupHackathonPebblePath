import type { NextApiRequest, NextApiResponse } from "next";
import { callStructured } from "@/lib/anthropic";
import { getFertilityBand } from "@/lib/fertility";
import { getJsonBody, handleError, methodGuard } from "@/lib/http";
import {
  buildContinuationPrompt,
  nextStateSnapshot,
  projectedAge,
} from "@/lib/prompts";
import {
  computeAchievements,
  computeRetirementStats,
  synthesizeRetirement,
} from "@/lib/retirement";
import {
  ContinuationRequestSchema,
  ContinuationResponseSchema,
} from "@/lib/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const parsed = ContinuationRequestSchema.parse(getJsonBody(req));
    const band = getFertilityBand(parsed.state.age);
    const { system, user } = buildContinuationPrompt(parsed, band);

    const result = await callStructured(
      { system, user, maxTokens: 2500 },
      ContinuationResponseSchema,
    );

    // Fertility-score enforcement: map the deterministic band to a max allowed
    // score. If the LLM tried to over-state fertility, clamp it.
    const bandCeiling: Record<typeof band.label, number> = {
      low: 5,
      "low-moderate": 4,
      moderate: 3,
      "moderate-high": 2,
      high: 2,
    };
    const ceiling = bandCeiling[band.label];
    if (result.outcome_summary.fertility.score > ceiling) {
      result.outcome_summary.fertility.score = ceiling;
    }

    // A2 — Deterministic retirement enforcement.
    // The prompt directs the LLM to return RETIREMENT when the next pebble
    // would cross retirement_age, but we must not trust that. Compute the
    // projected next age and coerce the payload if needed.
    const projectedNextAge = projectedAge(
      parsed.state.age,
      result.months_advanced,
    );
    const mustRetire = projectedNextAge >= parsed.profile.retirement_age;
    let next = result.next;
    let retirement_synthesized = false;

    if (mustRetire && next.type !== "RETIREMENT") {
      next = synthesizeRetirement(
        parsed.profile,
        projectedNextAge,
        result.outcome_summary,
        parsed.history,
      );
      retirement_synthesized = true;
    } else if (next.type === "RETIREMENT") {
      // A3 — Authoritative stats/achievements/final_age on the LLM path too.
      // Keep the LLM's recap (narrative); override the structured fields so
      // the retirement_reports row is always derived from observed scores.
      const stats = computeRetirementStats(
        parsed.history,
        result.outcome_summary,
      );
      const decisionCount = parsed.history.length + 1;
      next = {
        ...next,
        final_age: projectedNextAge,
        stats,
        achievements: computeAchievements(stats, decisionCount),
      };
    }

    // Build the new state snapshot only if the next pebble is not retirement.
    const personalisationNote =
      parsed.last_action.type === "OPEN"
        ? `${parsed.last_action.open_question} → ${parsed.last_action.user_open_answer}`
        : undefined;

    const new_state =
      next.type === "RETIREMENT"
        ? parsed.state
        : nextStateSnapshot(
            parsed.state,
            result.months_advanced,
            getFertilityBand(projectedNextAge).label,
            personalisationNote,
          );

    res.status(200).json({
      outcome_summary: result.outcome_summary,
      months_advanced: result.months_advanced,
      next,
      new_state,
      fertility_band_applied: band,
      fertility_score_clamped:
        result.outcome_summary.fertility.score === ceiling &&
        ceiling < 5,
      retirement_synthesized,
    });
  } catch (err) {
    handleError(err, res);
  }
}
