# ERD Drift Report — Sprint 027

**Date:** 2026-05-13
**Project:** `xyudnajzhuwdauwkwsbh` (gritty-recruit-hub) — region us-east-1, Postgres 17.6
**Live source:** Supabase MCP (`list_tables` verbose + `pg_policies` + `list_migrations`) at session time
**Reference:** `docs/specs/erd/erd-current-state.md` (generated 2026-05-02 at master HEAD `413a680`)
**Scope:** 7 in-scope entities for Sprint 027 Account Updates tab + audit log table

**This document is a READ-ONLY drift report.** Per operator directive, `erd-current-state.md` is NOT edited in this sprint. Carry-forward flag for a future ERD-update sprint at the bottom of this file.

---

## 1. In-scope entity map (live confirmed)

| Toggle | Live table | PK | Live row count | RLS enabled |
|---|---|---|---|---|
| Students | `public.profiles` | `id` (uuid) | 36 | yes |
| HS Coaches | `public.users` (filter `user_type = 'hs_coach'`) | `id` (uuid) | 40 (all user_types) | yes |
| Counselors | `public.users` (filter `user_type = 'hs_guidance_counselor'`) | `id` (uuid) | 40 (all user_types) | yes |
| High Schools | `public.hs_programs` (Q2 LOCKED) | `id` (uuid) | 2 | yes |
| Colleges | `public.schools` | `unitid` (integer) | 662 | yes |
| College Coaches | `public.college_coaches` | `id` (uuid) | 0 | yes |
| Recruiting Events | `public.recruiting_events` | `id` (uuid) | 0 | yes |

Auxiliary tables consulted: `public.hs_coach_schools` (4 rows, link), `public.hs_counselor_schools` (4 rows, link), `public.partner_high_schools` (2 rows — see § 4), `public.admin_audit_log` (10 rows — see § 3).

---

## 2. Per-entity drift vs ERD

### 2.1 `public.profiles` — drift = 7 columns added since ERD

ERD (2026-05-02) documents ~25 columns. Live has **38 columns**. Columns added since ERD:

| Column | Type | Migration | Note |
|---|---|---|---|
| `cmg_message_log` | `jsonb` (NOT NULL DEFAULT `'[]'::jsonb`) | `profiles_add_cmg_message_log` (applied 2026-05-12) | Coach Mass Group message log |
| `time_5_10_5` | `numeric` (nullable) | `0049_profiles_add_bulk_pds_measurables` | Bulk PDS — 5-10-5 drill seconds |
| `time_l_drill` | `numeric` (nullable) | `0049` | Bulk PDS — L-drill seconds |
| `bench_press` | `numeric` (nullable) | `0049` | Bulk PDS — lbs |
| `squat` | `numeric` (nullable) | `0049` | Bulk PDS — lbs |
| `clean` | `numeric` (nullable) | `0049` | Bulk PDS — lbs |
| `last_bulk_pds_approved_at` | `timestamptz` (nullable) | `0049` | Distinct from `updated_at` |

**Pre-ERD columns also present** (some present at ERD generation but not enumerated in ERD body — verified live): `hudl_url`, `last_grit_fit_run_at`, `last_grit_fit_zero_match`, `avatar_storage_path`, `status`. These are not drift — they were live before 2026-05-02 — but the ERD body should have shown them.

**Sprint 027 impact:** All 7 added columns are EDITABLE for admin (none are auth-linked). The Bulk PDS columns currently have a controlled write path (admin-approve-bulk-pds EF). If the new Account Updates form lets admin edit these directly, that creates two write paths to the same fields. **Decision needed in Phase 1:** allow direct admin edit (acceptable but breaks the audit linkage to `bulk_pds_submissions`), or read-only-mark these 6 fields in the Students view despite Q4 saying "everything else is editable." Recommend: **allow direct edit** (Q4 ruling is operator-locked) and document the dual-path in Phase 1.

### 2.2 `public.users` — drift = 1 column added since ERD

ERD documents 11 columns. Live has **12 columns**.

| Column | Type | Migration | Note |
|---|---|---|---|
| `full_name` | `text` (nullable) | `0046_users_add_full_name` | Sprint 023 Option γ; backfilled for 6 of 8 known staff. 2 staff rows still NULL. |

**Sprint 027 impact:** `full_name` is the natural editable display-name field for the HS Coaches and Counselors forms. The two NULL rows (`fa8fa926-…` and `9169818d-…`) are exactly the kind of operator-backfill the Account Updates form is designed for.

### 2.3 `public.hs_programs` — no drift

Live matches ERD: 10 columns, 2 rows (BC High, Belmont Hill). No migrations since 2026-05-02 touched this table.

### 2.4 `public.schools` — no drift

Live matches ERD: 40 columns, 662 rows. ERD already includes `athletics_phone` and `athletics_email` from `0036`. No migrations since 2026-05-02 touched this table's shape.

### 2.5 `public.college_coaches` — no drift

Live matches ERD: 10 columns, 0 rows.

### 2.6 `public.recruiting_events` — no drift

Live matches ERD: 13 columns, 0 rows.

### 2.7 `public.hs_coach_schools` / `public.hs_counselor_schools` — no drift (auxiliary)

Both live tables match ERD exactly (5 cols / 4 cols, both with 4 rows). Used by HS Coaches / Counselors forms as join-to-school link.

---

## 3. `public.admin_audit_log` — schema vs Q7 spec

**Live schema (8 cols):**
- `id` uuid PK DEFAULT `gen_random_uuid()`
- `admin_email` text
- `action` text
- `table_name` text
- `row_id` text
- `old_value` jsonb (nullable)
- `new_value` jsonb (nullable)
- `created_at` timestamptz DEFAULT `now()`

**Q7 spec (7 fields, lean):** `actor`, `entity_type`, `entity_id`, `field`, `old_value`, `new_value`, `ts`

**Mapping:**
| Q7 spec | Existing column |
|---|---|
| `actor` | `admin_email` |
| `entity_type` | `table_name` |
| `entity_id` | `row_id` |
| `field` | **MISSING** |
| `old_value` | `old_value` ✓ |
| `new_value` | `new_value` ✓ |
| `ts` | `created_at` |

**Gap:** No per-field column. Q7 says "one row per field changed" — current schema can technically carry it via single-key JSONB (`{ "athletics_phone": "..." }`), but querying "what did admin X change to field F across the past 30 days" requires JSONB key extraction every time.

**Recommendation for Phase 1 (`0051` migration):**
- **Option A — extend existing table** (RECOMMENDED): `ALTER TABLE public.admin_audit_log ADD COLUMN field text;` — null for legacy rows (10 existing rows), populated by all Sprint 027 admin writes. Add index `(table_name, row_id, field, created_at DESC)`. Lean, one-table.
- **Option B — new table** `admin_account_updates_audit` per Q7 fallback. Two audit tables to maintain. Not recommended unless we want strict separation between school-edits and account-edits.

Phase 1 sign-off: which option?

---

## 4. `public.partner_high_schools` — status flag (no refactor)

**Operator question:** join table, legacy duplicate, or active?

**Live evidence:**
- 7 columns: `id`, `slug` UNIQUE, `name`, `meeting_location`, `address`, `created_at`, `timezone` DEFAULT `'America/New_York'`
- 2 rows
- **FK in:** `visit_requests.school_id → partner_high_schools.id` (live, confirmed)
- RLS: `partner_high_schools_select_anon` (anon SELECT public)
- No FK out
- Distinct dependents from `hs_programs` — `hs_programs` is the FK target for `hs_coach_schools.hs_program_id` and `hs_counselor_schools.hs_program_id`; `partner_high_schools` is the FK target for `visit_requests.school_id` (coach scheduler)

**Verdict: ACTIVE parallel registry, not legacy.**

`partner_high_schools` is the canonical partner-school record for the **coach scheduler subsystem** (Sprint 013), where college coaches request visits. `hs_programs` is the canonical partner-school record for the **HS staff identity subsystem** (Sprint 001 → present), where HS coaches and counselors are linked to schools. They share two real-world entities (BC High, Belmont Hill) but address different domains and have different consumers.

**Sprint 027 directive (Q2 LOCKED):** `hs_programs` is the authoritative table for the "High Schools" toggle. `partner_high_schools` is left untouched. **Carry-forward flag** added below.

---

## 5. `supabase_migrations` table integrity gap

The `public.supabase_migrations` tracking table has 18 entries, but the live schema reflects far more applied migrations (visible from live columns and tables). Missing tracking rows:

| Migration file | Applied to live DB? | Tracking row present? |
|---|---|---|
| `0036_schools_add_athletics_contact.sql` | YES (cols `athletics_phone`, `athletics_email` live) | NO |
| `0037_relabel_journey_steps_for_scoreboard.sql` | YES (`_pre_0037_` snapshot exists) | NO |
| `0038_add_public_recruits_select.sql` | YES (`profiles_select_public_recruits` policy live) | NO |
| `0039_coach_scheduler_tables.sql` | YES (3 tables live) | NO |
| `0040_visit_request_players.sql` | YES (table live, 5 rows) | NO |
| `0041_coach_submissions_intake_log_reframe.sql` | YES (`source` enum live) | NO |
| `0042_visit_request_deliveries.sql` | YES (table live) | YES (recorded as version `20260502213440`) |
| `0043_generalize_partner_school_select_predicate.sql` | YES (anon SELECT policy live) | YES (recorded as version `20260507191911`) |
| `0044_seed_belmont_hill_school_identity.sql` | YES | YES (recorded as version `20260507191919`) |
| `0045_athletes_public_select_authenticated_and_grad_year.sql` | YES (`grad_year >= 2026` policy live) | NO |
| `0046_users_add_full_name.sql` | YES (`full_name` col live, backfill applied) | NO |
| `0047_profiles_add_cmg_message_log.sql` | YES (col live, jsonb default `[]`) | YES (recorded as `profiles_add_cmg_message_log` at version `20260512034812`) |
| `0048_bulk_pds_submissions.sql` | YES (table live, 6 rows) | NO |
| `0049_profiles_add_bulk_pds_measurables.sql` | YES (5 cols + timestamp live) | NO |
| `0050_bulk_pds_submissions_rls.sql` | YES (3 RLS policies live on bulk_pds_submissions) | NO |

**Sprint 027 impact:** When migration `0051` is applied via `npm run migrate -- supabase/migrations/0051_*.sql`, verify the migration script writes the tracking row (per `scripts/migrate.js`). If not, `0051` will succeed silently against the live DB but the tracking table will continue to drift. **Carry-forward flag** added below.

---

## 6. Carry-forward flags (out-of-scope for Sprint 027)

These are documented for the next ERD-update sprint and the next migration-tracking sprint. Sprint 027 does not address any of them.

| ID | Flag | Owner |
|---|---|---|
| CF-027-1 | ERD doc `erd-current-state.md` last generated 2026-05-02. Sprint 027 verified live schema differs by **8 columns across 2 tables** (`profiles` +7, `users` +1) plus 1 entire new table (`bulk_pds_submissions`). ERD update discipline gate is OUT OF SCOPE for this sprint per operator directive. | Future ERD sprint |
| CF-027-2 | `public.supabase_migrations` is missing tracking rows for 12 of the last 15 applied migrations. Live DB schema is correct; the tracking table is the artifact that diverged. Investigation needed: did `scripts/migrate.js` change behavior, or were some migrations applied via Supabase Dashboard / direct SQL? | Future migration-hygiene sprint |
| CF-027-3 | `public.partner_high_schools` (coach scheduler) and `public.hs_programs` (HS staff identity) are parallel partner-school registries that share real-world entities (BC High, Belmont Hill) but live in separate subsystems. Consolidation is a structural decision, not a Sprint 027 task. | Future structural sprint |
| CF-027-4 | `public.users` has 2 rows with NULL `full_name` (`fa8fa926-00f0-4325-b913-5e78be2b4c4a`, `9169818d-744f-411f-bf11-4bc13e13d0cb`). Sprint 027 Account Updates form is the natural backfill mechanism — operator should backfill these via the new HS Coaches form during initial post-deploy use. | Sprint 027 post-deploy operator action |

---

**Closing line:** ERD doc `erd-current-state.md` last generated 2026-05-02. Sprint 027 verified live schema differs by 8 columns across 2 tables plus 1 entire new staging table. ERD update discipline gate is OUT OF SCOPE for this sprint per operator directive — flag carries forward (CF-027-1).
