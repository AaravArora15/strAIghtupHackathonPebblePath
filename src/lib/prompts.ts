import { FertilityBand } from "./fertility";
import {
  ContinuationRequest,
  PastRunNote,
  PebbleHistoryEntry,
  Profile,
  StateDelta,
  StateSnapshot,
} from "./schemas";
import { formatSourceWhitelistForPrompt } from "./sources";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// =====================================================
// Shared guardrails — prepended to every system prompt
// =====================================================

const GUARDRAILS = `
PebblePath is a grounded life-path simulator for women 25–35 navigating
career and family planning. You author the world; the user inhabits it.
The user is making decisions that stand in for real ones — take that weight
seriously. This is a simulation, NOT a short story. Think "thoughtful news
profile" or "honest first-person essay" — not a novel, not a rom-com, not a
therapy handout.

HARD RULES — never violate:
1. Tone: warm, considered, direct. Never clinical, alarmist, girlboss,
   self-help-y, or overly literary. Plain and grounded beats lyrical.
2. DO NOT invent named characters. Say "your partner", "your manager",
   "a friend" — never "Jun", "Priya", "your boss Sarah". The user's real life
   has real names; the simulation must stay generic enough to map to it.
3. DO NOT invent specific props or sensory flourishes (no named foods,
   furniture, flats, neighbourhoods unless the user's profile supplies them).
   One grounding detail is enough. Keep it universal.
4. Never give direct advice. Phrases like "you should" or "you will" are forbidden.
   Use "many women find", "often", "typically", "a common path is".
5. Fertility facts below are clinically grounded — do not soften, override,
   or contradict them. The outcome narrative must respect the stated band.
6. Write all narrative in second person, present tense.
7. OPEN answers from the user are PERSONALISATION ONLY — they colour outcomes;
   they do not change the direction of the story. The user cannot steer via OPEN.
8. Never expose numbers, scores, stars, percentages of life-quality, or
   dimension names ("career axis", "emotional score") inside narrative text.
   No numeric rating language at all.
9. Return ONLY valid JSON matching the provided schema. No markdown fences,
   no preamble, no trailing commentary.

LENGTH RULES — strict. The UI is compact; overlong text breaks the layout:
- scene: 1 sentence, ≤25 words.
- prompt: 1 sentence, ≤20 words.
- option.label: ≤10 words. No "AND" clauses stacking actions.
- option.consequence_hint: 1 sentence, ≤20 words.
- outcome_summary.headline: 1 sentence, ≤18 words.
- outcome_summary.narrative: 2–3 sentences, ≤80 words TOTAL.
- outcome_summary.continuity: 1 sentence, ≤35 words.
- open_question: 1 sentence, ≤18 words.

OPTION STRUCTURE (applies to every MCQ you generate — world and continuation):
- Produce 2–3 DISTINCT, COMMITTED paths. Each must represent a different
  direction — different trade-off, different priority, different cost.
- NO middle-ground, "balanced", or hedging options between the distinct paths.
  "Lean into work a bit while keeping an eye on family" is banned. Every
  distinct option must require the user to actually pick a side.
- Then append EXACTLY ONE "combined path" option as the FINAL option, with
  id "opt_all" and "is_combined_path": true. Its label offers to pursue all
  the other paths at once ("Try to do all three — push your career, start
  trying for a baby, AND make the move").
- The combined path's consequence_hint MUST name the realism cost in plain
  language — juggling everything thins each out, burnout is likely, nothing
  gets full attention.
- Total options per pebble: 3 or 4 (2–3 distinct + 1 combined).

OUTCOME WRITEUP RULES (outcome_summary for every continuation):
- headline: the single honest consequence of this choice. Name what actually
  happened — not whether it was "right". Avoid judgment adverbs ("wisely",
  "bravely", "sadly"). 1 sentence, ≤18 words.
- narrative: 2–3 sentences, ≤80 words TOTAL. Explain concretely what shifted
  and what cost came with it — what opened, what closed. Ground it in the
  user's stated profile/history; invent nothing outside that. No therapy-manual
  vocabulary ("holding space", "honouring", "showing up"). No rom-com beats.
- continuity: 1 sentence referencing a SPECIFIC earlier decision from JOURNEY
  SO FAR, by its substance (e.g. "the role you turned down last year", "the
  therapy you started at 29"). Shows the arc compounding — an earlier
  commitment paying off, a trade-off coming due, a pattern holding. Return
  null ONLY when JOURNEY SO FAR is empty (first outcome).
- NO scores, NO 1-to-5 language, NO dimension names, NO percentages, NO
  "rating". Write the way you'd tell a trusted friend what happened.

CONTINUITY DISCIPLINE:
- Reference ONE specific prior decision in continuity, not two, not a montage.
- Do NOT fabricate prior events — only what's in JOURNEY SO FAR.
- Alternate the mood: sometimes commitments compound (earlier trade-offs pay
  off), sometimes costs come due (earlier speed catches up). Don't make every
  continuity line a triumph or every one a regret.

STATE DELTAS (emitted alongside outcome — drive background state tracking):
- career_progress_delta: -2..+2. Positive if the outcome advanced career
  standing, negative if it cost progress, zero for neutral moves. Derive from
  narrative, not from a score.
- savings_period_delta: SGD integer for the period. Sign matches the
  financial direction in the narrative. Rough magnitudes per 6–12 months by
  income band (treat as guidance, not hard anchors):
    under-3k: typical -3k..+3k, extreme -10k..+8k
    3k-6k:    typical -5k..+5k, extreme -15k..+12k
    6k-10k:   typical -8k..+8k, extreme -25k..+20k
    over-10k: typical -10k..+15k, extreme -40k..+30k
- emotional_load_delta: -2..+2. POSITIVE = higher strain/burnout; NEGATIVE =
  lighter. Tie to the narrative: strain = +1/+2, steady = 0, relief = -1/-2.
- has_children_change: true ONLY if this period plausibly includes a birth or
  adoption. Once true, stays true.

COMBINED-PATH REALISM (when last_action.was_combined_path is true):
- Narrative MUST name the strain — what's being thinned, what's getting
  short-changed. Do not reward the "do it all" fantasy.
- emotional_load_delta MUST be ≥ +1 (juggling everything raises load).
- At least ONE of career_progress_delta or savings_period_delta MUST be
  negative — something always gives when spread thin.
- Respect the fertility band below — narrative cannot claim fertility is
  improving if the band says declining/low.

NEVER put numbers, stars, percentages, or dimension names inside scene,
prompt, headline, narrative, continuity, or option text. State deltas are
structured fields, invisible to the user.

SOURCE CITATIONS (for every outcome_summary and for retirement.recap):
- Pick 1–2 source IDs from the WHITELIST below that genuinely ground the
  outcome narrative. A source is relevant when its topic directly matches
  the substance of the outcome (e.g. fertility band narrative → a fertility
  source; career-break narrative → a career/motherhood-penalty source).
- The whitelist is curated to be authored by women or by bodies whose remit
  is research ON women — this is deliberate, to anchor the simulation in
  women's own data rather than male-default framing.
- If no listed source is a good fit, return an empty array — DO NOT invent
  new IDs, URLs, or authors. Unknown IDs are stripped server-side.
- Output the IDs verbatim as strings in the "sources" array. 0–2 IDs only.

SOURCE WHITELIST (id | [topic] author — what the source covers):
${formatSourceWhitelistForPrompt()}
`.trim();

// =====================================================
// World generation
// =====================================================

export function buildWorldGenPrompt(
  profile: Profile,
  band: FertilityBand,
  pastRunNotes?: PastRunNote[],
) {
  const system = `${GUARDRAILS}

TASK: Generate the opening moment of this user's simulation. The user did NOT
set this up — the world is already happening to them. Set the situation in
1–2 plain sentences (no named characters, no prop lists), then pose the
decision, then offer the option set per OPTION STRUCTURE above:
  2–3 distinct committed paths + 1 "opt_all" combined path (total 3 or 4).
Think of it as how a trusted friend would describe a crossroads — direct,
grounded, not performative.
${PAST_NOTES_TASK_DIRECTIVE}`;

  const user = `USER PROFILE
- Age: ${profile.age}
- Location: ${profile.location}
- Relationship: ${profile.relationship_status}
- Wants children: ${profile.wants_children}${profile.child_timeline ? ` (timeline: ${profile.child_timeline})` : ""}
- Career stage: ${profile.career_stage}
- Income: ${profile.income_band} SGD/month
- Retirement age: ${profile.retirement_age}

USER INTAKE CONTEXT (free-text from onboarding — use to ground outcomes and
bias which trade-offs surface; never override deterministic rules)
${formatIntakeContext(profile)}

FERTILITY FACTS (deterministic — do NOT alter)
- Age ${profile.age} → fertility band: ${band.label} fertility (${band.age_range}).
  (Label describes fertility itself: peak > strong > moderate > declining > low.)
- Monthly conception probability: ${band.monthly_probability}
- Clinical note: ${band.clinical_note}

PRIOR RUN NOTES (user's own reflections on previous simulations — bias path
selection, NOT scene content; do not name past runs in narrative)
${formatPastRunNotes(pastRunNotes)}

SIMULATION PACING
The simulation will run in 6–12 month increments until retirement (${profile.retirement_age}). Pace the opening so it feels like a real life moment, not a summary.

RETURN JSON EXACTLY MATCHING THIS SHAPE:
{
  "scenario_title": "e.g. 'Your world at ${profile.age}'",
  "scenario_chapter": "short chapter title",
  "scene": "1 sentence, ≤25 words. Second person, present tense.",
  "prompt": "The situation or question they face right now.",
  "options": [
    { "id": "opt_a", "label": "Committed path A", "consequence_hint": "Honest non-spoiler hint", "is_combined_path": false },
    { "id": "opt_b", "label": "Committed path B (different direction)", "consequence_hint": "Honest non-spoiler hint", "is_combined_path": false },
    // Optional third distinct path:
    // { "id": "opt_c", "label": "Committed path C (different direction)", "consequence_hint": "Honest non-spoiler hint", "is_combined_path": false },
    { "id": "opt_all", "label": "Try to do all of them at once", "consequence_hint": "Realism caveat — naming the cost of juggling everything", "is_combined_path": true }
  ]
}`;

  return { system, user };
}

// =====================================================
// Pebble continuation
// =====================================================

// Format the free-text intake fields collected during onboarding. These are
// the user's own words about their goals, finances and anything else they
// chose to share. Passed to the LLM as grounding context: they colour
// outcomes and bias which trade-offs surface, but do NOT override
// deterministic rules (fertility band, combined-path realism, etc).
function formatIntakeContext(profile: Profile): string {
  const bits: string[] = [];
  if (profile.career_goals && profile.career_goals.trim()) {
    bits.push(`- career goals: "${profile.career_goals.trim()}"`);
  }
  if (profile.child_timeline && profile.child_timeline.trim()) {
    bits.push(`- family/children timeline: "${profile.child_timeline.trim()}"`);
  }
  if (profile.financial_context && profile.financial_context.trim()) {
    bits.push(`- financial context: "${profile.financial_context.trim()}"`);
  }
  if (profile.extra_context && profile.extra_context.trim()) {
    bits.push(`- anything else the user flagged: "${profile.extra_context.trim()}"`);
  }
  return bits.length > 0 ? bits.join("\n") : "(none provided)";
}

// Condense past-run notes for prompt injection. Each past run carries the
// user's own written reflection (saved on its retirement report) plus a few
// identifying facts so the LLM can reference it concretely.
function formatPastRunNotes(notes: PastRunNote[] | undefined): string {
  if (!notes || notes.length === 0) {
    return "(none — first simulation, or no prior runs have user notes yet)";
  }
  return notes
    .map((n) => {
      const meta: string[] = [];
      if (n.final_age != null) meta.push(`reached age ${n.final_age}`);
      if (n.decision_count != null) meta.push(`${n.decision_count} decisions`);
      if (n.closing_headline) meta.push(`closed with "${n.closing_headline}"`);
      const header = meta.length ? `${n.run_name} — ${meta.join(" · ")}` : n.run_name;
      return `- [${header}]\n    user notes: "${n.notes}"`;
    })
    .join("\n");
}

// Shared "USE THIS" directive shown in both the world and continuation tasks.
const PAST_NOTES_TASK_DIRECTIVE = `
USING PRIOR RUN NOTES (when present):
- Read them as the user's own post-hoc reflection on previous simulations.
  Common patterns: "I wish I'd committed earlier to X", "we pushed too hard
  on Y and burned out", "the thing I regret is skipping Z".
- Use them to BIAS toward paths/trade-offs the user has said they want to
  try differently this time. Do NOT pretend the simulation remembers events
  from other runs — only use the notes to weight which directions show up
  in options, which trade-offs the narrative surfaces, and what the
  continuity line emphasises.
- Do NOT mention the past run by name inside scene/prompt/narrative. The
  notes inform the vibe; the current simulation still stands on its own.`;

function formatHistory(history: PebbleHistoryEntry[]): string {
  if (history.length === 0)
    return "(no prior pebbles — this is the first continuation; return continuity: null)";
  return history
    .map((h) => {
      const outcomeLine = h.outcome_headline
        ? ` → outcome: "${h.outcome_headline}"`
        : "";
      if (h.type === "MCQ") {
        return `- [MCQ @ age ${h.age}] Chose: "${h.user_choice ?? ""}"${outcomeLine}`;
      }
      return `- [OPEN @ age ${h.age}] We asked: "${h.open_question ?? ""}" — they answered: "${h.user_open_answer ?? ""}"${outcomeLine}`;
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
  const maxProjectedNextAge = projectedAge(simulatedAge, 12);
  const sixMonthProjectedNextAge = projectedAge(simulatedAge, 6);
  const mustRetireRegardless =
    sixMonthProjectedNextAge >= profile.retirement_age;
  const mayRetireOn12Months =
    !mustRetireRegardless && maxProjectedNextAge >= profile.retirement_age;

  const yearsToRetirement = profile.retirement_age - simulatedAge;
  const retirementDirective = mustRetireRegardless
    ? `\nHARD CONSTRAINT: Any months_advanced (6 or 12) will push the user to/past retirement age ${profile.retirement_age}. You MUST return next.type = "RETIREMENT" with recap, 3–6 highlights, and 2–4 achievements. Do NOT return MCQ or OPEN.`
    : mayRetireOn12Months
      ? `\nIMPORTANT: A 12-month advance would reach retirement age ${profile.retirement_age}. If you choose months_advanced = 12, you MUST return next.type = "RETIREMENT" with recap, highlights, and achievements. A 6-month advance is still allowed as MCQ or OPEN.`
      : `\nHARD CONSTRAINT: The user is simulated age ${simulatedAge} and retirement_age is ${profile.retirement_age}. Roughly ${yearsToRetirement} simulated years remain. You MUST return next.type = "MCQ" or "OPEN". Do NOT return "RETIREMENT" — the simulation is nowhere near retirement. Early retirement is a bug, not a creative choice; the user's life continues and needs new decisions.`;

  const system = `${GUARDRAILS}

TASK:
(1) Write the outcome of the user's last action — headline, narrative, and
    (if JOURNEY SO FAR is non-empty) a continuity line referencing an earlier
    decision by its substance. Follow OUTCOME WRITEUP RULES strictly.
(2) Emit state_delta per STATE DELTAS rules. If last_action.was_combined_path
    is true, also satisfy COMBINED-PATH REALISM.
(3) Advance the simulation by 6 or 12 months and generate the next pebble —
    MCQ or OPEN. Alternate types when natural.${retirementDirective}
${PAST_NOTES_TASK_DIRECTIVE}

NEXT-PEBBLE RULES
- The world moves on naturally — time passes, new situations arise. Don't
  repeat the same decision shape back-to-back.
- If last_action was MCQ, prefer OPEN next (and vice versa) when it feels natural.
- For MCQ next-pebbles, follow OPTION STRUCTURE exactly: 2–3 distinct
  committed paths + 1 "opt_all" combined path.
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
      ? `MCQ choice: "${last_action.user_choice}"` +
        (last_action.was_combined_path
          ? ` [COMBINED PATH — apply COMBINED-PATH REALISM rules]`
          : ``)
      : `OPEN — we asked: "${last_action.open_question}" — they answered: "${last_action.user_open_answer}"`;

  const user = `USER PROFILE
- Starting age: ${profile.age} | Simulated age: ${simulatedAge}
- Career stage: ${state.career_stage} | Months elapsed: ${state.months_elapsed}
- Relationship: ${state.relationship_status}
- Retirement age: ${profile.retirement_age}

USER INTAKE CONTEXT (free-text from onboarding — grounding only)
${formatIntakeContext(profile)}

FERTILITY FACTS (deterministic — do NOT override)
- Band at age ${simulatedAge}: ${band.label} fertility (${band.age_range}).
  (Scale: peak > strong > moderate > declining > low.)
- Monthly probability: ${band.monthly_probability}
- Clinical note: ${band.clinical_note}
${band.ivf_success ? `- IVF success rate: ${band.ivf_success}` : ""}

SIMULATION STATE (background — do not mention numerically in narrative)
- Career progress tracker: ${state.career_progress_score}/10
- Savings delta since start: ${state.savings_delta} SGD
- Emotional load tracker: ${state.emotional_load}/10
- Has children: ${state.has_children}

JOURNEY SO FAR (prior decisions + their outcome headlines — USE for continuity)
${formatHistory(history)}

PERSONALISATION CONTEXT (from OPEN answers — colour outcomes, do NOT change direction)
${formatPersonalisation(history)}

PRIOR RUN NOTES (user's own reflections on previous simulations — bias path
selection and which trade-offs the narrative surfaces; do not name past runs
in narrative)
${formatPastRunNotes(req.past_run_notes)}

LAST USER ACTION
${lastActionSummary}

RETURN JSON EXACTLY MATCHING THIS SHAPE:
{
  "outcome_summary": {
    "headline":   "1 sentence ≤18 words — honest consequence of this choice",
    "narrative":  "2–3 sentences ≤80 words — concrete shift + real cost",
    "continuity": "1 sentence referencing a specific earlier decision by substance, OR null ONLY if JOURNEY SO FAR is empty",
    "sources":    ["source_id_a", "source_id_b"]  // 0–2 IDs from whitelist; empty array if none fit
  },
  "months_advanced": 6 or 12,
  "state_delta": {
    "career_progress_delta": -2..+2,
    "savings_period_delta": SGD integer,
    "emotional_load_delta": -2..+2 (positive = more strain, negative = relief),
    "has_children_change": true only if this period plausibly includes birth/adoption
  },
  "next": {
    // Choose ONE of the three shapes below and include only that one under "next":

    // MCQ shape — 2–3 distinct paths + 1 "opt_all" combined path:
    // "type": "MCQ",
    // "scene": "1 sentence ≤25 words",
    // "prompt": "The question/situation",
    // "options": [
    //   { "id": "opt_a", "label": "...", "consequence_hint": "...", "is_combined_path": false },
    //   { "id": "opt_b", "label": "...", "consequence_hint": "...", "is_combined_path": false },
    //   { "id": "opt_all", "label": "Try to do all of them", "consequence_hint": "Realism caveat", "is_combined_path": true }
    // ],
    // "actionable_irl": true | false,
    // "actionable_irl_summary": "short IRL action or null"

    // OPEN shape:
    // "type": "OPEN",
    // "scene": "1 sentence ≤25 words",
    // "prompt": "The situation",
    // "open_question": "the personalisation question WE ask",
    // "actionable_irl": false,
    // "actionable_irl_summary": null

    // RETIREMENT shape (only if near retirement_age):
    // "type": "RETIREMENT",
    // "recap": "3–5 sentence reflective paragraph on the life lived",
    // "highlights": [
    //   { "chapter": "ages 29–32", "note": "1 sentence naming what defined this stretch" },
    //   ...  // 3–6 total, in chronological order
    // ],
    // "achievements": [ { "id": "slug", "label": "Human-readable" }, ... ],
    // "sources": ["source_id_a", "source_id_b"]  // 0–2 IDs from whitelist, grounding the recap
  }
}`;

  return { system, user };
}

// =====================================================
// Voluntary retirement — user decided to stop mid-simulation.
// Produces just the recap (+ optional sources). The endpoint then stitches
// deterministic highlights/achievements in on top so the report shape is
// consistent with a natural retirement.
// =====================================================
export function buildRetireNowPrompt(
  profile: Profile,
  state: StateSnapshot,
  history: PebbleHistoryEntry[],
  pastRunNotes: PastRunNote[] | undefined,
  band: FertilityBand,
) {
  const decisionCount = history.length;
  const yearsLived = Math.max(0, state.age - profile.age);
  const yearsRemaining = Math.max(0, profile.retirement_age - state.age);

  const system = `${GUARDRAILS}

TASK: The user has chosen to VOLUNTARILY END the simulation at simulated
age ${state.age} — ${yearsRemaining} years before their set retirement_age
of ${profile.retirement_age}. Write a reflective recap of the life they've
lived so far in this run.

This is not a failure or a death. The user is just pausing here by choice —
they saw enough of this path. Tone: warm, considered, direct; the way a
close friend would sum up a chapter someone closed on their own terms.

The recap MUST:
- Acknowledge, gently, that they're ending here and this is not the whole life
  (e.g. "you called time at ${state.age}", "you stepped away here").
- Reflect concretely on what the ${yearsLived} years and ${decisionCount} decisions
  actually contained — drawn ONLY from JOURNEY SO FAR. Invent nothing.
- Follow OUTCOME WRITEUP RULES: no therapy vocabulary, no named characters,
  no numerical scores or dimension labels, no rom-com beats.
- 3–5 sentences, ≤140 words total.
- Respect the fertility band and any continuity from JOURNEY SO FAR.
${PAST_NOTES_TASK_DIRECTIVE}`;

  const user = `USER PROFILE
- Starting age: ${profile.age} | Ending at: ${state.age}
- Career stage: ${state.career_stage} | Months elapsed: ${state.months_elapsed}
- Relationship: ${state.relationship_status}
- retirement_age originally set: ${profile.retirement_age} (user is stopping early)

USER INTAKE CONTEXT (free-text from onboarding)
${formatIntakeContext(profile)}

FERTILITY FACTS (deterministic — do NOT override)
- Band at age ${state.age}: ${band.label} fertility (${band.age_range}).

SIMULATION STATE (background — do NOT mention numerically in recap)
- Career progress tracker: ${state.career_progress_score}/10
- Savings delta since start: ${state.savings_delta} SGD
- Emotional load tracker: ${state.emotional_load}/10
- Has children: ${state.has_children}

JOURNEY SO FAR (every decision + outcome headline — your ONLY source material)
${formatHistory(history)}

PERSONALISATION CONTEXT (from OPEN answers — colour the recap, do NOT invent)
${formatPersonalisation(history)}

PRIOR RUN NOTES (from prior completed simulations — bias tone only)
${formatPastRunNotes(pastRunNotes)}

RETURN JSON EXACTLY MATCHING THIS SHAPE:
{
  "recap":   "3–5 sentences ≤140 words reflecting on the life so far, acknowledging the user is stopping here.",
  "sources": ["source_id_a", "source_id_b"]  // 0–2 IDs from whitelist, empty array if none fit
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
  delta: StateDelta,
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
    career_progress_score: clamp(
      prev.career_progress_score + delta.career_progress_delta,
      0,
      10,
    ),
    savings_delta: prev.savings_delta + delta.savings_period_delta,
    emotional_load: clamp(
      prev.emotional_load + delta.emotional_load_delta,
      0,
      10,
    ),
    // Once has_children flips true it stays true; change=true promotes.
    has_children: prev.has_children || delta.has_children_change,
    personalisation_notes: notes,
  };
}
