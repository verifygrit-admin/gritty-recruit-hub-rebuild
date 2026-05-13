# Phase 3 Carry-Forward — Sprint 027

**Date:** 2026-05-13 (Phase 2 close)

This document captures concerns surfaced by Group B + Group C subagent review that are NOT Phase 2 blockers. They feed into Phase 3 negative-test design and into a future Phase 2.5 polish sprint.

---

## Concerns from Group B reviews

### Students subagent
1. **Bulk PDS dual-write semantics.** Direct admin edits of `time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean` do NOT null `last_bulk_pds_approved_at` cache. Operator accepted this in Phase 1 Issue 1 ("admin direct edit is the override path by design"). Phase 3 negative test should verify the hint text appears.
2. **`profiles.updated_at` join risk.** Subagent flagged possible field collision in the students join. Verified — `admin-read-accounts` only selects `account_status`, `payment_status`, `email_verified` from users; no `updated_at` collision. Resolved.

### HS Coaches subagent
3. **EF claims transaction but does sequential writes.** `admin-update-account` processes batch rows sequentially with no ROLLBACK on partial failure. If `users` UPDATE succeeds and `hs_coach_schools` UPDATE fails, the user-side change persists. EF header comment acknowledges this ("mirrors admin-update-school"). Phase 3 negative test should exercise a simulated partial failure.
4. **No 409 protection on `users` table.** `users` has no `updated_at` column → `has_updated_at: false` → no concurrent-edit conflict check for HS Coaches and Counselors edits. Acknowledged in Phase 1 §6.1; not blocking.
5. **N+1 on auth.users lookup in read EF.** Per-row admin API call to fetch email. Acceptable at current 4-row HS coach scale; flag if user_type='hs_coach' base grows.

### High Schools subagent
6. **`HighSchoolsView.jsx` exports `columnConfig = null`** — unused per architecture. Other view files have the same pattern. Worth consolidating in a future cleanup (but the views serve as ENTITY_KEY constant exporters, so they're not pure noise).

## Concerns from Group C reviews

### Colleges subagent
7. **`unitid` PK integer round-trip.** Subagent flagged need to verify PostgREST returns `int4` PK as JS number not string. Phase 3 negative test should confirm `selectedIds.has(unitid)` works correctly across pagination.

### College Coaches subagent
8. **No FK pre-validation for `unitid` on Create.** Operator typing an invalid integer hits a 500 from the EF rather than a friendly 400. Phase 2.5 enhancement: school picker dropdown or pre-flight check.
9. **`is_head_coach` bool as text input.** Operator must type `"true"` / `"false"` strings; Postgres coerces. Acceptable for an admin tool but fragile. Phase 2.5 enhancement: render boolean fields as a toggle / checkbox in CreateRowModal + BulkEditDrawer.
10. **`DeleteConfirmModal` references `row.id` directly.** Works for college_coaches and recruiting_events (both pk='id'); not entity-key-agnostic. If the delete-enabled set ever expands to a non-uuid-PK entity, refactor `row[cfg.pk]`.

### Recruiting Events subagent
11. **Date inputs as text — medium UX risk.** `event_date`, `end_date`, `registration_deadline` rendered as `<input type="text">`. Admin must hand-type ISO format. Phase 2.5: switch to `<input type="date">`.
12. **Enum inputs as text — high UX risk.** `event_type` (4 values) and `status` (4 values) have CHECK constraints; rendered as text. Admin has zero discoverability. Phase 2.5: introduce a field-type registry so CreateRowModal and BulkEditDrawer can render `<select>` for CHECK-constrained columns.
13. **No FK validation on `unitid`** — same as #8 for Recruiting Events.

---

## Phase 3 negative-test entry points (already in plan)

The session plan §Phase 3 already covers most of these via 3.N.1–3.N.7. Specific additions inspired by the above concerns:

- **3.N.8 (new) — Bulk PDS hint visible.** Verify the text "Direct edit bypasses bulk PDS audit chain." renders under each of the 5 PDS measurable inputs in Students view's drawer.
- **3.N.9 (new) — Partial-batch failure behavior.** Simulate a row failing UPDATE mid-batch (e.g., RLS rejection on a single row); verify the EF returns a clear error and that prior rows in the batch may have already committed (operator visibility).
- **3.N.10 (new) — pkCol type round-trip.** Verify Colleges view (integer PK) + College Coaches view (uuid PK) both correctly preserve selection state across pagination changes.

---

## Phase 2.5 polish backlog (not in Sprint 027 scope)

| ID | Item | Source |
|---|---|---|
| P25-1 | Boolean fields render as checkbox/toggle in CreateRowModal + BulkEditDrawer | Concern 9 |
| P25-2 | Date fields render as `<input type="date">` | Concern 11 |
| P25-3 | Enum CHECK-constrained fields render as `<select>` (event_type, status, etc.) | Concern 12 |
| P25-4 | School picker (`unitid` typeahead) for College Coaches + Recruiting Events Create forms | Concerns 8, 13 |
| P25-5 | Per-batch transaction semantics (or at minimum, partial-failure error reporting in EF response) | Concern 3 |
| P25-6 | Refactor `DeleteConfirmModal` to use `row[cfg.pk]` instead of `row.id` | Concern 10 |
