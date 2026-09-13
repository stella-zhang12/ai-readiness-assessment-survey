-- Per-question "report confusion" feedback (distinct from the end-of-
-- assessment feedback survey). One row per report; a user may submit
-- as many as they like. question_text is denormalized so each row is
-- self-contained when the research team reviews it in the Table Editor.
--
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table public.question_feedback (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id       uuid not null references auth.users (id),
  section_id    text not null,   -- e.g. 'S2'
  question_id   text not null,   -- the page the user was on, e.g. 'S2.Q8'
  question_text text not null,   -- the question as shown to the user
  feedback_type text not null check (feedback_type in
    ('confusing', 'term', 'options_dont_fit', 'not_working', 'other')),
  message       text,            -- optional "tell us more"
  created_at    timestamptz not null default now()
);

create index question_feedback_assessment_idx
  on public.question_feedback (assessment_id);
create index question_feedback_question_idx
  on public.question_feedback (question_id);

alter table public.question_feedback enable row level security;

-- INSERT-only for participants; the research team reads via the
-- Supabase dashboard / service role (no client SELECT policy).
create policy "member reports question feedback" on public.question_feedback
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.assessments a
                where a.id = assessment_id
                  and a.team_id in (select private.user_team_ids()))
  );
