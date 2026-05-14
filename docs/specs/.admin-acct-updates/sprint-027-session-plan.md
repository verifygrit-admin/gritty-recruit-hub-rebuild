# Sprint 027 — Admin "Account Updates" Tab — Session Plan

> **For execution:** REQUIRED SUB-SKILL — use `superpowers:subagent-driven-development` for Phase 2 (parallel) and `superpowers:executing-plans` for serial steps. Phase 0 must clear before Phase 1; Phase 1 must clear before Phase 2.

**Goal:** Ship a 7th Admin tab — "Account Updates" — that lets the chris@grittyfb.com admin select up to 10 rows in any of 7 entity views, edit non-protected fields inline, review the diff, confirm, and submit. Create/Delete enabled only for the 3 non-auth-linked entities (colleges, college coaches, recruiting events).

**Architecture (one paragraph):** Add a new admin route `/admin/account-updates` gated by the existing `AdminRoute` component (JWT `app_metadata.role === 'admin'`). The page hosts an inner toggle bar over 7 sub-views that share a single generic shell — `AccountUpdatesShell` — wrapping `AdminTableEditor` (already shared by Institutions/Users/Recruiting Events) plus a new **Bulk Edit Drawer** that supports the select-up-to-10 → inline edit → review diff → confirm → submit flow. All writes route through new admin Edge Functions that mirror `admin-update-school` (auth gate via `getUser()` per DEC 016-C WT-B, audit log INSERT, service-role DB writes). RLS is added per table for admin write where missing.

**Tech stack:** React 18 (Vite), Supabase JS client, Supabase Edge Functions (Deno), Postgres RLS. Existing patterns: `AdminTableEditor`, `SlideOutForm`, `AdminRoute`, `admin-update-school` EF, `admin_audit_log`.

**Spec discrepancy resolved:** Operator confirmed (Q1) — 7 toggles, the "eight" reference is a typo. Authoritative list: Students | HS Coaches | Counselors | High Schools | Colleges | College Coaches | Recruiting Events.

**Save location for execution artifacts:** All new code lives under `src/pages/AdminAccountUpdatesPage.jsx`, `src/components/account-updates/*`, `supabase/functions/admin-update-<entity>/`, `supabase/migrations/0051_*.sql` … `0057_*.sql` (one migration per entity for RLS).

---

## Pre-flight Q&A (LOCKED — resolved by operator)

**Q1 — Toggle count.** **7 toggles.** The "eight" reference in the spec narrative is a typo. Authoritative list: Students | HS Coaches | Counselors | High Schools | Colleges | College Coaches | Recruiting Events.

**Q2 — High Schools entity routing.** **`hs_programs` is authoritative** for the "High Schools" toggle. `partner_high_schools` is left untouched in this sprint (its role — join table, legacy duplicate, or active sibling — is documented in the Phase 0 drift report but NOT refactored).

**Q3 — Admin gate.** **Reuse existing `AdminRoute`** (role-based, `app_metadata.role === 'admin'`). chris@grittyfb.com already has admin role — no email-string check.

**Q4 — Read-only field set (locked).** Across all 7 entities, READ_ONLY = `id` (PK), `uuid` columns, `user_id`, auth-linked email, password / auth hash fields. **Everything else is editable for admin.** Per-entity application of this rule is captured in `READ_ONLY_FIELDS.md` (Phase 0 artifact).

**Q5 — Create/Delete scope.** Enabled for **Colleges, College Coaches, Recruiting Events** only. **Hard-disabled (UI hidden, not just disabled-and-grey)** for Students, HS Coaches, Counselors, High Schools. Compile-time gate — auth-linked `*View.jsx` does not import or mount the Create/Delete components at all.

**Q6 — Selection cap.** **Hard cap 10 per session.** 11th selection blocked at the UI with a **toast** (not just disabled checkbox). No override.

**Q7 — Audit log.** **Use existing `public.admin_audit_log`** (table is live — see DATA_INVENTORY § `public.admin_audit_log`). If the schema is insufficient, create `public.admin_account_updates_audit` in migration `0051` with columns: `actor` (text, admin email), `entity_type` (text), `entity_id` (text), `field` (text), `old_value` (jsonb), `new_value` (jsonb), `ts` (timestamptz NOT NULL DEFAULT now()). **One row per field changed** on bulk submit (not one row per batch). Phase 0 confirms whether the existing table can carry this shape; Phase 1 finalizes which table receives writes.

**Q8 — Empty tables.** `recruiting_events` (0 rows) and `college_coaches` (0 rows) — **build the forms anyway.** Empty list state shows: **"No records — use Create to add"** for the create-enabled entities. For auth-linked entities with 0 rows (none expected — all 4 have data), use a generic empty state.

**Sprint scope flag (operator directive):** Stale-ERD reconciliation in Phase 0 is in-scope for **read-only diff reporting**. Drift goes to a separate `erd-drift-sprint027.md` artifact. The canonical `erd-current-state.md` is NOT edited in this sprint.

---

## Phase 0 — ERD Reconciliation

**Goal:** Confirm live Supabase schema for the 7 in-scope entities matches the canonical ERD (`docs/specs/erd/erd-current-state.md`, generated 2026-05-02 at master HEAD `413a680`). Flag drift only — DO NOT edit the ERD doc in this sprint (that lives behind a separate update-discipline gate per ERD doc § "Update Discipline").

**Files:**
- Read: `docs/specs/erd/erd-current-state.md` (READ-ONLY — do not edit per operator directive)
- Read: `docs/architecture/DATA_INVENTORY.md`
- Output: `docs/specs/.admin-acct-updates/erd-drift-sprint027.md` (drift report)
- Output: `docs/specs/.admin-acct-updates/READ_ONLY_FIELDS.md` (per-entity locked field list per Q4)
- Output: `docs/specs/.admin-acct-updates/RLS_GAPS.md` (per-entity admin-write RLS gap analysis)

### Tasks

- [ ] **0.1 Authenticate Supabase MCP.** Run `mcp__supabase__authenticate` and complete OAuth. Required for all live schema reads in this phase.

- [ ] **0.2 Pull live schema for the 7 in-scope entities.** Use `mcp__supabase__list_tables` (or equivalent) for project `xyudnajzhuwdauwkwsbh` and select these tables:

| Toggle | Primary table | Join / link table(s) | PK | Auth-linked fields (READ-ONLY in form) |
|---|---|---|---|---|
| Students | `public.profiles` | `public.users` (on `user_id`) | `profiles.id` (uuid) | `profiles.id`, `profiles.user_id`, `profiles.email`, `users.id`, `users.user_id`, `users.user_type`, `users.email_verified` |
| HS Coaches | `public.users` (WHERE `user_type='hs_coach'`) | `public.hs_coach_schools` (on `coach_user_id = user_id`) → `public.hs_programs` (on `hs_program_id`) | `users.id` | `users.id`, `users.user_id`, `users.user_type`, `auth.users.email`, `auth.users.encrypted_password` |
| Counselors | `public.users` (WHERE `user_type='hs_guidance_counselor'`) | `public.hs_counselor_schools` → `public.hs_programs` | `users.id` | same as HS Coaches |
| High Schools | `public.hs_programs` (Q2 LOCKED — authoritative) | n/a (`partner_high_schools` left untouched in this sprint; role flagged in drift report) | `id` (uuid) | `id` (PK only — no auth tie) |
| Colleges | `public.schools` | n/a (FK target for many) | `unitid` (integer) | `unitid` (PK only — no auth tie) |
| College Coaches | `public.college_coaches` | `schools` (on `unitid`) | `id` (uuid) | `id` (PK only — no auth tie) |
| Recruiting Events | `public.recruiting_events` | `schools` (on `unitid`) | `id` (uuid) | `id` (PK only — no auth tie) |

- [ ] **0.3 Pull RLS policies** for every table above using the Supabase MCP. Document in the drift report. Specifically verify:
  - `public.profiles` — admin write policy exists? (DATA_INVENTORY does not state one explicitly; `admin-approve-bulk-pds` writes via service-role which bypasses RLS — same path applies here.)
  - `public.users` — admin write policy exists? (Only known policy: `users_update_own_full_name`. Admin writes go through service-role EFs. Confirm.)
  - `public.schools` — admin write policy exists (`0034_schools_admin_update_policy.sql` — confirmed).
  - `public.partner_high_schools` — admin write policy? (DATA_INVENTORY says "Operator INSERT only" — no admin policy.)
  - `public.college_coaches` — RLS posture per ERD: "INSERT/UPDATE/DELETE require service_role" — admin EF is fine, but no admin-scoped policy exists.
  - `public.recruiting_events` — same as `college_coaches`.

- [ ] **0.4 Diff live schema vs ERD.** Compare every column from live MCP read against `erd-current-state.md`. Known drift to expect (since ERD was generated 2026-05-02 and migrations 0044–0050 have shipped since):
  - `public.users` — `full_name` column added (`0046_users_add_full_name.sql`).
  - `public.profiles` — 5 Bulk PDS measurables + `last_bulk_pds_approved_at` added (`0049`); `cmg_message_log` added (`0047`); `avatar_storage_path` was added in `0022` (may already be in ERD).
  - `public.bulk_pds_submissions` — entire table is new (`0048`, `0050`) — out of scope for this sprint but flag.

- [ ] **0.5 Apply Q4 ruling per entity.** For each of the 7 toggles, write the full READ-ONLY field list applying the Q4 rule (`id` PK, `uuid`, `user_id`, auth-linked email, password / auth hash). Output as `READ_ONLY_FIELDS.md` for Phase 1 to consume.

- [ ] **0.6 RLS gap analysis.** For each of the 7 tables, document: (a) is RLS enabled, (b) does an admin-scoped write policy exist, (c) does the existing pattern rely on service-role bypass, (d) what additional policies (if any) Phase 1 migration `0051` needs to add for defense-in-depth. Output as `RLS_GAPS.md`.

- [ ] **0.7 Stale-flag the ERD.** Single closing line in `erd-drift-sprint027.md`: "ERD doc `erd-current-state.md` last generated 2026-05-02. Sprint 027 verified live schema differs by [count] columns across [count] tables. ERD update discipline gate is OUT OF SCOPE for this sprint per operator directive — flag carries forward to a future sprint."

- [ ] **0.8 Phase 0 done condition.** Three artifacts written: (a) `erd-drift-sprint027.md` — live schema + drift vs ERD, (b) `READ_ONLY_FIELDS.md` — per-entity locked field list, (c) `RLS_GAPS.md` — per-entity RLS gap analysis. **Halt for operator review before starting Phase 1.**

---

## Phase 1 — Architecture

**Goal:** Lock the route, component structure, RLS plan, and EF contracts before any build agent writes code.

**Files (planned — not created yet):**
- Modify: `src/lib/adminTabs.js` — add 6th tab
- Modify: `src/pages/AdminPage.jsx` — add tab content branch
- Create: `src/pages/AdminAccountUpdatesPage.jsx`
- Create: `src/components/account-updates/AccountUpdatesShell.jsx`
- Create: `src/components/account-updates/AccountUpdatesToggleBar.jsx`
- Create: `src/components/account-updates/BulkEditDrawer.jsx` — select up to 10 → edit → review diff → confirm
- Create: `src/components/account-updates/ReviewDiffPanel.jsx`
- Create: `src/components/account-updates/CreateRowModal.jsx` (only mounted for colleges, college coaches, recruiting events)
- Create: `src/components/account-updates/DeleteConfirmModal.jsx` (same gating)
- Create: `src/components/account-updates/views/StudentsView.jsx`
- Create: `src/components/account-updates/views/HsCoachesView.jsx`
- Create: `src/components/account-updates/views/CounselorsView.jsx`
- Create: `src/components/account-updates/views/HighSchoolsView.jsx`
- Create: `src/components/account-updates/views/CollegesView.jsx`
- Create: `src/components/account-updates/views/CollegeCoachesView.jsx`
- Create: `src/components/account-updates/views/RecruitingEventsView.jsx`
- Create: `src/lib/adminAccountUpdates/columnConfigs.js` — per-entity column + read-only field config
- Create: `src/lib/adminAccountUpdates/diffPayload.js` — pure function: (originalRow, editedRow) → diff object
- Create: `src/lib/adminAccountUpdates/applyBatchEdit.js` — fans out diff payload to the right EF
- Create: `supabase/functions/admin-read-account-updates/index.ts` — paginated read EF (one EF, entity param)
- Create: `supabase/functions/admin-update-account/index.ts` — single batch-write EF (entity param + diffs)
- Create: `supabase/functions/admin-create-account/index.ts` — only for the 3 non-auth-linked entities
- Create: `supabase/functions/admin-delete-account/index.ts` — only for the 3 non-auth-linked entities
- Create: `supabase/migrations/0051_account_updates_admin_write_policies.sql` — adds admin write policies where missing (per Phase 0 RLS gap report)

### Tasks

- [ ] **1.1 Tab placement decision.** Add `account-updates` to `src/lib/adminTabs.js` AFTER `bulk-pds` and BEFORE `audit`. Path: `/admin/account-updates`. Label: `"Account Updates"`. This becomes tab #6 of 6 (audit moves to position 7). Confirm with Chris if the label or order should differ.

- [ ] **1.2 Admin guard confirmation.** Use existing `AdminRoute` (no new guard needed). `AdminRoute` already enforces JWT `app_metadata.role === 'admin'` per `src/components/AdminRoute.jsx:62`. Spec says "chris@grittyfb.com" — that email is implicit in the admin role. No email-string check needed unless Chris wants belt-and-suspenders.

- [ ] **1.3 Component decomposition.** The 7 views share scaffolding:
  - `AccountUpdatesShell` owns the toggle state, fetches paged rows via `admin-read-account-updates`, hosts `AdminTableEditor` for read + the `BulkEditDrawer` for write, plus the create/delete modals (gated by entity).
  - Each `*View.jsx` is thin: column config + entity name + pagination defaults. No data fetching logic — all in shell.
  - `BulkEditDrawer` is the "select up to 10 → inline edit → review diff → confirm → submit" UI. Hard-cap selection at 10 rows; UI disables the "select" checkbox once 10 is reached.
  - `ReviewDiffPanel` shows: row identifier, old value → new value, per changed field. Confirm button is disabled until the admin scrolls through every changed row (or clicks "I've reviewed all changes" — pick one in execution).

- [ ] **1.4 Per-form contract.** State machine:
  ```
  IDLE → row select (≤10) → EDIT → click Update → REVIEW (diff panel) → click Confirm → SUBMITTING → SUCCESS | ERROR → IDLE
  ```
  Selection persists across pagination within a single edit session. Selecting an 11th row is blocked.

- [ ] **1.5 Create/Delete gating (Q5 LOCKED — UI hidden).** Wire `CreateRowModal` and `DeleteConfirmModal` to mount ONLY when the active toggle is one of `colleges | college-coaches | recruiting-events`. The `*View.jsx` for the 4 auth-linked entities does NOT import the Create/Delete components at all — compile-time gate. Verify via DOM inspection in Phase 3 that the buttons are entirely absent (not just `display: none`).

- [ ] **1.6 EF contracts.**
  - `admin-read-account-updates` — `GET /functions/v1/admin-read-account-updates?entity=<key>&page=<n>&page_size=<n>&sort=<col>&dir=<asc|desc>`. Returns `{ success, rows, total, page, page_size }`. Auth gate via `getUser()` (DEC 016-C WT-B). Service-role DB read.
  - `admin-update-account` — `PUT /functions/v1/admin-update-account` body `{ entity, batch: [{ row_id, diff: { col: new_value, ... }, updated_at_check?: timestamp }, ...] }`. Returns `{ success, updated_rows, audit_ids }` or `{ success: false, error, conflicts: [{ row_id, current_updated_at }] }` on 409. Transactional.
  - `admin-create-account` — `POST /functions/v1/admin-create-account` body `{ entity, row: {...} }`. Returns `{ success, row }`. Entity gated to colleges/college-coaches/recruiting-events at the EF (defense in depth).
  - `admin-delete-account` — `DELETE /functions/v1/admin-delete-account` body `{ entity, row_id }`. Soft delete (sets `deleted_at`). Same entity gate.
  - All four EFs write to the audit table per Q7 ruling: **one row per field changed** on update (10-row × 5-field bulk submit = 50 audit rows). Create and delete write **one row each**. Phase 0 confirms whether existing `public.admin_audit_log` schema fits or whether `0051` adds `public.admin_account_updates_audit` (lean schema: `actor`, `entity_type`, `entity_id`, `field`, `old_value` jsonb, `new_value` jsonb, `ts`).

- [ ] **1.7 Column whitelists per entity.** Mirror the `ALLOWED_COLUMNS` pattern from `supabase/functions/admin-update-school/index.ts:56`. Hardcoded per-entity in the EF — any column not on the whitelist returns 400. The whitelist is the security boundary; do not derive from request.

- [ ] **1.8 RLS plan.** Migration `0051_account_updates_admin_write_policies.sql` adds — per Phase 0 RLS gap report — admin-scoped write policies for any table missing one. Note: admin EFs use service-role and bypass RLS, so these policies are consistency/defense-in-depth, not the primary enforcement. Pattern: `WITH CHECK ((auth.jwt() ->> 'role') = 'service_role' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')`.

- [ ] **1.9 Phase 1 done condition.** Architecture doc `docs/specs/.admin-acct-updates/PHASE_1_ARCHITECTURE.md` written with: (a) tab placement, (b) component tree, (c) state machine diagram, (d) EF contracts (request/response shapes), (e) per-entity column whitelists (`COLUMN_WHITELISTS.md`), (f) RLS plan with migration outline. **Halt for operator review before starting Phase 2.**

### Phase 1 decisions (operator-locked 2026-05-13)

- **Issue 1 (Bulk PDS dual-write):** Accept (a) — admin direct edit is the override path by design. 5 PDS measurables stay editable in Students per Q4. UI shows per-field hint: **"Direct edit bypasses bulk PDS audit chain."** No code coupling to `bulk_pds_submissions`.
- **Issue 2 (Audit table):** Single audit table. `ALTER TABLE public.admin_audit_log ADD COLUMN field text` in `0051` + index `(table_name, row_id, field, created_at DESC)`. One audit row per field changed.
- **Issue 3 (Migration tracking drift):** `scripts/migrate.js:134` already writes the tracking row — **no patch needed**. Backfill 11 missing rows in `0051` as a one-time `INSERT ... ON CONFLICT DO NOTHING` cleanup block. CF-027-2 **closed in this sprint**.
- **Issue 4 (Schools EF conflict):** Sprint 027 Colleges writes route through new `admin-update-account`. `admin-update-school` is NOT extended — stays narrow as 3-col legacy path. Two EFs touch `public.schools` intentionally. Boundary documented in both EF header comments.
- **Link-table editing:** YES — HS Coaches and Counselors forms edit school assignment inline. 6 additional admin-write policies on `hs_coach_schools` and `hs_counselor_schools` included in `0051`. **17 policies total.**

### Phase 1 artifacts (all written 2026-05-13)

- `docs/specs/.admin-acct-updates/PHASE_1_ARCHITECTURE.md`
- `docs/specs/.admin-acct-updates/COLUMN_WHITELISTS.md`
- `supabase/migrations/0051_account_updates_admin_write_policies.sql` (written, NOT applied)
- Component stubs: 8 in `src/components/account-updates/` + 7 in `src/components/account-updates/views/` + 6 helpers in `src/lib/adminAccountUpdates/` + `src/pages/AdminAccountUpdatesPage.jsx`
- EF stubs: `supabase/functions/admin-{read-accounts,update-account,create-account,delete-account}/index.ts`

---

## Phase 2 — Build (parallel + serial groupings)

**Goal:** Build the feature in the smallest number of synchronization points. Use `superpowers:dispatching-parallel-agents` for the parallel groups.

### Sequencing

```
SERIAL — Group A (must finish before B and C can start)
  A1. Shared scaffolding: AccountUpdatesShell, ToggleBar, BulkEditDrawer, ReviewDiffPanel, columnConfigs.js, diffPayload.js
  A2. Tab wiring: adminTabs.js + AdminPage.jsx + route + page shell
  A3. Migration 0051 (admin write policies)
  A4. Read EF: admin-read-account-updates (covers all 7 entities via entity param)
  A5. Update EF: admin-update-account (covers all 7 entities via entity param)

PARALLEL — Group B (4 auth-linked entities; each is a thin view + column config)
  B1. StudentsView.jsx + students column config
  B2. HsCoachesView.jsx + hs_coaches column config
  B3. CounselorsView.jsx + counselors column config
  B4. HighSchoolsView.jsx + high_schools column config

PARALLEL — Group C (3 non-auth-linked entities — also need create/delete EFs)
  C1. Create EF: admin-create-account
  C2. Delete EF: admin-delete-account
  C3. CreateRowModal + DeleteConfirmModal components
  Then in parallel:
    C4. CollegesView.jsx + colleges column config
    C5. CollegeCoachesView.jsx + college_coaches column config
    C6. RecruitingEventsView.jsx + recruiting_events column config

SERIAL — Group D (only after B and C complete)
  D1. Cross-entity integration smoke (toggle between all 7 views, verify state isolation)
  D2. Phase 3 verification entry point
```

### Tasks

- [ ] **2.A1 Build shared scaffolding** (1 subagent, serial). Files: `AccountUpdatesShell.jsx`, `AccountUpdatesToggleBar.jsx`, `BulkEditDrawer.jsx`, `ReviewDiffPanel.jsx`, `columnConfigs.js` (skeletons for all 7 entities — populate per-entity in B/C), `diffPayload.js`. Unit-test `diffPayload.js` (pure function — easy TDD).

- [ ] **2.A2 Wire tab + route** (same subagent or follow-on). Edit `src/lib/adminTabs.js` and `src/pages/AdminPage.jsx`. Mount `AdminAccountUpdatesPage` at `/admin/account-updates`.

- [ ] **2.A3 Apply migration 0051** via `npm run migrate -- supabase/migrations/0051_account_updates_admin_write_policies.sql`. Verify via Supabase MCP that policies are live.

- [ ] **2.A4 Build + deploy `admin-read-account-updates` EF.** Pattern from `admin-read-institutions`. Deploy via `node scripts/deploy-ef.js admin-read-account-updates`. Smoke test with curl + admin JWT for each of the 7 entities.

- [ ] **2.A5 Build + deploy `admin-update-account` EF.** Pattern from `admin-update-school` (auth gate, audit log, service-role write, hardcoded column whitelist per entity). Add 409 conflict handling for `updated_at` mismatch (per Q6). Deploy + smoke test.

- [ ] **2.B Parallel-dispatch Group B** (4 subagents — one per entity). Each subagent gets:
  - `READ_ONLY_FIELDS.md` (from Phase 0)
  - `PHASE_1_ARCHITECTURE.md` (from Phase 1)
  - One specific entity to build (`students | hs_coaches | counselors | high_schools`)
  - Dependency: A1–A5 complete and deployed
  - Done condition: view component renders rows in dev, can select up to 10, can edit a non-protected field, can submit, DB write confirmed via Supabase MCP, audit log row written.

- [ ] **2.C1 Build + deploy `admin-create-account` EF** (1 subagent). Entity gate (only colleges/college_coaches/recruiting_events accepted). Pattern from `admin-update-school`.

- [ ] **2.C2 Build + deploy `admin-delete-account` EF** (1 subagent). Soft delete via `deleted_at` column. Migration `0052_add_deleted_at_for_soft_delete.sql` adds `deleted_at timestamptz` to colleges, college_coaches, recruiting_events if not present. Update read EF in A4 to filter `WHERE deleted_at IS NULL`.

- [ ] **2.C3 Build CreateRowModal + DeleteConfirmModal** (1 subagent, parallel to C1+C2). Mount only when active entity is non-auth-linked.

- [ ] **2.C4–C6 Parallel-dispatch Group C views** (3 subagents — one per entity). Same per-entity dispatch pattern as Group B, plus each subagent additionally wires create/delete UI for its entity.

- [ ] **2.D1 Cross-entity integration smoke.** Toggle through all 7 views, verify (a) selection state resets on toggle change, (b) URL deep-link to a specific entity works, (c) browser refresh preserves entity context. Single subagent or do inline.

- [ ] **2.2 Commit cadence within Phase 2.** Group A is one commit per A-task (5 commits). Group B is one commit per entity (4 commits). Group C is one commit per task (3 + 3 = 6 commits). Group D is one commit. Total Phase 2: ~16 commits.

---

## Phase 3 — Verification

**Goal:** Per-entity smoke tests + negative tests + audit log integrity check. Use `superpowers:verification-before-completion`.

**Files (planned):**
- Create: `tests/e2e/admin-account-updates.spec.js` (Playwright — covers all 7 entities + negative tests)
- Create: `tests/unit/diffPayload.test.js` (already covered in 2.A1)
- Create: `tests/unit/columnConfigs.test.js` (per-entity read-only field assertions)

### Per-entity smoke tests (positive path)

For EACH of the 7 entities, run this script:

- [ ] **3.S.<entity>.1 Load view.** Navigate to `/admin/account-updates`, click `<entity>` toggle. Verify rows load. Verify column headers match Phase 0 column list. Verify protected-field columns are visually distinct (e.g., grey background or lock icon).

- [ ] **3.S.<entity>.2 Select 10 rows.** Click 10 row checkboxes. Verify the 11th checkbox is disabled. Verify a "10 selected" indicator is shown.

- [ ] **3.S.<entity>.3 Edit a non-protected field on 1 row.** Open the bulk edit drawer. Type a new value. Verify the diff badge updates.

- [ ] **3.S.<entity>.4 Edit a non-protected field on multiple rows.** Pick a column visible across all 10 selected. Edit on 3 of them. Verify drawer shows 3 pending diffs.

- [ ] **3.S.<entity>.5 Click Update → Review diff panel renders correctly.** Each changed field shows row id + old → new.

- [ ] **3.S.<entity>.6 Click Confirm → Submit.** Verify success toast. Verify drawer closes. Verify table re-renders with new values. Verify Supabase MCP confirms the DB write. Verify `admin_audit_log` has the batch row with the correct diff JSONB.

### Negative tests

- [ ] **3.N.1 Protected fields are read-only.** For each entity, attempt to edit `id` / `user_id` / `email` / `password` (where present). Verify: input is disabled in the drawer; if the diff payload is hand-crafted to include a protected field and submitted, the EF returns 400 (defense in depth).

- [ ] **3.N.2 Non-admin sees no tab.** Sign in as a non-admin user (any `student_athlete` from the 30 profile rows). Navigate to `/admin/account-updates`. Verify redirect to `/admin-login` (per `AdminRoute:63-65`). Verify the "Account Updates" tab is NOT in the tab bar (because no admin nav is rendered for non-admin).

- [ ] **3.N.3 Create/Delete hidden on auth-linked entities.** Toggle to each of the 4 auth-linked entities (`students | hs_coaches | counselors | high_schools`). Verify Create and Delete buttons are NOT mounted in the DOM (compile-time gate per 1.5). Toggle to each of the 3 non-auth-linked entities — verify both buttons ARE mounted.

- [ ] **3.N.4 Concurrent edit conflict (409).** Open the same row in two browsers. Edit + submit in browser A. Edit + submit in browser B. Verify B receives a 409 with the conflict shape and the UI shows "This row was modified by another session — refresh to see latest values."

- [ ] **3.N.5 11th selection blocked (Q6 LOCKED).** With 10 rows selected, click an 11th checkbox. Verify it does NOT toggle, AND a **toast** appears with the cap message (toast — not tooltip — per Q6).

- [ ] **3.N.6 Audit log per field (Q7 LOCKED).** After each smoke run, query the audit table via Supabase MCP. Verify **one row per field changed** (e.g., 10-row × 5-field bulk submit produces 50 audit rows), each with `actor` = chris@grittyfb.com (or `admin_email` if existing table is reused), correct `entity_type`, correct `entity_id`, correct `field`, and old/new JSONB matching the submitted payload.

- [ ] **3.N.7 Empty-state messaging (Q8 LOCKED).** Toggle to `recruiting_events` and `college_coaches` (both 0 rows live). Verify the empty state reads exactly **"No records — use Create to add"** and the Create button is visible. Toggle to any auth-linked entity that returns 0 rows for the current page (force via filter if necessary) and verify the generic empty state appears (no Create button).

### Phase 3 done condition

- [ ] **3.D Phase 3 done.** All 7 × 6 = 42 positive smoke checks pass. All 7 negative tests pass (3.N.1 through 3.N.7). Playwright suite committed and green. **Halt for operator review before Phase 4.**

---

## Phase 4 — Commit + Push Cadence

**Goal:** Single feature branch, commit per phase milestone, push at sprint close.

**STATUS: COMPLETED 2026-05-13.** See `SPRINT_027_RETRO.md` for the full close-out report.

### Tasks (all DONE)

- [x] **4.1 Branch.** Cut `sprint-027/admin-account-updates` from `master` HEAD `02eab22`. Verified clean state before cutting.

- [x] **4.2 Commit cadence.** Final 6 commits:
  ```
  e52dfea sprint-027/Phase 4: scripts/audit-migration-tracking.js (CF-027-2 follow-up)
  0d26a27 sprint-027/Phase 3: e2e suite — 63 tests pass (50 positive + 12 negative + 1 smoke)
  e94bb27 sprint-027/Group D: cross-entity data-plane smoke report
  ca8fb6a sprint-027/Group C: create + delete EFs + modals + Shell wiring + polish
  ad62585 sprint-027/Group B: per-entity column-config polish from 4 subagent reports
  1225029 sprint-027/Group A: scaffolding + EFs (read+update) + migrations
  ```
  Lower than the original `~16 commits` estimate because Group A was bundled (foundational scaffolding doesn't benefit from sub-commits) and Group B/C subagent dispatches did read-only review (no per-subagent commits).

- [x] **4.3 No push until sprint close.** Honored — branch stayed local through Phase 3 done.

- [x] **4.4 Push at sprint close.** Branch pushed; PR opened. See SPRINT_027_RETRO.md for URLs.

- [x] **4.5 Push protocol checks.**
  - Event #5 (cutting a new branch) — base was master `02eab22`, clean.
  - Event #9 (schema/API contract changes) — `0051` + `0052` migrations applied to live; 4 EFs deployed; documented in PHASE_2_SMOKE_REPORT.md.
  - Event #10 (data pipeline operations) — none (no Serper/IPEDS).
  - Event #1 (session close / pause) — fired at sprint close.

- [x] **4.6 CF-027-2 follow-up (added per Phase 4 directive).** `scripts/audit-migration-tracking.js` written + `npm run audit:migrations` script added. First-run output confirms 0 missing tracking rows when both `public.supabase_migrations` and `supabase_migrations.schema_migrations` are queried (key Phase 4 discovery: this project has TWO tracking tables, not one).

- [ ] **4.7 Post-merge.** After operator approves PR + merge, the deploy pipeline runs. Standard post-deploy verification per `~/.claude/rules/push-protocol.md`. Out of scope for this sprint — handed off to operator.

---

## Open Items / Risks Surfaced During Planning

1. **ERD staleness gate (in-scope, read-only).** ERD is from 2026-05-02; 7 migrations have shipped since (0044–0050). Operator directed: drift goes to `erd-drift-sprint027.md`; canonical ERD is NOT edited.
2. **HS Coaches / Counselors do not have `profiles` rows.** The "account record" for these is `auth.users` + `public.users` shell only. The form will look thinner than the Students form. The `users.full_name` column was added in `0046` — backfilled for 6 of 8 known staff; 2 accounts have NULL `full_name`. The Account Updates form is a natural place to do that backfill.
3. **Soft delete column add affects readers.** If Phase 1 lands on soft delete for `schools`, `college_coaches`, `recruiting_events`, every read path that joins these tables must filter `deleted_at IS NULL`. The `schools` readers are many (`GritFitPage`, `ShortlistPage`, `AdminInstitutionsTab`, scoring modules). Recommendation: filter at the read EF layer (narrow blast radius), not via a view. Phase 1 finalizes.
4. **`admin-update-school` is the closest precedent for the new EFs**, but its column whitelist is 3 columns. Sprint 027 EF whitelists will be much larger. Recommend a typed per-entity config object, not flat string arrays.
5. **Audit volume per Q7.** One audit row per field changed → a 10-row × 5-field bulk submit creates 50 rows. At sustained admin use this could be high-volume. Index `(entity_type, entity_id, ts)` on the audit table from day one (Phase 1 / `0051` migration).
6. **High Schools — `hs_programs` vs `partner_high_schools`.** Q2 LOCKED to `hs_programs`. The Phase 0 drift report documents the role of `partner_high_schools` (likely active for the coach scheduler) but no refactor in this sprint. Carry-forward flag: future sprint should consolidate.

---

## Done Condition (Sprint 027)

The sprint is DONE when:
1. Admin signed in as chris@grittyfb.com can navigate to `/admin/account-updates`.
2. Toggle bar shows 7 entity buttons.
3. For each of 7 entities: select up to 10, edit non-protected fields, review diff, confirm, submit, DB write confirmed.
4. Protected fields (PK, user_id, email, password) are RO across all 7 forms.
5. Create + Delete are functional for colleges, college coaches, recruiting events. Hidden for the 4 auth-linked entities.
6. Non-admin cannot access tab.
7. Every admin write produces an `admin_audit_log` row.
8. Playwright suite (positive + negative) is green and committed.
9. Branch is pushed; PR is open with link to this plan.

---

## Self-Review Notes

- Spec coverage: Goal 1 (RW with protected fields RO) ⇒ tasks 1.6, 1.7, 3.N.1. Goal 2 (Admin View only) ⇒ tasks 1.2, 3.N.2. Goal 3A (10-row cap) ⇒ tasks 1.4, 3.N.5. Goal 3B (no second-party verification) ⇒ tasks 1.4 (the state machine omits the verify step). Goal 3C (7 toggles) ⇒ Group B + Group C. Goal 4 (create/delete only for 3 entities) ⇒ tasks 1.5, 2.C, 3.N.3. Goal 5 (full happy path) ⇒ 3.S.*.
- "Eight" vs "seven" toggle discrepancy is captured in pre-flight Q1 — must resolve before Phase 1.
- Two pre-existing patterns govern: `AdminTableEditor` for read, `admin-update-school` EF for write-with-audit. Plan reuses both.
- No code is written in this plan — all `Create:` paths are planned for execution. `Modify:` paths reference real files at real lines.
