import { z } from "zod";

// =====================================================
// Shared
// =====================================================

export const OptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  consequence_hint: z.string().min(1),
  is_combined_path: z.boolean().default(false),
});

// Qualitative outcome writeup — no numeric scoring. headline is a one-sentence
// honest consequence, narrative is 2–3 sentences explaining what shifted and
// what it cost, continuity is one sentence that explicitly references a prior
// decision to make the arc visible. continuity is null ONLY on the very first
// outcome (empty JOURNEY SO FAR).
export const OutcomeSummarySchema = z.object({
  headline: z.string().min(1).max(200),
  narrative: z.string().min(1).max(600),
  continuity: z.string().max(300).nullable().default(null),
  // 1–2 source IDs from the curated whitelist (see lib/sources.ts). The
  // server filters anything the LLM invents — unknown IDs drop silently —
  // so downstream code can treat this as a verified subset of the list.
  // Left .optional() (not .default([])) because a nested zod default ends
  // up propagating optionality through z.infer and breaks callers that
  // expect the field to always be present.
  sources: z.array(z.string()).max(4).optional(),
});
export type OutcomeSummary = z.infer<typeof OutcomeSummarySchema>;

// =====================================================
// Profile (input to /api/world)
// =====================================================

export const ProfileSchema = z.object({
  age: z.number().int().min(18).max(45),
  location: z.string().min(1),
  relationship_status: z.string().min(1),
  wants_children: z.enum(["yes", "no", "maybe"]),
  child_timeline: z.string().max(500).optional().nullable(),
  career_stage: z.enum(["student", "early", "mid", "senior", "not-working"]),
  // Free-text intake fields filled during onboarding. Stricter enum fields
  // above drive hard simulation logic (age bands, option structure, pacing);
  // these three are passed verbatim to the LLM as grounding context only —
  // they colour outcomes and bias which trade-offs surface, but never
  // override deterministic rules like the fertility band.
  career_goals: z.string().max(500).optional().nullable(),
  income_band: z.enum(["under-15k", "15k-30k", "30k-50k", "50k-80k", "over-80k"]),
  financial_context: z.string().max(500).optional().nullable(),
  extra_context: z.string().max(1000).optional().nullable(),
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
  // 2–3 distinct paths + exactly 1 combined ("do it all") path → total 3–4.
  options: z.array(OptionSchema).min(3).max(4),
});
export type WorldGenResponse = z.infer<typeof WorldGenResponseSchema>;

// =====================================================
// Past-run notes (sent with every API call — world + continuation)
// =====================================================
// Each entry is the user's own written reflection on a previously-completed
// simulation, condensed to what the model actually needs: the name they gave
// the run, the free-text notes they wrote on its retirement report, and a
// few identifying facts so the LLM can reference the run concretely when
// steering subsequent paths.
export const PastRunNoteSchema = z.object({
  run_name: z.string().min(1).max(100),
  notes: z.string().max(2000),
  final_age: z.number().int().optional(),
  decision_count: z.number().int().optional(),
  closing_headline: z.string().max(300).optional(),
});
export type PastRunNote = z.infer<typeof PastRunNoteSchema>;

// =====================================================
// World request (input to /api/world) — wraps ProfileSchema so we can pass
// past-run notes alongside. The endpoint still accepts bare Profile payloads
// for backwards compatibility with tooling like tests/playthrough.ts.
// =====================================================
export const WorldRequestSchema = z.object({
  profile: ProfileSchema,
  past_run_notes: z.array(PastRunNoteSchema).max(10).optional(),
});
export type WorldRequest = z.infer<typeof WorldRequestSchema>;

// =====================================================
// Pebble history entry (sent on continuation)
// =====================================================

export const PebbleHistoryEntrySchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  age: z.number().int(),
  user_choice: z.string().optional().nullable(),
  open_question: z.string().optional().nullable(),
  user_open_answer: z.string().optional().nullable(),
  // Previous outcome's headline, carried forward so the next continuation can
  // reference it in the new outcome's `continuity` line. This is what makes
  // the arc feel compounding instead of disjoint.
  outcome_headline: z.string().optional().nullable(),
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
        // Client sets this true when the user picked the combined-path option.
        // Triggers combined-path realism on the server (state-delta floor).
        was_combined_path: z.boolean().default(false),
      }),
      z.object({
        type: z.literal("OPEN"),
        open_question: z.string().min(1),
        user_open_answer: z.string().min(1).max(150),
      }),
    ]),
    // Notes from the user's own prior completed simulations. Optional; the
    // client caps at 10 entries before sending. See PastRunNoteSchema.
    past_run_notes: z.array(PastRunNoteSchema).max(10).optional(),
  })
  .strict();
export type ContinuationRequest = z.infer<typeof ContinuationRequestSchema>;

// =====================================================
// Voluntary retirement (input to /api/pebble/retire) — user ends the
// simulation at the current simulated age, before their set retirement_age.
// =====================================================
export const RetireRequestSchema = z
  .object({
    profile: ProfileSchema,
    state: StateSnapshotSchema,
    history: z.array(PebbleHistoryEntrySchema),
    past_run_notes: z.array(PastRunNoteSchema).max(10).optional(),
  })
  .strict();
export type RetireRequest = z.infer<typeof RetireRequestSchema>;

// =====================================================
// Continuation response — next pebble OR retirement
// =====================================================

const NextMcqSchema = z.object({
  type: z.literal("MCQ"),
  scene: z.string().min(1),
  prompt: z.string().min(1),
  // 2–3 distinct paths + exactly 1 combined path → total 3–4.
  options: z.array(OptionSchema).min(3).max(4),
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

// Retirement "highlights" — qualitative chapter-notes pulled from the life
// lived. No numeric averages. Each entry captures a stretch of the arc in
// one sentence.
export const HighlightSchema = z.object({
  chapter: z.string().min(1).max(60),
  note: z.string().min(1).max(220),
});
export type Highlight = z.infer<typeof HighlightSchema>;

const NextRetirementSchema = z.object({
  type: z.literal("RETIREMENT"),
  // Server-authoritative. The LLM may omit it; the API overwrites with the
  // deterministically projected final age before returning.
  final_age: z.number().int().min(18).max(120).default(65),
  recap: z.string().min(1),
  highlights: z.array(HighlightSchema).min(1).max(6),
  achievements: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
  // Source IDs for the recap (same whitelist as outcome_summary.sources).
  sources: z.array(z.string()).max(4).optional(),
});

// Period-scoped changes to scalar state fields. The LLM derives these from
// the outcome narrative (no longer tied to dimension scores). The server
// applies + clamps. Combined-path realism enforces a floor on these.
export const StateDeltaSchema = z.object({
  career_progress_delta: z.number().min(-3).max(3),
  savings_period_delta: z.number(),
  emotional_load_delta: z.number().min(-3).max(3),
  has_children_change: z.boolean(),
});
export type StateDelta = z.infer<typeof StateDeltaSchema>;

export const ContinuationResponseSchema = z.object({
  outcome_summary: OutcomeSummarySchema,
  months_advanced: z.union([z.literal(6), z.literal(12)]),
  state_delta: StateDeltaSchema,
  next: z.discriminatedUnion("type", [
    NextMcqSchema,
    NextOpenSchema,
    NextRetirementSchema,
  ]),
});
export type ContinuationResponse = z.infer<typeof ContinuationResponseSchema>;
