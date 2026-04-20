-- Aisha demo seed — run after schema.sql
-- Loads the scenario that judges will walk through. No auth required if RLS is
-- disabled for the demo window (see schema.sql bottom).

insert into profiles (id, age, location, relationship_status, wants_children, child_timeline, career_stage, income_band, retirement_age)
values (
  '00000000-0000-0000-0000-000000000001',
  27, 'Singapore', 'In a relationship', 'yes', '3-5 years', 'mid', '6k-10k', 65
)
on conflict (id) do nothing;

insert into scenarios (id, profile_id, title, chapter)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Your world at 27',
  'Career peak or fertility window?'
)
on conflict (id) do nothing;

insert into pebbles (
  id, scenario_id, parent_id, type,
  scene, prompt, options, state_snapshot, depth
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  null,
  'MCQ',
  'It''s Monday morning. Your manager has messaged asking for a quick chat — you already know it''s about the MBA sponsorship. At the same time, your partner texts: they''ve been offered the job in London and need an answer by Friday. Two things you''ve been quietly thinking about for months have arrived on the same day.',
  'You have until Friday. What do you do?',
  '[
    {"id":"opt_a","label":"Accept the MBA sponsorship","consequence_hint":"Two years of study, an accelerated career — and a paused timeline for everything else."},
    {"id":"opt_b","label":"Go to London with your partner","consequence_hint":"A relationship deepened, a new city — and a career to rebuild from scratch."},
    {"id":"opt_c","label":"Turn both down and start trying for a baby","consequence_hint":"The path you''ve discussed most. The timing has never felt quite right."}
  ]'::jsonb,
  '{
    "age": 27,
    "months_elapsed": 0,
    "career_stage": "mid",
    "career_progress_score": 5,
    "savings_delta": 0,
    "relationship_status": "In a relationship",
    "fertility_risk": "low",
    "has_children": false,
    "emotional_load": 5,
    "personalisation_notes": []
  }'::jsonb,
  0
)
on conflict (id) do nothing;
