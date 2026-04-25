# PebblePath

An AI life-path simulator for women 25–35. Built for **Problem 04 (Longevity)** at the **strAIght up!** hackathon.

> You don't design the world. The world is already happening to you — you just decide what to do next.

PebblePath walks a user through a decade-plus simulation of their own life, one decision at a time. Each decision is a "pebble" — a small moment with real trade-offs between career, relationships, fertility, finances, and emotional load. The simulation runs in 6–12 month increments until the user's chosen retirement age and closes with a recap of the life that was lived.

---

## What makes it different

Most "AI life simulators" let the user author the scenario. PebblePath deliberately does not.

* **Onboarding → auto-generated world.** The user fills in a profile (age, location, relationship, career stage, income band, children intent, free-text context). The system generates the opening scene, stakes and option set from that profile. The user never writes the premise.
* **Decisions only.** The user picks an MCQ option, or writes a short free-text answer on an OPEN pebble. OPEN answers **colour** the outcome; they never **steer** the direction.
* **Fertility facts are deterministic.** Age-based fertility bands (ACOG / NHS / KKH/SingHealth) are injected into every LLM prompt as stated facts. The model cannot soften or override them.
* **No free-lunch "do it all" path.** Every pebble includes a combined `opt_all` option. Its outcome is clamped server-side: emotional load must rise, and at least one of career progress or savings must go negative. Juggling everything always costs something.
* **Realism in both health and career.** Humans aren't immortal — health risk and lethal decisions surface as warnings in the outcome itself. Career and income trajectories are grounded in real wage-growth data per role. We don't reinforce decisions, we simulate them.

This is the product's differentiator and its safety guarantee — no hallucinated fertility advice, no steerable story, no "have it all" fantasy.

---

## Stack

|Layer|Tech|
|-|-|
|Frontend|Vanilla React in `.jsx` files, transpiled in-browser via `@babel/standalone`. No bundler.|
|API proxy|Next.js 14 on Vercel (`src/pages/api/*`)|
|LLM|Anthropic Claude via `@anthropic-ai/sdk` (default `claude-sonnet-4-6`)|
|Validation|Zod schemas (`src/lib/schemas.ts`) — shared between API and prompt builders|
|Persistence|Browser `localStorage` (profile, live session, past runs, sound prefs)|
|Future / optional|Supabase schema exists in `supabase/` for server-side persistence, but the current API is a pure LLM proxy. Momen handles Supabase writes directly.|

---

## Core functionalities

### 1. Onboarding

A single-page segmented form captures the user's profile:

* **Basics** — name (optional), age (18–45), location
* **Relationship** — single / dating / partnered / married / separated / other (+ optional free-text)
* **Children** — yes / maybe / no, plus optional timeline free-text (hidden if "no")
* **Career** — stage (student / early / mid / senior / not-working) + optional goals free-text
* **Finances** — annual SGD income band (Under $15k, $15k–$30k, $30k–$50k, $50k–$80k, $80k+) + optional savings/debts/dependents free-text
* **Extra context** — anything else the user wants the simulation to know
* **Retirement age** — 50–75, default 65

Structured fields drive hard simulation logic (fertility bands, option structure, state-delta magnitudes). Free-text fields are passed to the LLM verbatim as grounding — they bias which trade-offs surface, but never override deterministic rules.

The profile is stored under `localStorage["pebblepath:profile:v2"]` and hydrated onto `window.PROFILE_API` for API calls. Schema changes bump the version suffix so stale profiles don't silently break downstream calls.

### 2. World generation

On first run, the client POSTs the profile to `/api/world`. The server:

1. Computes the user's fertility band from their age.
2. Builds a world-gen prompt combining profile, band facts and (if present) prior-run notes.
3. Calls Claude with a structured JSON schema, retrying on validation failure.
4. Initialises a state snapshot (age, career stage, career progress = 5/10, savings delta = 0, emotional load = 5/10, has_children = false, personalisation notes = []).
5. Returns `{ scenario, root_pebble, fertility_band }`.

The root pebble is always an MCQ with 3–4 options: 2–3 distinct paths + exactly one `opt_all` combined path.

### 3. Decision loop

Each turn the user:

* Picks an MCQ option, OR
* Writes an answer to an OPEN pebble.

The client POSTs `{ profile, state, history, last_action, past_run_notes? }` to `/api/pebble/choose`. The server returns:

* **`outcome_summary`** — headline, narrative (2–3 sentences, ≤80 words), one line of continuity referencing one specific prior decision, 0–2 source citations.
* **`state_delta`** — `career_progress_delta` (−3..+3), `savings_period_delta` (SGD integer, calibrated per income band), `emotional_load_delta` (−2..+2), `has_children_change` (boolean, once true stays true).
* **`next`** — the next pebble: another MCQ, an OPEN question, or a RETIREMENT payload.
* **`new_state`** — updated snapshot (age, savings, scores, fertility band for new age, personalisation notes appended).
* **`months_advanced`** — 6 or 12.

History is replayed on every call so the LLM sees the full journey, not just the last turn. Continuity lines reference one prior decision by substance (never by fabricated detail).

### 4. Server-side realism clamps

`/api/pebble/choose` enforces rules the prompt alone can't guarantee (`src/pages/api/pebble/choose.ts`):

* **Premature retirement retry** — if the model returns RETIREMENT while the projected age is still more than 2 years short of `retirement_age`, reject and retry with an explicit correction message.
* **Combined-path clamp** — if the last action was an `opt_all` pick: `emotional_load_delta` is forced to ≥ +1, and if neither `career_progress_delta` nor `savings_period_delta` went negative, `career_progress_delta` is forced to −1. Returned with `combined_path_clamped: true` so the client can surface the fact if needed.
* **Deterministic retirement override** — if `projectedNextAge >= retirement_age` and the model didn't return RETIREMENT, the server synthesises one from the run's history.
* **Source whitelist filter** — unknown source IDs are stripped silently (whitelist lives in `src/lib/sources.ts`, 12 entries across career / caregiving / fertility / finance / health).
* **Combined-path flag normalisation** — at most one option per MCQ may carry `is_combined_path: true`.

### 5. Retirement

Triggered either:

* **Naturally** — when the next 6- or 12-month advance would cross `retirement_age`.
* **Voluntarily** — via `/api/pebble/retire`, which asks the LLM only to author a closing recap. Acknowledges the user chose to end early.

In both cases the server stitches together:

* **`recap`** — LLM narrative (fallback template if absent).
* **`highlights`** — derived deterministically from the history's outcome headlines. Evenly sampled down to 5 if the run is long.
* **`achievements`** — derived deterministically from history shape:

  * `long_path` (10+ decisions) / `full_path` (4–9)
  * `reflective` (3+ OPEN answers)
  * `long_arc` (20+ years spanned) / `decade_arc` (10–19)
  * `committed` (6+ MCQ picks)
  * `a_life_lived` — fallback when nothing else triggers
  * Capped at 4.
* **`sources`** — whitelist-filtered.
* **`final_age`** — projected from the last advance.

### 6. Past runs

Each retirement writes a run object to `localStorage["pebblepath:runs:v1"]`: stable `runId`, profile name, start age, final age, decision count, history, recap, highlights, achievements, sources, user-set name (`Run #1`, `Run #2`…), and a free-text notes field.

Prior-run notes are passed on every future `/api/world` and `/api/pebble/choose` call (capped at the 10 most recent with non-empty notes). The LLM is instructed to bias path selection toward things the user said they wanted to try differently — without pretending the current simulation remembers the other runs.

Runs can be renamed, annotated with reflections, deleted, re-opened in a retirement modal, or used as a branching point ("Branch from last decision") to revisit an alternative from the most recent MCQ.

---

## Additional functionalities

* **Profile view & edit** — every onboarded field is editable post-onboarding. Enum fields commit on click; text/number fields commit on blur with range validation (age 18–45, retirement age 50–75).
* **Markdown export** — `profileToMarkdown()` produces a structured `.md` summary of profile + past-run count, downloaded as `pebblepath-profile-<name>.md`.
* **PDF export** — the same view rendered through `html2pdf.js` to `pebblepath-profile-<name>.pdf` (A4, 16mm margins, 2× scale).
* **Branching replay** — from the retirement modal of the current run, the user can rewind to the most recent chosen MCQ and commit an alternative sibling. Old subtree is ghosted rather than deleted.
* **Ghost/revive pebbles** — forgone branches remain visible as ghosts. Clicking a ghost MCQ revives that subtree and rewinds state; re-opening an answered OPEN spawns a fresh sibling without losing the old answer.
* **Session persistence** — the live run (pebble tree, selected pebble, state snapshot, history, scenario, fertility band, retirement data) is stored under `localStorage["pebblepath:session:v1"]` and fingerprinted against the profile, so switching profiles on the same browser doesn't hydrate the wrong run.
* **Sound effects** — lazy `AudioContext`-based tones via `window.PebbleSounds`: `tap` (modal/hover), `whoosh` (pebble open), `commit` (decision confirmed), `reward` (4-note arpeggio on retirement). Togglable, preference stored under `localStorage["pebblepath:sound:v1"]`.
* **Theming & density** — light/dark theme toggle, branches filter, motion and density knobs. Defaults are declared in an `EDITMODE` block at the top of `app.jsx`.
* **Fertility band pill** — the current band label is always visible in the progress UI, re-derived on every age change so it stays consistent with the LLM's view of the world.

---

## Data model

### Profile (input to every API call)

```
age, location, relationship_status, wants_children, child_timeline?,
career_stage, career_goals?, income_band, financial_context?,
extra_context?, retirement_age
```

### StateSnapshot (evolves every turn)

```
age, months_elapsed, career_stage, career_progress_score (0–10),
savings_delta (SGD, cumulative), relationship_status, fertility_risk (band label),
has_children (monotonic), emotional_load (0–10), personalisation_notes[]
```

### FertilityBand (deterministic from age, `src/lib/fertility.ts`)

|Age|Label|Monthly probability|Clinical note|
|-|-|-|-|
|≤29|peak|25–30%|Conception 6–12 mo typical; peak fertility|
|30–32|strong|20–25%|Decline begins; most conceive within 1 year|
|33–35|moderate|15–20%|Decline accelerates; 6+ mo → consider specialist|
|36–38|declining|10–15%|Egg freezing / specialist commonly recommended|
|39+|low|5–10%|Significant decline; specialist consult advised|

---

## API

All endpoints are `POST`, JSON in / JSON out, Zod-validated.

|Endpoint|Purpose|
|-|-|
|`/api/world`|Generate the opening scenario + root MCQ from a profile.|
|`/api/pebble/choose`|Commit a decision. Returns outcome, state delta, next pebble (MCQ / OPEN / RETIREMENT), new state.|
|`/api/pebble/retire`|End the run early. Returns a RETIREMENT payload (recap + deterministic highlights/achievements).|

Each request:

1. Computes the deterministic fertility band from age (`src/lib/fertility.ts`).
2. Builds the prompt (`src/lib/prompts.ts`), injecting the band as stated facts.
3. Calls Anthropic with Zod-validated JSON output + one retry on schema failure (`src/lib/anthropic.ts`).
4. Clamps the fertility score to the band ceiling before returning (defence-in-depth against a model that over-states fertility).

Errors surface as `400` with a Zod issue list (via `src/lib/http.ts`).

### Example — `/api/world`

```bash
curl -X POST http://localhost:3000/api/world \
  -H "Content-Type: application/json" \
  -d '{
    "age": 27,
    "location": "Singapore",
    "relationship_status": "In a relationship",
    "wants_children": "yes",
    "child_timeline": "3-5 years",
    "career_stage": "mid",
    "income_band": "50k-80k",
    "retirement_age": 65
  }'
```

Returns: `{ scenario, root_pebble, fertility_band }`.

### Example — `/api/pebble/choose`

```bash
curl -X POST http://localhost:3000/api/pebble/choose \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "age": 27, "location": "Singapore", "relationship_status": "In a relationship",
      "wants_children": "yes", "child_timeline": "3-5 years",
      "career_stage": "mid", "income_band": "50k-80k", "retirement_age": 65
    },
    "state": {
      "age": 27, "months_elapsed": 0, "career_stage": "mid",
      "career_progress_score": 5, "savings_delta": 0,
      "relationship_status": "In a relationship", "fertility_risk": "low",
      "has_children": false, "emotional_load": 5, "personalisation_notes": []
    },
    "history": [],
    "last_action": {
      "type": "MCQ",
      "user_choice": "Accept the MBA sponsorship"
    }
  }'
```

Returns: `{ outcome_summary, months_advanced, state_delta, next, new_state, fertility_band_applied, combined_path_clamped, retirement_synthesized }`.

---

## Local development

```bash
cp .env.example .env.local
# Fill ANTHROPIC_API_KEY
npm install
npm run dev
```

Then open `http://localhost:3000/pebblepath/index.html`.

Default model is `claude-sonnet-4-6`. Override with `ANTHROPIC_MODEL` in `.env.local` (e.g. `claude-opus-4-7` for higher quality, `claude-haiku-4-5-20251001` for speed during dev).

Unit tests (no framework, just `node:assert`):

```bash
npx tsx tests/unit.test.ts
```

Tests cover `projectedAge` rounding, highlight sampling, achievement trigger rules, fallback recap, and fertility band lookup.

---

## Deploy

```bash
vercel
# Set ANTHROPIC_API_KEY in the Vercel dashboard → Environment Variables
vercel --prod
```

Optional: if using Momen as the frontend, give the deployed URL (e.g. `https://pebblepath-api.vercel.app`) to Momen's HTTP action config and let Momen write results back to Supabase using the schema in `supabase/schema.sql`.

---

## Repo layout

```
.
├── public/pebblepath/       # browser-rendered app (babel-standalone)
│   ├── index.html / PebblePath.html
│   ├── app.jsx              # root, session hydration, decision loop, retirement
│   ├── components.jsx       # onboarding, profile view, pebble tree, modals
│   ├── data.js
│   ├── sounds.js            # window.PebbleSounds
│   └── styles.css
├── src/
│   ├── pages/api/           # world.ts, pebble/choose.ts, pebble/retire.ts
│   └── lib/                 # schemas, prompts, anthropic, fertility, retirement, sources, http
├── supabase/                # SQL schema (unused by API, reserved for Momen writes)
└── tests/unit.test.ts
```

---

## Scope notes

* Current profiles and runs live entirely in browser `localStorage`. The Supabase schema under `supabase/` is reserved for Momen's direct writes; the Next.js API itself is a pure LLM proxy.
* There is no authentication flow — the app assumes a single local browser session per judge/user.
* The trail UI is desktop-first. Mobile layout is not a target for the hackathon submission.
