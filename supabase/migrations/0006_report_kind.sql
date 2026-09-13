-- Allow storing the AI Solution Scoping Report (and, if you have not
-- run 0003 yet, the section completeness checks too: this migration
-- SUPERSEDES 0003, so run this one and skip 0003).
--
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

alter table public.ai_outputs
  drop constraint ai_outputs_kind_check;

alter table public.ai_outputs
  add constraint ai_outputs_kind_check
  check (kind in ('summary', 'recap', 'followups', 'final',
                  'section_check', 'report'));
