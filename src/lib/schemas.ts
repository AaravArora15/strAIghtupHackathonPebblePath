import { z } from "zod";

// =====================================================
// Shared
// =====================================================

export const OptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  consequence_hint: z.string().min(1),
});

const DimensionSchema = z.object({
  score: z.number().int().min(1).max(5),
  label: z.string().min(1),
  narrative: z.string().min(1),
  range_note: z.string().refine((s) => s.includes("%"), {
    message: "range_note must include a % qualifier",
  }),
});

export const OutcomeSummarySchema = z.object({
  career: DimensionSchema,
  fertility: DimensionSchema,
  finances: DimensionSchema,
  lifestyle: DimensionSchema,
  emotional: DimensionSchema,
  relationships: DimensionSchema,
});

// =====================================================
// Profile (input to /api/world)
// =====================================================

export const ProfileSchema = z.object({
  age: z.number().int().min(18).max(45),
  location: z.string().min(1),
  relationship_status: z.string().min(1),
  wants_children: z.enum(["yes", "no", "maybe"]),
  child_timeline: z.string().optional().nullable(),
  career_stage: z.enum(["student", "early", "mid", "senior", "not-working"]),
  income_band: z.enum(["under-3k", "3k-6k", "6k-10k", "over-10k"]),
  retirement_age: z.number().int().min(50).max(75).default(65),
});
export type Profile = z.infer<typeof ProfileSchema>;

// =====================================================
// State snapshot
// =====================================================

export const StateSnapshotSchema = z.object({
  age: z.number().int(),
  months_elapsed: z.number().int().min(0),
  career_stage: z.string(),
  career_progress_score: z.number().min(0).max(10),
  savings_delta: z.number(),
  relationship_status: z.string(),
  fertility_risk: z.string(),
  has_children: z.boolean(),
  emotional_load: z.number().min(0).max(10),
  personalisation_notes: z.array(z.string()).default([]),
});
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

// =====================================================
// World generation response
// =====================================================

export const WorldGenResponseSchema = z.object({
  scenario_title: z.string().min(1),
  scenario_chapter: z.string().min(1),
  scene: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(OptionSchema).min(2).max(3),
});
export type WorldGenResponse = z.infer<typeof WorldGenResponseSchema>;

// =====================================================
// Pebble history entry (sent on continuation)
// =====================================================

export const PebbleHistoryEntrySchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  age: z.number().int(),
  user_choice: z.string().optional().nullable(),
  open_question: z.string().optional().nullable(),
  user_open_answer: z.string().optional().nullable(),
  // Optional per-dimension outcome scores (1–5) from that pebble, if the client
  // has them. Used only by the retirement-report aggregator to compute
  // deterministic cumulative stats. Missing entries are skipped.
  outcome_scores: z
    .object({
      career: z.number().int().min(1).max(5).optional(),
      fertility: z.number().int().min(1).max(5).optional(),
      finances: z.number().int().min(1).max(5).optional(),
      lifestyle: z.number().int().min(1).max(5).optional(),
      emotional: z.number().int().min(1).max(5).optional(),
      relationships: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});
export type PebbleHistoryEntry = z.infer<typeof PebbleHistoryEntrySchema>;

// =====================================================
// Continuation request (input to /api/pebble/choose)
// =====================================================

export const ContinuationRequestSchema = z
  .object({
    profile: ProfileSchema,
    state: StateSnapshotSchema,
    history: z.array(PebbleHistoryEntrySchema),
    last_action: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("MCQ"),
        user_choice: z.string().min(1),
      }),
      z.object({
        type: z.literal("OPEN"),
        open_question: z.string().min(1),
        user_open_answer: z.string().min(1).max(150),
      }),
    ]),
  })
  .strict();
export type ContinuationRequest = z.infer<typeof ContinuationRequestSchema>;

// =====================================================
// Continuation response — next pebble OR retirement
// =====================================================

const NextMcqSchema = z.object({
  type: z.literal("MCQ"),
  scene: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(OptionSchema).min(2).max(3),
  actionable_irl: z.boolean().default(false),
  actionable_irl_summary: z.string().nullable().default(null),
});

const NextOpenSchema = z.object({
  type: z.literal("OPEN"),
  scene: z.string().min(1),
  prompt: z.string().min(1),
  open_question: z.string().min(1),
  actionable_irl: z.literal(false).default(false),
  actionable_irl_summary: z.null().default(null),
});

const NextRetirementSchema = z.object({
  type: z.literal("RETIREMENT"),
  // Server-authoritative. The LLM may omit it; the API overwrites with the
  // deterministically projected final age before returning.
  final_age: z.number().int().min(18).max(120).default(65),
  recap: z.string().min(1),
  stats: z.record(z.string(), z.number()),
  achievements: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});

export const ContinuationResponseSchema = z.object({
  outcome_summary: OutcomeSummarySchema,
  months_advanced: z.union([z.literal(6), z.literal(12)]),
  next: z.discriminatedUnion("type", [
    NextMcqSchema,
    NextOpenSchema,
    NextRetirementSchema,
  ]),
});
export type ContinuationResponse = z.infer<typeof ContinuationResponseSchema>;
