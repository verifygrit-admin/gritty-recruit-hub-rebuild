# ERD Flag Register

| ID | Type | Table.Column | Risk | Status | Action |
|----|----|---|------|--------|--------|
| F-01 | SOFT-JOIN | short_list_items.unitid | Medium | Open | No FK to schools. Orphan risk if school deleted. Acceptable MVP — harden post-v1. |
| F-02 | SOFT-JOIN | document_shares.unitid | Medium | Open | No FK to schools. Same orphan risk as F-01. |
| F-03 | SOFT-JOIN | file_uploads.unitid | Medium | Open | No FK to schools. Same orphan risk as F-01. |
| F-04 | COL-NAME | schools.admissions_rate | High | Likely resolved | Scoring code reads admission_rate (no s). David to confirm authoritative column name against live DB. |
| F-05 | COL-NAME | schools.type | Medium | CLOSED | Resolved: schools.type is authoritative. Tier vocabulary in constants only. No rename needed. |
| F-06 | RLS | profiles.parent_guardian_email | Medium | Open | Readable by coaches via current RLS with no column exclusion. Policy decision required before parent accounts go live. |
| F-07 | JSONB | short_list_items.coach_contact | High | Open | No enforced schema contract. Quill to write contract doc before any UI reads or writes this field. |
| F-08 | JSONB | short_list_items.recruiting_journey_steps | High | Open | No enforced schema contract. Same requirement as F-07. |
| F-09 | MISSING | college_coaches (table) | Blocking | Not created | Must be named college_coaches — never coaches — to distinguish from HS coaching roles. FK to schools.unitid required. Patch to write migration before data enhancement begins. Migration 0029. |
| F-10 | MISSING | recruiting_events (table) | Blocking | Not created | FK to schools.unitid required. Patch to write migration before data enhancement begins. Migration 0030. |
| F-11 | MISSING | student_recruiting_events (table) | Blocking | Not created | Junction between profiles and recruiting_events. FK to both. Patch to write migration before data enhancement begins. Migration 0031. |
| F-12 | CLEAN | scripts/migrate.js | None | Resolved | npm run migrate operational via Supabase Management API (HTTPS port 443). Comcast port 5432 block bypassed. |
| F-13 | CLEAN | 0027 rls policies | None | Resolved | Confirmed applied and committed. Matches live DB. |
| F-14 | CLEAN | scripts/import_shortlist_bc_high.py + repair_shortlist_fields.py | None | Resolved | Hardcoded service role keys removed. Both use dotenv with ValueError guard. |
| F-15 | MISSING | coach_contacts (table) | Blocking | Not created | Junction table for student-college coach contact tracking. FK to profiles, schools, and college_coaches. Migration 0032 — after college_coaches (0029) exists. Named coach_contacts always. |
| F-16 | DATA-INTEGRITY | schools.unitid completeness | High | Open | Schools table may not contain all active NCAA football programs. Joint-institution programs and new membership programs require manual unitid resolution before coach_contacts and recruiting_events receive production data. Staging review required. |
| F-17 | MISSING | school_link_staging (table) | High | Open | Staging table for unitid resolution workflow. Candidate school names are matched to schools.unitid here before production data enters coach_contacts or recruiting_events. Supports F-16 resolution. Migration 0028. |
| F-18 | SPEC-FIDELITY | school_link_staging RLS | Low | Backlog | RLS enabled in migration 0028 but spec says no RLS. Functionally correct — no policies exist, service role works. Spec alignment only. |
