# AI Use Case Scoping & Readiness Assessment (Beta)

A web tool that guides health-sector teams — especially civil registration and vital
statistics (CRVS) programs — through a structured assessment of whether a proposed AI
use case is ready to build. Built by the Digital Health & AI research group, Johns
Hopkins Bloomberg School of Public Health.

Two assessment depths:

- **Brainstorm** — 17 open questions, ~10–15 min, no scoring. Ends with a printable
  transcript and an AI-suggested "things to find out" list.
- **Diagnostic** — Sections A–E, ~30–45 min. Open scoping questions, an AI-generated
  problem summary the respondent confirms, 24 structured readiness ratings, and a
  final AI-judged readiness table (Use Case · Data · Safety · Country-Level) with
  traffic-light status and plain-language reasoning.

Full product requirements: [`docs/AI_Readiness_Tool_PRD.docx`](docs/AI_Readiness_Tool_PRD.docx)
(user journey diagram: [`docs/AI_Readiness_Tool_Flow.png`](docs/AI_Readiness_Tool_Flow.png)).

## Repository layout

```
├── app/                    Next.js App Router pages and API routes
├── components/             Shared React components
├── lib/                    Typed instrument loader, Supabase + AI helpers
├── content/instrument/     The assessment instrument as versioned JSON (single
│                           source of truth, transcribed from the lab's docx)
├── supabase/migrations/    Database schema + row-level security policies
└── docs/                   PRD, flow diagram, design mockup
```

## The instrument content

`content/instrument/` is the single source of truth for every question, guidance
paragraph, example, and scale label. It was transcribed from
*"Revised Version of AI Readiness (Re-Scoped).docx"* (including its tracked review
comments). Rules baked in:

- Rating scale labels are **Absent / Partially Meets the Criteria / Fully Meets the
  Criteria** (+ *I don't know* everywhere; + *N/A* on `D1.1.4` only). The underlying
  0/1/2 values are never shown to users.
- Entries marked `"draft": true` (generic-healthcare examples, Brainstorm helper
  sentences) are **Claude-drafted placeholders awaiting lab review** — see PRD §4.
- Editing content = editing JSON here; each assessment records the instrument
  version it was answered against.

## Local development

```bash
# Node 22+ required (this machine: ~/.local/node22/bin — add to PATH)
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `ANTHROPIC_API_KEY` | Server-side only — powers the AI features (Claude Opus 5) |

## Database setup

Create a Supabase project, then run the SQL in `supabase/migrations/0001_init.sql`
(SQL editor → paste → run). It creates all tables, the team-scoped row-level
security policies, and the `join_team` invite-code function.

## Deployment

Vercel, connected to this GitHub repo — every push to `main` deploys. Set the three
environment variables in the Vercel project settings. See PRD §12 for the full
platform/cost table (the pilot runs on free tiers + ~$5 of Anthropic API credit).

## Status

Building toward the pilot. Roadmap (PRD §15): instrument JSON ✅ → schema ✅ →
scaffold ✅ → auth & teams → form engine → rating pages → AI routes → results →
polish → pilot.
