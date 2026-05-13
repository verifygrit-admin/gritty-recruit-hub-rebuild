# Column Whitelists per Entity — Sprint 027

**Date:** 2026-05-13
**Source:** Inverse of `READ_ONLY_FIELDS.md` (Q4 ruling) — every editable column listed here.
**Consumer:** Phase 2 EF source (`admin-update-account/index.ts`, `admin-create-account/index.ts`) — copy these arrays verbatim into the EF column whitelist constants.

This file is the **security boundary definition** for Sprint 027 admin writes. Any column NOT in the entity's UPDATE whitelist returns 400 from `admin-update-account`. Any column NOT in the CREATE whitelist returns 400 from `admin-create-account`. Pattern follows `supabase/functions/admin-update-school/index.ts:56` (existing `ALLOWED_COLUMNS` precedent).

---

## How to read this file

Each entity has up to three lists:
- **UPDATE whitelist** — accepted in `admin-update-account` PUT body diff
- **CREATE whitelist** — accepted in `admin-create-account` POST body row (only for the 3 create-enabled entities)
- **CREATE required** — subset of CREATE whitelist that must be NOT NULL in the request

Field types match live schema (Phase 0 verified).

---

## 1. Students (`profiles`)

**Entity key:** `students`
**UPDATE only.** No CREATE / DELETE per Q5.

```ts
export const STUDENTS_UPDATE_WHITELIST = [
  // Identity
  'name',
  'phone',
  'twitter',
  'parent_guardian_email',
  // High school
  'high_school',
  'grad_year',
  'state',
  'hs_lat',
  'hs_lng',
  // Athletic measurables
  'position',
  'height',
  'weight',
  'speed_40',
  'gpa',
  'sat',
  // Bulk PDS measurables — DUAL-WRITE FLAG (UI shows: "Direct edit bypasses bulk PDS audit chain.")
  'time_5_10_5',
  'time_l_drill',
  'bench_press',
  'squat',
  'clean',
  // Badges
  'expected_starter',
  'captain',
  'all_conference',
  'all_state',
  // Financial
  'agi',
  'dependents',
  // Status / media
  'status',
  'hudl_url',
  'avatar_storage_path',
] as const;
```
28 columns.

---

## 2. HS Coaches (`users` filtered + `hs_coach_schools` link)

**Entity key:** `hs_coaches`
**UPDATE only** for the row. **Link table edits flow through a separate path within the same EF transaction** (see EF contract).

```ts
export const HS_COACHES_UPDATE_WHITELIST_USERS = [
  'account_status',
  'email_verified',
  'activated_by',
  'activated_at',
  'payment_status',
  'trial_started_at',
  'full_name',
] as const;

export const HS_COACHES_UPDATE_WHITELIST_LINK = [
  'is_head_coach',
  'hs_program_id',
] as const;
```
6 + 2 columns.

The EF accepts a payload of the shape:
```json
{
  "entity": "hs_coaches",
  "batch": [
    {
      "row_id": "<users.id>",
      "diff": {
        "users": { "full_name": "...", "account_status": "..." },
        "hs_coach_schools": { "is_head_coach": true, "hs_program_id": "<uuid>" }
      },
      "updated_at_check": "..."
    }
  ]
}
```

---

## 3. Counselors (`users` filtered + `hs_counselor_schools` link)

**Entity key:** `counselors`
Same shape as HS Coaches; link table has only `hs_program_id` (no `is_head_coach`).

```ts
export const COUNSELORS_UPDATE_WHITELIST_USERS = [
  'account_status',
  'email_verified',
  'activated_by',
  'activated_at',
  'payment_status',
  'trial_started_at',
  'full_name',
] as const;

export const COUNSELORS_UPDATE_WHITELIST_LINK = [
  'hs_program_id',
] as const;
```
6 + 1 columns.

---

## 4. High Schools (`hs_programs`)

**Entity key:** `high_schools`
**UPDATE only.** No CREATE / DELETE per Q5.

```ts
export const HIGH_SCHOOLS_UPDATE_WHITELIST = [
  'school_name',
  'address',
  'city',
  'state',
  'zip',
  'conference',
  'division',
  'state_athletic_association',
] as const;
```
8 columns.

---

## 5. Colleges (`schools`)

**Entity key:** `colleges`
**UPDATE only.** No CREATE / DELETE per Q5 (existing `schools_deny_insert` and `schools_deny_delete` policies are preserved).

**Boundary note:** The existing `admin-update-school` EF (Sprint 016) has a 3-column whitelist (`coach_link`, `prospect_camp_link`, `recruiting_q_link`). Per Phase 1 Issue 4 decision, Sprint 027 routes Colleges writes through the new `admin-update-account` EF with the full 38-col whitelist. `admin-update-school` remains unchanged as a narrow legacy path.

```ts
export const COLLEGES_UPDATE_WHITELIST = [
  // Identity
  'school_name',
  'state',
  'city',
  'control',
  'school_type',
  'type',
  'ncaa_division',
  'conference',
  'latitude',
  'longitude',
  // Cost / aid
  'coa_out_of_state',
  'est_avg_merit',
  'avg_merit_award',
  'share_stu_any_aid',
  'share_stu_need_aid',
  'need_blind_school',
  'dltv',
  'adltv',
  'adltv_rank',
  'admissions_rate',
  // Academic rigor (with-test)
  'acad_rigor_senior',
  'acad_rigor_junior',
  'acad_rigor_soph',
  'acad_rigor_freshman',
  // Academic rigor (test-optional)
  'acad_rigor_test_opt_senior',
  'acad_rigor_test_opt_junior',
  'acad_rigor_test_opt_soph',
  'acad_rigor_test_opt_freshman',
  // Academic flags / metrics
  'is_test_optional',
  'graduation_rate',
  'avg_gpa',
  'avg_sat',
  // Recruiting links (overlap with admin-update-school whitelist — both EFs may write these)
  'recruiting_q_link',
  'coach_link',
  'prospect_camp_link',
  'field_level_questionnaire',
  // Athletics contact
  'athletics_phone',
  'athletics_email',
] as const;
```
38 columns.

---

## 6. College Coaches (`college_coaches`)

**Entity key:** `college_coaches`
**CREATE / UPDATE / DELETE** all enabled per Q5.

```ts
export const COLLEGE_COACHES_UPDATE_WHITELIST = [
  'unitid',
  'name',
  'title',
  'email',
  'photo_url',
  'twitter_handle',
  'is_head_coach',
  'profile_url',
] as const;

export const COLLEGE_COACHES_CREATE_WHITELIST = COLLEGE_COACHES_UPDATE_WHITELIST;

export const COLLEGE_COACHES_CREATE_REQUIRED = [
  'unitid', // FK → schools.unitid
  'name',   // NOT NULL
] as const;
```
8 columns. CREATE accepts the same set; only `unitid` and `name` required.

**Soft-delete column:** Phase 1 decision — add `deleted_at timestamptz` to `college_coaches` in `0052` migration (Phase 2 task) to support soft delete. Read EF filters `WHERE deleted_at IS NULL`. NOT included in `0051`.

---

## 7. Recruiting Events (`recruiting_events`)

**Entity key:** `recruiting_events`
**CREATE / UPDATE / DELETE** all enabled per Q5.

```ts
export const RECRUITING_EVENTS_UPDATE_WHITELIST = [
  'unitid',
  'event_type',     // CHECK: camp | junior_day | official_visit | unofficial_visit
  'event_name',
  'event_date',
  'end_date',
  'registration_deadline',
  'location',
  'cost_dollars',
  'registration_url',
  'status',         // CHECK: confirmed | registration_open | completed | cancelled
  'description',
] as const;

export const RECRUITING_EVENTS_CREATE_WHITELIST = RECRUITING_EVENTS_UPDATE_WHITELIST;

export const RECRUITING_EVENTS_CREATE_REQUIRED = [
  'unitid',     // FK → schools.unitid
  'event_date', // NOT NULL
] as const;
```
11 columns. CREATE accepts the same set; only `unitid` and `event_date` required.

**Soft-delete column:** Same as College Coaches — add `deleted_at` in `0052` (Phase 2).

---

## Master entity registry (for the EF dispatcher)

The `admin-update-account`, `admin-create-account`, and `admin-delete-account` EFs read the entity key from the request body and dispatch by entity. Full registry:

```ts
export const ENTITY_REGISTRY = {
  students: {
    table: 'profiles',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: STUDENTS_UPDATE_WHITELIST,
    create_enabled: false,
    delete_enabled: false,
    has_link_table: false,
    audit_table_name: 'profiles',
  },
  hs_coaches: {
    table: 'users',
    pk: 'id',
    pk_type: 'uuid',
    user_type_filter: 'hs_coach',
    update_whitelist_users: HS_COACHES_UPDATE_WHITELIST_USERS,
    update_whitelist_link: HS_COACHES_UPDATE_WHITELIST_LINK,
    link_table: 'hs_coach_schools',
    link_fk_to_user: 'coach_user_id', // hs_coach_schools.coach_user_id = users.user_id
    create_enabled: false,
    delete_enabled: false,
    has_link_table: true,
    audit_table_name: 'users', // link writes audit-log under 'hs_coach_schools'
  },
  counselors: {
    table: 'users',
    pk: 'id',
    pk_type: 'uuid',
    user_type_filter: 'hs_guidance_counselor',
    update_whitelist_users: COUNSELORS_UPDATE_WHITELIST_USERS,
    update_whitelist_link: COUNSELORS_UPDATE_WHITELIST_LINK,
    link_table: 'hs_counselor_schools',
    link_fk_to_user: 'counselor_user_id',
    create_enabled: false,
    delete_enabled: false,
    has_link_table: true,
    audit_table_name: 'users',
  },
  high_schools: {
    table: 'hs_programs',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: HIGH_SCHOOLS_UPDATE_WHITELIST,
    create_enabled: false,
    delete_enabled: false,
    has_link_table: false,
    audit_table_name: 'hs_programs',
  },
  colleges: {
    table: 'schools',
    pk: 'unitid',
    pk_type: 'integer',
    update_whitelist: COLLEGES_UPDATE_WHITELIST,
    create_enabled: false, // schools_deny_insert preserved
    delete_enabled: false, // schools_deny_delete preserved
    has_link_table: false,
    audit_table_name: 'schools',
  },
  college_coaches: {
    table: 'college_coaches',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: COLLEGE_COACHES_UPDATE_WHITELIST,
    create_whitelist: COLLEGE_COACHES_CREATE_WHITELIST,
    create_required: COLLEGE_COACHES_CREATE_REQUIRED,
    create_enabled: true,
    delete_enabled: true, // soft delete via deleted_at
    has_link_table: false,
    audit_table_name: 'college_coaches',
  },
  recruiting_events: {
    table: 'recruiting_events',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: RECRUITING_EVENTS_UPDATE_WHITELIST,
    create_whitelist: RECRUITING_EVENTS_CREATE_WHITELIST,
    create_required: RECRUITING_EVENTS_CREATE_REQUIRED,
    create_enabled: true,
    delete_enabled: true, // soft delete via deleted_at
    has_link_table: false,
    audit_table_name: 'recruiting_events',
  },
} as const;

export type EntityKey = keyof typeof ENTITY_REGISTRY;
```

---

## Cross-cutting

| Entity | UPDATE cols | CREATE cols | CREATE required | Link table | Create/Delete |
|---|---|---|---|---|---|
| students | 28 | — | — | — | — |
| hs_coaches | 6+2 | — | — | hs_coach_schools | — |
| counselors | 6+1 | — | — | hs_counselor_schools | — |
| high_schools | 8 | — | — | — | — |
| colleges | 38 | — | — | — | — |
| college_coaches | 8 | 8 | 2 | — | enabled |
| recruiting_events | 11 | 11 | 2 | — | enabled |

**Total UPDATE editable surface:** 110 columns across 7 forms. Matches `READ_ONLY_FIELDS.md` § Cross-entity summary.
