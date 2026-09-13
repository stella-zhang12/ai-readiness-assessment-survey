-- Allow the hub's AI completeness checks to be stored (and therefore
-- cached: unchanged answers reuse the stored check instead of a new
-- AI call). The feature works without this, it just re-generates every
-- visit, so run this soon after deploying.
--
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

alter table public.ai_outputs
  drop constraint ai_outputs_kind_check;

alter table public.ai_outputs
  add constraint ai_outputs_kind_check
  check (kind in ('summary', 'recap', 'followups', 'final', 'section_check'));
