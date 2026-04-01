# GrittyOS — Current State ERD

**Source of truth: supabase/migrations/**
**Last corrected: 2026-03-31 per David+Patch audit.**
**ERD is a representative view — not all columns shown.**
**Do not use as column reference for new code. Use migration files as authoritative column reference.**

---

Generated: March 31, 2026 | Version: v0.3.1 | Status: Post-audit (corrected per David + Patch fidelity confirmation)

---

## schools

| Column | Type | Notes |
|--------|------|-------|
| unitid | int | PK — root reference, no FKs out |
| school_name | text |  |
| type | text | FLAG F-05: referenced as tier in code |
| athletics_url | text |  |
| prospect_camp_link | text | Exists — mostly null. Will be populated by data enhancement. |
| coach_link | text | Exists — mostly null. Will be populated by data enhancement. |
| admissions_rate | numeric | FLAG F-04: scoring code reads admission_rate (no s) |
| adltv | numeric |  |
| adltv_rank | int |  |

---

## profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users(id) CASCADE, UNIQUE |
| name | text | Single column — consolidated from first_name / last_name |
| position | text |  |
| gpa | numeric |  |
| sat | int | Consolidated from sat_score |
| grad_year | int |  |
| parent_guardian_email | text | FLAG F-06: readable by coaches via RLS — no column exclusion |
| hs_lat | numeric | High school latitude — renamed from lat |
| hs_lng | numeric | High school longitude — renamed from lng |

---

## short_list_items

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | PK identity |
| user_id | uuid | FK → auth.users(id) CASCADE |
| unitid | int | FLAG F-01: soft join — no FK to schools |
| coach_contact | jsonb | FLAG F-07: no enforced schema contract |
| recruiting_journey_steps | jsonb | FLAG F-08: no enforced schema contract |
| grit_fit_labels | text[] |  |

---

## hs_coach_students

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | PK — GENERATED ALWAYS AS IDENTITY |
| coach_user_id | uuid | FK → auth.users(id) |
| student_user_id | uuid | FK → auth.users(id). UNIQUE pair with coach_user_id. |
| confirmed_at | timestamptz | When coach-student link was confirmed |

---

## hs_counselor_students

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | PK — GENERATED ALWAYS AS IDENTITY |
| counselor_user_id | uuid | FK → auth.users(id) |
| student_user_id | uuid | FK → auth.users(id). UNIQUE pair with counselor_user_id. |
| linked_at | timestamptz | When counselor-student link was created |

---

## hs_coach_schools

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | PK — GENERATED ALWAYS AS IDENTITY |
| coach_user_id | uuid | FK → auth.users(id) |
| hs_program_id | uuid | FK → hs_programs(id) |
| is_head_coach | boolean |  |
| linked_at | timestamptz | When coach-school link was created |

---

## hs_counselor_schools

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | PK — GENERATED ALWAYS AS IDENTITY |
| counselor_user_id | uuid | FK → auth.users(id) |
| hs_program_id | uuid | FK → hs_programs(id) |
| linked_at | timestamptz | When counselor-school link was created |

---

## hs_programs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_name | text |  |
| state | text |  |
| conference | text |  |
| division | text |  |

---

## public_users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users(id) |
| user_type | text | 6-role enum |
| account_status | text |  |
| payment_status | text |  |

---

## document_shares

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| library_doc_id | uuid | FK → document_library(id) |
| unitid | int | FLAG F-02: soft join — no FK to schools |

---

## file_uploads

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users(id) |
| unitid | int | FLAG F-03: soft join — no FK to schools |

---

## college_coaches — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, external-facing, UUID per DEC-CFBRB-064 |
| unitid | int | FLAG F-09: FK → schools(unitid) — REQUIRED. Table does not exist yet. |
| name | text |  |
| title | text |  |
| email | text |  |
| photo_url | text |  |
| twitter_handle | text |  |
| is_head_coach | boolean | default false |
| profile_url | text |  |
| created_at | timestamptz | DEFAULT now() |

---

## recruiting_events — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, external-facing, UUID per DEC-CFBRB-064 |
| unitid | int | FLAG F-10: FK → schools(unitid) — REQUIRED. Table does not exist yet. |
| event_type | text | camp \| junior_day \| official_visit \| unofficial_visit |
| event_name | text |  |
| event_date | date |  |
| registration_deadline | date |  |
| cost_dollars | numeric |  |
| registration_url | text |  |
| status | text | confirmed \| registration_open \| completed \| cancelled |
| created_at | timestamptz | DEFAULT now() |

---

## student_recruiting_events — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, gcal sync, UUID per DEC-CFBRB-064 |
| profile_id | uuid | FLAG F-11: FK → profiles(id) — REQUIRED. Table does not exist yet. |
| event_id | uuid | FK → recruiting_events(id) |
| status | text | recommended_by_coach \| registered \| on_calendar \| attended |
| gcal_event_id | text | For Google Calendar sync |
| confirmed_by | text | student \| parent \| hs_coach |
| confirmed_at | timestamptz |  |
| notes | text | nullable |
| created_at | timestamptz | DEFAULT now() |

Constraint: UNIQUE(profile_id, event_id)

---

## school_link_staging — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK — auto-increment staging record identifier |
| source_tab | text | required — D1-FBS \| D1-FCS \| D2 \| D3 |
| source_run | text | required — import run identifier (e.g. 2026-03-31) |
| data_type | text | required — camp_link \| coach_link \| future types |
| row_index | int | nullable — row position in source tab |
| school_name_raw | text | required — name as received from Google Sheet |
| athletics_url_raw | text | nullable — athletics URL from source |
| camp_url | text | nullable — camp URL from source |
| coach_url | text | nullable — coach page URL from source |
| matched_unitid | int | nullable — best-match unitid (no FK, staging allows unresolved rows) |
| match_confidence | numeric | nullable — 0.0-1.0 confidence score |
| match_status | text | required — CHECK (match_status IN ('pending', 'auto_confirmed', 'manually_confirmed', 'unresolved')) |
| match_method | text | nullable — how the match was determined (name_fuzzy \| domain \| manual) |
| reviewed_by | text | nullable — who confirmed the match |
| reviewed_at | timestamptz | nullable — when confirmed |
| created_at | timestamptz | DEFAULT now() |

---

## college_coaches — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, external-facing, UUID per DEC-CFBRB-064 |
| unitid | int | FLAG F-09: FK → schools(unitid) — REQUIRED. Table does not exist yet. |
| name | text |  |
| title | text |  |
| email | text |  |
| photo_url | text |  |
| twitter_handle | text |  |
| is_head_coach | boolean | default false |
| profile_url | text |  |
| created_at | timestamptz | DEFAULT now() |

---

## recruiting_events — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, external-facing, UUID per DEC-CFBRB-064 |
| unitid | int | FLAG F-10: FK → schools(unitid) — REQUIRED. Table does not exist yet. |
| event_type | text | camp \| junior_day \| official_visit \| unofficial_visit |
| event_name | text |  |
| event_date | date |  |
| registration_deadline | date |  |
| cost_dollars | numeric |  |
| registration_url | text |  |
| status | text | confirmed \| registration_open \| completed \| cancelled. CHECK (status IN ('confirmed', 'registration_open', 'completed', 'cancelled')) |
| created_at | timestamptz | DEFAULT now() |

---

## student_recruiting_events — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — entity table, gcal sync, UUID per DEC-CFBRB-064 |
| profile_id | uuid | FLAG F-11: FK → profiles(id) — REQUIRED. Table does not exist yet. |
| event_id | uuid | FK → recruiting_events(id) |
| status | text | recommended_by_coach \| registered \| on_calendar \| attended. CHECK (status IN ('recommended_by_coach', 'registered', 'on_calendar', 'attended')) |
| gcal_event_id | text | For Google Calendar sync |
| confirmed_by | text | student \| parent \| hs_coach. CHECK (confirmed_by IN ('student', 'parent', 'hs_coach')) |
| confirmed_at | timestamptz |  |
| notes | text | nullable |
| created_at | timestamptz | DEFAULT now() |

Constraint: UNIQUE(profile_id, event_id)

---

## coach_contacts — MISSING

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK — UUID per DEC-CFBRB-064 |
| profile_id | uuid | FK → profiles(id) |
| unitid | int | FK → schools(unitid) |
| coach_id | uuid | FK → college_coaches(id), nullable |
| contact_date | date | required |
| contact_type | text | email \| call \| text \| in_person \| dm \| camp. CHECK (contact_type IN ('email', 'call', 'text', 'in_person', 'dm', 'camp')) |
| initiated_by | text | student \| parent \| hs_coach \| college_coach. CHECK (initiated_by IN ('student', 'parent', 'hs_coach', 'college_coach')) |
| short_list_step | int | 1-15, nullable |
| notes | text | nullable |
| created_at | timestamptz | DEFAULT now() |

C-2 OPEN: This table supports the F-16 unitid completeness workflow. All matched_unitids must be confirmed to match_status 'auto_confirmed' or 'manually_confirmed' in school_link_staging before production inserts run against coach_contacts or recruiting_events.
