# Gritty Recruits — Public Page + Visit Scheduler
## Strategy Artifact / Sprint Plan v4

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
| J | College coach identity model | Two-tier: soft profile (scheduler-created, unverified) vs. full profile (registration, deferred to Sprint 6). |
| K | Scheduler-created profiles vs. scraped contacts | Separate Supabase tables, deduplicated only at outreach time. |
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
│  Hero CTA: "College coach?      │────────▶│  │ /recruits  (public page)   │  │
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
                                            │  │  - players                 │  │
                                            │  │  - schools                 │  │
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
- New route `/recruits` in `recruit-hub-rebuild` — non-auth, public
- Card grid styled with GrittyFB palette
- Card displays: photo (or initials fallback), name, position · height · weight, school name (visible on every card), class year tag, active interest summary, GPA, hometown, athletic stat, also-plays sport
- Card outbound links: Hudl Film + X / Twitter (no "Profile" link until Sprint 6)
- School toggle — BC High active, Belmont Hill placeholder
- Filters: search by name, position, class year. Sort: class year, name, GPA
- Top nav with logo + GrittyFB wordmark; nav links bridge externally to grittyfb.com sections; Recruits link marks as current page
- No CTA strip yet, no scheduler

**Acceptance test:**
- `/recruits` renders publicly without auth
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
- Persistent sticky CTA strip on `/recruits` ("Coach? Schedule a Drop-In")
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
- **Date filtering on the picker.** With "Contact Period" framing gone, what dates should show? Any future weekday, any future date, configurable per school?
- **`visit_requests` schema fields.** Minimum: id, coach_submission_id (FK), requested_date, time_window, notes, status, created_at, school_id (FK).
- **`coach_submissions` schema fields.** Minimum: id, name, email, program, source ('scheduler'), created_at, verified (default false). Email unique within table.

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

- Add a CTA in the grittyfb.com hero: "College coach? Browse our recruits →" linking to `https://[recruit-hub-host]/recruits`
- Match existing GrittyFB hero design language
- Visible but secondary

Can ship in parallel with Sprint 1.

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

1. Confirm v4 plan
2. Resolve Sprint 0 open question: Tailwind theme tokens vs. CSS variable file
3. Open Sprint 0 with coach-me, using prototype's `--gf-*` variables as reference
4. Note for later: schedule a pre-Sprint 5 diagnostic session to audit admin panel before opening Sprint 5
