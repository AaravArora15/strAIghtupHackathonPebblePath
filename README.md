# PebblePath API

Thin Next.js proxy between the Momen frontend and the Anthropic API.
Deployed to Vercel. Two endpoints power the full simulation loop.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/world` | Generate the opening scenario + root MCQ pebble from a profile |
| `POST` | `/api/pebble/choose` | Continue the simulation: outcome for the last action + next pebble (MCQ / OPEN / RETIREMENT) |

Both endpoints:
1. Compute the deterministic fertility band from age (`src/lib/fertility.ts`).
2. Build the prompt (`src/lib/prompts.ts`), injecting the band as stated facts.
3. Call Anthropic with Zod-validated JSON output + one retry on schema failure (`src/lib/anthropic.ts`).
4. Clamp the fertility score to the band ceiling before returning (defence-in-depth against a model that over-states fertility).

## Setup

```bash
cd PebblePathCodeFiles
cp .env.example .env.local
# Fill ANTHROPIC_API_KEY
npm install
npm run dev
```

Default model is `claude-sonnet-4-6`. Override with `ANTHROPIC_MODEL` in `.env.local` (e.g. `claude-opus-4-7` for higher quality, `claude-haiku-4-5-20251001` for speed during dev).

## Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`.
3. For the judge demo, run `supabase/seed.sql` to load the Aisha scenario.
4. To demo without auth, uncomment the `disable row level security` block at the bottom of `schema.sql` during the demo window — re-enable afterwards.

Momen writes to Supabase directly via its built-in integration. This API does NOT touch Supabase — it's a pure AI proxy. Momen calls `/api/world` or `/api/pebble/choose`, receives the LLM output, then writes the result to Supabase in a follow-up action.

## Test locally

### `/api/world`

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
    "income_band": "6k-10k",
    "retirement_age": 65
  }'
```

Returns: `{ scenario, root_pebble, fertility_band }`.

### `/api/pebble/choose`

```bash
curl -X POST http://localhost:3000/api/pebble/choose \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "age": 27, "location": "Singapore", "relationship_status": "In a relationship",
      "wants_children": "yes", "child_timeline": "3-5 years",
      "career_stage": "mid", "income_band": "6k-10k", "retirement_age": 65
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

Returns: `{ outcome_summary: { headline, narrative, continuity }, months_advanced, state_delta, next, new_state, fertility_band_applied, combined_path_clamped, retirement_synthesized }`.

## Deploy

```bash
vercel
# Set ANTHROPIC_API_KEY in the Vercel dashboard → Environment Variables
vercel --prod
```

Give the deployed URL (e.g. `https://pebblepath-api.vercel.app`) to the Momen HTTP action config.

## Architecture notes for the pitch

- **User never authors the scenario** — profile in, world out.
- **Fertility risk is deterministic** — `src/lib/fertility.ts` maps age → clinical band (ACOG / NHS / Singapore MOH). Injected as stated facts in every prompt. Fertility score is post-clamped to the band ceiling; the LLM cannot exceed it.
- **Every call is stateful** — `/api/pebble/choose` receives the full history array (`[{MCQ, age, user_choice}, {OPEN, age, question, answer}, ...]`) plus the live state snapshot. Not a single-turn wrapper.
- **Schema-validated with retry** — Zod validates LLM JSON; one retry with error feedback on failure.
- **OPEN answers colour, don't steer** — prompt explicitly labels them as `personalisation_context` and instructs the model not to change trajectory.
