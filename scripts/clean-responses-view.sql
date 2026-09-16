-- Readable view of every answer in the combined assessment.
-- Generated from content/instrument/combined.v1.json; regenerate with
-- scratchpad gen-clean-view.mjs if the instrument changes.
--
-- Run once in the Supabase SQL editor. Afterwards, browse it under
-- Table Editor -> Views -> clean_responses (filter, sort, export CSV), or:
--   select * from clean_responses where assessment = 'My assessment';

create or replace view public.clean_responses as
with q(ord, qid, section, question, kind, options) as (
  values
    (1, 'S1.Q1', '1 · Use Case Definition', 'What task are you hoping AI could help with? What would you like AI to do?', 'text', null::jsonb),
    (2, 'S1.Q2', '1 · Use Case Definition', 'How is this task handled today?', 'text', null::jsonb),
    (3, 'S1.Q3', '1 · Use Case Definition', 'What are the main challenges with the current process?', 'text', null::jsonb),
    (4, 'S1.Q4', '1 · Use Case Definition', 'Could these challenges be addressed by a simpler digital tool, such as a rule-based system, instead of AI?', 'text', null::jsonb),
    (5, 'S1.Q5', '1 · Use Case Definition', 'Who would primarily use the AI tool?', 'text', null::jsonb),
    (6, 'S1.Q6', '1 · Use Case Definition', 'Would any information be provided to the AI tool?', 'text', null::jsonb),
    (7, 'S1.Q7', '1 · Use Case Definition', 'Would the AI tool produce anything?', 'text', null::jsonb),
    (8, 'S1.Q8', '1 · Use Case Definition', 'How would the information produced be used in practice?', 'text', null::jsonb),
    (9, 'S1.Q9', '1 · Use Case Definition', 'What outcomes would indicate that the application of AI in this process has been successful?', 'goals', null::jsonb),
    (10, 'S2.Q1', '2 · Data Readiness', 'Does your team currently have access to historical data that could be used for this AI solution?', 'select_one', '{"yes":"Yes","no":"No","not_sure":"Not sure"}'::jsonb),
    (11, 'S2.Q2', '2 · Data Readiness', 'In what form is the data available?', 'select_many', '{"paper":"Paper records","spreadsheets":"Spreadsheets, such as Excel or CSV files","databases":"Electronic databases","ehis":"Electronic health information systems","digital_forms":"Standardized digital forms","documents":"PDF or Word documents","images":"Images or photographs","audio":"Audio recordings","other":"Other","not_sure":"Not sure"}'::jsonb),
    (12, 'S2.Q3', '2 · Data Readiness', 'Where is the data currently stored?', 'select_many', '{"facilities":"At individual health facilities","district":"District or regional systems","national":"National Ministry of Health systems","ehis":"Electronic health information system","local_servers":"Local computers or servers","cloud":"Cloud-based storage","paper_archives":"Paper records or archives","external_partner":"With an external partner or organization","other":"Other","not_sure":"Not sure"}'::jsonb),
    (13, 'S2.Q4', '2 · Data Readiness', 'Could your team get permission to use this data for an AI project?', 'select_one', '{"have_access":"We already have access to the data","straightforward":"Approvals would be needed but are likely to be straightforward","difficult":"Approvals would be needed and may be slow or difficult","not_sure":"Not sure"}'::jsonb),
    (14, 'S2.Q5', '2 · Data Readiness', 'How much historical data is available?', 'select_one', '{"lt1y":"Less than 1 year","1_2y":"1-2 years","3_5y":"3-5 years","gt5y":"More than 5 years","unknown_period":"Data are available, but the time period is unknown","na":"Not applicable"}'::jsonb),
    (15, 'S2.Q6', '2 · Data Readiness', 'Is this data still being collected?', 'select_one', '{"yes":"Yes","no":"No","not_sure":"Not sure","na":"Not applicable","daily":"Daily","weekly":"Weekly","monthly":"Monthly","quarterly":"Quarterly","annually":"Annually","other":"Other"}'::jsonb),
    (16, 'S2.Q7', '2 · Data Readiness', 'Do your records also show the final, confirmed outcome of each case?', 'select_one', '{"most":"Yes, for most records","some":"Yes, for some records","no":"No","not_sure":"Not sure","na":"Not applicable: this use case would not predict or suggest an outcome"}'::jsonb),
    (18, 'S2.Q8.1', '2 · Data Readiness', 'Digital availability: Most of the data needed for this use case are available in a digital format that can be accessed and analyzed.', 'grid', null::jsonb),
    (19, 'S2.Q8.2', '2 · Data Readiness', 'Completeness: The important information needed for this task is usually recorded, with few missing fields or records.', 'grid', null::jsonb),
    (20, 'S2.Q8.3', '2 · Data Readiness', 'Consistency: The same information is recorded in a similar way across facilities, locations, and time periods.', 'grid', null::jsonb),
    (21, 'S2.Q8.4', '2 · Data Readiness', 'Geographic coverage: The data include the districts, regions, facilities, or communities where the AI solution would be used.', 'grid', null::jsonb),
    (22, 'S2.Q8.5', '2 · Data Readiness', 'Population coverage: The data include the different populations that the AI solution would serve, such as relevant age groups, genders, geographic communities, and socioeconomic groups.', 'grid', null::jsonb),
    (23, 'S2.Q8.6', '2 · Data Readiness', 'Less common situations: The data include enough examples of less common but important situations relevant to the use case.', 'grid', null::jsonb),
    (24, 'S2.Q8.7', '2 · Data Readiness', 'Accuracy checks: There are processes or checks in place to identify incorrect, impossible, or unusual data entries.', 'grid', null::jsonb),
    (25, 'S3.Q1', '3 · Safety and Responsible Use', 'Where do you anticipate human review or approval to occur in the new process with AI integration?', 'text', null::jsonb),
    (26, 'S3.Q2', '3 · Safety and Responsible Use', 'What data governance requirements apply in your country or setting?', 'text', null::jsonb),
    (27, 'S3.Q3', '3 · Safety and Responsible Use', 'How would you monitor whether the AI tool remains accurate once it is in use?', 'text', null::jsonb),
    (28, 'S3.Q4', '3 · Safety and Responsible Use', 'What would happen when the AI tool makes a mistake?', 'text', null::jsonb),
    (29, 'S4.Q1', '4 · Country-Level Readiness', 'Do senior leaders in your organization and relevant government agencies support this AI initiative?', 'text', null::jsonb),
    (30, 'S4.Q2', '4 · Country-Level Readiness', 'Are there national or regional laws, policies, or guidelines that would apply to this AI solution?', 'text', null::jsonb),
    (31, 'S4.Q3', '4 · Country-Level Readiness', 'Is the necessary technology infrastructure available to support this AI solution?', 'text', null::jsonb),
    (32, 'S4.Q4', '4 · Country-Level Readiness', 'Are there people in your organization with the skills needed to implement, operate, and maintain the AI solution?', 'text', null::jsonb),
    (33, 'S4.Q5', '4 · Country-Level Readiness', 'What regulatory, financial, or technical challenges could make it difficult to implement or sustain this AI solution?', 'text', null::jsonb)
)
select
  a.title                                   as assessment,
  t.name                                    as team,
  q.ord                                     as question_order,
  q.section,
  q.question,
  case
    -- skipped / not applicable
    when r.value ? 'idk' then
      case when q.kind = 'grid' then 'Not sure' else 'I don''t know' end
    when r.value ? 'na' then 'Not applicable'

    -- open text (with the optional 0-5 comfort rating appended)
    when q.kind = 'text' then
      coalesce(r.value->>'text', '')
      || case when r.value ? 'scale'
              then ' [user comfort: ' || (r.value->>'scale') || ' of 5]'
              else '' end

    -- goal builder: one line per goal
    when q.kind = 'goals' then
      coalesce(
        (select string_agg(
           coalesce(g->>'metric','(unnamed)')
           || ' | today: ' || coalesce(g->>'before','')
           || ' | goal: '  || coalesce(g->>'after',''),
           chr(10))
         from jsonb_array_elements(r.value->'goals') g),
        r.value->>'text', '')

    -- single choice (+ conditional follow-up answers)
    when q.kind = 'select_one' then
      coalesce(q.options->>(r.value->>'choice'), r.value->>'choice', '')
      || case when coalesce(r.value->>'followupText','') <> ''
              then ' | ' || (r.value->>'followupText') else '' end
      || case when r.value ? 'followupChoice'
              then ' | ' || coalesce(q.options->>(r.value->>'followupChoice'),
                                     r.value->>'followupChoice') else '' end
      || case when coalesce(r.value->>'followupOther','') <> ''
              then ' (' || (r.value->>'followupOther') || ')' else '' end

    -- multiple choice (+ Other write-in)
    when q.kind = 'select_many' then
      coalesce(
        (select string_agg(coalesce(q.options->>c, c), '; ')
         from jsonb_array_elements_text(r.value->'choices') c), '')
      || case when coalesce(r.value->>'other','') <> ''
              then ' (Other: ' || (r.value->>'other') || ')' else '' end

    -- grid statement ratings (+ optional note)
    when q.kind = 'grid' then
      case r.value->>'rating'
        when '2' then 'Fully' when '1' then 'Partially' when '0' then 'Not at all'
        else '' end
      || case when coalesce(r.value->>'note','') <> ''
              then ' | note: ' || (r.value->>'note') else '' end

    else r.value::text
  end                                       as answer,
  p.full_name                               as last_edited_by,
  r.updated_at
from public.responses r
join q                    on q.qid = r.question_id
join public.assessments a on a.id = r.assessment_id
join public.teams t       on t.id = a.team_id
left join public.profiles p on p.id = r.updated_by
order by a.title, q.ord;

-- Lock the view down: respect row-level security and keep it out of the
-- public API entirely (research team reads it via the dashboard only).
alter view public.clean_responses set (security_invoker = true);
revoke select on public.clean_responses from anon, authenticated;
