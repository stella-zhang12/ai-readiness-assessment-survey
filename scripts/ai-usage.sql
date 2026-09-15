-- AI usage and cost per assessment, in dollars.
-- Run in the Supabase SQL editor.
--
-- Each generation stores its own cost_usd (computed at call time from the
-- price table in lib/ai/claude.ts). For the handful of rows written after
-- token tracking but before cost storage, cost falls back to token math
-- here; rows from before 2026-09-15 count as calls with 0 tokens/cost.

with u as (
  select
    o.assessment_id,
    o.kind,
    o.model,
    o.created_at,
    coalesce((o.content->'usage'->>'input_tokens')::int, 0)      as in_tok,
    coalesce((o.content->'usage'->>'output_tokens')::int, 0)     as out_tok,
    coalesce(
      (o.content->'usage'->>'cost_usd')::numeric,
      (case
        when o.model like 'claude-haiku%'  then
          coalesce((o.content->'usage'->>'input_tokens')::int, 0) * 1.0
          + coalesce((o.content->'usage'->>'output_tokens')::int, 0) * 5.0
        when o.model like 'claude-sonnet%' then
          coalesce((o.content->'usage'->>'input_tokens')::int, 0) * 3.0
          + coalesce((o.content->'usage'->>'output_tokens')::int, 0) * 15.0
        when o.model like 'claude-opus%'   then
          coalesce((o.content->'usage'->>'input_tokens')::int, 0) * 5.0
          + coalesce((o.content->'usage'->>'output_tokens')::int, 0) * 25.0
        else 0
      end) / 1000000.0
    )                                                            as cost_usd
  from ai_outputs o
)
select
  a.title,
  count(*) filter (where u.kind = 'section_check')  as checks,
  count(*) filter (where u.kind = 'report')         as reports,
  sum(u.in_tok)                                     as input_tokens,
  sum(u.out_tok)                                    as output_tokens,
  round(sum(u.cost_usd), 4)                         as cost_usd
from u
join assessments a on a.id = u.assessment_id
group by a.id, a.title
order by cost_usd desc;

-- Whole-project total in dollars:
--   select round(sum(cost_usd), 2) as total_usd from u;
