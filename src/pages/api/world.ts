import type { NextApiRequest, NextApiResponse } from "next";
import { callStructured } from "@/lib/anthropic";
import { getFertilityBand } from "@/lib/fertility";
import { getJsonBody, handleError, methodGuard } from "@/lib/http";
import { buildWorldGenPrompt } from "@/lib/prompts";
import {
  PastRunNote,
  Profile,
  ProfileSchema,
  StateSnapshot,
  WorldGenResponseSchema,
  WorldRequestSchema,
} from "@/lib/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    // Accept both shapes: the wrapped { profile, past_run_notes } used by the
    // UI, and a bare Profile body used by tests/playthrough.ts and any caller
    // pre-dating past-run notes.
    const rawBody = getJsonBody(req);
    let profile: Profile;
    let pastRunNotes: PastRunNote[] | undefined;
    if (
      typeof rawBody === "object" &&
      rawBody !== null &&
      "profile" in (rawBody as Record<string, unknown>)
    ) {
      const wrapped = WorldRequestSchema.parse(rawBody);
      profile = wrapped.profile;
      pastRunNotes = wrapped.past_run_notes;
    } else {
      profile = ProfileSchema.parse(rawBody);
    }
    const band = getFertilityBand(profile.age);
    const { system, user } = buildWorldGenPrompt(profile, band, pastRunNotes);

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
