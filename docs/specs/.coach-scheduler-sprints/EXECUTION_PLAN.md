# Gritty Recruits — Public Page + Visit Scheduler
## Strategy Artifact / Sprint Plan v5

**Revision notes (v5 vs v4):**
- Path correction throughout: public route is `/athletes`, not `/recruits`. Five path call-sites updated (topology diagram, Sprint 1 desired output, Sprint 1 acceptance test, Sprint 2 desired output, Marketing Task URL). The page brand remains "Gritty Recruits"; only the URL changed. Pivot occurred mid-Sprint-011 after a legacy `/recruits/<slug>/` reverse proxy was discovered live in production.
- Added section "Architectural Carry-Forwards from Sprints 010–011" capturing seven repo conventions downstream sprints must conform to: data-hook pattern, RLS pattern (anon-INSERT-only), slug-in-config, SlideOutShell modal primitive, legacy proxy as governance constraint, `<style>` block + className pattern, and PII boundary defense in depth.
- Added section "Open Decisions Forward of Sprint 012" capturing six items from the Sprint 012 Phase 0 audit (DF-1 through DF-6).
- Inputs: `docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md` Sections F (staleness check) and G (DF reconciliation), plus `docs/specs/.coach-scheduler-sprints/sprint-011-retro.md` (close ledger and carry-forwards).

**Revision notes (v4 vs v3):**
- Inserted Sprint 5: Admin Panel Repair (data integrity, search, audit log, edit coverage)
- Renumbered former Sprint 5 (College Coach Auth) to Sprint 6
- Recorded active risk during Sprints 0–4: admin panel persistence bug means data accuracy of public page depends on workaround (direct Supabase Studio edits for critical changes)

**Revision notes (v3 vs v2):**
- Removed "Contact Period 2026" framing — page is now division-agnostic
- Replaced "Profile" link on player cards with X/Twitter link
- Recorded architectural placement: page lives in `recruit-hub-rebuild` repo
- Recorded soft-profile pattern for college coaches
- Logo and wordmark styling fixed in prototype

**Revision notes (v2 vs v1):**
- Removed Google Calendar API; replaced with server-generated ICS + transactional email
- Added multi-recipient invite distribution
- Added school name display on player cards

---

## Decisions on record

| ID | Decision | Value |
|---|---|---|
| A | MVP scope | Full feature: roster + scheduler + player selection + ICS calendar invite |
| B | Visit request storage | Supabase table, surfaced as new tab in existing Coach Dashboard |
| C | Player selection mechanism | Inside scheduler modal — date/time first, then player picker step |
| D | Multi-school page layout | School toggle (default to BC High; Belmont Hill comes online May 2026) |
| E | GrittyFB style system readiness | Partial — needs Sprint 0 token extraction |
| F | Auth boundary on public scheduler | Email + name + invisible honeypot (no captcha v1) |
| G | Calendar invite mechanism | Server-generated `.ics`, distributed via email to all attendees |
| H | ICS attendee visibility | Single invite, all attendees visible |
| I | Architectural placement | Page lives in `recruit-hub-rebuild` (web app repo). Nav links bridge to `grittyfb.com` via external URLs. |
| J | College coach identity model | Multi-state coach identity now lives at the canonical layer (`college_coaches`) per the intake-log reframe of 2026-05-01 (supersedes the prior DF-7 framing that placed states on `coach_submissions`). `coach_submissions` per-row verification is a simple boolean (`submitter_verified`, default false). The four states (`unverified` / `email_verified` / `form_returned` / `auth_bound`) remain a valid design at the canonical layer, to be built when the enrichment pipeline lands. The `auth_bound` state still belongs to Sprint 6 work on `college_coaches`. |
| K | Scheduler-created profiles vs. scraped contacts | Separate Supabase tables, deduplicated only at outreach time. `coach_submissions` is a semi-staging table whose rows accumulate from multiple intake paths (scraped baseline from `college_coach_contacts`, self-asserted intake from `/athletes` scheduler modal, future follow-up form returns, future auth-binding events) and progress through verification states independently of any single intake event. Rows without paired `visit_requests` are captured contacts awaiting downstream pipeline events, not orphans.<br><br>The semi-staging framing of 2026-05-01 (v5.3) is sharpened by the intake-log reframe of 2026-05-01: `coach_submissions` is an append-only intake record, not a per-coach staging row. The enrichment pipeline (later sprint) reads intake rows and writes to canonical tables (`college_coaches`, `ncaa_schools`, `partner_high_schools`, `profiles`). Decision K's "semi-staging" direction was correct; the intake-log behavior is the precise pattern. |
| L | **Admin panel repair sequencing** | Sprint 5 — after public page ships, before coach auth. Data accuracy maintained during interim via Supabase Studio direct edits for critical changes. |

---

## Active risk during Sprints 0–4

The admin panel currently has a persistence bug: edits show as saved in the UI but do not persist past session/toggle. This means the public page (Sprint 1) will read from Supabase data that may not accurately reflect what the admin intended.

**Mitigation during Sprints 0–4:** Critical data edits (especially height, weight, GPA, Hudl URLs, X handles — anything publicly visible on the recruits page) are made directly in Supabase Studio rather than through the admin panel. The admin panel can still be used for read-only browsing.

**Why this matters:** A college coach scheduling a visit based on stale data is a higher-cost failure than a coach not seeing certain players. Accuracy > completeness during this window.

---

## System Topology (for Claude Code orientation)

```
┌─────────────────────────────────┐         ┌──────────────────────────────────┐
│  grittyfb.com                   │         │  recruit-hub-rebuild (web app)   │
│  (marketing site, separate repo)│         │                                  │
│                                 │         │  ┌────────────────────────────┐  │
│  Hero CTA: "College coach?      │────────▶│  │ /athletes  (public page)   │  │
│   Browse our recruits →"        │  URL    │  │                            │  │
│                                 │  link   │  │  - Roster grid             │  │
│  Nav anchors:                   │         │  │  - School toggle           │  │
│  #why                           │◀────────│  │  - Filters/sort            │  │
│  #partnership                   │  URL    │  │  - Sticky CTA              │  │
│  #outcomes                      │  links  │  │  - Scheduler modal         │  │
│  #contact                       │         │  └────────────────────────────┘  │
│                                 │         │              │                   │
└─────────────────────────────────┘         │              ▼                   │
                                            │  ┌────────────────────────────┐  │
                                            │  │ Supabase                   │  │
                                            │  │  - profiles                │  │
                                            │  │  - schools (NCAA, 662)     │  │
                                            │  │  - users (head_coach flag) │  │
                                            │  │  - visit_requests (new)    │  │
                                            │  │  - visit_request_players   │  │
                                            │  │  - coach_submissions (new) │  │
                                            │  │  - college_coach_contacts  │  │
                                            │  │    (existing, scraped)     │  │
                                            │  │  - audit_log (existing,    │  │
                                            │  │    needs Sprint 5 wiring)  │  │
                                            │  └────────────────────────────┘  │
                                            │              │                   │
                                            │              ▼                   │
                                            │  Transactional email (Resend?)   │
                                            │   → .ics to all attendees        │
                                            └──────────────────────────────────┘
```

---

## Architectural Carry-Forwards from Sprints 010–011

Patterns established in Sprints 010 (design tokens) and 011 (public roster) that downstream sprints inherit. These are not optional — they are repo conventions enforced by tests, file structure, and prior decisions. Sprint 012 and beyond compose on top.

### Data-hook pattern (Sprint 011)

Public-read surfaces use the anon Supabase client called directly from a React hook with no Edge Function intermediary. RLS does the auth work; the hook owns the SELECT clause as an explicit column whitelist constant. **Anchor:** `src/hooks/useRecruitsRoster.js` (`PROFILES_WHITELIST_SELECT`, 16 columns explicit, zero exclusions implicit). **Downstream conformance:** Sprint 012's submit path defaults to this same pattern (anon-write via `supabase-js`); audit DF-5 recommends extending the convention from reads to writes rather than introducing a first Edge Function in `api/`. Future read surfaces follow the same hook-owns-the-whitelist shape.

### RLS pattern: anon-INSERT-only, no SELECT (Sprint 011 → Sprint 012 extension)

Sprint 011's `0038_add_public_recruits_select` granted anon SELECT to `profiles` rows scoped to active partner-school `high_school` values. Sprint 012 extends the precedent to write surfaces: tightly-bounded anon INSERT with `WITH CHECK` clauses pinning safe field values, zero anon SELECT, zero anon UPDATE, zero anon DELETE. **Anchor:** `supabase/migrations/0038_add_public_recruits_select.sql`. **Downstream conformance:** every public-write table follows the same anon-INSERT-only shape; SELECT denies silently (zero rows under RLS, no error surface — Postgres standard behavior); UPDATE/DELETE are service-role-only; `WITH CHECK` constrains writable column values to a safe subset (e.g., `status='pending'`, `verified=false`, `source='scheduler'` for Sprint 012's tables).

### Slug-in-config (Sprint 011)

Partner high schools are identified by a slug stored in a hardcoded JS array, not by a UUID FK to a normalized table. The active schools are `bc-high` (live) and `belmont-hill` (disabled, May 2026). **Anchor:** `src/data/recruits-schools.js`. **Downstream conformance:** until a third partner school onboards, the slug pattern is canonical — `school_slug text` with a CHECK constraint enumerating active slugs is the recommended FK alternative for any new table that needs to identify a partner school (audit DF-1, DF-6). The duplication between config (`recruits-schools.js`) and DDL (CHECK constraint) is accepted MVP debt; reconcile when the 3rd school onboards.

### SlideOutShell as modal primitive (Sprints 005, 007)

The repo's single modal primitive handles desktop slide-in from right (240ms ease-out), mobile bottom-sheet (≤768px, 90vh slide-up), Escape-to-close, focus trap, `aria-modal="true"`, body-scroll lock, and `prefers-reduced-motion` handling. The token-purity guard already passes for it. **Anchor:** `src/components/SlideOutShell.jsx`. **Downstream conformance:** Sprint 012's 3-step scheduler modal composes a step-state wrapper on top of `SlideOutShell` (e.g., `SchedulerModal.jsx` orchestrates step 1/2/3 + confirmation; each step is a child component). Do not introduce a new modal primitive. Any future modal surface in this repo extends `SlideOutShell` the same way.

### Legacy /recruits/&lt;slug&gt;/ proxy as governance constraint

A password-gated reverse proxy lives in production at `/recruits/<slug>/...` paths, implemented via Vercel rewrite + an Edge Function. It carries `RECRUIT_PASSWORD_*`, `RECRUIT_ORIGIN_*`, `RECRUIT_AUTH_SECRET` env vars in the live environment, has no DEC, no `_org` entry, no spec reference. **Anchors:** `api/recruits-auth.ts`, `vercel.json` (the `/recruits/login`, `/recruits/auth`, `/recruits/:path*` rewrite trio), `public/recruits/login.html`. **Downstream conformance:** Sprint 012 and every future coach-scheduler sprint must not modify `vercel.json`, `api/recruits-auth.ts`, or anything under `public/recruits/`. The path pivot from `/recruits` to `/athletes` in Sprint 011 exists because of this system; the constraint persists. Filed for governance traceability as Sprint 011 retro BL-S011-08; resolution sits outside the coach-scheduler series and requires its own governance work.

### `<style>` block + className pattern (Sprint 011)

Components that need `@media` queries, `:hover`, or `:focus` states cannot rely on inline `style={...}` (React inline styles do not support pseudo-classes or media queries). Convention: a `<style>` element placed inside the component with scoped class selectors and a matching `className` handle on the JSX. The token-purity guard scans `<style>` content for hex literals as well, so this pattern stays compatible with the design-token discipline. **Anchors:** `src/components/recruits/RecruitsTopNav.jsx`, `SchoolToggle.jsx`, `RecruitsFilterBar.jsx`, `RecruitCard.jsx`. **Downstream conformance:** Sprint 012's modal mobile responsive (D7) and hover states follow this pattern. CSS Modules and styled-components are not adopted; reconsider only as a repo-wide infra sprint, not inside a feature sprint.

### PII boundary defense in depth (Sprint 011)

Sensitive columns on `profiles` (`email`, `phone`, `parent_guardian_email`, `agi`, `dependents`, plus location, timestamps, and SAT) are excluded at three layers: data-layer SELECT whitelist (the hook never asks for them), render-layer destructure boundary (the component takes only whitelisted props), and boundary tests at both layers (the test suite passes a profile with PII fields populated and asserts none surface in render). **Anchors:** `src/hooks/useRecruitsRoster.js` (data layer, `PROFILES_WHITELIST_SELECT`), `src/components/recruits/RecruitCard.jsx` (render layer destructure), `tests/unit/` (33 boundary assertions across the Sprint 011 test files). **Downstream conformance:** any future card-shaped surface reading sensitive tables follows the same triple-layer pattern. Sprint 012's new tables (`coach_submissions`, `visit_requests`) are write-only from anon and do not surface PII on the public page, but the convention remains the standard for any future read surface.

---

## Execution Plan: 6 Sprints + 1 Marketing Task

### Sprint 0 — GrittyFB Design Token System

**Input state:**
- GrittyFB color values exist somewhere (logo, marketing site, scattered components) but aren't extracted into a design token system
- BC High maroon palette is the dominant styled surface in the existing app
- No documented design token file in `recruit-hub-rebuild`

**Desired output state:**
- GrittyFB palette codified as Tailwind theme tokens (or CSS variables — verify codebase shape first)
- Minimum viable token set: surface variants, accent variants, text variants, border variants, light-surface parallel palette
- Typography pair codified: Fraunces (serif display) + Inter (sans-serif body)
- Reference component renders correctly using only tokens
- Logo asset added to repo at standard path

**Acceptance test:**
- Tokens defined in one location
- Reference card component imports tokens, contains zero hardcoded color values
- BC High Coach Dashboard styling unaffected — no regressions

**Reference asset:** Prototype HTML at `/gritty-recruits-prototype/index.html` contains a working version of the token set under `--gf-*` variables.

---

### Sprint 1 — Gritty Recruits Public Page (Read-Only)

**Input state:**
- Supabase has BC High players with school foreign key, X/Twitter handles, Hudl URLs
- No public-facing page; everything auth-gated
- GrittyFB tokens exist (Sprint 0)
- **Admin panel persistence bug active** — data edits during this sprint should be made via Supabase Studio if accuracy critical

**Desired output state:**
- New route `/athletes` in `recruit-hub-rebuild` — non-auth, public (note: pivoted from `/recruits` mid-Sprint-011 due to a legacy reverse proxy in production at `/recruits/<slug>/`; the page brand remains "Gritty Recruits")
- Card grid styled with GrittyFB palette
- Card displays: photo (or initials fallback), name, position · height · weight, school name (visible on every card), class year tag, active interest summary, GPA, hometown, athletic stat, also-plays sport
- Card outbound links: Hudl Film + X / Twitter (no "Profile" link until Sprint 6)
- School toggle — BC High active, Belmont Hill placeholder
- Filters: search by name, position, class year. Sort: class year, name, GPA
- Top nav with logo + GrittyFB wordmark; nav links bridge externally to grittyfb.com sections; Recruits link marks as current page
- No CTA strip yet, no scheduler

**Acceptance test:**
- `/athletes` renders publicly without auth
- All BC High players visible by default with X/Twitter and Hudl links populated from Supabase
- Filters and sort work
- Mobile-responsive
- School name visible on every card
- Nav links navigate externally to grittyfb.com (not in-app routing)

---

### Sprint 2 — Schedule-a-Drop-In CTA + Modal (Date/Time + Coach Info)

**Input state:**
- Public page from Sprint 1 deployed
- No `visit_requests` or `coach_submissions` table in Supabase
- No CTA on the public page

**Desired output state:**
- Persistent sticky CTA strip on `/athletes` ("Coach? Schedule a Drop-In")
- Modal with three steps (player picker comes in Sprint 3): date selector → time window → contact form (with honeypot)
- Submit creates two records:
  - `visit_requests` table: status `pending`, no players linked yet
  - `coach_submissions` table: soft profile (name, email, program, submitted_at)
- Confirmation screen

**Acceptance test:**
- Coach completes flow on public page, both records land in Supabase
- Honeypot rejects automated submissions
- Mobile-responsive modal

**Open questions to resolve before Sprint 2 opens:**
- **`visit_requests` schema fields.** Minimum: id, coach_submission_id (FK), requested_date, time_window, notes, status, created_at, school identifier (FK type and target undecided — see DF-1).
- **`coach_submissions` schema fields.** Minimum: id, name, email, program, source ('scheduler'), created_at, verified (default false). Email must be declared with explicit `UNIQUE` constraint at DDL time, not just spec-language "unique" (see DF-3, resolved).

---

### Sprint 3 — Player Selection + ICS Multi-Recipient Invite

**Input state:**
- Sprint 2 modal collects date/time + coach info
- No player linkage on `visit_requests`
- No ICS generation, no transactional email service configured

**Desired output state:**
- Modal gains player selection step (order: date → time → players → contact info → submit)
- Player picker shows current school's roster, multi-select, chip-style UX
- New join table `visit_request_players`
- `users` table confirmed to have `head_coach` boolean scoped by `school_id`
- On submit, server generates one `.ics` (ORGANIZER = head coach email; ATTENDEE list = college coach + selected players + head coach, all visible) and sends via transactional email
- Failure path: per-recipient delivery status tracked

**Acceptance test:**
- Coach completes full flow, single .ics generated, all attendees receive email, can add to calendar
- Supabase has request, player links, delivery status per recipient
- Per-recipient failure logged, others still succeed

**Open questions to resolve before Sprint 3 opens:**
- Transactional email provider (Resend recommended)
- Sender identity (`noreply@grittyfb.com` or head coach with reply-to)
- Meeting location field on schools table
- Player email source + consent verification
- Head coach identification logic (one per school, or handle multi)

---

### Sprint 4 — Coach Dashboard "Visit Requests" Tab

**Input state:**
- Visit requests landing in Supabase from Sprint 3
- Coach Dashboard exists with Students / Recruiting Intelligence / Calendar / Reports tabs

**Desired output state:**
- New tab: "Visit Requests"
- List view sortable by date
- Each row shows: coach name + program, date/time, players selected, status, delivery status per recipient
- Status update controls (confirm / reschedule / cancel)
- Visible to head coach for their school

**Acceptance test:**
- Head coach sees all visit requests for their school, sort and filter
- Status changes persist
- Delivery status visible
- Auth-gated

---

### Sprint 5 — Admin Panel Repair

**Why this slot:** Public scheduler feature is shipped (Sprints 0–4). Admin debt has been deferred long enough; data integrity issues need resolution before more features get layered on top of an unreliable editing surface.

**Pre-sprint audit recommended (small diagnostic session):**
Before opening Sprint 5, run a quick inventory:
1. List which player fields are currently editable vs. uneditable in the admin panel
2. Reproduce the persistence bug and capture: does the network request actually fire? What does the response say? Is it a client-side state issue or a server-side write issue?
3. Check whether the persistence bug and the audit log silence share a root cause (likely — if writes aren't completing, audit logging that depends on those writes also fails)

This audit becomes input to Sprint 5 and may collapse multiple issues into one fix.

**Input state:**
- Admin panel exists in `recruit-hub-rebuild` with partial edit functionality
- Some player fields uneditable (TBD which during pre-sprint audit)
- No search/find functionality
- Audit log table exists but isn't being written to on edits
- Persistence bug: changes show "saved" in UI but don't persist past session/toggle
- Admin (Chris) has been working around these issues by editing in Supabase Studio for critical changes

**Desired output state:**
- All player fields editable except `id` and other system-generated columns (created_at, updated_at, foreign key IDs)
- Search bar that filters student/user list by name (partial match), email, school, or position
- All edits write to `audit_log` table with: actor user_id, action ('update'), entity_type ('player' | 'user' | etc.), entity_id, field_changed, old_value, new_value, timestamp
- Persistence bug fixed: edits round-trip to Supabase reliably; UI confirmation reflects actual database state, not optimistic local state
- Edits persist across logout/login and across user toggles
- Edit form clearly distinguishes saved-and-persisted vs. unsaved-local-changes

**Acceptance test:**
- Edit a player's height, log out, log back in — change persists
- Edit a player's GPA, switch to a different user via the toggle, switch back — change persists
- Search for "Watkins" — Ayden Watkins surfaces; works for partial matches and across email/school/position fields
- Make any edit — corresponding audit log row exists with correct field, old value, new value, actor, timestamp
- All player table fields except IDs are editable from the admin panel
- No regressions in other admin panel functionality

**Open questions to resolve during pre-sprint audit:**
- Root cause of persistence bug (client state vs. server write vs. RLS policy vs. type mismatch)
- Whether audit log silence is the same bug or a separate gap
- Inventory of currently uneditable fields and reasons (foreign key complexity, type handling, scope cuts from prior sprints)
- Whether `audit_log` table schema is correct or needs migration

**Carry-forward candidates after Sprint 5:**
- Bulk edit / CSV import for roster updates (relevant when Belmont Hill seeds, more so as schools scale)
- Field-level edit history (visible in admin UI, not just audit_log table)
- Permission scoping (which admins can edit which fields)

---

### Sprint 6 (Future) — College Coach Full Registration + Auth

**Why deferred:** v1 doesn't need verified college coach accounts. The scheduler creates soft profiles automatically, which is enough for the scheduling use case and seeds the future outreach list.

**Anticipated input state:**
- `coach_submissions` table populated with soft profiles from Sprint 2+ usage
- Existing `college_coach_contacts` table (scraped) populated separately
- Admin panel reliable (Sprint 5 complete)
- No coach-facing registration flow

**Anticipated desired output state:**
- "Coach Login" link in nav goes to a real registration/login flow
- Verified coach profile includes: name, email, program/school, role/title, X/Twitter, photo, recruiting region
- On registration, system checks `coach_submissions` for matching email and links the soft profile
- On registration, system optionally checks `college_coach_contacts` (scraped) for matching email and links if found
- Verified coaches gain access to full player profiles (Profile link returns to cards, gated by auth)
- Outreach campaign tooling: query both tables, dedupe by email, prioritize submitted-coaches

**Open questions (placeholder):**
- Auth provider (Supabase Auth, Clerk, or other)
- What "full player profile" contains beyond the public card
- Outreach tooling scope (in-product vs. export to email tool)

---

### Marketing Task (Adjacent to Sprint 1) — grittyfb.com Hero Link

- Add a CTA in the grittyfb.com hero: "College coach? Browse our recruits →" linking to `https://[recruit-hub-host]/athletes`
- Match existing GrittyFB hero design language
- Visible but secondary

Can ship in parallel with Sprint 1.

---

## Open Decisions Forward of Sprint 012

Six items surfaced by the Sprint 012 Phase 0 audit (`docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md`, Decisions Forced + Section G reconciliation). Each carries a sprint dependency and a recommended resolution path.

### DF-1 — High-school identity column on `visit_requests` (RESOLVED 2026-05-01)

**RESOLVED — Option 2: introduce `partner_high_schools` table.** `visit_requests.school_id` becomes `uuid NOT NULL REFERENCES partner_high_schools(id)`.

**Migration shape (for `0039_*`):**

```sql
CREATE TABLE partner_high_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  meeting_location text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO partner_high_schools (slug, name, meeting_location, address) VALUES
  ('bc-high', 'Boston College High School',
   'BC High Football Office, 150 Morrissey Blvd., Dorchester, MA 02125',
   '150 Morrissey Blvd., Dorchester, MA 02125');

ALTER TABLE visit_requests ADD COLUMN school_id uuid NOT NULL
  REFERENCES partner_high_schools(id);

CREATE POLICY "anon can read partner_high_schools"
  ON partner_high_schools FOR SELECT TO anon
  USING (true);
```

**Rationale:** collapses DF-6 (no more CHECK enumeration); simplifies Sprint 013 D4 (`meeting_location` lives natively on `partner_high_schools`, already seeded for BC High); provides a real uuid FK target for the partner-school namespace (the existing `schools` table is NCAA institutions with `unitid integer` PK and does not contain BC High).

**Slug-in-config separation:** `src/data/recruits-schools.js` remains the source of truth for which schools are **active in the UI** (toggle, default, ordering). `partner_high_schools` becomes the source of truth for **school identity** (FK target, RLS scope, data integrity). Loose coupling — config drives UI behavior, table drives data model. The `slug` column on `partner_high_schools` is the join key when needed.

**Seed scope:** BC High only for Sprint 012. Belmont Hill onboards in a later sprint via `INSERT INTO partner_high_schools`, not via migration.

**Rejected alternatives:** Option 1 (`school_slug text` + CHECK) — lighter migration but doesn't collapse DF-6 and forces `meeting_location` to a misnamed home. Option 3 (rename refactor: `schools` → `ncaa_schools`, partner table → `schools` or `high_schools`) — correct end-state for namespace honesty but multi-sprint blast radius; deferred to backlog item BL-S012-XX-naming-hygiene (see Backlog section below).

**Future state note:** the eventual project namespace honors high school student-athletes as the subject matter; the renaming refactor (Option 3) is the path there. See BL-S012-XX-naming-hygiene.

Source: locked decision 2026-05-01; mirrored from audit Section G DF-1. Sprint 012 spec D6 and Sprint 013 spec D4 updated for the cascade.

### DF-2 — Anon INSERT policy `WITH CHECK` shape (RESOLVED 2026-05-01)

**RESOLVED — Option B column-bounded INSERT with B1 FK-only binding.** Specific shape for the `0039_*` migration:

- **`coach_submissions` anon INSERT `WITH CHECK`:** `verification_state = 'unverified'` (anon cannot self-promote past unverified — updated 2026-05-01 per DF-7 cascade; replaces the original `verified = false` clause now that the boolean is superseded by the four-state `verification_state` column), `source = 'scheduler'` (anon cannot impersonate other intake paths).
- **`visit_requests` anon INSERT `WITH CHECK`:** `status = 'pending'` (anon cannot self-confirm a visit). `coach_submission_id` relationship enforced by FK alone — no additional `WITH CHECK` constraint.
- Both tables: anon has INSERT only — zero SELECT, zero UPDATE, zero DELETE.

**Threat model rationale:** Sprint 012's threat model is honeypot-passing spam, not sophisticated attackers running custom Supabase clients. FK gives real referential integrity at the data layer. The two-insert path (one to `coach_submissions`, one to `visit_requests`) shares the same anon permission; an attacker spamming `visit_requests` rows pointing at the same `coach_submission_id` is the **accepted residual risk**.

**Upgrade path:** if Sprint 013 email-send work surfaces actual abuse, consolidate to RPC (Option B3) where rate-limiting becomes a function-level concern. The Edge Function decision in DF-5 can independently add request-layer rate-limiting without changing the RLS policy.

**Rejected alternatives:** Option A (wide-open INSERT, exposes `verified`/`status`/`source` to client tampering); Option C (shape-validated INSERT, duplicates app-layer validation in slow-evolving migration code); B2 (time-bound binding, half-measure that adds complexity for marginal gain); B3 (RPC consolidation, correct future state but premature for Sprint 012's threat model).

Source: locked decision 2026-05-01; mirrored from audit Section G DF-2 and into Sprint 012 spec Risk Register row 1.

### DF-3 — `coach_submissions.email` UNIQUE constraint declaration (RESOLVED 2026-05-01, REFRAMED 2026-05-01)

**RESOLVED — email column declared UNIQUE in 0039 migration. ON CONFLICT pattern operates at column level, not application layer.** Sprint 012 migration `0039_*` declares `email text NOT NULL UNIQUE` (or table-level `UNIQUE(email)`) so the spec's "duplicate email update" behavior — `INSERT ... ON CONFLICT (email) DO UPDATE` — operates against a real unique index. Probe 5 surfaced the failure mode live (Postgres error `42P10` fires without the column-level constraint). Source: locked decision 2026-05-01; mirrored from audit Section G DF-3.

**REFRAMED 2026-05-01 by the intake-log architecture pivot.** `coach_submissions` is an append-only intake record; multiple submissions from the same email are valid distinct rows. UNIQUE constraint dropped via `0041` migration. The email column remains; it is no longer unique. The original DF-3 problem (ensuring ON CONFLICT operates against a real index) becomes moot because there is no ON CONFLICT — every submit is a plain `.insert()` of a new row per the DF-5 reframe. Canonical coach identity (one row per coach with current contact info) lives at the `college_coaches` layer, populated by a later enrichment pipeline that reads `coach_submissions` most-recent-by-email. See "Coach Identity Architecture" section below for the full two-layer model.

### DF-4 — Date filtering logic (RESOLVED 2026-05-01)

**RESOLVED — any future date including weekends. Default 60 days, expandable to 180 days. Per-school config deferred.** Default view shows today + 60 days; "Show more dates" expansion extends to today + 180 days. Per-school open-visit-day configurability is deferred as a carry-forward candidate, not Sprint 012 scope. **Rationale:** option 1 (weekdays only) was rejected because college coaches travel weekends and a weekend drop-in is a realistic use case; option 3 (per-school config) was deferred because no admin panel exists to configure it and Sprint 012 is the wrong sprint to introduce one. Source: locked decision 2026-05-01; mirrored from audit Section G DF-4.

### DF-5 — Submit path: direct anon INSERT vs Edge Function (RESOLVED 2026-05-01, amended DF-5.1 2026-05-01, REFRAMED 2026-05-01)

**RESOLVED — Option A direct supabase-js client from the modal.** Implementation shape: two sequential calls fired from the modal after client-side honeypot validation passes:

1. `supabase.from('coach_submissions').upsert(payload, { onConflict: 'email', ignoreDuplicates: true })` *(amended DF-5.1 2026-05-01 — see below)*
2. `supabase.from('visit_requests').insert(payload)`

RLS does the security work per DF-2's column-bounded `WITH CHECK`. No `api/` addition, no `vercel.json` change, no Edge Function in Sprint 012.

**Rationale:** DF-2's column-bounding already pays for the security work — anon cannot escalate `verified`, `status`, or `source`. The Sprint 012 spec marks `api/` and `vercel.json` as untouched (per the legacy proxy governance constraint), so adding a Vercel function expands sprint scope. `coach_submissions` is a semi-staging table per **Decision K** (above); a `coach_submissions` row without a paired `visit_requests` row is captured intake awaiting downstream pipeline events, not an orphan. Sprint 013 introduces email send, which requires server-side execution; that sprint is the natural home for the function migration.

**Sprint 013 reopener (upgrade path):** Sprint 013 owns the migration of the submit path to a server-side function (Vercel function or Supabase Edge Function — provider decision is part of Sprint 013's scope) concurrent with email send + ICS generation work. Mirrored as a new Hard Constraint in the Sprint 013 spec. The reopener also restores last-write-wins on name/program updates (see DF-5.1 amendment compromise below).

**Rejected alternatives:** Option B (Vercel function in Sprint 012, premature scope expansion); Option C (Supabase Edge Function in Sprint 012, adds an unused tooling surface — no other Edge Functions exist in this repo's `supabase/functions/`).

Source: locked decision 2026-05-01; mirrored from audit Section G DF-5.

**REFRAMED 2026-05-01.** Submit path is now: `supabase.from('coach_submissions').insert(payload)` — plain insert, no upsert, no on-conflict. Each submit creates a new intake row per the intake-log architecture pivot. The DF-5.1 amendment (`ignoreDuplicates: true`) is superseded and no longer applies. The Sprint 013 reopener for server-side route migration remains valid for the email-send work but is no longer required to fix upsert semantics. The `visit_requests` insert (call 2 of the original two-call pattern) is unchanged — it was already a plain `.insert()`. Net effect on the modal submit code: the `.upsert(..., { onConflict: 'email', ignoreDuplicates: true })` call becomes `.insert(...)` and the option bag drops entirely. See "Coach Identity Architecture" section below for the full two-layer model.

#### DF-5.1 amendment 2026-05-01 — `.upsert()` requires `ignoreDuplicates: true` under anon (SUPERSEDED 2026-05-01)

**Surfaced during the 0040 migration apply (Sprint 012 Phase 3).** Probe setup using the original DF-5 pattern — `supabase.from('coach_submissions').upsert(payload, { onConflict: 'email' })` — returned `42501` RLS denial despite `WITH CHECK` being satisfied. Root cause: supabase-js v2's `.upsert()` defaults `Prefer: return=representation` internally regardless of `.select()` chaining; PostgREST then issues a SELECT-side RLS check on the inserted row, which anon cannot pass (no anon SELECT policy on `coach_submissions`). The entire statement rolls back atomically.

**Locked amendment:**

```js
supabase
  .from('coach_submissions')
  .upsert(payload, { onConflict: 'email', ignoreDuplicates: true });
```

`ignoreDuplicates: true` sets `Prefer: resolution=ignore-duplicates,return=minimal` — bypasses the SELECT-side RLS check and skips the conflict row instead of running an UPDATE.

**Compromise.** With `ignoreDuplicates: true`, a coach's second submission with the same email no longer updates the existing `coach_submissions` row's `name` or `program` — the conflict is silently ignored. The `visit_requests` row still inserts (FK to the existing `coach_submissions` row), so the visit request is captured; only the per-coach contact-info refresh is lost. This contradicts the original "last-write-wins on name/program" framing in DF-3 and Sprint 012 spec D6's "Behavior on duplicate email" note. Accepted as a known limitation of the anon-direct path.

**Closes via Sprint 013 reopener.** When the submit path migrates to a server-side function (per the existing DF-5 Sprint 013 reopener) the function executes under service role, which bypasses RLS. The real upsert pattern with merge-duplicates resolution is restored at that point. Last-write-wins on name/program returns when the server-side route ships.

Source: locked amendment 2026-05-01; mirrored from audit Section G DF-5.1 and into Sprint 012 spec D6's Consumer-side pattern requirement bullet.

**SUPERSEDED 2026-05-01 by the intake-log reframe.** The upsert-under-anon problem dissolves when `coach_submissions` is treated as an append-only intake record — there is no upsert, just plain insert. DF-5.1 is preserved in the record as historical context for why the reframe was adopted, not as an active resolution. The supabase-js v2 `.upsert()` defaults finding (PostgREST `Prefer: return=representation` triggers SELECT-side RLS denial under anon) remains a true technical observation; it just no longer applies because the submit pattern is no longer an upsert. The DF-5.1 compromise (no name/program updates on repeat submissions) is also moot — repeat submissions now create new intake rows with the new name/program values, and the enrichment pipeline at the canonical layer (later sprint) determines which row provides the "current" contact info for each coach.

### DF-6 — Partner-high-school enumeration source (RESOLVED 2026-05-01 by DF-1 collapse)

**RESOLVED — collapsed by DF-1 Option 2.** `partner_high_schools` table is introduced in Sprint 012's `0039_*` migration. School identity is now an FK to `partner_high_schools.id`, not a CHECK-constraint enumeration. Future partner schools (Belmont Hill and beyond) are added via `INSERT INTO partner_high_schools`, not via migration. The original DF-6 framing of "CHECK-constraint enumeration source" is no longer applicable to the schema shape.

Source: locked decision 2026-05-01; mirrored from audit Section G DF-6.

### DF-7 — `coach_submissions` verification-state column shape (RESOLVED 2026-05-01, REFRAMED 2026-05-01)

Surfaced from the DF-5 resolution context (added to v5.3 Open Decisions as NEW). Sprint 012 spec D6 originally declared `coach_submissions.verified` as boolean (default false). **Decision J** named a two-tier coach identity model (soft profile vs. full profile). **Decision K** (extended in v5.3) frames `coach_submissions` as a semi-staging table with multiple intake paths and progressive verification. A boolean cannot represent the states the pipeline produces.

**RESOLVED — replace `coach_submissions.verified` (boolean) with `coach_submissions.verification_state` (text + CHECK).**

**Column shape:**

```sql
verification_state text NOT NULL DEFAULT 'unverified'
  CHECK (verification_state IN ('unverified', 'email_verified', 'form_returned', 'auth_bound'))
```

**State semantics:**
- `unverified` — captured intake, no verification touch yet (anon insert from scheduler, scraped imports)
- `email_verified` — email sent and confirmed delivered/responded (set by Sprint 013 email send flow)
- `form_returned` — coach completed follow-up form, domain checked (set by future follow-up sprint)
- `auth_bound` — coach claimed account, auth provider linked (set by Sprint 6 College Coach Auth)

**Ordering is convention, not constraint.** CHECK enforces set membership only. Downstream code may enforce progression; the schema does not. Matches the repo's text + CHECK enum convention (DEC-CFBRB-067).

**DF-2 cascade:** Anon INSERT into `coach_submissions` `WITH CHECK` clause updates from `verified = false` to `verification_state = 'unverified'` (in addition to `source = 'scheduler'`). Anon cannot self-promote past unverified. DF-2 entry updated above.

**Decision J supersession:** Decision J's two-tier framing is superseded by the multi-state model. The "full profile" state of the prior two-tier model corresponds to `auth_bound`; Sprint 6 still owns the `auth_bound` transition. Decision J's Value column has been updated above (Decisions on Record). Decision K is reinforced by DF-7 without modification.

Source: locked decision 2026-05-01; mirrored from audit Section G DF-7. Sprint 012 spec D6 column definition updated for the cascade.

**REFRAMED 2026-05-01 by the intake-log architecture pivot.** `verification_state` column dropped; `submitter_verified` boolean (default false) replaces it via `0041` migration. Per-row verification flag, not a state machine. Real coach verification state lives at the canonical layer (`college_coaches`), not on the intake log. Sprint 6 (College Coach Auth) inherits the multi-state design problem on `college_coaches`; `coach_submissions` ships with the simpler boolean. `submitter_verified` is true only if the submitter's identity was verified at submission time (e.g., by a future server-side route that checks the email against `college_coaches`). For Sprint 012, all anon submissions land with `submitter_verified = false`. The DF-2 anon INSERT `WITH CHECK` clause cascade updates: `submitter_verified = false` (replacing the prior `verification_state = 'unverified'`). The four-state pipeline (`unverified` / `email_verified` / `form_returned` / `auth_bound`) remains a valid design but lives at the canonical layer (`college_coaches.verification_state`), to be designed when the enrichment pipeline is built. Decision J updated again (Decisions on Record above) to reference the canonical-layer location.

### Scope shift — visit_request_players (Sprint 013 D2 → Sprint 012 Phase 3) RESOLVED 2026-05-01

Sprint 012 Phase 2 shipped a fully functional player picker in the inline coach scheduler section. To let those selections persist immediately and to consolidate the coach-scheduler schema work into Sprint 012's migration sequence, the `visit_request_players` join table was pulled forward from Sprint 013 D2 to Sprint 012 Phase 3. Migration `0040` introduces the table with a FK on `profiles(user_id)` — the canonical identity column used throughout the Sprint 011 recruit roster surface. Sprint 013's D2 reduces to a historical note; D3–D10 unaffected. Net effect: Sprint 012 ships four new tables (`partner_high_schools`, `coach_submissions`, `visit_requests`, `visit_request_players`); Sprint 013 ships ICS generation, email send, and the per-recipient delivery tracking on top of the existing schema.

---

## Coach Identity Architecture (intake log + canonical)

Established 2026-05-01 by the intake-log reframe. Captures the two-layer architectural model that `coach_submissions` and `visit_requests` fit inside.

The coach data model has two layers.

**Intake-log layer (Sprint 012):** `coach_submissions` and `visit_requests` are append-only records of intake events. Each row records what was asserted at the moment it was submitted. The intake-log layer never carries "current" coach state — a coach who submits twice creates two intake rows, both preserved verbatim. RLS gates anon writes (INSERT only, no SELECT/UPDATE/DELETE per DF-2). The intake log is the source of truth for "what did the coach assert and when," not for "who is this coach right now."

**Canonical layer (deferred to later sprint):** `college_coaches` holds the canonical coach identity, including current contact info and verification state (the four-state pipeline that DF-7 originally placed on `coach_submissions`). `ncaa_schools` holds institutions (the existing 662-row table — see BL-S012-XX-naming-hygiene for the rename refactor). `partner_high_schools` holds partner schools (introduced in Sprint 012 per DF-1). `profiles` holds students.

**Enrichment pipeline (deferred):** an asynchronous pipeline (later sprint) reads intake rows and updates canonical tables. Most-recent-by-email becomes the current contact info on `college_coaches`. Verification work happens at the canonical layer. Relationship building (coach ↔ school ↔ student) happens at the canonical layer.

**Sprint 012 ships only the intake-log layer.** The enrichment pipeline and canonical-layer connections are scoped for later. Sprint 013's email-send work executes against the intake log (it sends a confirmation email per visit_request, no canonical lookup needed). Sprint 6 (College Coach Auth) is the natural sprint to design the `college_coaches.verification_state` four-state model and the enrichment pipeline that promotes intake rows toward auth-bound coaches.

This model resolves the tension that surfaced through DF-3, DF-5, DF-5.1, and DF-7: the original framing tried to make `coach_submissions` carry both intake event semantics and per-coach state semantics. Splitting the two — intake log stays append-only, canonical layer carries state — eliminates the upsert-under-anon problem (no upsert needed), the verification-state schema problem (boolean intake flag plus future canonical state machine), and the email-uniqueness problem (intake doesn't enforce uniqueness; canonical does at the layer that owns it).

---

## Backlog — Architectural Carry-Forwards from Sprint 012

Items deferred from Sprint 012 resolutions that should be picked up in a future sprint. Filed here so the scheduling decision is explicit and the work isn't lost.

### BL-S012-XX-naming-hygiene — schools / partner_high_schools rename refactor

**Surfaced from:** DF-1 resolution 2026-05-01 (Option 3 deferred).

**The work:** rename `schools` (NCAA institutions table, 662 rows, `unitid integer` PK) to `ncaa_schools`, and rename `partner_high_schools` (introduced in Sprint 012 `0039_*`) to `schools` or `high_schools`.

**Why:** the project's actual subject matter is high school student-athletes recruited by college coaches. The current namespace inverts the naming convention — `schools` should refer to the schools whose rosters drive the public page, not the NCAA institutions that are downstream consumers of the recruiting flow. Sprint 012's introduction of `partner_high_schools` is a tactical workaround that locks in the inversion.

**Scope (multi-file refactor):**
- Migration: rename both tables, preserve PKs and FKs
- Queries: every `from('schools')` and `from('partner_high_schools')` call across `src/`
- RLS policies: update policy bodies that reference old table names
- Hooks: `useRecruitsRoster.js`, any new Sprint 013+ hooks
- Components: any string references in JSX (school toggle, filter labels)
- Types: TypeScript or JSDoc type references
- Tests: every test that constructs or asserts against the old names
- Migrations themselves: down-migrations or supporting scripts

**Recommended scheduling:** open whenever the next high-school-identity-touching feature lands — likely the coach verification follow-up sprint or the Belmont Hill data-onboarding sprint. The rename is a tractable one-time refactor once the relational shape is correct (which it is, post-Sprint-012). Out of scope for Sprint 012 because the rename's blast radius (queries, RLS, hooks, components, tests) exceeds Sprint 012's scope and the partner table is greenfield in this sprint anyway.

**Acceptance:** after the refactor, every reference to `schools` in `src/` and `supabase/` refers to the partner-school table, and every reference to NCAA institutions uses `ncaa_schools`.

---

## Sequencing & Risk

**Sequential dependency chain:** Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4 → Sprint 5. Sprint 6 deferred. Marketing task parallelizes with Sprint 1.

**Highest-risk sprint:** Sprint 3 (transactional email setup, player email consent). Sprint 5 also has unknown scope until pre-sprint audit completes.

**Active risk during Sprints 0–4:** Admin persistence bug means public page may display stale or partially-edited data. Mitigated by direct Supabase Studio edits for accuracy-critical changes.

**Carry-forward / future enhancements:**
- Recruiting calendar overlay (multi-division scaling)
- Full college coach profiles + auth (Sprint 6)
- Scheduler reschedule flow
- Notification email to head coach when request lands
- Volume metrics + reporting in Coach Dashboard tab
- Bulk admin edit / CSV import (post-Sprint 5)
- Field-level edit history UI (post-Sprint 5)

---

## What to do next

1. Confirm v5 plan
2. Resolve Sprint 0 open question: Tailwind theme tokens vs. CSS variable file
3. Open Sprint 0 with coach-me, using prototype's `--gf-*` variables as reference
4. Note for later: schedule a pre-Sprint 5 diagnostic session to audit admin panel before opening Sprint 5

---

## Revision History

| Version | Date | Summary |
|---|---|---|
| v5.8 | 2026-05-01 | Intake-log reframe — `coach_submissions` and `visit_requests` treated as append-only intake records, not staging rows. DF-3 (email UNIQUE), DF-5 (upsert pattern), DF-5.1 (ignoreDuplicates amendment), and DF-7 (verification_state) reframed. Decision J updated to reference canonical-layer verification. Decision K sharpened with intake-log vocabulary. New "Coach Identity Architecture" section added. 0041 migration scope: drop email UNIQUE, drop verification_state column, add submitter_verified boolean. |
| v5.7 | 2026-05-01 | DF-5.1 amendment — supabase-js v2 `.upsert()` requires `ignoreDuplicates: true` to operate under anon (PostgREST `Prefer: return=representation` default triggers SELECT-side RLS denial otherwise; surfaced during 0040 probe setup). Coach name/program no longer update on repeat submissions; Sprint 013 server-side route fixes. Sprint 012 spec D6 Consumer-side pattern bullet updated to capture both `.insert().select()` and `.upsert()` defaults findings. |
| v5.6 | 2026-05-01 | Scope shift — `visit_request_players` pulled forward from Sprint 013 D2 to Sprint 012 Phase 3 via `0040` migration. FK on `profiles(user_id)` per existing Sprint 011 roster identity convention. Sprint 012 spec D6 expanded to four tables; Sprint 013 spec D2 reduced to historical note. |
| v5.5 | 2026-05-01 | DF-1 resolved (Option 2 — `partner_high_schools` table introduced; `visit_requests.school_id` FK to it) and DF-6 collapsed (resolved by DF-1 — partner-school enumeration via INSERT, not migration). All seven DF items now resolved. Sprint 012 spec D6 updated with new `partner_high_schools` table definition and `visit_requests.school_id` FK target. Sprint 013 spec D4 simplified from "add column to schools" to "confirm `partner_high_schools.meeting_location` populated." Option 3 (naming-hygiene rename refactor) filed as BL-S012-XX backlog item. |
| v5.4 | 2026-05-01 | DF-7 resolved — `coach_submissions.verified` (boolean) replaced with `verification_state` (text + CHECK, four states: `unverified`, `email_verified`, `form_returned`, `auth_bound`). Decision J updated to multi-state model; `auth_bound` state remains Sprint 6 ownership. DF-2 `WITH CHECK` clause updated for cascade (`verified = false` → `verification_state = 'unverified'`). Sprint 012 spec D6 column definition updated. |
| v5.3 | 2026-05-01 | DF-5 resolved — Option A direct supabase-js client for Sprint 012. Sprint 013 reopens for submit-path migration concurrent with email send work. Decision K extended with semi-staging-table vocabulary. DF-7 surfaced for `coach_submissions` verification-state column shape; routes through Decisions J and K. |
| v5.2 | 2026-05-01 | DF-2 resolved — column-bounded anon INSERT, B1 FK-only binding. `coach_submissions` `WITH CHECK`: `verified=false`, `source='scheduler'`. `visit_requests` `WITH CHECK`: `status='pending'`; coach_submission_id binding by FK only. Both tables: INSERT only, no SELECT/UPDATE/DELETE for anon. Mirrored from audit Section G; Sprint 012 spec Risk Register row 1 updated. |
| v5.1 | 2026-05-01 | DF-3 and DF-4 resolved. DF-3: `coach_submissions.email` declared UNIQUE in `0039_*` migration. DF-4: any future date including weekends, default 60 days, expandable to 180, per-school config deferred. Sprint 2 open-questions cleanup: removed DF-4 cross-reference. Mirrored from audit Section G. |
| v5 | 2026-05-01 | Path correction (`/recruits` → `/athletes`, five call-sites). Added "Architectural Carry-Forwards from Sprints 010–011" section (seven items). Added "Open Decisions Forward of Sprint 012" section (six DF items). Inputs: `sprint-012-phase-0-audit.md` Sections F (staleness check) and G (DF reconciliation), plus `sprint-011-retro.md` (close ledger and carry-forwards). |
| v4 | (prior) | Inserted Sprint 5 (Admin Panel Repair). Renumbered College Coach Auth to Sprint 6. Recorded admin persistence bug as active risk Sprints 0–4. |
| v3 | (prior) | Removed Contact Period 2026 framing (page is division-agnostic). Replaced "Profile" link with X/Twitter on player cards. Recorded architectural placement in `recruit-hub-rebuild`. Soft-profile pattern for college coaches. Logo and wordmark fixed in prototype. |
| v2 | (prior) | Removed Google Calendar API (replaced with server-generated ICS + transactional email). Multi-recipient invite distribution. School name on player cards. |
| v1 | (prior) | Initial strategy artifact. |
