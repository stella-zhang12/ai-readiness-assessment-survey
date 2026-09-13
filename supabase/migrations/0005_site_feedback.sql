-- Site-wide pilot feedback (supersedes 0004's question_feedback: this
-- one table now receives ALL feedback, from any page, signed in or not;
-- question context is attached automatically when relevant). If you
-- have not run 0004, skip it. If you have, the old table simply stops
-- receiving new rows.
--
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table public.site_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id),  -- null for signed-out visitors
  page          text not null,                     -- pathname, e.g. '/dashboard'
  assessment_id text,                              -- attached when inside an assessment
  section_id    text,                              -- e.g. 'S2'
  question_id   text,                              -- the question page the user was on
  question_text text,                              -- the question as shown to the user
  feedback_type text not null check (feedback_type in
    ('question_unclear', 'options_dont_fit', 'design', 'navigation',
     'broken', 'suggestion', 'other')),
  message       text,                              -- optional "tell us more"
  created_at    timestamptz not null default now()
);

create index site_feedback_page_idx     on public.site_feedback (page);
create index site_feedback_question_idx on public.site_feedback (question_id);
create index site_feedback_type_idx     on public.site_feedback (feedback_type);

alter table public.site_feedback enable row level security;

-- INSERT-only, open to visitors as well (pilot feedback from the landing
-- page matters too). The research team reads via the Supabase dashboard /
-- service role (no client SELECT policy).
create policy "anyone submits site feedback" on public.site_feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
