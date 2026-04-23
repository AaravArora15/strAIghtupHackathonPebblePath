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
  computeHighlights,
  synthesizeRetirement,
} from "@/lib/retirement";
import {
  ContinuationRequestSchema,
  ContinuationResponseSchema,
} from "@/lib/schemas";
import { filterKnownSources } from "@/lib/sources";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const parsed = ContinuationRequestSchema.parse(getJsonBody(req));
    const band = getFertilityBand(parsed.state.age);
    const { system, user } = buildContinuationPrompt(parsed, band);

    // Reject premature RETIREMENT — if the model retires the user when
    // simulated age is still well below retirement_age, retry once with the
    // message fed back. Allows a small grace window (retirement_age - 2) so
    // we don't fight the prompt's "may retire on 12-month advance" case.
    const result = await callStructured(
      { system, user, maxTokens: 2500 },
      ContinuationResponseSchema,
      (data) => {
        if (data.next.type !== "RETIREMENT") return null;
        const nextAge = projectedAge(parsed.state.age, data.months_advanced);
        if (nextAge < parsed.profile.retirement_age - 2) {
          return `You returned next.type = "RETIREMENT" but the simulated age would be ${nextAge} and retirement_age is ${parsed.profile.retirement_age} — the user has ~${parsed.profile.retirement_age - nextAge} simulated years of life remaining. Return MCQ or OPEN instead.`;
        }
        return null;
      },
    );

    // Strip any hallucinated source IDs — only whitelist entries survive.
    result.outcome_summary.sources = filterKnownSources(
      result.outcome_summary.sources,
    );

    // Combined-path realism — enforced on state_delta now that outcomes are
    // qualitative. When the user picked the "opt_all" path, we refuse to let
    // the LLM portray it as a free lunch:
    //   - emotional_load_delta must be ≥ +1 (juggling everything raises load)
    //   - at least one of career_progress_delta / savings_period_delta must be
    //     negative (something gives when spread thin)
    // The narrative rules for combined paths live in the prompt; these are
    // the mechanical backstop.
    let combined_path_clamped = false;
    if (
      parsed.last_action.type === "MCQ" &&
      parsed.last_action.was_combined_path
    ) {
      const d = result.state_delta;
      if (d.emotional_load_delta < 1) {
        d.emotional_load_delta = 1;
        combined_path_clamped = true;
      }
      if (d.career_progress_delta >= 0 && d.savings_period_delta >= 0) {
        // Neither went negative — force a cost on career progress.
        d.career_progress_delta = -1;
        combined_path_clamped = true;
      }
    }

    // Deterministic retirement enforcement. The prompt directs the LLM to
    // return RETIREMENT when the next pebble would cross retirement_age, but
    // we must not trust that. Compute the projected next age and coerce.
    const projectedNextAge = projectedAge(
      parsed.state.age,
      result.months_advanced,
    );
    const mustRetire = projectedNextAge >= parsed.profile.retirement_age;
    let next = result.next;
    let retirement_synthesized = false;

    if (mustRetire && next.type !== "RETIREMENT") {
      // zod 3.25 quirk: nested schemas with .default() surface as optional
      // on the parent's inferred type, so spread a normalised outcome_summary
      // (continuity defaulted to null) to match synthesizeRetirement's shape.
      next = synthesizeRetirement(
        parsed.profile,
        projectedNextAge,
        {
          ...result.outcome_summary,
          continuity: result.outcome_summary.continuity ?? null,
        },
        parsed.history,
      );
      retirement_synthesized = true;
    } else if (next.type === "RETIREMENT") {
      // Authoritative highlights + achievements: keep the LLM recap narrative,
      // override the structured fields so retirement is always derived from
      // observed history rather than whatever the model improvised.
      const highlights = computeHighlights(
        parsed.history,
        result.outcome_summary.headline,
        parsed.state.age,
      );
      next = {
        ...next,
        final_age: projectedNextAge,
        highlights,
        achievements: computeAchievements(parsed.history, parsed.profile),
        sources: filterKnownSources(next.sources),
      };
    }

    // Normalise combined-path flag on the NEXT MCQ pebble — at most one
    // is_combined_path: true, and if multiple, keep the first flagged.
    if (next.type === "MCQ") {
      let seen = false;
      for (const opt of next.options) {
        if (opt.is_combined_path) {
          if (seen) opt.is_combined_path = false;
          else seen = true;
        }
      }
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
            result.state_delta,
            personalisationNote,
          );

    res.status(200).json({
      outcome_summary: result.outcome_summary,
      months_advanced: result.months_advanced,
      state_delta: result.state_delta,
      next,
      new_state,
      fertility_band_applied: band,
      combined_path_clamped,
      retirement_synthesized,
    });
  } catch (err) {
    handleError(err, res);
  }
}
