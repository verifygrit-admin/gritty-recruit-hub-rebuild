# Gritty Recruits — Public Page + Visit Scheduler
## Strategy Artifact / Sprint Plan v5.12

**Revision notes (v5.12 vs v5.11):**
- **Sprint 013 Phase 0 COMPLETE 2026-05-02.** All Phase 0 deliverables shipped or locked. Master HEAD remains `a951ec9` (D0 was the only Phase 0 work that produced a commit; D11 was data-only inserts; D12 was operator-side verification). **Next move: cut `sprint-013-coach-scheduler` branch from master, Phase 1 (build) opens.**
- **D11 (Test Fixture Seeding) closed** with two production fixtures: test student (`chris+sprint013-student@grittyfb.com`, BC High roster, linked to Paul Zukauskas via hs_coach_students) and test head coach (`chris+sprint013-headcoach@grittyfb.com`, hs_coach_schools row 4, is_head_coach=true at BC High). F-21 routing rule verified live: Paul wins by `created_at ASC` over fixture (linked 2026-05-02 vs 2026-03-26). Fixture 3 (test college coach) documented for Phase 4 form-submit.
- **D12 (Test Inbox Provisioning) closed** with plus-addressing verified on `chris@grittyfb.com` via Google Workspace. No DNS work needed.
- **OQ1 closed:** Resend domain `noreply.grittyfb.com` verified — DKIM, SPF, DMARC all green in Resend dashboard. DNS records added in Squarespace Custom Records panel. Existing `_dmarc.replies` orphan from prior Resend setup left as residue (separate housekeeping).
- **OQ2 locked:** sender identity `scheduler@noreply.grittyfb.com` with reply-to dynamic to head coach.
- **OQ5 locked with three sub-decisions:** (1) Runtime Node 22.x with function-level pin; (2) Env vars non-prefixed (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`); (3) Mixed-runtime project accepted — `api/recruits-auth.ts` stays Edge, `api/coach-scheduler-dispatch.ts` will be Node. Vercel scaffold readiness verified live: `vercel.json` rewrites-only (no edits required), `api/` auto-detection mounts D1 at `/api/coach-scheduler-dispatch`.
- **OQ6 locked:** client-invoked synchronous trigger pattern (per spec recommendation).
- **OQ8 locked:** full-window mapping per spec table; `partner_high_schools.timezone` column existence check folds into D1's Phase 1 prep — if absent, ride-along ALTER on D7's `0042` migration commit.
- **OQ7 deferred to Phase 1 close:** cross-client ICS testing requires D1/D5/D6 ship first; runs against D11/D12 fixtures after Phase 1 build.
- **Phase 1 carry-forwards locked:** D1 head coach display name source — backfill Paul Zukauskas's `raw_user_meta_data.display_name` via one-time UPDATE during Phase 1 prompt construction (alongside D7 commit), D1 reads `display_name` with email-local-part fallback. Surfaced by D11.
- Inputs: D11 Step 1 schema spot-check + Step 3 verification report, OQ1 Resend verification, OQ5 Vercel scaffold readiness check, in-session OQ6/OQ8 locks.

**Revision notes (v5.11 vs v5.10):**
- **D0 (ERD Reconciliation) closed 2026-05-02 at master `a951ec9`.** Phase 0a (read + spot-check + write v2) and Phase 0b (corrections + rename + delete + commit) executed in single session under canonical operating pattern. Output: `docs/specs/erd/erd-current-state.md` (1,083 lines, single canonical schema document with update discipline header). Old ERD trio at `docs/superpowers/specs/` deleted in same commit. Flag register reconciled: F-09/F-10/F-11/F-15/F-17 closed by shipped migrations; F-19/F-20/F-21/F-22 newly surfaced.
- **OQ4 RESOLVED 2026-05-02 by D0.** HS coaches table verified as `hs_coach_schools` with `is_head_coach` boolean. BC High `hs_program_id` is `de54b9af-c03c-46b8-a312-b87585a06328` with one head_coach=true row (Paul Zukauskas).
- **D7 migration numbering confirmed** as `0042_visit_request_deliveries.sql` (the "0042 or 0043" hedge in the spec is closed; 0042 is available).
- **Architectural Carry-Forward #8 (ERD update discipline) operationalized.** Canonical ERD now lives at fixed path with update discipline statement in document header. Every future migration touching schema updates this ERD in the same commit as the migration file.
- **Verbatim-print discipline saved a real preservation issue during D0 Phase 0b.** Operator review of Section 6 caught thinning of 8 Action-column entries (most consequentially F-01, F-04, F-09, F-14, F-15, F-16); restoration applied before commit. The discipline functioned as designed — structural completeness ("all flag IDs present") would have committed silently if substantive content had not been spot-checked.
- **Active sprint state after D0:** Phase 0 in progress. Six OQs remaining (OQ1, OQ2, OQ5, OQ6, OQ7, OQ8). Two Phase 0 deliverables remaining (D11 test fixture seeding, D12 test inbox provisioning). Sprint branch `sprint-013-coach-scheduler` not yet cut; cuts at Phase 1 open.
- Inputs: Sprint 013 D0 Phase 0a + 0b execution this session, Section 6 preservation-fidelity review.

**Revision notes (v5.10 vs v5.9):**
- Sprint 013 pre-sprint diagnostic session opened 2026-05-02 under canonical operating pattern. Sprint 013 became the active sprint at session-open (status: `not_started`); spec adapted in-session with four substantive changes: (1) new foundational deliverable **D0 — ERD Reconciliation** added before D1–D10, (2) **D11 — Test Fixture Seeding** added after D10 as Phase 0 close artifact (Supabase rows), (3) **D12 — Email Test Inbox Provisioning** added as separate Phase 0 operator task (DNS + inbox setup, no Claude Code involvement), (4) D3 reframed from `users.head_coach` to HS coaches table after operator clarified head_coach designation lives on the coaching-staff junction table (likely `hs_coach_schools` per Sprint 011 baseline; D0 confirms exact shape). In-session adjustments to an active sprint spec are *adjustments*, not drafting — the `draft` status flag is reserved for untracked sibling files (e.g., sprint-014/015/016 specs that exist in the folder but are not the active sprint).
- **OQ3 resolved 2026-05-02.** Operator confirmed signed contact waiver establishes per-school player communication consent. Player emails ship in Sprint 013 scope. D11 + D12 handle test isolation so real student inboxes never receive test ICS invites.
- **OQ4 reframed 2026-05-02 and pending closure by D0.** Head coach designation lives on HS coaches table, not on `users`. The boolean is intentionally not unique-constrained to support test fixture coexistence with real coaches. Routing rule (default `created_at ASC`) handles multiple-row case.
- **OQ7 dependency on D12.** ICS cross-client testing matrix requires reachable inboxes on Apple Mail, Gmail web + mobile, Outlook web + desktop. D12 simplified per operator decision 2026-05-02 to single-inbox plus-addressing on `chris@grittyfb.com` (`chris+sprint013-<role>@grittyfb.com`). No DNS work required. OQ7 cross-client testing has per-client setup overhead (add `chris@grittyfb.com` to Apple Mail / Outlook accounts, or forward samples) handled at OQ7 testing time.
- **ERD reconciliation introduced as architectural carry-forward.** Existing ERD docs at `docs/superpowers/specs/` (`erd-current-state.md`, `erd-after-state.md`, `erd-flags.md`) last updated 2026-03-31, predate every coach-scheduler migration (0033–0041), and operate in older governance vocabulary that doesn't apply under the canonical operating pattern. D0 produces a single canonical ERD doc replacing the pair, with **update discipline established in document header**: every future migration updates the ERD in the same commit as the migration file. This becomes the eighth architectural carry-forward going forward (see updated section below).
- The data structure / topology content currently embedded in this EXECUTION_PLAN's "System Topology" section remains useful as sprint-strategy context but **the canonical schema reference moves to the new ERD doc** once D0 lands. Going forward, EXECUTION_PLAN references the ERD; the ERD does not duplicate EXECUTION_PLAN content.
- Inputs: Sprint 013 spec adaptation (this session), operator clarifications on head coach table location, signed waiver, test inbox needs, ERD docs review.

**Revision notes (v5.9 vs v5.8):**
- Sprint 012 (called "Sprint 2" in this plan's numbering scheme) shipped to production at master `413a680` on 2026-05-02, including hotfix #4 for nav anchor corrections + mobile hamburger menu. Sprint 2 section rewritten to capture what actually shipped: the inline scheduler section on `/athletes` (not a modal — pivoted from the original SlideOutShell modal scaffold mid-Phase-2), four production tables, intake-log architecture, three migrations (`0039`, `0040`, `0041`), end-to-end submit verified.
- Sprint 013 spec opened against this plan version with `status: draft` (the convention at v5.9 — superseded at v5.10 when Sprint 013 became the active sprint and spec status flipped to `not_started`). Player picker D2 closed by Sprint 012 Phase 3. `coach_submissions` and `visit_requests` are intake-log tables; Sprint 013's server-side function reads intake rows, generates ICS, sends email via Resend, writes per-recipient delivery rows to a new `visit_request_deliveries` table. Sprint 3 section rewritten to match the adapted spec.
- "Open Decisions Forward of Sprint 012" section retitled "Resolved Decisions from Sprint 012" — every DF item is now RESOLVED, REFRAMED, or SUPERSEDED. No open decisions remain in this register; the section now functions as historical record.
- "Active risk during Sprints 0–4" updated to reflect current state: Sprints 010, 011, 012 shipped; admin persistence bug remains as Sprint 5 scope.
- Brief acknowledgment of the **Canonical Operating Pattern** discovered during Sprint 012 close (Sprint Mode Primer v0.2 Section 9.5). The full pattern lives in `_org/primers/sprint-mode-primer.md`; this plan operates under the pattern (single-mode operation for prototype-driven feature work, feature-folder-as-unit-of-development, "all thoughts are operations" mantra). EXECUTION_PLAN itself is the strategic ground truth for the coach-scheduler feature workstream per the pattern.
- Inputs: Sprint 012 Phase 0 retro, Phase 1 retro, Phase 2+3 retro with Section 7 close addendum, Sprint 013 adapted spec.

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

## Active risk forward (post-Sprint-012)

The admin panel currently has a persistence bug: edits show as saved in the UI but do not persist past session/toggle. This affects both the public page (Sprint 1 — shipped as Sprint 011) and the scheduler-fed tables (Sprint 2 — shipped as Sprint 012) because the public-facing data depends on Supabase records that the admin panel ought to be able to maintain reliably.

**Mitigation through Sprint 4:** Critical data edits (especially height, weight, GPA, Hudl URLs, X handles — anything publicly visible on the recruits page; plus `partner_high_schools` seed data, `users.head_coach` flagging, etc.) are made directly in Supabase Studio rather than through the admin panel. The admin panel can still be used for read-only browsing.

**Why this matters:** A college coach scheduling a visit based on stale data is a higher-cost failure than a coach not seeing certain players. Accuracy > completeness during this window.

**Sprint 5 sequencing:** Admin panel repair is scheduled after the public scheduler feature ships (Sprints 0–4 shipped through Sprint 012; Sprint 4 — Coach Dashboard Visit Requests tab — not yet opened). The persistence bug is a real blocker for Sprint 4's status-update controls and is the natural trigger to open Sprint 5.

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
                                            │  │  - partner_high_schools    │  │
                                            │  │    (Sprint 012, BC High)   │  │
                                            │  │  - visit_requests          │  │
                                            │  │    (Sprint 012, intake-log)│  │
                                            │  │  - visit_request_players   │  │
                                            │  │    (Sprint 012 Phase 3,    │  │
                                            │  │    pulled from Sprint 013) │  │
                                            │  │  - coach_submissions       │  │
                                            │  │    (Sprint 012, intake-log)│  │
                                            │  │  - visit_request_deliveries│  │
                                            │  │    (Sprint 013 — pending)  │  │
                                            │  │  - college_coaches         │  │
                                            │  │    (canonical layer —      │  │
                                            │  │    enrichment pipeline     │  │
                                            │  │    deferred)               │  │
                                            │  │  - audit_log (existing,    │  │
                                            │  │    needs Sprint 5 wiring)  │  │
                                            │  └────────────────────────────┘  │
                                            │              │                   │
                                            │              ▼                   │
                                            │  Vercel function (Sprint 013)    │
                                            │   reads intake rows →            │
                                            │   generates ICS →                │
                                            │   sends via Resend →             │
                                            │   writes deliveries              │
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

### ERD update discipline (Sprint 013 D0 introduces, all sprints conform)

**Source of canonical schema documentation lives at `docs/specs/erd/erd-current-state.md` (active 2026-05-02 at master `a951ec9`).** Every migration that adds, drops, or modifies a table, column, constraint, RLS policy, or FK relationship updates this ERD in the same commit as the migration file itself. The discipline statement lives in the ERD doc's header as the primary authoritative location; this carry-forward is the cross-reference. **Anchors:** the ERD doc itself; `supabase/migrations/` (every file 0042+ has a paired ERD update). **Downstream conformance:** Sprint 013's D7 (`visit_request_deliveries` migration, confirmed as `0042`) is the first deliverable to validate this discipline by updating the ERD in the same commit. Sprint 5's admin panel repair migrations conform. All future feature folders conform. **Failure mode this protects against:** the precise condition that motivated D0 — multiple migrations shipping without ERD updates, leaving the canonical schema reference stale enough that downstream sprints reconstruct schema from migration files individually rather than from a coherent document. The Sprint 012 data-architecture-confusion incident (Supabase vs Google Sheets canonical question) is the kind of confusion this discipline prevents going forward.

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

### Sprint 2 — Schedule-a-Drop-In (SHIPPED as Sprint 012, 2026-05-02)

> **Status: SHIPPED.** Closed at master `413a680` (squash merge of PR #3 at `debd2ed`, plus close addendum at `640f3ed`, plus hotfix #4 squash merge at `413a680`). Production live at `https://app.grittyfb.com/athletes`. This section records what actually shipped; the original framing has been preserved in revision history.

**What shipped:**
- Persistent sticky CTA strip on `/athletes` ("Coach? Schedule a Drop-In") with imperative `window.scrollTo` and 72px scroll-margin offset. Mobile-responsive.
- **Inline scheduler section** below the recruit roster grid (NOT a modal — pivoted from initial `SlideOutShell` modal scaffold during Phase 2 after prototype review confirmed the UX is an inline section). Four cards visible simultaneously: Date, Time, Players, Contact. Plus an inline contact form with honeypot defense-in-depth (button disabled when honeypot populated, AND onClick handler short-circuits to fake success UI).
- **Date card:** 6 visible date buttons by default, "Earlier"/"Later" navigation, "Show more dates" expansion from 60-day default to 180-day max (per DF-4 resolution).
- **Time card:** Five named time windows (Morning, Midday, Afternoon, Evening, Flexible).
- **Players card:** Multi-select via `useRecruitsRoster` hook, scoped by school toggle (BC High active, Belmont Hill placeholder).
- **Contact card:** Name, email, program, optional notes, honeypot (no `position` field — DF-3 relevant).
- **Submit handler:** Three sequential plain `.insert()` calls (`coach_submissions` → `visit_requests` → `visit_request_players` bulk), client-side `crypto.randomUUID()` for FK chaining, no `.upsert()`, no `.select()` chains. UI state machine: idle / submitting / success / error. Error preserves form data for retry.
- **Confirmation panel:** Replaces cards with "Thanks, [name]! Your drop-in request has been received. The [school] coaching staff will follow up at [email] to confirm the date and time."
- **Mobile hamburger menu** (Sprint 012 hotfix #4): Four nav anchors (Why GrittyFB, Partnership, Outcomes, Contact) plus Coach Login consolidated into a hamburger dropdown at `@media (max-width: 768px)`. Recruits link stays always-visible. Nav anchor hrefs corrected to current `www.grittyfb.com` section ids (`#opportunity`, `#partner`, `#proof`, `#cta`).

**Schema delivered (three migrations):**
- `0039_coach_scheduler_tables.sql` — `partner_high_schools` (BC High seed), `coach_submissions`, `visit_requests` with anon RLS (anon SELECT on partner schools; anon INSERT only on the other two with column-bounded `WITH CHECK`).
- `0040_visit_request_players.sql` — join table pulled forward from Sprint 013 D2. Composite PK on `(visit_request_id, player_id)`, FK cascade to `visit_requests` and `profiles(user_id)`. Anon INSERT with FK-only integrity.
- `0041_coach_submissions_intake_log_reframe.sql` — drops email UNIQUE constraint, drops `verification_state` column with CHECK, adds `submitter_verified` boolean default false, recreates anon INSERT policy with new `WITH CHECK (submitter_verified=false AND source='scheduler')`.

**Architectural reframing during Phase 3 (intake-log architecture):** A discovery during the `0040` apply surfaced that supabase-js v2's `.upsert()` defaults `Prefer: return=representation` internally, triggering 42501 RLS denial under anon. After an initial workaround amendment (DF-5.1: `ignoreDuplicates: true`) carried a documented compromise, the operator pivoted to a deeper architectural reframe: `coach_submissions` and `visit_requests` are append-only intake records, not staging rows. Each submit creates a new row capturing what was asserted at that moment. Canonical coach identity (current contact info, multi-state verification) is deferred to `college_coaches`; an enrichment pipeline (later sprint) reads intake rows and updates canonical tables. Plain `.insert()` per submit dissolves the upsert problem entirely. See "Coach Identity Architecture (intake log + canonical)" section below for the two-layer model.

**End-to-end verification (operator + Claude in Chrome):**
- Test 1 happy path: three rows landed in production with correct FKs and player join data
- Test 2 honeypot bot deception: zero Supabase calls, fake success UI rendered
- Test 3 error path: error banner + form preservation + successful retry
- Test 4 repeat email: same email submitted twice produced two distinct intake rows, both 201, no 409 conflict — intake-log architecture verified end-to-end

**Phase structure (recorded for forward reference):**
- Phase 0 — pre-sprint audit, seven DFs resolved, EXECUTION_PLAN advanced v4 → v5.5
- Phase 1 — `0039` migration applied to production via `npm run migrate`
- Phase 2 — inline scheduler section build (commits `6a62076` build + `3d22e45` hotfixes after `SlideOutShell` modal pivot)
- Phase 3 — `0040` and `0041` migrations + submit wiring + intake-log reframe (commits `2bd90a1` schema + `9ecea09` wiring)
- Sprint close — Phase 2+3 retro with Section 7 close addendum capturing PR cycle, canonical operating pattern discovery, final state, Sprint 013 readiness

**Carry-forwards into Sprint 013 (now Sprint 3 below):**
- `visit_request_players` already exists; Sprint 013 D2 reduced to historical pointer
- Intake-log architecture means Sprint 013's email-send work is a downstream consumer of intake rows, not a migration of existing submit path
- DF-5's Sprint 013 reopener for server-side route is no longer architecturally required (intake-log eliminates the upsert problem) but remains required functionally for sender credentials and ICS generation

**Carry-forwards as discipline items (per Phase 2+3 retro Section 7e):**
- Verify file/branch/decision state before referencing in prompts (recurring failure pattern caught at session-open, mid-session, and PR review)
- Cascade enumeration when decisions ripple across multiple documents
- Verbatim-print-before-apply discipline for migrations

---

### Sprint 3 — ICS Multi-Recipient Calendar Invite + Email Delivery (active as Sprint 013, status: not_started, Phase 0 COMPLETE, ready for branch cut)

> **Status: not_started. Phase 0 COMPLETE 2026-05-02 at master `a951ec9`.** Sprint 013 spec at `docs/specs/.coach-scheduler-sprints/sprint-013-session-spec.md`. All Phase 0 deliverables shipped or locked: D0 closed (ERD reconciliation, master `a951ec9`), D11 closed (two production fixtures + one documented payload), D12 closed (plus-addressing verified), OQ1/OQ2/OQ5/OQ6/OQ8 locked, OQ3 RESOLVED (waiver), OQ4 RESOLVED by D0, OQ7 deferred to Phase 1 close. Phase 1 carry-forwards locked: D1 runtime Node 22.x, env vars non-prefixed, head coach display name backfilled in D7 commit. **Next move: cut `sprint-013-coach-scheduler` branch from master, Phase 1 (build) opens.** Sprint 012's intake-log architecture substantially reduced this sprint's scope; player picker D2 already shipped via Sprint 012's `0040` migration. Canonical schema reference now lives at `docs/specs/erd/erd-current-state.md` per Architectural Carry-Forward #8.

**Input state:**
- Sprint 012 shipped to master `413a680`. Production `/athletes` is live with the inline four-card scheduler.
- Production schema includes the four Sprint 012 tables (`partner_high_schools`, `coach_submissions` intake-log shape, `visit_requests` intake-log shape, `visit_request_players`).
- Submit handler writes three intake rows per submission via plain `.insert()`. No email send today; the confirmation panel reads "The [school] coaching staff will follow up at [email] to confirm the date and time" with no actual outreach happening.
- No transactional email provider configured; no domain auth (SPF/DKIM/DMARC) on `grittyfb.com`; no `visit_request_deliveries` table.
- ERD documentation at `docs/superpowers/specs/` is stale (last updated 2026-03-31, predates 0033–0041). D0 reconciles before any other Sprint 013 work proceeds.
- Player communication consent established by signed waiver (operator confirmed 2026-05-02). Test isolation via D11 fixture pattern.

**Desired output state:**
- **D0:** Single canonical ERD doc at `docs/specs/erd/erd-current-state.md` (operator-confirmed path) reflecting current production schema, with update discipline established in header. Old ERD docs deleted; flag register reconciled.
- **D11:** Tagged test fixture rows (test student profile, test head coach on HS coaches table, fixture college coach payload) live in production, isolated from real student inboxes by email domain + name suffix tagging.
- **D12:** Plus-addressing on `chris@grittyfb.com` verified. Three fixture addresses (`chris+sprint013-student@`, `chris+sprint013-headcoach@`, `chris+sprint013-collegecoach@`) reachable at single operator inbox. Inbox-to-role mapping documented.
- Server-side function (Vercel function at `api/coach-scheduler-dispatch.ts` recommended; Supabase Edge Function as alternative — provider decision in OQ5) that reads intake rows by `visit_request_id`, generates a single `.ics` file with full attendee visibility, sends email via Resend (recommended provider, OQ1), and writes per-recipient delivery rows.
- New `visit_request_deliveries` table (introduced via `0042` migration; D0 confirms numbering availability): `recipient_email`, `recipient_role` (CHECK in `college_coach`/`head_coach`/`player`), `send_status` (CHECK in `sent`/`failed`/`bounced`/`pending`), provider message id, error code/message, attempted/delivered timestamps. **Migration commit also updates the ERD doc** per the update discipline carry-forward.
- ICS file conforming to RFC 5545: ORGANIZER = head coach; ATTENDEE list (all visible) = college coach + selected players + head coach; SUMMARY/LOCATION/DTSTART/DTEND/DESCRIPTION populated from intake rows + partner school meeting_location; deterministic UID `<visit_request_id>@grittyfb.com`.
- Sprint 012's submit handler invokes the dispatch function after intake inserts succeed (client-invoked pattern recommended in OQ6). Confirmation panel updates based on dispatch response (full success / partial success / fallback when dispatch unavailable).
- Failure path: per-recipient failures logged in `visit_request_deliveries` with error details; user sees partial-success confirmation. Function-level failures leave intake rows intact (admin-triggered re-dispatch deferred to Sprint 4 or later).

**Acceptance test:**
- Coach completes the four-card scheduler flow on `/athletes` (already functional from Sprint 012)
- Single `.ics` generated per submit with correct LOCATION, DTSTART/DTEND, and full attendee list per Decision H
- College coach + head coach + selected players (D11 fixtures during verification) receive the email at D12-provisioned inboxes; ICS auto-imports in Apple Mail, Gmail web + mobile, Outlook web + desktop (verified during pre-sprint OQ7 testing using D12 inbox topology)
- Production has intake-log rows (Sprint 012) plus per-recipient `visit_request_deliveries` rows (Sprint 013)
- Per-recipient failure logged, others still succeed, user sees partial-success confirmation
- Vitest floor 772/1/773 holds plus any new assertions for client-side touches
- No regressions on Sprint 012 functionality
- ERD doc reflects `visit_request_deliveries` table and any other schema touches (D7 commit validates the update discipline established by D0)

**Open questions status (eight items, OQ1–OQ8):**
- ~~**OQ3** (player consent)~~ **RESOLVED 2026-05-02** — signed waiver establishes per-school consent.
- ~~**OQ4** (head coach identification)~~ **REFRAMED 2026-05-02; closes with D0** — head_coach lives on HS coaches table, not `users`. Multiple-row case handled by routing rule (`created_at ASC` default).
- **OQ1 — Transactional email provider:** Resend recommended. Operator setup task (account creation, domain auth).
- **OQ2 — Sender identity:** `scheduler@grittyfb.com` with reply-to head coach. Operator setup task.
- **OQ5 — Function provider:** Vercel function recommended. Claude Code verifies scaffold readiness during Phase 0.
- **OQ6 — Function trigger pattern:** client-invoked synchronous recommended. Locks fast.
- **OQ7 — ICS format edge cases:** Phase 0 close test using D11 fixture inboxes across Apple Mail, Gmail web + mobile, Outlook web + desktop.
- **OQ8 — Time window → time conversion:** full-window ICS event mapping locked in spec; needs `partner_high_schools.timezone` if absent (D0 surfaces).

**Sprint 014+ carry-forward candidates surfaced from Sprint 013 scope:**
- Bulk re-dispatch / admin retry mechanism for full-function-failure cases (vs per-recipient failures within the function)
- Coach Dashboard tab reads `visit_request_deliveries` to surface delivery problems and provide manual retry — already named as Sprint 4 below
- Player consent infrastructure if OQ3 path (a) or (b) is chosen post-Sprint 013
- Multi-head-coach routing if OQ4 surfaces ambiguity in production
- `partner_high_schools.timezone` column if absent and required for OQ8 implementation
- Calendar invite cancellation/update flow (Sprint 013 ships invite-creation only)

---

### Sprint 4 — Coach Dashboard "Visit Requests" Tab

**Input state:**
- Visit requests landing in Supabase from Sprint 2 (Sprint 012 — shipped)
- Per-recipient `visit_request_deliveries` rows landing from Sprint 3 (Sprint 013 — pending)
- Coach Dashboard exists with Students / Recruiting Intelligence / Calendar / Reports tabs

**Desired output state:**
- New tab: "Visit Requests"
- List view sortable by date
- Each row shows: coach name + program (from `coach_submissions` intake row), date/time, players selected (joined via `visit_request_players`), status, per-recipient delivery status (read from `visit_request_deliveries` populated by Sprint 013's dispatch function)
- Status update controls (confirm / reschedule / cancel) — writes to `visit_requests.status`
- Manual re-dispatch control for failed deliveries (re-invokes Sprint 013's dispatch function, scoped to specific failed recipients)
- Visible to head coach for their school (RLS-scoped by `school_id` on the dashboard read)

**Acceptance test:**
- Head coach sees all visit requests for their school, sort and filter
- Status changes persist
- Per-recipient delivery status visible (sent / failed / bounced / pending)
- Manual re-dispatch fires for failed recipients only
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

## Resolved Decisions from Sprint 012

> **Section status:** All seven decisions forced (DF-1 through DF-7) plus one amendment (DF-5.1) and one scope shift are resolved as of Sprint 012 close. Three were reframed mid-sprint by the intake-log architecture pivot (DF-3, DF-5, DF-7). One amendment was superseded by the same pivot (DF-5.1). Section retained as historical record; this register has no open items as of v5.9.

Originally surfaced by the Sprint 012 Phase 0 audit (`docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md`, Decisions Forced + Section G reconciliation) plus mid-sprint discoveries.

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

**Status as of v5.9 (2026-05-02):**
- Sprint 0 (design tokens) — shipped as Sprint 010
- Sprint 1 (public roster page) — shipped as Sprint 011
- Sprint 2 (scheduler CTA + flow) — shipped as Sprint 012, including hotfix #4
- Sprint 3 (ICS multi-recipient invite) — active as Sprint 013, status `not_started`; Phase 1 branch cut after remaining OQs (OQ1, OQ2, OQ5, OQ6, OQ7, OQ8) resolve and Phase 0 deliverables (D0, D11, D12) ship
- Sprint 4 (Coach Dashboard tab) — not yet opened; depends on Sprint 013
- Sprint 5 (Admin Panel Repair) — not yet opened; depends on Sprint 4 (the Coach Dashboard tab will surface persistence issues that motivate the repair)
- Sprint 6 (College Coach Auth) — deferred per Decision L

**Highest-risk forward sprint:** Sprint 3 (Sprint 013) — player email consent (OQ3) is a hard gate; ICS deliverability across major email clients (OQ7) requires pre-sprint testing. Sprint 5 (Admin Panel Repair) also has unknown scope until pre-sprint audit completes.

**Active risk forward:** Admin persistence bug means the public page may display stale or partially-edited data, and Sprint 4's status-update controls (confirm/reschedule/cancel writes) will hit the same persistence issue if not resolved. Mitigated by direct Supabase Studio edits for accuracy-critical changes.

**Carry-forward / future enhancements:**
- Recruiting calendar overlay (multi-division scaling)
- Full college coach profiles + auth (Sprint 6)
- Scheduler reschedule flow (post-Sprint 4)
- Notification email to head coach when request lands (subset of Sprint 013 — covered by D6)
- Volume metrics + reporting in Coach Dashboard tab (Sprint 4 surface)
- Bulk admin edit / CSV import (post-Sprint 5)
- Field-level edit history UI (post-Sprint 5)
- **Bulk re-dispatch / admin retry mechanism** for full-function-failure cases (surfaced by Sprint 013 scope; candidate for Sprint 4 or later)
- **Player consent infrastructure** (own feature folder candidate if OQ3 path (a) or (b) is chosen post-Sprint 013)
- **`partner_high_schools.timezone` column** if needed for OQ8 implementation
- **Calendar invite cancellation/update flow** (Sprint 013 ships invite-creation only)
- **Enrichment pipeline** that promotes intake-log rows to canonical `college_coaches` records (natural Sprint 6 work)

---

## What to do next

1. Sprint 012 closed at master `413a680`; production live at `https://app.grittyfb.com/athletes`. Sprint Mode Primer evolved to v0.2 with Canonical Operating Pattern Section 9.5 (full pattern at `_org/primers/sprint-mode-primer.md`).
2. **Sprint 013 pre-sprint diagnostic session opened 2026-05-02.** Spec adapted in this session: D0 (ERD Reconciliation), D11 (Test Fixture Seeding), D3 reframed to HS coaches table. OQ3 RESOLVED (signed waiver). OQ4 reframed and pending closure by D0.
3. **Next operational moves (in order):**
   - ~~**D0 Phase 0a** — Claude Code reads migration files chronologically + spot-checks live Supabase, produces `erd-current-state-v2.md` additively. Operator reviews.~~ **DONE 2026-05-02.**
   - ~~**D0 Phase 0b** — Rename + delete, single commit on master.~~ **DONE 2026-05-02 at `a951ec9`.**
   - ~~**OQ4 closes** as D0 byproduct.~~ **DONE 2026-05-02 by D0.** D3 finalized: `hs_coach_schools.is_head_coach`. ~~Migration 0042 numbering confirmed for D7.~~ **CONFIRMED.**
   - ~~**OQ1 + OQ2** operator setup~~ **DONE 2026-05-02.** Resend domain `noreply.grittyfb.com` verified; sender identity `scheduler@noreply.grittyfb.com` locked.
   - ~~**OQ5** Claude Code verifies Vercel function scaffold readiness.~~ **DONE 2026-05-02.** Three sub-decisions locked: Node 22.x function-level pin, non-prefixed env vars, mixed-runtime project accepted.
   - ~~**OQ6, OQ8** lock against spec recommendations.~~ **DONE 2026-05-02.** OQ6 client-invoked synchronous; OQ8 full-window mapping; `partner_high_schools.timezone` check folds into D1 prep.
   - ~~**D11** test fixture seeding (Supabase rows) — Claude Code-suitable.~~ **DONE 2026-05-02.** Two fixtures seeded; F-21 routing rule verified live.
   - ~~**D12** test inbox provisioning~~ **DONE 2026-05-02.** Plus-addressing verified.
   - **OQ7** ICS rendering test — DEFERRED to Phase 1 close (requires D1/D5/D6 ship first).
   - **NEXT MOVE: Cut `sprint-013-coach-scheduler` branch from master at `a951ec9`. Phase 1 (build) opens.**
4. Schedule a pre-Sprint 5 diagnostic session to audit admin panel persistence bug before opening Sprint 5 (per Sprint 5 section guidance).
5. **Note:** EXECUTION_PLAN updates and sprint retros are sprint-mode artifacts under the canonical operating pattern. Strategy and governance work compress into the prototype/diagnostic phase upstream of build; mid-sprint reframings update this doc in place with revision history. The doc is canonical for the coach-scheduler feature workstream. **Schema reference moves to the new ERD doc once D0 lands** — EXECUTION_PLAN going forward references the ERD rather than embedding schema content.

---

## Revision History

| Version | Date | Summary |
|---|---|---|
| v5.12 | 2026-05-02 | **Sprint 013 Phase 0 COMPLETE.** All Phase 0 deliverables shipped or locked in single coaching session. D11 closed (two fixtures seeded, F-21 routing verified live). D12 closed (plus-addressing on `chris@grittyfb.com`). OQ1 closed (Resend `noreply.grittyfb.com` verified). OQ2 locked (`scheduler@noreply.grittyfb.com` + reply-to head coach). OQ5 locked (Node 22.x, non-prefixed env vars, mixed runtime). OQ6 locked (client-invoked synchronous). OQ8 locked (full-window mapping). OQ7 deferred to Phase 1 close. Phase 1 carry-forwards locked: D1 head coach display name source — backfill Paul Zukauskas's `raw_user_meta_data.display_name` in D7 commit, D1 reads display_name with email-local-part fallback. Master HEAD remains `a951ec9`. **Next move: cut `sprint-013-coach-scheduler` branch from master, Phase 1 opens.** |
| v5.11 | 2026-05-02 | **D0 (ERD Reconciliation) closed at master `a951ec9`.** Phase 0a + 0b executed in single session under canonical operating pattern. Output: `docs/specs/erd/erd-current-state.md` (1,083 lines, single canonical schema document with update discipline header). Old ERD trio at `docs/superpowers/specs/` deleted in same commit. Flag register reconciled with full preservation: F-09/F-10/F-11/F-15/F-17 closed by shipped migrations; F-19/F-20/F-21/F-22 newly surfaced; six restorations applied during preservation-fidelity review (F-01/F-04/F-09/F-14/F-15/F-16). **OQ4 RESOLVED by D0**: HS coaches table verified as `hs_coach_schools.is_head_coach`, BC High has 1 head_coach=true row (Paul Zukauskas, hs_program_id `de54b9af-c03c-46b8-a312-b87585a06328`). **D7 migration numbering confirmed** as 0042. **Architectural Carry-Forward #8 operationalized** with canonical ERD at fixed path. **Verbatim-print discipline saved a real preservation issue** during Phase 0b: structural completeness in Section 6 ("all flag IDs present") would have committed silently if substantive Action-column content had not been spot-checked; restoration applied before commit. Sprint 013 spec updated: D0 marked CLOSED with closure note; D3 marked VERIFIED with actual values; D7 hedge dropped; OQ4 marked RESOLVED; Notes for Phase 1 Branch Cut updated; Risk Register stale-ERD row CLOSED; Definition of Done D0 line marked done. Active sprint state: Phase 0 in progress, six OQs remaining (OQ1, OQ2, OQ5, OQ6, OQ7, OQ8), two Phase 0 deliverables remaining (D11, D12). |
| v5.10 | 2026-05-02 | Sprint 013 became the active sprint (status flipped to `not_started`; pre-sprint diagnostic session opened in-session). Spec adapted with four substantive changes: (1) **D0 — ERD Reconciliation** added as foundational deliverable (read migrations chronologically + spot-check live Supabase, produce single canonical ERD doc replacing the stale current-state/after-state pair at `docs/superpowers/specs/`, two-commit pattern on master); (2) **D11 — Test Fixture Seeding** added as Phase 0 close artifact (Supabase rows: tagged test student/head coach/college coach using `chris+sprint013-<role>@grittyfb.com` plus-aliasing for Phase 4 isolation from real student inboxes); (3) **D12 — Email Test Inbox Provisioning** added as separate Phase 0 operator task (single-inbox plus-addressing on `chris@grittyfb.com` per operator decision; ~5min verification step, no DNS work; runs in parallel with D11 since it's pure operator work); (4) **D3 reframed** from `users.head_coach` to HS coaches table per operator clarification — head_coach designation lives on coaching-staff junction table (likely `hs_coach_schools`), not on `users`. **OQ3 RESOLVED** by signed contact waiver establishing per-school player communication consent. **OQ4 reframed and pending closure by D0** — head_coach boolean is intentionally not unique-constrained to support test fixture coexistence; routing rule (default `created_at ASC`) handles multiple-row case. **OQ7 now depends on D12** for cross-client testing inboxes (single-inbox approach has per-client setup overhead handled at testing time). **Status convention codified:** `draft` is reserved for untracked sibling files in `docs/specs/.coach-scheduler-sprints/` (e.g., sprint-014/015/016 specs not yet active); active sprint specs are `not_started` from session open onward. In-session spec changes are *adjustments*, not drafting. New architectural carry-forward added: **ERD update discipline** — every migration touching schema updates the canonical ERD doc in the same commit. Spec Risk Register expanded (stale ERD risk closed by D0; test ICS to real students risk closed by D11+D12). DoD updated. Notes for Promotion replaced with Notes for Phase 1 Branch Cut. |
| v5.9 | 2026-05-02 | Sprint 012 closed at master `413a680` (squash merge `debd2ed` + close addendum `640f3ed` + hotfix #4 squash merge `413a680`). Sprint 2 section rewritten as SHIPPED capturing actual outcomes (inline section pivot from modal, four production tables, three migrations, intake-log architecture, end-to-end verification, hotfix #4 nav anchors + mobile hamburger). Sprint 3 section rewritten to reflect adapted Sprint 013 spec (intake-log inheritance, Vercel function recommendation, eight Open Questions OQ1–OQ8). Sprint 4 section updated to reference `visit_request_deliveries` reads. "Open Decisions Forward of Sprint 012" retitled "Resolved Decisions from Sprint 012" — register has no open items. System topology diagram updated for Sprint 012 schema + Sprint 013 dispatch function. Active Risk section reframed for current sprint state. Carry-forward list expanded with Sprint 013 surface candidates. Brief acknowledgment of Canonical Operating Pattern (Sprint Mode Primer v0.2 Section 9.5; full pattern at `_org/primers/sprint-mode-primer.md`). |
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
