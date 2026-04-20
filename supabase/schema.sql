-- PebblePath schema
-- Run in Supabase SQL editor in order. Idempotent enough to re-run after dropping.

-- =====================================================
-- Tables
-- =====================================================

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  age int not null check (age between 18 and 45),
  location text,
  relationship_status text,
  wants_children text,           -- 'yes' | 'no' | 'maybe'
  child_timeline text,           -- '1-2 years' | '3-5 years' | 'not sure' | 'n/a'
  career_stage text,             -- 'student' | 'early' | 'mid' | 'senior' | 'not-working'
  income_band text,              -- 'under-3k' | '3k-6k' | '6k-10k' | 'over-10k'
  retirement_age int default 65,
  created_at timestamptz default now()
);

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  title text,
  chapter text,
  created_at timestamptz default now()
);

create table if not exists pebbles (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references scenarios(id) on delete cascade,
  parent_id uuid references pebbles(id) on delete cascade,

  type text not null check (type in ('MCQ','OPEN','RETIREMENT')),
  scene text,
  prompt text,
  options jsonb,                 -- MCQ only
  open_question text,            -- OPEN only

  user_choice text,              -- MCQ: option label or id chosen
  user_open_answer text,         -- OPEN: free text (<= 150 chars, enforced in app)

  state_snapshot jsonb,          -- running sim state at this node
  outcome_summary jsonb,         -- 6-dimension outcomes

  -- Behaviour loop (appSpecs §D)
  is_pinned boolean default false,
  actionable_irl boolean default false,
  actionable_irl_summary text,
  irl_status text check (irl_status in ('done','not_yet','changed_mind')),
  irl_status_updated_at timestamptz,
  last_nudged_at timestamptz,

  depth int default 0,
  created_at timestamptz default now()
);

create table if not exists retirement_reports (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references scenarios(id) on delete cascade,
  final_age int not null,
  recap text not null,
  stats jsonb not null,
  achievements jsonb not null,
  created_at timestamptz default now()
);

create index if not exists pebbles_scenario_idx on pebbles(scenario_id);
create index if not exists pebbles_parent_idx on pebbles(parent_id);
create index if not exists scenarios_profile_idx on scenarios(profile_id);

-- =====================================================
-- Row-Level Security
-- =====================================================

alter table profiles enable row level security;
alter table scenarios enable row level security;
alter table pebbles enable row level security;
alter table retirement_reports enable row level security;

drop policy if exists "profiles owner" on profiles;
create policy "profiles owner"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scenarios owner" on scenarios;
create policy "scenarios owner"
  on scenarios for all
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

drop policy if exists "pebbles owner" on pebbles;
create policy "pebbles owner"
  on pebbles for all
  using (
    scenario_id in (
      select s.id from scenarios s
      join profiles p on s.profile_id = p.id
      where p.user_id = auth.uid()
    )
  )
  with check (
    scenario_id in (
      select s.id from scenarios s
      join profiles p on s.profile_id = p.id
      where p.user_id = auth.uid()
    )
  );

drop policy if exists "retirement_reports owner" on retirement_reports;
create policy "retirement_reports owner"
  on retirement_reports for all
  using (
    scenario_id in (
      select s.id from scenarios s
      join profiles p on s.profile_id = p.id
      where p.user_id = auth.uid()
    )
  )
  with check (
    scenario_id in (
      select s.id from scenarios s
      join profiles p on s.profile_id = p.id
      where p.user_id = auth.uid()
    )
  );

-- =====================================================
-- Demo-mode access (for judge demo without auth)
-- Uncomment only during the demo window, then re-enable RLS.
-- =====================================================
-- alter table profiles disable row level security;
-- alter table scenarios disable row level security;
-- alter table pebbles disable row level security;
-- alter table retirement_reports disable row level security;
