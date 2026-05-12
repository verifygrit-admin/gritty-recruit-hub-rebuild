# Sprint 026 — Bulk Player Data Submission (Bulk PDS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a functional Head Coach "Player Updates" (Bulk PDS) page that writes multi-player performance data to a Supabase staging table, and an Admin "Bulk PDS Approval" panel that verifies-and-applies staged rows to `public.profiles`.

**Architecture:** Three-layer build: (1) new `public.bulk_pds_submissions` staging table + 5 numeric measurable columns added to `public.profiles` + RLS scoped to coach (own rows) and admin (all rows via EF service_role); (2) new `/coach/player-updates` route — read-only coach identity box + `hs_coach_students`-scoped student dropdown + dynamic Player Update Cards + single batch submit; (3) new `/admin/bulk-pds-approval` admin tab — side-by-side A/B grid (staging row vs current profiles row joined on `user_id`) with a prominent "Verify and Update Profiles" button, writes via a new admin Edge Function. Submit timestamp lives on staging; approval timestamp writes a new `last_bulk_pds_approved_at` column to `profiles`. School design-token overlay applied over the supplied background image on the coach page.

**Tech Stack:** React 18 + Vite, React Router v6, Supabase JS v2 (PostgREST + Edge Functions on Deno), React Hook Form (form state), Playwright (E2E), Vitest (unit). Migrations applied via `scripts/migrate.js` over the Supabase Management API. EF deploys via `scripts/deploy-ef.js`.

**Locked field names (per operator at session open):**
- Existing measurables write-thru: `height` (text "6-2"), `weight` (numeric), `speed_40` (numeric)
- NEW measurables on BOTH `profiles` AND `bulk_pds_submissions`: `time_5_10_5` numeric, `time_l_drill` numeric, `bench_press` numeric, `squat` numeric, `clean` numeric
- Submit timestamp = staging only. Approved-at timestamp = profiles (proposed column: `last_bulk_pds_approved_at`).

**Live schema verified 2026-05-12:** `public.profiles` (32 cols, 36 rows), `public.hs_coach_students` (30 rows, shape `id / coach_user_id / student_user_id / confirmed_at`), `public.admin_audit_log` present, admin EF pattern uses `getUser()` + `app_metadata.role === 'admin'`. Source: `mcp__supabase__list_tables` against project `xyudnajzhuwdauwkwsbh`.

---

## 1. Schema Contract — DDL Preview (Locked)

Three migrations land in this order. Each is a separate file applied via `npm run migrate -- <path>`.

### 1.1 `supabase/migrations/0048_bulk_pds_submissions.sql`

```sql
-- Sprint 026 — Bulk Player Data Submission staging table.
-- One row per (coach submission, student) — a batch of cards in a single
-- submit produces N rows sharing a batch_id.

CREATE TABLE IF NOT EXISTS public.bulk_pds_submissions (
  id                                uuid          NOT NULL DEFAULT gen_random_uuid(),
  batch_id                          uuid          NOT NULL,
  coach_user_id                     uuid          NOT NULL,
  student_user_id                   uuid          NOT NULL,

  -- Snapshot of identity fields at submission time (immutable record).
  student_name_snapshot             text,
  student_email_snapshot            text,
  student_grad_year_snapshot        integer,
  student_high_school_snapshot      text,
  student_avatar_storage_path_snap  text,

  -- Performance fields (write-thru candidates).
  height                            text,
  weight                            numeric,
  speed_40                          numeric,
  time_5_10_5                       numeric,
  time_l_drill                      numeric,
  bench_press                       numeric,
  squat                             numeric,
  clean                             numeric,

  -- Lifecycle.
  submitted_at                      timestamptz   NOT NULL DEFAULT now(),
  approval_status                   text          NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by                       uuid,
  approved_at                       timestamptz,
  rejection_reason                  text,

  PRIMARY KEY (id),
  CONSTRAINT bulk_pds_submissions_coach_user_id_fkey
    FOREIGN KEY (coach_user_id)    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT bulk_pds_submissions_student_user_id_fkey
    FOREIGN KEY (student_user_id)  REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT bulk_pds_submissions_approved_by_fkey
    FOREIGN KEY (approved_by)      REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_bulk_pds_submissions_batch_id        ON public.bulk_pds_submissions (batch_id);
CREATE INDEX idx_bulk_pds_submissions_coach_user_id   ON public.bulk_pds_submissions (coach_user_id);
CREATE INDEX idx_bulk_pds_submissions_student_user_id ON public.bulk_pds_submissions (student_user_id);
CREATE INDEX idx_bulk_pds_submissions_approval_status ON public.bulk_pds_submissions (approval_status);
CREATE INDEX idx_bulk_pds_submissions_submitted_at    ON public.bulk_pds_submissions (submitted_at DESC);
```

### 1.2 `supabase/migrations/0049_profiles_add_bulk_pds_measurables.sql`

```sql
-- Sprint 026 — Five new numeric measurables on profiles + approval timestamp.
-- Nullable. No default. Populated only by admin-approved bulk PDS write path.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_5_10_5                 numeric,
  ADD COLUMN IF NOT EXISTS time_l_drill                numeric,
  ADD COLUMN IF NOT EXISTS bench_press                 numeric,
  ADD COLUMN IF NOT EXISTS squat                       numeric,
  ADD COLUMN IF NOT EXISTS clean                       numeric,
  ADD COLUMN IF NOT EXISTS last_bulk_pds_approved_at   timestamptz;

COMMENT ON COLUMN public.profiles.time_5_10_5               IS 'Pro Agility (5-10-5) drill time in seconds. Bulk PDS field (Sprint 026).';
COMMENT ON COLUMN public.profiles.time_l_drill              IS 'L-Drill time in seconds. Bulk PDS field (Sprint 026).';
COMMENT ON COLUMN public.profiles.bench_press               IS 'Bench press max in pounds. Bulk PDS field (Sprint 026).';
COMMENT ON COLUMN public.profiles.squat                     IS 'Squat max in pounds. Bulk PDS field (Sprint 026).';
COMMENT ON COLUMN public.profiles.clean                     IS 'Clean max in pounds. Bulk PDS field (Sprint 026).';
COMMENT ON COLUMN public.profiles.last_bulk_pds_approved_at IS 'Timestamp of the last admin-approved Bulk PDS write to this profile. NULL if never updated via Bulk PDS.';
```

### 1.3 `supabase/migrations/0050_bulk_pds_submissions_rls.sql`

```sql
-- Sprint 026 — RLS for bulk_pds_submissions.
-- Coach can INSERT rows ONLY for students linked to them in hs_coach_students,
-- and ONLY with their own coach_user_id. Coach can SELECT only their own rows.
-- Admin reads/writes go through admin EFs using service_role (bypasses RLS).

ALTER TABLE public.bulk_pds_submissions ENABLE ROW LEVEL SECURITY;

-- Coach SELECT: own submissions only.
CREATE POLICY "bulk_pds_coach_select_own"
  ON public.bulk_pds_submissions FOR SELECT
  USING (coach_user_id = auth.uid());

-- Coach INSERT: only their own coach_user_id, and only for students
-- linked in hs_coach_students.
CREATE POLICY "bulk_pds_coach_insert_own_linked_students"
  ON public.bulk_pds_submissions FOR INSERT
  WITH CHECK (
    coach_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.hs_coach_students hcs
      WHERE hcs.coach_user_id   = auth.uid()
        AND hcs.student_user_id = bulk_pds_submissions.student_user_id
    )
  );

-- Admin SELECT (admin EFs use service_role and bypass this; included for
-- consistency with admin_audit_log pattern in migration 0035).
CREATE POLICY "bulk_pds_admin_select_all"
  ON public.bulk_pds_submissions FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No coach UPDATE/DELETE. No browser-side INSERT/UPDATE/DELETE on the
-- approval lifecycle — all admin writes flow through Edge Functions.

-- Profiles already has RLS from 0012/0025/0026/0027/0043. The five new
-- columns inherit the same row-level grants. The student profile-edit page
-- (ProfilePage.jsx:271) does NOT expose these fields in Sprint 026 (Note 1).
```

**RLS summary:**

| Actor        | bulk_pds_submissions                                          | profiles (new fields)                                       |
|--------------|---------------------------------------------------------------|-------------------------------------------------------------|
| Coach (HS)   | INSERT own rows for linked students; SELECT own rows          | No direct write. New fields not exposed in any coach UI.    |
| Student      | No grant                                                      | No write. Sprint 026 does NOT add these to ProfilePage.jsx. |
| Admin        | SELECT/UPDATE all via EF (service_role)                       | UPDATE via EF (service_role)                                |
| Anon         | No grant                                                      | Existing                                                    |

---

## 2. Coach View Component Tree — `/coach/player-updates`

**Route:** `src/App.jsx` — add `<Route path="/coach/player-updates" element={<Layout><ProtectedRoute><CoachPlayerUpdatesPage /></ProtectedRoute></Layout>} />` immediately after the existing `/coach/profile` line.

**Nav:** `src/lib/navLinks.js` — append `{ to: '/coach/player-updates', label: 'PLAYER UPDATES' }` to `COACH_NAV_LINKS`.

```
src/pages/coach/CoachPlayerUpdatesPage.jsx                  // page shell, data load, submit handler
├── components/bulk-pds/BulkPdsBackground.jsx               // bg image + school-token overlay (token at α=0.65; design lock)
├── components/bulk-pds/BulkPdsHeader.jsx                   // title + how-to copy block
├── components/bulk-pds/CoachIdentityBox.jsx                // read-only name + email + school (school-staff.js + useSchoolIdentity)
├── components/bulk-pds/StudentDropdownPicker.jsx           // <select> populated from hs_coach_students join; "Add" button
├── components/bulk-pds/PlayerUpdateCardList.jsx            // dynamic list; remove-card affordance
│   └── components/bulk-pds/PlayerUpdateCard.jsx            // one card; 5 RO identity fields + 8 write fields
│       └── components/bulk-pds/MeasurableField.jsx         // shared numeric/text input with label + unit suffix
└── components/bulk-pds/SubmitBatchButton.jsx               // disabled until ≥1 card; calls submit handler

src/lib/bulk-pds/
├── buildSubmissionRows.js                                   // pure: cards[] + coach + students → DB row array
├── validateBulkPdsCards.js                                  // pure: returns error map per card
└── submitBulkPdsBatch.js                                    // supabase.insert(bulk_pds_submissions); returns batch_id

src/hooks/
├── useCoachLinkedStudents.js                                // query hs_coach_students JOIN profiles for current coach
└── useCoachIdentity.js                                      // combines useSchoolIdentity + school-staff.js findStaffByUserId
```

**Data flow (read):**
1. `useAuth()` → session.user.id (the logged-in coach).
2. `useCoachIdentity()` → name + email + school (from `school-staff.js`, NOT profiles).
3. `useCoachLinkedStudents()` → `SELECT student_user_id FROM hs_coach_students WHERE coach_user_id = auth.uid()`, then `SELECT id, user_id, name, email, grad_year, high_school, avatar_storage_path FROM profiles WHERE user_id IN (...)`.
4. Dropdown options = linked students minus students already in the card list.

**Data flow (submit):**
1. Generate one `batch_id = crypto.randomUUID()` for the submission.
2. For each card, build a `bulk_pds_submissions` insert row: `{ batch_id, coach_user_id, student_user_id, ...snapshot fields from profiles read, ...measurables from card }`.
3. Single `supabase.from('bulk_pds_submissions').insert(rows)` call. RLS validates each row's `coach_user_id` and `hs_coach_students` linkage server-side.
4. On success: toast confirmation + clear card list + reset dropdown.

**Mobile responsiveness:** Player Update Cards render full-width single column on viewport < 768px, two-column grid 768–1199px, three-column grid ≥ 1200px. Existing token system in `src/index.css` and `src/components/Layout.jsx` is the reference.

**Design overlay:** `BulkPdsBackground.jsx` renders the image as a fixed-position layer with `school-tokens` overlay at the same opacity already used in the Coach Dashboard masthead. Default opacity α=0.65 — open question Q5 confirms before lock.

---

## 3. Admin View Component Tree — `/admin/bulk-pds-approval`

**Route:** added to `src/lib/adminTabs.js`:

```js
export const ADMIN_TABS = [
  { key: 'users',             label: 'Users',               path: '/admin/users' },
  { key: 'institutions',      label: 'Institutions',        path: '/admin/institutions' },
  { key: 'recruiting-events', label: 'Recruiting Events',   path: '/admin/recruiting-events' },
  { key: 'bulk-pds',          label: 'Bulk PDS Approval',   path: '/admin/bulk-pds' },
  { key: 'audit',             label: 'Audit Log',           path: '/admin/audit' },
];
```

**AdminPage.jsx:** add `{ activeTab === 'bulk-pds' && <AdminBulkPdsTab /> }` to the tab content switch.

```
src/components/AdminBulkPdsTab.jsx                            // tab shell, list + detail layout
├── AdminBulkPdsBatchList.jsx                                  // left: collapsible list of pending batches, sorted submitted_at desc
└── AdminBulkPdsBatchDetail.jsx                                // right: per-batch detail
    ├── AdminBulkPdsBatchHeader.jsx                            // coach name/email + submission ts + "Verify and Update Profiles" CTA
    └── AdminBulkPdsCompareRow.jsx                             // one row per student in batch — A/B side-by-side
        ├── AdminBulkPdsStagingCard.jsx                        // A: staging row values
        └── AdminBulkPdsProfileCard.jsx                        // B: current profiles row (joined on user_id)

supabase/functions/admin-read-bulk-pds/index.ts                // GET: lists pending batches OR returns one batch + matching profiles rows
supabase/functions/admin-approve-bulk-pds/index.ts             // POST: { batch_id } → applies staging rows to profiles, marks approved, logs admin_audit_log

src/lib/bulk-pds/admin/
├── adminBulkPdsClient.js                                       // wraps fetches to the two EFs
└── diffStagingVsProfile.js                                     // pure: highlights changed fields per row
```

**Admin approval flow:**
1. Admin opens tab → EF `admin-read-bulk-pds` returns array of batches grouped by `batch_id`, each with: coach identity (looked up via `school-staff.js` lookup on coach_user_id), array of `{ staging_row, profile_row }` paired on `student_user_id` (LEFT JOIN — flags missing profile as error).
2. Admin selects a batch → detail view renders `<AdminBulkPdsCompareRow>` per student. Each row visually highlights deltas using `diffStagingVsProfile`.
3. Admin clicks "Verify and Update Profiles" (top of batch detail) → EF `admin-approve-bulk-pds` body `{ batch_id }`.
4. EF (service_role, single transaction):
   - For each staging row in batch where `approval_status='pending'`: UPDATE `profiles` SET `height/weight/speed_40/time_5_10_5/time_l_drill/bench_press/squat/clean` = staging values, `last_bulk_pds_approved_at` = now(), `updated_at` = now() WHERE `user_id` = staging.student_user_id.
   - UPDATE staging rows SET `approval_status='approved'`, `approved_by=auth.uid()`, `approved_at=now()` WHERE `batch_id = $1`.
   - INSERT admin_audit_log row per approved student (action='bulk_pds_approve', table_name='profiles', row_id=student_user_id, old_value=jsonb of pre-update profile fields, new_value=jsonb of staging values).
5. On success: UI reloads pending batch list; approved batch is removed from pending view.

**Auth gate:** both EFs use the existing pattern from `supabase/functions/admin-read-schools/index.ts` (lines 60–87): Bearer token → `userClient.auth.getUser(accessToken)` → check `app_metadata.role === 'admin'` → reject 403 otherwise. Sprint 026 admin = `chris@grittyfb.com` only (already the sole admin).

---

## 4. Test Plan (TDD targets)

### 4.1 Unit (Vitest) — pure-function tests, written first per skill

| Module                                           | Test file                                                            | Failing tests required                                          |
|--------------------------------------------------|----------------------------------------------------------------------|-----------------------------------------------------------------|
| `src/lib/bulk-pds/buildSubmissionRows.js`        | `tests/unit/bulk-pds/buildSubmissionRows.test.js`                    | 3 cards → 3 rows with same batch_id; snapshots copied verbatim; null measurables stay null |
| `src/lib/bulk-pds/validateBulkPdsCards.js`       | `tests/unit/bulk-pds/validateBulkPdsCards.test.js`                   | Negative numbers rejected; non-numeric in numeric field rejected; height accepts "6-2" |
| `src/lib/bulk-pds/admin/diffStagingVsProfile.js` | `tests/unit/bulk-pds/diffStagingVsProfile.test.js`                   | Same values → no diff; numeric coercion ("180" vs 180); null vs value flagged |
| `src/hooks/useCoachLinkedStudents.js`            | `tests/unit/hooks/useCoachLinkedStudents.test.js`                    | Returns linked students; empty array when no links; supabase error path |

### 4.2 Integration (Vitest + Supabase test project) — RLS contract tests

| Scenario                                                                                  | Expected |
|-------------------------------------------------------------------------------------------|----------|
| Coach A inserts bulk_pds_submissions row for student linked in hs_coach_students          | PASS     |
| Coach A inserts row with coach_user_id = Coach B                                          | RLS DENY |
| Coach A inserts row for student NOT in their hs_coach_students                            | RLS DENY |
| Coach A SELECT own rows                                                                   | PASS     |
| Coach A SELECT Coach B rows                                                               | RLS DENY |
| Student tries to INSERT into bulk_pds_submissions                                         | RLS DENY |

### 4.3 Edge Function tests (Deno test runner)

| EF                          | Test                                                                                                 |
|-----------------------------|------------------------------------------------------------------------------------------------------|
| admin-read-bulk-pds         | No bearer → 401; non-admin → 403; admin → 200 with grouped batches                                   |
| admin-approve-bulk-pds      | No bearer → 401; non-admin → 403; admin + valid batch → 200 + profiles updated + audit log written; admin + already-approved batch → 200 idempotent (no double-write) |

### 4.4 E2E (Playwright) — golden paths

| Flow                                                                                                       | Trigger                                       |
|------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Coach signs in → /coach/player-updates → adds 2 students → submits → toast PASS                            | `tests/e2e/coach-player-updates.spec.js`      |
| Admin signs in → /admin/bulk-pds → opens batch → clicks Verify and Update Profiles → profiles updated      | `tests/e2e/admin-bulk-pds-approval.spec.js`   |
| Student profile page renders unchanged (no new fields visible to student) — Note 1 lock                    | `tests/e2e/profile-note1-lock.spec.js`        |
| Mobile viewport (375×667) — Player Update Card stacks single column, dropdown usable                       | `tests/e2e/coach-player-updates-mobile.spec.js` |

---

## 5. Parallel Dispatch Map

**Phase 0 — Schema lock (sequential, single agent).** Operator confirms open questions (§7) → schema migrations written and applied → frontend can rely on locked column names.

| Phase | Agent                | Scope                                                                                                     | Blocked by  |
|-------|----------------------|-----------------------------------------------------------------------------------------------------------|-------------|
| 0     | Schema agent (single)| Write + apply 0048/0049/0050; write integration RLS tests; verify with `mcp__supabase__list_tables`       | Q1–Q3, Q6   |
| 1a    | Coach UI agent       | Coach View page + components (§2); `useCoachLinkedStudents`, `useCoachIdentity`, `buildSubmissionRows`    | Phase 0     |
| 1b    | Admin UI agent       | Admin tab + components (§3) WITHOUT EF wiring (uses fixture data); `diffStagingVsProfile`                 | Phase 0     |
| 1c    | EF agent             | Both Edge Functions (`admin-read-bulk-pds`, `admin-approve-bulk-pds`) + Deno tests; deploy via `scripts/deploy-ef.js` | Phase 0     |
| 1d    | Test agent           | Write Playwright specs for all 4 E2E flows against deployed dev URL                                       | Phase 0     |
| 2     | Integration agent    | Wire Admin UI to live EFs; replace fixtures; verify-and-update flow end-to-end                            | 1b + 1c     |
| 3     | Verification agent   | Run Vitest + Deno tests + Playwright suite; `superpowers:verification-before-completion`                  | 1a + 2 + 1d |

Phase 1a, 1b, 1c, 1d are mutually independent and dispatch in parallel after Phase 0 closes.

---

## 6. Acceptance Checklist — 7 Goals + 2 Notes

| #   | Done condition                                                                                                                                                              | Verification                                  |
|-----|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| G1  | Functional Coach Bulk PDS page submits multi-player data to `public.bulk_pds_submissions`                                                                                   | E2E `coach-player-updates.spec.js`            |
| G2  | Page labeled **PLAYER UPDATES** in `COACH_NAV_LINKS`; route is `/coach/player-updates`; internal module names retain `bulk_pds`                                              | Grep nav + manual screenshot                  |
| G3  | Mobile viewport (375×667) renders single-column card stack; dropdown adds Player Update Card dynamically without page reload                                                | E2E `coach-player-updates-mobile.spec.js`     |
| G4  | Staging row has `submitted_at`; admin "Verify and Update Profiles" writes `last_bulk_pds_approved_at` to `profiles` AND writes `approved_at` to staging row                 | EF test + DB inspection                       |
| G5  | Form contains: title + how-to copy, read-only coach box (name + email + school from `school-staff.js`), student dropdown (scoped via `hs_coach_students`), dynamic card list | Visual review + component snapshot test       |
| G6  | Player Update Card matches spec exactly: 5 read-only identity fields + 8 write fields + hidden `submitted_at` (server-generated)                                            | Field-by-field component test                 |
| G7  | Migrations 0048, 0049, 0050 applied; live schema reflects them                                                                                                              | `mcp__supabase__list_tables` post-apply       |
| N1  | Student `/profile` page UI shows zero new fields (no `time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean` inputs on Student View)                                 | E2E `profile-note1-lock.spec.js`              |
| N2  | `/coach/player-updates` renders the supplied background image with school design-token overlay at locked opacity                                                            | Visual inspection + DOM assertion             |

---

## 7. Open Questions Register — RESOLVED 2026-05-12 by Operator

All eight resolutions are locked. Schema migrations 0048/0049/0050 are unchanged in shape (already accommodated rejection_reason and last_bulk_pds_approved_at). Implementation impact is captured against the phase each decision touches.

### Q1 — Approval modes: **BOTH (batch + per-row)**

Admin can approve the whole batch in one click OR approve/reject individual staging rows. The Admin UI and the approval/rejection EFs must support both modes.

**Implementation impact (Phase 1b + 1c):**
- `admin-approve-bulk-pds` EF accepts EITHER `{ batch_id }` (apply all pending rows in batch) OR `{ submission_id }` (apply single staging row). Mutually exclusive.
- `admin-reject-bulk-pds` EF mirrors the same shape with `rejection_reason` required.
- Admin UI exposes "Verify and Update Profiles (whole batch)" at the batch header AND per-row "Approve" / "Reject" buttons on every `AdminBulkPdsCompareRow`.
- Adds new component `AdminBulkPdsRowActions.jsx` to the §3 component tree.

### Q2 — Reject in v1: **YES**

Reject action:
- (a) sets `approval_status='rejected'`, populates `rejection_reason`, writes `approved_by` and `approved_at`;
- (b) sends an email notification to the coach (Q4 infra);
- (c) produces NO writes to `public.profiles`;
- (d) retains the rejected staging row indefinitely (Q8 retention).

**Implementation impact:** new EF `supabase/functions/admin-reject-bulk-pds/index.ts` added to §3. UI adds reject modal capturing `rejection_reason` (free-text, required).

### Q3 — Admin edits staging pre-approval: **NO**

Strict verify-as-submitted in v1. Staging rows are immutable through the lifecycle. The only allowed UPDATEs to `bulk_pds_submissions` are the lifecycle transitions (`approval_status`, `approved_by`, `approved_at`, `rejection_reason`) performed by the approve/reject EFs via service_role. No coach UPDATE policy. No admin UI for editing values.

### Q4 — Email notifications in scope: **YES, with graceful degradation**

Three trigger points:
- (a) Submission → admin (`chris@grittyfb.com`)
- (b) Approval → coach + each affected student-athlete whose profile was updated
- (c) Rejection → coach

**Provider:** Resend, gated on `RESEND_API_KEY` env var.

**Degradation contract:** if `RESEND_API_KEY` is not set, the email helper logs `EMAIL_DISABLED: <event>` with the would-be recipient list and returns success without sending. The approval/rejection lifecycle does not block on email failure — the DB state change is the source of truth; email is best-effort.

**Implementation impact (Phase 1c):**
- New helper `supabase/functions/_shared/sendBulkPdsEmail.ts` — single entry point for all three trigger templates.
- Coach insert path (Phase 1a coach client) calls a separate notification EF or includes a `post-insert` notify call. **Open sub-decision:** does the coach-side submit fire submission email through an EF (admin-notify-bulk-pds-submission) or via a trigger on the staging table? Default: dedicated EF called from the coach client after a successful insert. Confirmed in Phase 1c kickoff.
- `Phase 1c` task list grows from 2 EFs to 4: `admin-read-bulk-pds`, `admin-approve-bulk-pds`, `admin-reject-bulk-pds`, `notify-bulk-pds-event` (single EF dispatching all three email templates).

### Q5 — Overlay opacity: **α=0.65 baseline; tune up to 0.8 if legibility requires; NOT a Phase 0 blocker**

Resolved during Phase 1a (Task 5 — Coach UI). A dedicated UI-tuning subagent A/B tests overlay opacity against `src/assets/GrittyFB - Coach Bulk PDS Page Background Image.png` using the BC High token palette as the canonical test case. Final α is documented inline here in §7 and in a comment block at the top of `src/components/bulk-pds/BulkPdsBackground.jsx`.

**Locked α (post Phase 1a):** **0.70** — UI-tuning analysis A/B-tested 0.65 / 0.70 / 0.75 / 0.80 against the supplied background image with the BC High maroon token. 0.65 left the bright sky and stadium highlights bleeding through the white card surfaces; 0.75–0.80 collapsed the image into a near-flat maroon page that wasted the design asset. 0.70 keeps helmet/jersey structure visible while pulling the brightness down enough that the white cards anchor cleanly against the school-token wash. Locked at the top of `src/components/bulk-pds/BulkPdsBackground.jsx` (`OVERLAY_ALPHA = 0.70`).

### Q6 — `last_bulk_pds_approved_at` on profiles: **YES, confirmed locked**

Distinct from `updated_at`. Already in the §1.2 DDL (migration 0049). Confirmed.

### Q7 — Missing-profile-row on approval: **resolve in-flight this session (orphan audit) + steady-state error**

**In-flight (this session, before Task 2):** orphan audit subagent confirms no current `hs_coach_students.student_user_id` lacks a matching `profiles.user_id`. If orphans > 0, halt and surface via AskUserQuestion.

**Steady-state (post-launch):** the approval EF must error on missing profile and leave the staging row at `approval_status='pending'` with a clear server log line. No silent skip. Per-row error does not abort sibling rows in a batch approve (per-row transaction or savepoint).

### Q8 — Retention policy: **RETAIN INDEFINITELY**

No purge cadence for approved or rejected staging rows. Revisit in later sprints.

### Decision summary table

| ID  | Decision                                                                                              | Affects                                                              |
|-----|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| Q1  | BOTH approval modes (batch + per-row)                                                                 | §3 EF contract; Admin UI components                                  |
| Q2  | Reject button enabled in v1; email coach; no profiles write; indefinite retention                     | New EF `admin-reject-bulk-pds`; reject modal in Admin UI             |
| Q3  | No staging edits — strict verify-as-submitted                                                         | No staging UPDATE policy; no admin edit UI                           |
| Q4  | Email YES via Resend; graceful degradation when `RESEND_API_KEY` absent                              | New EF `notify-bulk-pds-event`; shared `sendBulkPdsEmail.ts` helper  |
| Q5  | α=0.65 baseline, up to 0.8; tuned in Phase 1a                                                         | `BulkPdsBackground.jsx` (Phase 1a UI-tuning subagent)                |
| Q6  | Add `last_bulk_pds_approved_at` to profiles — locked                                                  | Migration 0049 (no change)                                           |
| Q7  | In-flight orphan audit pre-Task 2; steady-state EF errors on missing profile, row stays `pending`     | This session's PRE-TASK 2; approval EF error contract (Phase 1c)     |
| Q8  | Retain all staging rows indefinitely                                                                  | No purge job; no retention column on staging table                   |

---

## Task Decomposition (for `/sprint-execute` or `executing-plans`)

### Task 1: Resolve Open Questions and Lock Schema

**Files:**
- Read: this plan §7

- [ ] **Step 1: Surface Q1–Q8 to operator via AskUserQuestion**
- [ ] **Step 2: Update §7 of this plan with operator decisions**
- [ ] **Step 3: Commit plan revision**

```bash
git add docs/sprints/SPRINT_026_PLAN.md
git commit -m "sprint-026/plan: resolve open questions Q1-Q8"
```

---

### Task 2: Write Migration 0048 (bulk_pds_submissions table)

**Files:**
- Create: `supabase/migrations/0048_bulk_pds_submissions.sql`

- [ ] **Step 1: Write the failing schema check test**

```js
// tests/integration/bulk-pds/schema-0048.test.js
import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

test('bulk_pds_submissions table exists with locked column set', async () => {
  const { data, error } = await client.rpc('exec_sql', {
    sql: `SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name='bulk_pds_submissions'
          ORDER BY ordinal_position`
  });
  expect(error).toBeNull();
  const cols = data.map(r => r.column_name);
  expect(cols).toEqual(expect.arrayContaining([
    'id', 'batch_id', 'coach_user_id', 'student_user_id',
    'student_name_snapshot', 'student_email_snapshot',
    'student_grad_year_snapshot', 'student_high_school_snapshot',
    'student_avatar_storage_path_snap',
    'height', 'weight', 'speed_40',
    'time_5_10_5', 'time_l_drill', 'bench_press', 'squat', 'clean',
    'submitted_at', 'approval_status', 'approved_by', 'approved_at', 'rejection_reason',
  ]));
});
```

- [ ] **Step 2: Run test to verify FAIL** (table doesn't exist)

Run: `npx vitest run tests/integration/bulk-pds/schema-0048.test.js`
Expected: FAIL with "table public.bulk_pds_submissions does not exist"

- [ ] **Step 3: Write the migration file** — copy DDL from §1.1 verbatim into `supabase/migrations/0048_bulk_pds_submissions.sql`

- [ ] **Step 4: Apply migration** — `npm run migrate -- supabase/migrations/0048_bulk_pds_submissions.sql`

- [ ] **Step 5: Re-run test** — expect PASS

- [ ] **Step 6: Verify with MCP** — call `mcp__supabase__list_tables` filtered to `public`; confirm `bulk_pds_submissions` present with 22 columns.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0048_bulk_pds_submissions.sql tests/integration/bulk-pds/schema-0048.test.js
git commit -m "sprint-026: 0048 bulk_pds_submissions table"
```

---

### Task 3: Write Migration 0049 (profiles add 5 measurables + approval timestamp)

**Files:**
- Create: `supabase/migrations/0049_profiles_add_bulk_pds_measurables.sql`

- [ ] **Step 1: Write the failing schema test**

```js
test('profiles has 5 new measurables + last_bulk_pds_approved_at', async () => {
  const { data } = await client.rpc('exec_sql', {
    sql: `SELECT column_name, data_type FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles'
            AND column_name IN ('time_5_10_5','time_l_drill','bench_press','squat','clean','last_bulk_pds_approved_at')`
  });
  expect(data).toHaveLength(6);
  for (const c of data.filter(r => r.column_name !== 'last_bulk_pds_approved_at')) {
    expect(c.data_type).toBe('numeric');
  }
  expect(data.find(r => r.column_name === 'last_bulk_pds_approved_at').data_type).toBe('timestamp with time zone');
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Copy DDL from §1.2 into the migration file**

- [ ] **Step 4: Apply migration** — `npm run migrate -- supabase/migrations/0049_profiles_add_bulk_pds_measurables.sql`

- [ ] **Step 5: Re-run test → PASS**

- [ ] **Step 6: Verify** — `mcp__supabase__list_tables` confirms profiles now has 38 cols.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0049_profiles_add_bulk_pds_measurables.sql tests/integration/bulk-pds/schema-0049.test.js
git commit -m "sprint-026: 0049 profiles +5 measurables +last_bulk_pds_approved_at"
```

---

### Task 4: Write Migration 0050 (RLS for bulk_pds_submissions)

**Files:**
- Create: `supabase/migrations/0050_bulk_pds_submissions_rls.sql`
- Test: `tests/integration/bulk-pds/rls.test.js` (the 6 RLS scenarios from §4.2)

- [ ] **Step 1: Write 6 failing RLS contract tests** (one per scenario in §4.2)
- [ ] **Step 2: Run → FAIL** (no policies yet)
- [ ] **Step 3: Copy DDL from §1.3 into migration file**
- [ ] **Step 4: Apply migration**
- [ ] **Step 5: Re-run → all 6 PASS**
- [ ] **Step 6: Commit** with subject `sprint-026: 0050 bulk_pds_submissions RLS policies`

---

### Task 5–8: Coach UI build (Phase 1a)

Sequential within agent; parallel with admin/EF/test agents. Each card layer (background, header, identity box, dropdown, card list, single card, measurable field, submit button) gets one task with: failing component test → minimal implementation → pass → commit. Reference §2 for file paths.

### Task 9–11: Admin UI build (Phase 1b)

Tab registration in `adminTabs.js`, tab content switch in `AdminPage.jsx`, then `AdminBulkPdsTab.jsx` with fixture data, then `AdminBulkPdsCompareRow.jsx` + diff utility. Reference §3 for file paths.

### Task 12–14: Edge Functions (Phase 1c)

`admin-read-bulk-pds` (read + grouping), `admin-approve-bulk-pds` (transactional update + audit log writes), Deno tests for both, deploy via `node scripts/deploy-ef.js admin-read-bulk-pds` and `... admin-approve-bulk-pds`. Auth pattern: copy lines 60–87 of `supabase/functions/admin-read-schools/index.ts` verbatim.

### Task 15: Integration wire-up (Phase 2)

Replace Admin UI fixtures with live `adminBulkPdsClient.js` calls; verify end-to-end against deployed EFs.

### Task 16: Playwright E2E (Phase 1d → Phase 3)

Author 4 specs from §4.4; run against `npm run dev`; capture screenshots for Note 2 design lock evidence.

### Task 17: Final verification & PR

- [ ] Run `superpowers:verification-before-completion`
- [ ] Confirm all 9 acceptance items in §6 (7 goals + 2 notes)
- [ ] Update `docs/architecture/DATA_INVENTORY.md` — new `public.bulk_pds_submissions` entry + profiles column additions
- [ ] Sprint 026 retro filed by Scribe
- [ ] `[PUSH CHECK]` before merge

---

## Self-Review Notes

Spec coverage scan: all 7 goals + 2 notes mapped to §6 rows. All 14 spec field requirements (5 RO identity, 8 write, 1 hidden timestamp) mapped to PlayerUpdateCard structure in §2 and column set in §1.1. No placeholders; all DDL is literal. Type consistency: `time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean` used identically across staging table (§1.1), profiles ALTER (§1.2), card component (§2), and admin diff (§3) — single source. RLS contract in §1.3 matches Coach/Student/Admin grants stated in §1 summary table. Plan path for execution handoff is `docs/sprints/SPRINT_026_PLAN.md` per operator instruction (overrides the skill's default `docs/superpowers/plans/...` location).
