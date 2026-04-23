import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { callStructured } from "@/lib/anthropic";
import { getFertilityBand } from "@/lib/fertility";
import { getJsonBody, handleError, methodGuard } from "@/lib/http";
import { buildRetireNowPrompt } from "@/lib/prompts";
import { computeAchievements, computeHighlights } from "@/lib/retirement";
import { RetireRequestSchema } from "@/lib/schemas";
import { filterKnownSources } from "@/lib/sources";

// LLM authors the recap (and optionally cites). Structured fields —
// highlights, achievements — are derived deterministically from history so
// the voluntary-retirement report shape matches a natural retirement.
const RetireLlmSchema = z.object({
  recap: z.string().min(1).max(1500),
  sources: z.array(z.string()).max(4).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const parsed = RetireRequestSchema.parse(getJsonBody(req));
    const { profile, state, history } = parsed;
    const band = getFertilityBand(state.age);
    const { system, user } = buildRetireNowPrompt(
      profile,
      state,
      history,
      parsed.past_run_notes,
      band,
    );

    const llm = await callStructured(
      { system, user, maxTokens: 1200 },
      RetireLlmSchema,
    );

    const lastHeadline =
      history.length > 0 ? history[history.length - 1].outcome_headline ?? "" : "";
    const highlights = computeHighlights(history, lastHeadline, state.age);
    const achievements = computeAchievements(history, profile);

    // Shape identical to NextRetirementSchema so the frontend's mapRetirement
    // + RetirementModal consume it unchanged. `type` is included for
    // symmetry with the MCQ/OPEN continuation branches even though the
    // client just reads fields off this object directly.
    res.status(200).json({
      type: "RETIREMENT",
      final_age: state.age,
      recap: llm.recap,
      highlights,
      achievements,
      sources: filterKnownSources(llm.sources),
    });
  } catch (err) {
    handleError(err, res);
  }
}
