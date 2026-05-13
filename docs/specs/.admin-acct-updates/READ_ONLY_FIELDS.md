# Read-Only Fields per Entity — Sprint 027

**Date:** 2026-05-13
**Source:** Q4 ruling (operator-locked) + live schema (`erd-drift-sprint027.md`)
**Q4 rule:** Across all 7 entities, READ_ONLY = `id` (PK), `uuid` columns, `user_id`, auth-linked email, password / auth hash. **Everything else is editable for admin.**

This file is the canonical input to Phase 1 column whitelist construction. Phase 1 EFs enforce these read-only fields as the security boundary; the UI mirrors them as disabled inputs.

---

## Conventions

- **READ_ONLY** = field is present in the form but disabled / not in the EF column whitelist
- **EDITABLE** = field is in the EF column whitelist
- **EXCLUDED** = field is not surfaced in the form at all (e.g., system-only fields like `created_at` for create-enabled entities, or denormalized cache columns)
- Auth-linked = field is FK to `auth.users.id`, OR is the canonical account email, OR is a password / auth hash

A column being NULL on some rows does not change its read-only status.

---

## 1. Students (`public.profiles`) — 38 cols live

**PK:** `id` (uuid)

### READ_ONLY (5 fields — auth-linked per Q4)
- `id` — PK (uuid)
- `user_id` — FK → `auth.users.id` (uuid)
- `email` — account email, NOT NULL on this table

(Note: `auth.users.encrypted_password` is in the auth schema, not this table — not surfaced in the form at all.)

### EDITABLE (28 fields)

Identity:
- `name` (NOT NULL)
- `phone`
- `twitter`
- `parent_guardian_email`

High school:
- `high_school`
- `grad_year`
- `state`
- `hs_lat`
- `hs_lng`

Athletic measurables:
- `position`
- `height` (text — `"6-2"` format)
- `weight`
- `speed_40`
- `gpa`
- `sat`
- `time_5_10_5` (Bulk PDS — flagged dual-write, see Phase 0 drift report § 2.1)
- `time_l_drill` (Bulk PDS — flagged dual-write)
- `bench_press` (Bulk PDS — flagged dual-write)
- `squat` (Bulk PDS — flagged dual-write)
- `clean` (Bulk PDS — flagged dual-write)

Badges:
- `expected_starter` (bool)
- `captain` (bool)
- `all_conference` (bool)
- `all_state` (bool)

Financial:
- `agi`
- `dependents`

Status / media:
- `status`
- `hudl_url`
- `avatar_storage_path`

### EXCLUDED (5 fields — system / cache)
- `created_at`
- `updated_at` (used for 409 conflict check, not user-edited; surfaced as a hidden field in payload)
- `last_grit_fit_run_at` (cache — written by GRIT FIT scorer)
- `last_grit_fit_zero_match` (cache — written by GRIT FIT scorer)
- `last_bulk_pds_approved_at` (cache — written by Bulk PDS approve EF)
- `cmg_message_log` (jsonb message log — operational, not for direct edit)

---

## 2. HS Coaches (`public.users` WHERE `user_type='hs_coach'`) — 12 cols live

**PK:** `id` (uuid). Filtered view; the table holds all user_types but the form filters to `hs_coach`.

### READ_ONLY (3 fields — auth-linked per Q4)
- `id` — PK (uuid)
- `user_id` — FK → `auth.users.id` (uuid)
- `user_type` — privilege column; locked here because changing it cross-routes the account between toggles

(Note: account email lives in `auth.users.email`, not in this table. The form should display it READ_ONLY via the read EF joining `auth.users`. Password lives in `auth.users.encrypted_password` — never surfaced.)

### EDITABLE (6 fields)
- `account_status` (`active | paused | pending`) — privilege-relevant, but spec goal 1 says only `id/user_id/email/password` are RO; account_status is admin-editable
- `email_verified` (bool) — admin can flip
- `activated_by` (uuid) — admin can set
- `activated_at` (timestamptz)
- `payment_status` (`free | trial | paid | expired`)
- `trial_started_at` (timestamptz)
- `full_name` (text — Sprint 023 backfill column; 2 NULL rows for HS coach UUIDs `fa8fa926-…` and `9169818d-…` — see CF-027-4)

### EDITABLE (auxiliary join — `public.hs_coach_schools`)

The HS Coaches form should also expose the school link for editing:
- `hs_coach_schools.is_head_coach` (bool) — head coach designation
- `hs_coach_schools.hs_program_id` (uuid → `hs_programs.id`) — which HS this coach is at

These are link-table edits, not direct `users` edits. Phase 1 must decide whether to surface them inline in the same form (one EF call updates `users` + `hs_coach_schools` in a transaction) or in a separate sub-panel.

### EXCLUDED (3 fields)
- `created_at`
- `last_login` (cache — written by auth events)
- `auth.users.email` / `auth.users.encrypted_password` — surfaced as RO display only via read EF; not in the form's editable column set

---

## 3. Counselors (`public.users` WHERE `user_type='hs_guidance_counselor'`) — 12 cols live

**PK:** `id` (uuid). Same shape as HS Coaches; only the `user_type` filter differs.

### READ_ONLY (3 fields)
Same as HS Coaches: `id`, `user_id`, `user_type`.

### EDITABLE (6 fields)
Same as HS Coaches: `account_status`, `email_verified`, `activated_by`, `activated_at`, `payment_status`, `trial_started_at`, `full_name`.

### EDITABLE (auxiliary join — `public.hs_counselor_schools`)
- `hs_counselor_schools.hs_program_id` (uuid → `hs_programs.id`)

(Note: counselor link table has no `is_head_coach` analog.)

### EXCLUDED (3 fields)
Same as HS Coaches: `created_at`, `last_login`, plus auth.users fields.

---

## 4. High Schools (`public.hs_programs`) — 10 cols live (Q2 LOCKED)

**PK:** `id` (uuid). No auth-linked fields — `hs_programs` is a structural record.

### READ_ONLY (1 field — PK only per Q4)
- `id` — PK (uuid)

### EDITABLE (8 fields)
- `school_name` (NOT NULL)
- `address`
- `city`
- `state` (NOT NULL)
- `zip`
- `conference`
- `division`
- `state_athletic_association`

### EXCLUDED (1 field)
- `created_at` (system)

---

## 5. Colleges (`public.schools`) — 40 cols live

**PK:** `unitid` (integer — IPEDS identifier). No auth-linked fields.

### READ_ONLY (1 field — PK only per Q4)
- `unitid` — PK (integer)

### EDITABLE (38 fields)

Identity:
- `school_name` (NOT NULL)
- `state`, `city`, `control`, `school_type`, `type`, `ncaa_division`, `conference`
- `latitude`, `longitude`

Cost / aid:
- `coa_out_of_state`, `est_avg_merit`, `avg_merit_award`, `share_stu_any_aid`, `share_stu_need_aid`, `need_blind_school`, `dltv`, `adltv`, `adltv_rank`, `admissions_rate`

Academic rigor:
- `acad_rigor_senior`, `acad_rigor_junior`, `acad_rigor_soph`, `acad_rigor_freshman`
- `acad_rigor_test_opt_senior`, `acad_rigor_test_opt_junior`, `acad_rigor_test_opt_soph`, `acad_rigor_test_opt_freshman`
- `is_test_optional`, `graduation_rate`, `avg_gpa`, `avg_sat`

Recruiting links:
- `recruiting_q_link`, `coach_link`, `prospect_camp_link`, `field_level_questionnaire`

Athletics contact:
- `athletics_phone`, `athletics_email`

### EXCLUDED (1 field)
- `last_updated` (system — written by `admin-update-school` EF)

**Sprint 027 note:** Schools is create/delete-DISABLED per Q5 (it's not in the create-enabled trio). The existing `admin-update-school` EF whitelist (only 3 cols: `coach_link`, `prospect_camp_link`, `recruiting_q_link`) is intentionally narrower than Q4's "everything else editable." Sprint 027 either (a) widens the EF whitelist for `schools` writes routed through `admin-update-account`, OR (b) leaves `admin-update-school` untouched and routes Sprint 027 Colleges writes through the new EF with the wider whitelist. Phase 1 decides.

---

## 6. College Coaches (`public.college_coaches`) — 10 cols live, 0 rows

**PK:** `id` (uuid). No auth-linked fields. Create/delete-ENABLED per Q5.

### READ_ONLY (1 field)
- `id` — PK (uuid, auto-generated)

### EDITABLE (8 fields)
- `unitid` (NOT NULL → FK `schools.unitid` — admin must pick valid school)
- `name` (NOT NULL)
- `title`
- `email`
- `photo_url`
- `twitter_handle`
- `is_head_coach` (bool, NOT NULL DEFAULT false)
- `profile_url`

### EXCLUDED (1 field)
- `created_at` (system)

**Create form required fields:** `unitid`, `name`. All others optional.

---

## 7. Recruiting Events (`public.recruiting_events`) — 13 cols live, 0 rows

**PK:** `id` (uuid). No auth-linked fields. Create/delete-ENABLED per Q5.

### READ_ONLY (1 field)
- `id` — PK (uuid, auto-generated)

### EDITABLE (11 fields)
- `unitid` (NOT NULL → FK `schools.unitid`)
- `event_type` (CHECK: `camp | junior_day | official_visit | unofficial_visit`)
- `event_name`
- `event_date` (date, NOT NULL)
- `end_date` (date, multi-day support)
- `registration_deadline` (date)
- `location`
- `cost_dollars` (numeric)
- `registration_url`
- `status` (CHECK: `confirmed | registration_open | completed | cancelled`)
- `description`

### EXCLUDED (1 field)
- `created_at` (system)

**Create form required fields:** `unitid`, `event_date`. All others optional.

---

## Cross-entity summary

| Entity | Editable count | Read-only count | Excluded count |
|---|---|---|---|
| Students | 28 (incl. 5 Bulk PDS — flagged dual-write) | 3 | 6 |
| HS Coaches | 6 + 2 link-table | 3 | 3 |
| Counselors | 6 + 1 link-table | 3 | 3 |
| High Schools | 8 | 1 | 1 |
| Colleges | 38 | 1 | 1 |
| College Coaches | 8 | 1 | 1 |
| Recruiting Events | 11 | 1 | 1 |

**Total editable surface: 110 fields across 7 forms.**

---

## Phase 1 hooks

1. The EF column whitelist per entity comes directly from this file. A typed config object (per Plan §1.7) reads from this list at build time — do NOT hand-copy strings into the EF source (drift risk).
2. The 5 Bulk PDS measurables under Students need a Phase 1 decision on dual-write semantics (this file lists them as EDITABLE per Q4, but flags the write-path collision with `admin-approve-bulk-pds`).
3. The HS Coaches and Counselors forms touch two tables (`users` + the appropriate link table). Phase 1 decides single-form-multi-table vs sub-panels.
4. The Colleges form needs a Phase 1 decision on `admin-update-school` EF coexistence (existing whitelist is 3 cols; Sprint 027 needs 38).
