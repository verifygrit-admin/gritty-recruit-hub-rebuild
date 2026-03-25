# MORTY — CONFIRMATION PASS: FOUR SCHEMA AUDIT FINDINGS
Date: 2026-03-25
Authority: Morty (Architecture Auditor)
Method: Fresh source reads — no reliance on MORTY_SCHEMA_AUDIT.md from 2026-03-24 remote session
Gate: Phase 1 build authorization — all four findings must resolve before build proceeds

---

## RULING SUMMARY

| Finding | Claim | Verdict |
|---------|-------|---------|
| A-05 | grit_fit_status enum conflict between DEC-CFBRB-013 and v2 spec | CONFIRMED |
| A-06 | Coach auto-link queries non-existent users.school_id | CONFIRMED |
| A-07 | UX_SPEC_AUTH_FLOWS.md contains live SAID references | CONFIRMED |
| A-08 | schema.test.js contains SAID assertions | CONFIRMED (partial — profiles.said is in-spec; short_list_items said is not) |

All four findings confirmed. Phase 1 build is blocked pending resolution.

---

## A-05 — grit_fit_status ENUM CONFLICT

**Verdict: CONFIRMED**

**What DEC-CFBRB-013 requires** (PHASE1_ROADMAP.md, line 157-171):
- grit_fit_status enum MUST include 'not_evaluated' as a valid value
- DEFAULT must be 'not_evaluated' (not NULL)
- Non-nullable (text with CHECK constraint, no NULL permitted)
- Exact DDL specified:
  ```sql
  grit_fit_status text DEFAULT 'not_evaluated' CHECK (grit_fit_status IN (
    'not_evaluated', ...
  ```
  (PHASE1_ROADMAP.md line 170-171)

**What patch-schema-auth-spec-v2.md actually specifies** (Section 2.11, line 295):
- grit_fit_status DEFAULT NULL
- Nullable — CHECK constraint explicitly permits NULL: `CHECK (grit_fit_status IS NULL OR grit_fit_status IN (...))`
- 'not_evaluated' is NOT in the enum values list
- Exact DDL: `grit_fit_status text DEFAULT NULL CHECK (grit_fit_status IS NULL OR grit_fit_status IN (...)`

**The conflict is real and direct.** DEC-CFBRB-013 says DEFAULT 'not_evaluated', non-nullable, with 'not_evaluated' in enum. v2 spec says DEFAULT NULL, nullable, with 'not_evaluated' absent from enum. These are incompatible. The v2 spec was written with Patch's call to use NULL (per the decision table: "Patch decision — Chris: make your call"), predating DEC-CFBRB-013 which explicitly overrode that call.

**Blocking question for Chris:** v2 spec's NULL approach (line 707: "Applied") conflicts with DEC-CFBRB-013 (logged as "Made" on the same date). Which governs: DEC-CFBRB-013 or v2 spec Section 2.11?

---

## A-06 — COACH AUTO-LINK QUERIES NON-EXISTENT COLUMN

**Verdict: CONFIRMED**

**What UX_SPEC_AUTH_FLOWS.md specifies** (line 271):
> Query `users` table for `user_type = 'hs_coach'` where `school_id = [selected_school_id]`

**What patch-schema-auth-spec-v2.md specifies** (line 87, 121, 177, 206):
- `school_id` was **removed** from the `users` table: "school_id removed — school linkage lives in role-specific junction tables" (line 121)
- The correct query is against `hs_coach_schools` for coaches at the same `hs_program_id` (line 206): "query `hs_coach_schools` for coaches at the same `hs_program_id`"
- Section 3.5 (line 501-510) specifies the correct auto-link logic: query `hs_coach_schools` where `is_head_coach = true`

**The conflict is real.** The UX spec references a column (`users.school_id`) that the schema spec explicitly removed. Any implementation following UX_SPEC_AUTH_FLOWS.md step 2 coach auto-link query will fail at runtime with a column-does-not-exist error.

**Required fix:** UX_SPEC_AUTH_FLOWS.md line 271 must be updated to: "Query `hs_coach_schools` for `hs_program_id = [selected_hs_program_id]` and `is_head_coach = true`" — consistent with patch-schema-auth-spec-v2.md Section 3.5.

**Additional SAID references on same screen (UX_SPEC_AUTH_FLOWS.md lines 312, 387):** The coach and student data flow descriptions also reference `school_id` as a column on the `users` table insert — both of these are also broken. Covered under A-07 below for SAID; the school_id issue on users insert is a separate instance of this same A-06 gap.

---

## A-07 — SAID REFERENCES IN UX_SPEC_AUTH_FLOWS.md

**Verdict: CONFIRMED**

Three distinct SAID references found. All are incompatible with DEC-CFBRB-002 (SAID removed entirely).

**1. Student Profile Form data flow — line 314-315:**
> `generate_said() trigger fires → said assigned`
> `linkSaidToAuth() called → said written to user_metadata`

**2. Session Restore (Student Login) — line 460:**
> `If yes: Call auth_said() to get said from user_metadata`

**3. Session Management code block — line 650:**
> `a. Extract said from user_metadata`

All three reference:
- `generate_said()` — function removed per DEC-CFBRB-002
- `linkSaidToAuth()` — function removed per DEC-CFBRB-002
- `auth_said()` — function removed per DEC-CFBRB-002
- `user_metadata.said` — field never to be written per DEC-CFBRB-002

None of these exist in the v2 schema. None should appear in any build spec. The UX spec postdates DEC-CFBRB-002 (both dated 2026-03-24) but was not scrubbed of SAID references before filing.

**Required fix:** All four SAID references in UX_SPEC_AUTH_FLOWS.md must be replaced with user_id-based session logic per the v2 schema (getSession() → user_id as the sole key).

---

## A-08 — SAID ASSERTIONS IN schema.test.js

**Verdict: CONFIRMED (with nuance — two categories of SAID reference, different severities)**

**Category 1 — profiles.said (lines 218-256): INVALID**

Describe block: "Schema: profiles.said generation trigger" (line 220)
- Line 221: `it('said column exists on profiles table', ...)`
- Line 226: `.select('said')`
- Line 255: `expect(data[0].said).not.toBeNull()`
- Line 256: `expect(data[0].said).toMatch(/^GRIT-\d{4}-\d{4}$/)`

The `profiles` table in v2 schema does NOT include a `said` column. SAID was removed entirely per DEC-CFBRB-002. The test explicitly checks that `profiles.said` exists and is non-null — this test will fail against a correctly-built v2 schema. The describe block ("profiles.said generation trigger") presupposes a trigger that was also removed. This is a live SAID assertion that must be removed or replaced.

**Category 2 — short_list_items insert payloads (lines 178, 206): ALSO INVALID**

Two insert attempts use `said: 'TEST-SAID'` as a payload field:
- Line 178 (source constraint test insert)
- Line 206 (grit_fit_status constraint test insert)

The v2 `short_list_items` table (patch-schema-auth-spec-v2.md line 271, Section 2.11) had `said` removed. These inserts include a column that does not exist in v2. While both inserts are expected to fail (they use invalid user_ids), they are structurally wrong — they document SAID as a short_list_items column. Any future developer reading these tests will be misled.

**Category 3 — file_uploads reference (lines 362-371): CORRECT**

Line 362: `it('file_uploads table has user_id column (not said) as identity key', ...)`
This is an anti-SAID assertion — it correctly documents that said should NOT exist on file_uploads. This is not a gap; it is correct QA documentation. Not flagged.

**Net assessment:** Two test blocks contain SAID assertions that presuppose a schema that does not and should not exist in v2. Both must be corrected before schema tests can serve as a valid gate.

---

## REQUIRED ACTIONS BEFORE BUILD PROCEEDS

1. **A-05 — Chris decision required:** Does DEC-CFBRB-013 ('not_evaluated', non-nullable) or patch-schema-auth-spec-v2.md Section 2.11 (NULL, nullable) govern grit_fit_status? One document must be updated to match the other. Migration 0009 cannot be written until this resolves.

2. **A-06 — Spec update (Quill/Patch):** UX_SPEC_AUTH_FLOWS.md lines 271, 312, 387 must replace `users.school_id` references with the correct v2 join path through `hs_coach_schools` / `hs_program_id`.

3. **A-07 — Spec scrub (Quill):** UX_SPEC_AUTH_FLOWS.md lines 314-315, 460, 650 must remove all SAID function calls and user_metadata.said references. Replace with user_id-based session logic.

4. **A-08 — Test correction (Quin):** schema.test.js must:
   - Remove the "profiles.said generation trigger" describe block (lines 218-258) or replace with a test confirming said does NOT exist on profiles
   - Remove `said: 'TEST-SAID'` from insert payloads at lines 178 and 206

---

*Morty confirmation pass complete. All four findings from the 2026-03-24 remote session are independently verified against current source files.*
