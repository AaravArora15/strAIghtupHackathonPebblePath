import { FertilityBand } from "./fertility";
import {
  ContinuationRequest,
  PebbleHistoryEntry,
  Profile,
  StateSnapshot,
} from "./schemas";

// =====================================================
// Shared guardrails — prepended to every system prompt
// =====================================================

const GUARDRAILS = `
PebblePath is a grounded life-path simulator for women 25–35 navigating
career and family planning. You author the world; the user inhabits it.

This is a simulation, NOT a short story. Think "thoughtful news profile" or
"honest first-person essay" — not a novel, not a rom-com, not fanfic.

HARD RULES — never violate:
1. Tone: warm, considered, empowering. Never clinical, alarmist, girlboss,
   or overly literary. Plain and grounded beats lyrical.
2. DO NOT invent named characters. Say "your partner", "your manager",
   "a friend" — never "Jun", "Priya", "your boss Sarah". The user's real life
   has real names; the simulation must stay generic enough to map to it.
3. DO NOT invent specific props or sensory flourishes (no named foods,
   furniture, flats, neighbourhoods unless the user's profile supplies them).
   One grounding detail is enough. No "half-eaten laksa", no "cross-legged
   on the floor", no "your Tiong Bahru flat". Keep it universal.
4. Scene is 1–2 sentences MAX. Set the situation, not the ambience. The
   decision is the point, not the mise-en-scène.
5. Never give direct advice. Phrases like "you should" or "you will" are forbidden.
   Use "many women find", "often", "typically", "a common path is".
6. Fertility facts below are clinically grounded — do not soften, override,
   or contradict them. Score the fertility dimension to match the stated band.
7. Write all narrative in second person, present tense.
8. OPEN answers from the user are PERSONALISATION ONLY — they colour outcomes;
   they do not change the direction of the story. The user cannot steer via OPEN.
9. Never expose numeric scores inside scene or narrative text — scores are for
   the outcome UI only.
10. Return ONLY valid JSON matching the provided schema. No markdown fences,
    no preamble, no trailing commentary.
`.trim();

// =====================================================
// World generation
// =====================================================

export function buildWorldGenPrompt(profile: Profile, band: FertilityBand) {
  const system = `${GUARDRAILS}

TASK: Generate the opening moment of this user's simulation. The user did NOT
set this up — the world is already happening to them. Set the situation in
1–2 plain sentences (no named characters, no prop lists), then pose the
decision, then offer 2–3 meaningfully distinct MCQ choices. Think of it as
how a trusted friend would describe a crossroads to you — direct, grounded,
not performative.`;

  const user = `USER PROFILE
- Age: ${profile.age}
- Location: ${profile.location}
- Relationship: ${profile.relationship_status}
- Wants children: ${profile.wants_children}${profile.child_timeline ? ` (timeline: ${profile.child_timeline})` : ""}
- Career stage: ${profile.career_stage}
- Income: ${profile.income_band} SGD/month
- Retirement age: ${profile.retirement_age}

FERTILITY FACTS (deterministic — do NOT alter)
- Age ${profile.age} band: ${band.label} (${band.age_range})
- Monthly conception probability: ${band.monthly_probability}
- Clinical note: ${band.clinical_note}

SIMULATION PACING
The simulation will run in 6–12 month increments until retirement (${profile.retirement_age}). Pace the opening so it feels like a real life moment, not a summary.

RETURN JSON EXACTLY MATCHING THIS SHAPE:
{
  "scenario_title": "e.g. 'Your world at ${profile.age}'",
  "scenario_chapter": "short chapter title",
  "scene": "2–3 sentences. The specific moment they are in. Second person, present tense.",
  "prompt": "The situation or question they face right now.",
  "options": [
    { "id": "opt_a", "label": "Concrete choice", "consequence_hint": "Gentle non-spoiler hint" },
    { "id": "opt_b", "label": "Concrete choice", "consequence_hint": "Gentle non-spoiler hint" },
    { "id": "opt_c", "label": "Concrete choice", "consequence_hint": "Gentle non-spoiler hint" }
  ]
}`;

  return { system, user };
}

// =====================================================
// Pebble continuation
// =====================================================

function formatHistory(history: PebbleHistoryEntry[]): string {
  if (history.length === 0) return "(no prior pebbles — this is the first continuation)";
  return history
    .map((h) => {
      if (h.type === "MCQ") {
        return `- [MCQ @ age ${h.age}] Chose: "${h.user_choice ?? ""}"`;
      }
      return `- [OPEN @ age ${h.age}] We asked: "${h.open_question ?? ""}" — they answered: "${h.user_open_answer ?? ""}"`;
    })
    .join("\n");
}

function formatPersonalisation(history: PebbleHistoryEntry[]): string {
  const openAnswers = history.filter((h) => h.type === "OPEN" && h.user_open_answer);
  if (openAnswers.length === 0) return "(none yet)";
  return openAnswers
    .map((h) => `- "${h.open_question}" → "${h.user_open_answer}"`)
    .join("\n");
}

export function buildContinuationPrompt(
  req: ContinuationRequest,
  band: FertilityBand,
) {
  const { profile, state, history, last_action } = req;
  const simulatedAge = state.age;
  // Max age the next pebble could reach (12-month advance adds +1).
  const maxProjectedNextAge = projectedAge(simulatedAge, 12);
  // Would even a 6-month advance retire the user?
  const sixMonthProjectedNextAge = projectedAge(simulatedAge, 6);
  const mustRetireRegardless =
    sixMonthProjectedNextAge >= profile.retirement_age;
  const mayRetireOn12Months =
    !mustRetireRegardless && maxProjectedNextAge >= profile.retirement_age;

  const retirementDirective = mustRetireRegardless
    ? `\nHARD CONSTRAINT: Any months_advanced (6 or 12) will push the user to/past retirement age ${profile.retirement_age}. You MUST return next.type = "RETIREMENT" with recap, cumulative stats, and 2–4 achievements. Do NOT return MCQ or OPEN.`
    : mayRetireOn12Months
      ? `\nIMPORTANT: A 12-month advance would reach retirement age ${profile.retirement_age}. If you choose months_advanced = 12, you MUST return next.type = "RETIREMENT" with recap, cumulative stats, and 2–4 achievements. A 6-month advance is still allowed as MCQ or OPEN.`
      : "";

  const system = `${GUARDRAILS}

TASK: (1) Write the outcome of the user's last action across six dimensions.
(2) Advance the simulation by 6 or 12 months and generate the next pebble —
either an MCQ or an OPEN question. Alternate types when natural.${retirementDirective}

OUTCOME RULES
- Score 1 = very negative, 3 = mixed/neutral, 5 = very positive.
- Fertility score MUST align with the stated clinical band below.
- range_note on every dimension must contain a % qualifier (e.g. "typical for 60–70% of women this age").
- Use uncertainty language everywhere: "often", "typically", "range of X–Y%".
- No advice, no judgment, no directive language.

NEXT-PEBBLE RULES
- The world moves on naturally — time passes, new situations arise.
- If last_action was MCQ, prefer OPEN next (and vice versa) when it feels natural.
- OPEN questions WE ask — the user cannot steer the story via their answer.
  Good OPEN questions:
    "What does success look like to you in the next year?"
    "How is your partner feeling about where things are heading?"
    "What are you most afraid of giving up?"
- actionable_irl: true only if the choice maps to a concrete real-world action
  (e.g. "Apply to the MBA", "Talk to your partner"). For reflective or passive
  branches, false. OPEN pebbles are always actionable_irl: false.`;

  const lastActionSummary =
    last_action.type === "MCQ"
      ? `MCQ choice: "${last_action.user_choice}"`
      : `OPEN — we asked: "${last_action.open_question}" — they answered: "${last_action.user_open_answer}"`;

  const user = `USER PROFILE
- Starting age: ${profile.age} | Simulated age: ${simulatedAge}
- Career stage: ${state.career_stage} | Months elapsed: ${state.months_elapsed}
- Relationship: ${state.relationship_status}
- Retirement age: ${profile.retirement_age}

FERTILITY FACTS (deterministic — do NOT override)
- Band at age ${simulatedAge}: ${band.label} (${band.age_range})
- Monthly probability: ${band.monthly_probability}
- Clinical note: ${band.clinical_note}
${band.ivf_success ? `- IVF success rate: ${band.ivf_success}` : ""}

SIMULATION STATE
- Career progress: ${state.career_progress_score}/10
- Savings delta: ${state.savings_delta} SGD
- Emotional load: ${state.emotional_load}/10
- Has children: ${state.has_children}

JOURNEY SO FAR
${formatHistory(history)}

PERSONALISATION CONTEXT (from OPEN answers — colour outcomes, do NOT change direction)
${formatPersonalisation(history)}

LAST USER ACTION
${lastActionSummary}

RETURN JSON EXACTLY MATCHING THIS SHAPE:
{
  "outcome_summary": {
    "career":        { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" },
    "fertility":     { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" },
    "finances":      { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" },
    "lifestyle":     { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" },
    "emotional":     { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" },
    "relationships": { "score": 1-5, "label": "...", "narrative": "2-3 sentences", "range_note": "qualifier with %" }
  },
  "months_advanced": 6 or 12,
  "next": {
    // Choose ONE of the three shapes below and include only that one under "next":

    // MCQ shape:
    // "type": "MCQ",
    // "scene": "2-3 sentence narrative",
    // "prompt": "The question/situation",
    // "options": [ { "id": "opt_a", "label": "...", "consequence_hint": "..." }, ... ],
    // "actionable_irl": true | false,
    // "actionable_irl_summary": "short IRL action or null"

    // OPEN shape:
    // "type": "OPEN",
    // "scene": "2-3 sentence narrative",
    // "prompt": "The situation",
    // "open_question": "the personalisation question WE ask",
    // "actionable_irl": false,
    // "actionable_irl_summary": null

    // RETIREMENT shape (only if near retirement_age):
    // "type": "RETIREMENT",
    // "recap": "reflective paragraph of the life lived",
    // "stats": { "career_avg": n, "fertility_peak": n, "finances_avg": n, "lifestyle_avg": n, "emotional_avg": n, "relationships_avg": n },
    // "achievements": [ { "id": "slug", "label": "Human-readable" }, ... ]
  }
}`;

  return { system, user };
}

// =====================================================
// Helpers used by endpoints to build the state advance
// =====================================================

// Project forward age given a 6- or 12-month advance. Rounds up a 6-month jump
// to +1 year for the purpose of retirement-boundary checks (conservative).
export function projectedAge(currentAge: number, monthsAdvanced: number): number {
  return (
    currentAge +
    Math.floor(monthsAdvanced / 12) +
    (monthsAdvanced % 12 >= 6 ? 1 : 0)
  );
}

export function nextStateSnapshot(
  prev: StateSnapshot,
  monthsAdvanced: number,
  fertilityLabel: string,
  personalisationNote?: string,
): StateSnapshot {
  const notes = personalisationNote
    ? [...prev.personalisation_notes, personalisationNote]
    : prev.personalisation_notes;
  return {
    ...prev,
    age: projectedAge(prev.age, monthsAdvanced),
    months_elapsed: prev.months_elapsed + monthsAdvanced,
    fertility_risk: fertilityLabel,
    personalisation_notes: notes,
  };
}
