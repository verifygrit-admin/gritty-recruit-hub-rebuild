---
sprint_id: Sprint016
sprint_name: College Coach Full Registration + Auth
asset: Gritty OS Web App - Authentication + Coach Surface
version: MVP
priority: Important, Not Urgent
effort: High (uncertain — depends on auth provider selection and full profile scope)
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Sprint 016 Session Spec — College Coach Full Registration + Auth

> **Status: working draft, deferred future sprint.** This sprint should not open until Sprints 010–015 are all complete and the `coach_submissions` table has accumulated meaningful soft-profile volume. Many decisions remain open — auth provider selection, full profile scope, outreach tooling — that should resolve through strategy work before this sprint is specced concretely.

## Sprint Objective

Add a verified college coach identity and authentication flow that complements the soft-profile pattern established in Sprint 012. Verified coaches gain access to features beyond what the public `/recruits` page offers, primarily full player profiles. Registration is designed to capture richer data than the scheduler form, and to link automatically with prior soft profiles (from `coach_submissions`) and scraped contacts (from `college_coach_contacts`) when email matches.

This sprint is the bridge from "anyone can schedule a visit" (Sprint 012) to "verified coaches have a real product surface."

## Hard Constraints (Anticipated — May Adjust)

1. **Soft profiles continue to function.** A college coach who hasn't registered can still use the scheduler (Sprint 012 flow remains intact). Registration is additive value, not a gate.
2. **No regressions on public surface or admin panel.** Sprints 010–015 deliverables continue to work unchanged.
3. **Email-match linking is automatic but reversible.** When a coach registers with an email that matches an existing `coach_submissions` record (soft profile) or `college_coach_contacts` record (scraped), the new verified account links to those records. The link is queryable but doesn't merge tables — separation of provenance is preserved (per decision K in execution plan).
4. **Mobile pairing required.** Registration and login flows work on phone-sized viewports.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions. **New external dependency:** authentication provider (Supabase Auth recommended; alternatives: Clerk, Auth.js).

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, decisions J + K + Sprint 6 anticipated state |
| Sprint 012 retro | `docs/specs/sprint-012/retro.md` (assumed) | `coach_submissions` schema as actually shipped |
| Existing scraped contacts | `college_coach_contacts` table | Schema reference for the table to dedupe against at outreach time |

## Deliverables (Draft — Will Sharpen Significantly Before Promotion)

### D1 — Registration Flow

Public-facing registration page (e.g., `/coach-register` or accessed via "Coach Login" → "New here? Register"). Form fields:
- Name (required)
- Email (required, validated)
- Program / school (required)
- Role / title (e.g., Head Coach, Recruiting Coordinator, Defensive Coordinator) — required
- X / Twitter handle (optional)
- Photo (optional)
- Recruiting region (optional, multi-select or freeform)
- Password (or passwordless via magic link, depending on auth provider)

On submit:
- Auth provider creates an account
- New row in a `coaches` table (or extending an existing users table) marks `verified=true`, `source='registration'`
- System checks `coach_submissions` for email match; if found, links the soft profile to the new verified account
- System checks `college_coach_contacts` for email match; if found, links the scraped record to the new verified account

### D2 — Login Flow

Public-facing login (`/coach-login` or via "Coach Login" link in nav from `/recruits`). Standard email + password (or magic link).

### D3 — Linking Logic Between Tables

When a verified account is created with email X, look up:
- `coach_submissions` where email = X → if found, set `coach_submissions.linked_account_id = new_account.id`
- `college_coach_contacts` where email = X → if found, set `college_coach_contacts.linked_account_id = new_account.id` (or matching FK)

This is queryable for outreach but doesn't merge the records. Provenance is preserved.

### D4 — Authenticated Coach Surface (Player Profile Access)

Once logged in as a verified college coach, accessing `/recruits` or any player card surfaces a "Profile" link (the link removed in Sprint 011's MVP). The full player profile page is auth-gated and shows richer data than the public card.

**What's in the "full" profile vs. the public card?** This is an open question — see below.

### D5 — Coach Account Management

Verified coach can:
- View their profile
- Edit their fields (name, program, role, X handle, photo, recruiting region)
- Log out
- Request password reset (if password-based)

### D6 — Soft-to-Verified Upgrade Path

If a coach has a soft profile from prior scheduler use, surface an invitation (email or in-product on their next visit) prompting them to complete registration. This is the "Sprint 016 starts paying back the soft-profile groundwork from Sprint 012" moment.

### D7 — Outreach Query Tooling

Internal tool (likely admin-only, in the existing admin panel) that generates outreach lists by querying both `coach_submissions` and `college_coach_contacts`, deduplicating by email at query time, and prioritizing coaches who submitted via the scheduler over scraped-only contacts.

This may be a separate small tool or a button in the admin panel that exports a CSV.

### D8 — Mobile Registration + Login

Both flows render and function on phone-sized viewports.

## Open Questions to Resolve Before Promoting This Spec

These are extensive — most of the work before this sprint opens is resolving them:

- **Auth provider selection.** Supabase Auth, Clerk, Auth.js, or other. Each has different integration costs and feature sets. Recommend Supabase Auth for tightest integration with existing data layer, but Clerk has better UX out of the box for some flows.
- **Password vs. passwordless.** Magic links are simpler from a security standpoint and reduce password-reset support burden. Recommend passwordless for v1.
- **Full player profile contents.** What does the verified-coach view of a player show that the public card doesn't? Possibilities: GPA history, full coach communication log, parent/guardian contact, full Hudl access, recruiting timeline, GrittyFB coach notes, etc. Strategy decision before sprint opens.
- **Verified coach role taxonomy.** "Head Coach, Recruiting Coordinator, Defensive Coordinator" — confirm this is the right taxonomy and whether role affects what they can see/do.
- **Registration friction vs. data quality.** More fields = better data, fewer registrations. Find the right balance through user research or hypothesis testing.
- **Does this require a new payment tier?** Verified coaches may eventually pay for premium features. Current spec assumes free verified accounts; revisit if monetization is part of this sprint.
- **Outreach tooling scope.** Is the CSV export sufficient, or does the team need an in-product email-sending interface (Sprint 016+ scope)?
- **Email verification before activation.** Standard practice — add a verification email step before account is fully active. Confirm pattern.

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| Auth integration takes longer than anticipated, blocking the rest of the sprint | High | Time-box auth setup; if it exceeds budget, scope down to login + basic profile and defer player-profile-access to a follow-up |
| Linking logic creates orphaned or inconsistent records | Medium | Use database transactions for the registration + linking flow; rollback on partial failure |
| Players' personal information exposed through the verified-coach view without proper consent | High | Audit "full profile" data carefully; players + parents should consent to what verified coaches can see |
| Soft-profile-to-verified upgrade email spam-flagged | Medium | Send only one upgrade invitation, and only after the soft profile has been inactive for X days |
| Outreach tooling produces lists that violate CAN-SPAM or have stale unsubscribes | High | Outreach tooling must respect unsubscribe lists; bake in unsubscribe handling from day one |
| Verified-coach session leaks data to unverified browsers | Medium | RLS on player profile tables: only verified coaches can SELECT certain fields |

## Definition of Done (Draft)

- All 8 deliverables ship desktop + mobile (or scope-reduced version after open-question resolution)
- College coach can register, log in, log out, edit profile
- Soft profile + scraped contact linking works on registration
- Verified coach accessing `/recruits` sees additional "Profile" link on cards; logged-out user does not
- Outreach query produces correct deduplicated list
- No regressions on public surface, admin panel, or existing Coach Dashboard
- Vitest assertion count ≥ Sprint 015 floor + new assertions

## Notes for Promotion

When promoting from `draft` to `not_started`:
1. Resolve ALL open questions — this sprint has more open questions than any other in the series and shouldn't open until they resolve
2. Strategy session(s) on full profile scope, monetization implications, outreach tooling boundaries
3. Pre-sprint diagnostic on auth provider selection (build a tiny prototype with each top candidate, compare)
4. Confirm Sprint 015 retro is complete and admin panel is reliable (Sprint 015 is a hard prereq — no point onboarding verified coaches when admin can't reliably edit player data)
5. Confirm `coach_submissions` has accumulated enough data that the soft-to-verified upgrade story is compelling
6. Add Prompt 0 with all decisions baked in
7. Decide whether this sprint is one large sprint or splits into 016a (auth + registration + linking) and 016b (full profile access + outreach tooling)

## Carry-Forward Items (Likely Not In This Sprint)

- Subscription / payment tier for verified coaches
- Coach-side messaging or in-product communication with high schools
- Coach analytics dashboard (which players have they viewed, requested visits with, etc.)
- API for coaches to integrate GrittyFB data into their own recruiting workflows

---
