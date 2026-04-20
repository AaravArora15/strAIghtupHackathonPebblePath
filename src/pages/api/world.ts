import type { NextApiRequest, NextApiResponse } from "next";
import { callStructured } from "@/lib/anthropic";
import { getFertilityBand } from "@/lib/fertility";
import { getJsonBody, handleError, methodGuard } from "@/lib/http";
import { buildWorldGenPrompt } from "@/lib/prompts";
import {
  ProfileSchema,
  StateSnapshot,
  WorldGenResponseSchema,
} from "@/lib/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const profile = ProfileSchema.parse(getJsonBody(req));
    const band = getFertilityBand(profile.age);
    const { system, user } = buildWorldGenPrompt(profile, band);

    const world = await callStructured(
      { system, user, maxTokens: 1500 },
      WorldGenResponseSchema,
    );

    const initialState: StateSnapshot = {
      age: profile.age,
      months_elapsed: 0,
      career_stage: profile.career_stage,
      career_progress_score: 5,
      savings_delta: 0,
      relationship_status: profile.relationship_status,
      fertility_risk: band.label,
      has_children: false,
      emotional_load: 5,
      personalisation_notes: [],
    };

    res.status(200).json({
      scenario: {
        title: world.scenario_title,
        chapter: world.scenario_chapter,
      },
      root_pebble: {
        type: "MCQ" as const,
        scene: world.scene,
        prompt: world.prompt,
        options: world.options,
        state_snapshot: initialState,
        depth: 0,
      },
      fertility_band: band,
    });
  } catch (err) {
    handleError(err, res);
  }
}
