// Tier 3 full playthrough driver — POSTs through the full A lifecycle from
// onboarding to retirement. Prereq: `npm run dev` running on :3000 and
// ANTHROPIC_API_KEY set. Cost: ~$0.30–$1 per run, 5–15 min wall clock.
// Run: npx tsx tests/playthrough.ts | tee tests/runs/$(date +%s).log

import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PROFILE_PATH = "tmp/profile.json";
const MAX_TURNS = 80;

const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
const warnings: string[] = [];

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${path} ${r.status}: ${text.slice(0, 500)}`);
  }
  return r.json();
}

// Tone guards — map to prompts.ts GUARDRAILS rules 2, 3, 4, 5.
function toneChecks(text: string | undefined, where: string) {
  if (!text) return;
  const sentenceCount = text.split(/[.!?]\s+/).filter((s) => s.trim()).length;
  if (sentenceCount > 2) {
    warnings.push(`${where}: scene has ${sentenceCount} sentences (rule: ≤2)`);
  }
  if (/\b(Jun|Priya|Sarah|Aisha|Mei|Ming|Wei|Arjun|Kai|Jasmine|Rachel|Sophie|Emily)\b/.test(text)) {
    warnings.push(`${where}: invented-name match — "${text.slice(0, 90)}…"`);
  }
  if (/\b(you should|you will|you must)\b/i.test(text)) {
    warnings.push(`${where}: directive language — "${text.slice(0, 90)}…"`);
  }
}

function logOutcome(o: { headline: string; narrative: string; continuity: string | null }) {
  console.log(`    HEADLINE:   ${o.headline}`);
  console.log(`    NARRATIVE:  ${o.narrative}`);
  if (o.continuity) console.log(`    CONTINUITY: ${o.continuity}`);
}

const started = Date.now();
console.log(`\n=== OPENING (age ${profile.age}, retire at ${profile.retirement_age}) ===`);
const world = await post("/api/world", profile);
console.log(`TITLE:  ${world.scenario.title}`);
console.log(`SCENE:  ${world.root_pebble.scene}`);
console.log(`PROMPT: ${world.root_pebble.prompt}`);
toneChecks(world.root_pebble.scene, "opening.scene");
toneChecks(world.root_pebble.prompt, "opening.prompt");

let state = world.root_pebble.state_snapshot;
let pebble: {
  type: "MCQ" | "OPEN";
  scene: string;
  prompt: string;
  options?: Array<{ id: string; label: string; consequence_hint: string }>;
  open_question?: string;
} = world.root_pebble;
const history: unknown[] = [];
let turn = 0;
let retired = false;

while (turn < MAX_TURNS) {
  turn++;
  const prevAge = state.age;

  let last_action: { type: "MCQ"; user_choice: string } | { type: "OPEN"; open_question: string; user_open_answer: string };
  if (pebble.type === "OPEN") {
    last_action = {
      type: "OPEN",
      open_question: pebble.open_question!,
      user_open_answer: "Calm days, enough money, people who know me",
    };
  } else {
    const opts = pebble.options!;
    const opt = opts[turn % opts.length];
    last_action = { type: "MCQ", user_choice: opt.label };
  }

  const resp = await post("/api/pebble/choose", {
    profile,
    state,
    history,
    last_action,
  });

  history.push({
    type: last_action.type,
    age: prevAge,
    ...(last_action.type === "MCQ"
      ? { user_choice: last_action.user_choice }
      : {
          open_question: last_action.open_question,
          user_open_answer: last_action.user_open_answer,
        }),
    outcome_headline: resp.outcome_summary.headline,
  });

  const choseLabel =
    last_action.type === "MCQ" ? last_action.user_choice : last_action.user_open_answer;
  console.log(
    `\n=== TURN ${String(turn).padStart(2, "0")} | age ${prevAge} → ${resp.new_state?.age ?? prevAge} | months=${resp.months_advanced} ===`,
  );
  console.log(`  CHOSEN [${last_action.type}] ${choseLabel}`);
  console.log(`  OUTCOME:`);
  logOutcome(resp.outcome_summary);

  if (resp.next.type === "RETIREMENT") {
    retired = true;
    console.log(`\n=== RETIREMENT ===`);
    console.log(`  final_age:              ${resp.next.final_age}`);
    console.log(`  retirement_synthesized: ${resp.retirement_synthesized}`);
    console.log(`  recap: ${resp.next.recap}`);
    console.log(`  highlights:`);
    for (const h of resp.next.highlights ?? []) {
      console.log(`    ${String(h.chapter).padEnd(14)} ${h.note}`);
    }
    console.log(`  achievements:`);
    for (const a of resp.next.achievements) {
      console.log(`    - ${a.id}: ${a.label}`);
    }

    if (resp.next.final_age < profile.retirement_age) {
      warnings.push(
        `retirement: final_age ${resp.next.final_age} < retirement_age ${profile.retirement_age}`,
      );
    }
    if (!resp.next.recap) warnings.push("retirement: empty recap");
    const achN = resp.next.achievements.length;
    if (achN < 1 || achN > 4) {
      warnings.push(`retirement: achievements length ${achN} out of [1,4]`);
    }
    const hlN = (resp.next.highlights ?? []).length;
    if (hlN < 1 || hlN > 6) {
      warnings.push(`retirement: highlights length ${hlN} out of [1,6]`);
    }
    break;
  }

  // Per-turn invariants.
  if (resp.new_state.age <= prevAge) {
    warnings.push(`turn ${turn}: time-advance stall (age ${prevAge} → ${resp.new_state.age})`);
  }
  if (resp.months_advanced !== 6 && resp.months_advanced !== 12) {
    warnings.push(`turn ${turn}: months_advanced=${resp.months_advanced} not in {6,12}`);
  }
  if (prevAge + 6 >= profile.retirement_age && resp.next.type !== "RETIREMENT") {
    warnings.push(
      `turn ${turn}: at age ${prevAge} (retire=${profile.retirement_age}), expected RETIREMENT, got ${resp.next.type}`,
    );
  }

  console.log(`  SCENE:  ${resp.next.scene}`);
  console.log(`  PROMPT: ${resp.next.prompt}`);
  toneChecks(resp.next.scene, `turn ${turn} scene`);
  toneChecks(resp.next.prompt, `turn ${turn} prompt`);

  state = resp.new_state;
  pebble = resp.next;
}

const elapsed = Math.round((Date.now() - started) / 1000);
console.log(`\n=== RUN SUMMARY ===`);
console.log(`  turns:    ${turn}`);
console.log(`  elapsed:  ${elapsed}s`);
console.log(`  retired:  ${retired}`);
console.log(`  warnings: ${warnings.length}`);
for (const w of warnings) console.log(`    - ${w}`);

if (!retired) {
  console.error(`\nFAIL: hit MAX_TURNS (${MAX_TURNS}) without reaching RETIREMENT`);
  process.exit(2);
}
process.exit(warnings.length > 10 ? 1 : 0);
