-- The single combined instrument replaces the Brainstorm/Diagnostic split
-- (lab decision, 2026-09). Existing rows keep their original version value.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

alter table public.assessments
  drop constraint assessments_version_check;

alter table public.assessments
  add constraint assessments_version_check
  check (version in ('brainstorm', 'diagnostic', 'combined'));
