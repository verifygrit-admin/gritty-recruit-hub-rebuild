# Sprint 026 Retro — Bulk Player Data Submission (Bulk PDS)

Filed 2026-05-13 at sprint close. Covers Phase 0 (plan + schema), Phase 1 (parallel build), Phase 2 (live wire-up + deploy + verification), and close. Flat-register voice throughout — role descriptors only.

## Scope shipped

The 7 goals and 2 notes from `docs/sprints/SPRINT_026_PLAN.md` §6, each marked ✓ with the commit SHA that delivered it.

| #   | Done condition                                                                                         | Delivered by commit |
|-----|--------------------------------------------------------------------------------------------------------|---------------------|
| G1  | Functional Coach Bulk PDS page submits multi-player data to `public.bulk_pds_submissions`              | `1d7278d` (Coach UI merge) + `d1810f0` (notify wiring) |
| G2  | Page labeled "PLAYER UPDATES" in nav; route `/coach/player-updates`; internal name `bulk_pds` retained | `64d1fac` (route + nav) |
| G3  | Mobile viewport (375×768) renders single-column card stack; dropdown adds cards without reload         | `8b8cc78` (components) + scaffold in `9e70c1c` |
| G4  | Staging row has `submitted_at`; admin Verify+Update writes `last_bulk_pds_approved_at` + `approved_at` | `4323ddc` + `a7b529a` (schema) + `bb49fb3` (admin EFs) |
| G5  | Form contains title, how-to copy, RO coach box, `hs_coach_students`-scoped dropdown, dynamic card list | `8b8cc78` + `9b5e9c9` (hooks) |
| G6  | Player Update Card: 5 RO identity + 8 write fields + hidden `submitted_at`                             | `8b8cc78` (PlayerUpdateCard) |
| G7  | Migrations 0048/0049/0050 applied; live schema reflects them                                            | `4323ddc`, `a7b529a`, `b1c30f2` |
| N1  | Student `/profile` shows zero new fields                                                                | Verified absence — no Student View source changed in any Sprint 026 commit |
| N2  | `/coach/player-updates` renders background image with school-token overlay at locked α                  | `8b8cc78` (BulkPdsBackground, OVERLAY_ALPHA=0.70) |

## Schema deltas

- `public.bulk_pds_submissions` — NEW (migration 0048). 22 columns, 5 indexes, 3 FKs to `auth.users`, CHECK on `approval_status`.
- `public.profiles` — +6 columns (migration 0049): `time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean` (all numeric, nullable) and `last_bulk_pds_approved_at` (timestamptz, nullable, distinct from `updated_at`).
- RLS on `bulk_pds_submissions` — 3 policies (migration 0050): coach SELECT own / coach INSERT own + linked / admin SELECT via JWT claim. No coach UPDATE or DELETE.

## Surface area delivered

- **Coach View**: `/coach/player-updates` route + nav link; 8 components (`BulkPdsBackground`, `BulkPdsHeader`, `CoachIdentityBox`, `StudentDropdownPicker`, `PlayerUpdateCardList`, `PlayerUpdateCard`, `MeasurableField`, `SubmitBatchButton`); page shell `CoachPlayerUpdatesPage.jsx`; 3 lib helpers (`buildSubmissionRows`, `validateBulkPdsCards`, `submitBulkPdsBatch`); 2 hooks (`useCoachLinkedStudents`, `useCoachIdentity`).
- **Admin View**: `/admin/bulk-pds` tab registered in `adminTabs.js`; 7 components (`AdminBulkPdsTab`, `BatchList`, `BatchDetail`, `BatchHeader`, `CompareRow`, `StagingCard`, `ProfileCard`); shared `AdminBulkPdsRejectModal` for batch and per-row reject paths; pure diff util `diffStagingVsProfile` with TDD tests.
- **Edge Functions** (deployed Supabase project `xyudnajzhuwdauwkwsbh`, version 1): `admin-read-bulk-pds`, `admin-approve-bulk-pds`, `admin-reject-bulk-pds`, `notify-bulk-pds-event`. Shared helper `supabase/functions/_shared/sendBulkPdsEmail.ts`. Auth pattern verbatim from `admin-read-schools`.
- **Tests**: 4 Playwright E2E specs (`coach-player-updates`, `coach-player-updates-mobile`, `admin-bulk-pds-approval`, `profile-note1-lock`); 6 RLS contract scenarios (`tests/integration/bulk-pds/rls.test.js`); 23+ new unit tests (component, lib, diff util, RLS, schema).
- **Docs**: `docs/sprints/SPRINT_026_PLAN.md` (canonical plan + open questions register), `.env.example` (env schema mirrored from `grittyfb-marketing`), `docs/architecture/DATA_INVENTORY.md` (+`bulk_pds_submissions` entry, `profiles` +6 cols + new write path).

## Operator decisions (Q1–Q8)

| ID  | Decision                                                                                                      |
|-----|---------------------------------------------------------------------------------------------------------------|
| Q1  | BOTH approval modes — batch + per-row, mutually exclusive payload.                                            |
| Q2  | Reject button in v1 — email coach, no profiles write, indefinite retention.                                   |
| Q3  | No staging edits — strict verify-as-submitted.                                                                |
| Q4  | Email via Resend with graceful `EMAIL_DISABLED` no-op when `RESEND_API_KEY` absent. Sprint shipped with degradation in effect. |
| Q5  | School-token overlay α=0.70 (range 0.65–0.80 allowed; tuned inline by Coach UI worker; locked in `BulkPdsBackground.jsx`). |
| Q6  | Add `last_bulk_pds_approved_at` to `profiles`, distinct from `updated_at`.                                    |
| Q7  | In-flight orphan audit pre-Task 2 (0 orphans); steady-state EF errors on missing profile, leaves staging at `pending`. |
| Q8  | Retain approved + rejected staging rows indefinitely.                                                          |

## What worked

- **Parallel dispatch of 4 independent workers in Phase 1** returned 14 commits across 4 isolated git-worktree branches with **zero file collisions** at merge time. Pre-merge orchestrator no-collision audit (see Phase 1 T+0) held.
- **Append-only contracts** (`tests/e2e/bulk-pds/SELECTORS.md`, `src/lib/bulkPds/notificationContract.md`) authored by the orchestrator at T+0 held under concurrent authorship — only the test worker appended, in its own clearly-labeled subsection.
- **TDD-per-migration in Phase 0** surfaced the orphan audit cleanly before any production data risk. Schema apply gates (state-before, apply, state-after) caught no surprises.
- **Flat-register sprint mode held throughout** once the governance correction landed in Phase 1. Phase 2 inherited the prohibition cleanly with zero new persona refs introduced.
- **Live end-to-end exercise during close** — Step 1 obtained a real admin JWT via service-role-minted magic link, called the deployed `admin-reject-bulk-pds` EF, and saw the auth gate behave correctly. The operator's manual UI-driven rejections during pre-close QA also exercised the same EF via the P2-2 wired client, producing 7 audit log entries with admin attribution.
- **Acceptance walk** mapped 9/9 plan §6 items to delivered commits with no scope drift.

## What needed correction mid-sprint

- **Persona references** surfaced in Phase 1 worker output and required a governance correction (operator Directive 1) before Phase 2. In-scope content grep across 4 branches + master returned 1 real hit at `tests/e2e/bulk-pds/_helpers.js:5`; cleaned in commit `cbf4cd6`. Phase 2 inherited the prohibition cleanly. Future fix: include the prohibition in every Phase-1 dispatch prompt so workers do not inherit personified language from older codebase artifacts.
- **EF worker misdiagnosed Deno absence** as "harness denied permission" rather than "command not found (exit 127)". The worker did not run the actual command before reporting the blocker. Future fix: any worker claiming a sandbox/permission block must report the literal exit code and stderr before halting. Pre-Phase 2 Directive 2 ran `deno --version` from Bash and PowerShell and confirmed the real cause was that Deno was not installed; resolved with the official Windows installer.
- **EF worker had two real TypeScript bugs** (`admin-approve-bulk-pds/index.ts:187`, `notify-bulk-pds-event/index.ts:321`) — missing PostgREST error guards on Supabase response narrowing. Would have crashed on first Supabase error at runtime in production. Caught only because Deno was installed in Phase 2 and the test suite was actually executed. Fixed in commit `6a01cd3` along with a per-file `test()` helper to opt out of Deno's sanitizer for supabase-js's auth/realtime interval handles. Future fix: deploy-blocker — Deno tests must pass in CI before any EF deploy.
- **EF worker's initial Write calls landed in the main repo path** before the worktree `cwd` took effect. Mitigated by `mv` into the worktree and committing there; main repo was clean post-fix. Future fix: worktree workers should run `pwd` as their first action and refuse to write outside the resolved worktree path.
- **Test worker incorrectly claimed `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` were not declared anywhere in the repo.** They were already consumed by `tests/admin-pagination.spec.js` and `tests/admin-tab-remediation.spec.js`. Real gap was documentation, closed via `.env.example` (commit `5f3962a`). Future fix: declare-vs-document phrasing — workers should grep for actual usages before claiming a variable is absent.
- **Test worker's RLS fixture omitted `batch_id`** (NOT NULL per migration 0048). Surfaced in P2-5 live RLS run; fixed in commit `b2b18c0`. Not a policy bug — the schema correctly rejected the malformed payload. Future fix: schema-evolution awareness — when a worker writes test fixtures against a brand-new table, verify required columns against the migration before submission.

## What is deferred

- **Email notifications**: `RESEND_API_KEY` absent from Supabase Edge Function secrets. `EMAIL_DISABLED:` graceful path is active. Wiring Resend is a later-sprint concern; the lifecycle does not block on email and the EF logs each would-send recipient for traceability.
- **Playwright `bulk-pds` specs** skip without `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` in `.env`. Operator-managed. Once populated and a Vercel deploy of master lands, the four specs can run against `app.grittyfb.com`.
- **Pre-existing `collapsible-title-strip.test.js` failure** unchanged through the sprint. Confirmed unrelated to Sprint 026 by stash-pop diff. Separate triage.
- **Persona reference in `playwright.config.js:5`** ("Owner: Quin (QA Agent)") pre-existed Sprint 026 (not in any branch's diff) and is therefore out of Directive 1 scope. Flagged for future general cleanup.
- **Future enhancements** to the Bulk PDS feature surface noted by the operator at close; not scoped to Sprint 026.

## Sprint metrics

- **Phase 0**: 5 commits — plan resolutions (Q1–Q8), 3 migrations applied, contracts.
- **Phase 1**: 14 commits across 4 parallel worker branches; ~23 min wall time from launch to last completion notification.
- **Phase 2**: 6 commits, sequential.
- **Close**: 1 retro commit (this file).
- **Total**: 31 commits to `master` between `b676d9a` (pre-sprint) and the retro commit.
- **Migrations applied**: 3 (0048, 0049, 0050).
- **Edge Functions deployed**: 4 (all version 1, ACTIVE on Supabase project `xyudnajzhuwdauwkwsbh`).
- **Acceptance**: 9/9 items in plan §6 passed at code level. G3 and G4 have post-deploy execution-readiness dependencies on populated test credentials and a Vercel deploy of master — neither is an implementation gap.
- **Live end-to-end verification**: Coach submit path ✓ (operator manual QA + RLS contract tests); Admin approve path ✓ (operator manual QA); Admin reject path ✓ (operator manual QA via Admin UI + Step 1 admin-JWT auth-gate test against deployed EF).

## Files

- Plan: `docs/sprints/SPRINT_026_PLAN.md`
- Retro: `docs/sprints/SPRINT_026_RETRO.md` (this file)
- Schema migrations: `supabase/migrations/0048_bulk_pds_submissions.sql`, `0049_profiles_add_bulk_pds_measurables.sql`, `0050_bulk_pds_submissions_rls.sql`
- Coordination contracts: `src/lib/bulkPds/notificationContract.md`, `tests/e2e/bulk-pds/SELECTORS.md`
- Env schema: `.env.example`
- Data inventory delta: `docs/architecture/DATA_INVENTORY.md` (entries `public.bulk_pds_submissions` and updated `public.profiles`)
