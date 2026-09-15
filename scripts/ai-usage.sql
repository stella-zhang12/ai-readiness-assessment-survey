-- AI token usage and estimated cost per assessment.
-- Run in the Supabase SQL editor. Prices (USD per million tokens):
-- Haiku 4.5: $1 in / $5 out · Sonnet 5: $3 / $15 · Opus 5: $5 / $25.
-- Rows generated before token tracking shipped (2026-09-15) count as
-- calls but contribute 0 tokens.

with u as (
  select
    o.assessment_id,
    o.kind,
    o.model,
    o.created_at,
    coalesce((o.content->'usage'->>'input_tokens')::int, 0)  as in_tok,
    coalesce((o.content->'usage'->>'output_tokens')::int, 0) as out_tok
  from ai_outputs o
)
select
  a.title,
  count(*) filter (where u.kind = 'section_check')            as checks,
  count(*) filter (where u.kind = 'report')                   as reports,
  count(*) filter (where u.kind not in
                   ('section_check','report'))                as legacy_calls,
  sum(u.in_tok)                                               as input_tokens,
  sum(u.out_tok)                                              as output_tokens,
  round((sum(
    case
      when u.model like 'claude-haiku%'  then u.in_tok * 1.0 + u.out_tok * 5.0
      when u.model like 'claude-sonnet%' then u.in_tok * 3.0 + u.out_tok * 15.0
      when u.model like 'claude-opus%'   then u.in_tok * 5.0 + u.out_tok * 25.0
      else 0
    end) / 1000000.0)::numeric, 4)                            as est_cost_usd
from u
join assessments a on a.id = u.assessment_id
group by a.id, a.title
order by est_cost_usd desc;

-- Grand total across the whole project:
-- select round((sum(...)/1e6)::numeric, 2) from u;  (same CASE expression)
