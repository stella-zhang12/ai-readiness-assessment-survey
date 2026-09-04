-- =============================================================================
-- AI Use Case Scoping & Readiness Assessment (Beta) - initial schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Implements PRD section 8: team-scoped tables + row-level security.
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  invite_code text not null unique,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

create table public.team_members (
  team_id   uuid not null references public.teams (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member',           -- flat roles for the beta
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.assessments (
  id                 uuid primary key default gen_random_uuid(),
  team_id            uuid not null references public.teams (id) on delete cascade,
  title              text not null default 'Untitled assessment',
  version            text not null check (version in ('brainstorm', 'diagnostic')),
  status             text not null default 'draft' check (status in ('draft', 'complete')),
  current_step       text,                            -- resume pointer, e.g. 'A4', 'd2'
  instrument_version text not null,                   -- e.g. 'diagnostic.v1'
  created_by         uuid not null references auth.users (id),
  updated_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);

-- One row per answer, upserted on autosave. value shapes:
--   {"text": "..."} | {"rating": 0|1|2} | {"idk": true} | {"na": true}
-- The hidden 0/1/2 never carries label text (labels live in the instrument JSON).
create table public.responses (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  question_id   text not null,
  value         jsonb not null,
  updated_by    uuid references auth.users (id),
  updated_at    timestamptz not null default now(),
  unique (assessment_id, question_id)
);

-- Append-only audit trail of every AI generation (PRD section 7).
-- For kind='final', content also stores the hidden anchor for the pilot audit.
create table public.ai_outputs (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  kind           text not null check (kind in ('summary', 'recap', 'followups', 'final')),
  section_id     text,
  content        jsonb not null,
  model          text,
  prompt_version text,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

-- Experience survey; write-only for participants, read by the research team
-- via the Supabase dashboard / service role only (no SELECT policy).
create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id       uuid not null references auth.users (id),
  answers       jsonb not null,
  created_at    timestamptz not null default now(),
  unique (assessment_id, user_id)
);

-- Invisible-but-disclosed active-time tracking (PRD section 10). Append-only.
create table public.timing_events (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  user_id        uuid not null references auth.users (id),
  section_id     text not null,
  seconds_active integer not null check (seconds_active >= 0 and seconds_active <= 3600),
  started_at     timestamptz,
  recorded_at    timestamptz not null default now()
);

create index responses_assessment_idx     on public.responses (assessment_id);
create index ai_outputs_assessment_idx    on public.ai_outputs (assessment_id, kind);
create index timing_events_assessment_idx on public.timing_events (assessment_id);
create index assessments_team_idx         on public.assessments (team_id);

-- -----------------------------------------------------------------------------
-- Helpers & triggers
-- -----------------------------------------------------------------------------

-- Invite codes: 8 chars, unambiguous alphabet (no 0/O/1/I).
create or replace function private.generate_invite_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
           (floor(random() * 32))::int + 1, 1), '')
  from generate_series(1, 8);
$$;

alter table public.teams
  alter column invite_code set default private.generate_invite_code();

-- The caller's team ids, bypassing RLS (SECURITY DEFINER) so policies on
-- team_members don't recurse.
create or replace function private.user_team_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

-- Auto-create a profile row for each new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Team creator automatically becomes a member.
create or replace function private.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (team_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row execute function private.handle_new_team();

-- Joining happens ONLY through this function, so invite codes can't be
-- enumerated by SELECTing teams. Called via supabase.rpc('join_team', ...).
create or replace function public.join_team(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into target
  from public.teams
  where invite_code = upper(trim(code));

  if target is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.team_members (team_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;

  return target;
end;
$$;

-- Keep updated_at fresh.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assessments_touch before update on public.assessments
  for each row execute function private.touch_updated_at();
create trigger responses_touch before update on public.responses
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.assessments   enable row level security;
alter table public.responses     enable row level security;
alter table public.ai_outputs    enable row level security;
alter table public.feedback      enable row level security;
alter table public.timing_events enable row level security;

-- profiles: users manage their own row; teammates' names are visible.
create policy "read own or teammates' profiles" on public.profiles
  for select using (
    id = auth.uid()
    or id in (
      select tm.user_id from public.team_members tm
      where tm.team_id in (select private.user_team_ids())
    )
  );
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- teams: members read/rename; any authenticated user may create a team.
create policy "members read team" on public.teams
  for select using (id in (select private.user_team_ids()));
create policy "members update team" on public.teams
  for update using (id in (select private.user_team_ids()))
  with check (id in (select private.user_team_ids()));
create policy "authenticated create team" on public.teams
  for insert with check (auth.uid() = created_by);

-- team_members: visible within the team; leaving = deleting own row.
-- No INSERT policy: joining goes through join_team() (SECURITY DEFINER).
create policy "members read membership" on public.team_members
  for select using (team_id in (select private.user_team_ids()));
create policy "leave team" on public.team_members
  for delete using (user_id = auth.uid());

-- assessments: full access within the team.
create policy "team assessments" on public.assessments
  for all using (team_id in (select private.user_team_ids()))
  with check (team_id in (select private.user_team_ids()));

-- responses: access via the parent assessment's team.
create policy "team responses" on public.responses
  for all using (
    exists (select 1 from public.assessments a
            where a.id = assessment_id
              and a.team_id in (select private.user_team_ids()))
  )
  with check (
    exists (select 1 from public.assessments a
            where a.id = assessment_id
              and a.team_id in (select private.user_team_ids()))
  );

-- ai_outputs: append-only (SELECT + INSERT, no UPDATE/DELETE policies).
create policy "team reads ai outputs" on public.ai_outputs
  for select using (
    exists (select 1 from public.assessments a
            where a.id = assessment_id
              and a.team_id in (select private.user_team_ids()))
  );
create policy "team inserts ai outputs" on public.ai_outputs
  for insert with check (
    exists (select 1 from public.assessments a
            where a.id = assessment_id
              and a.team_id in (select private.user_team_ids()))
  );

-- feedback: INSERT-only for participants (researchers read via service role).
create policy "member submits feedback" on public.feedback
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.assessments a
                where a.id = assessment_id
                  and a.team_id in (select private.user_team_ids()))
  );

-- timing_events: INSERT-only, own rows (researchers read via service role).
create policy "member records timing" on public.timing_events
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.assessments a
                where a.id = assessment_id
                  and a.team_id in (select private.user_team_ids()))
  );

-- -----------------------------------------------------------------------------
-- Research views (service-role / dashboard use; not exposed through the app)
-- -----------------------------------------------------------------------------

create view private.assessment_timing as
select assessment_id,
       section_id,
       count(distinct user_id) as contributors,
       sum(seconds_active)     as total_seconds
from public.timing_events
group by assessment_id, section_id;
