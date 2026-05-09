---
sprint_id: Sprint015
sprint_name: Admin Panel Repair (Edit Coverage, Search, Audit Log, Persistence)
asset: Gritty OS Web App - Admin Panel
version: MVP
priority: Important, Urgent
effort: High (uncertain — pending pre-sprint diagnostic)
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Sprint 015 Session Spec — Admin Panel Repair

> **Status: working draft.** This sprint has the most uncertain scope of any in the coach-scheduler series because three of the four issues (persistence bug, audit log silence, edit coverage) require diagnostic investigation before they can be specced concretely. **A pre-sprint diagnostic session is strongly recommended before promoting this spec to `not_started`.**

## Sprint Objective

Repair four interrelated admin panel issues that have accumulated as data integrity debt:
1. **Edit coverage:** Make all student/user fields editable except system-generated IDs
2. **Search:** Add a search/filter mechanism so any student or user can be found quickly
3. **Audit log:** Wire edits to the existing audit log table (currently silent)
4. **Persistence:** Fix the bug where changes show "saved" in UI but don't persist past session/toggle

These four are likely interrelated — the persistence bug and audit log silence may share a root cause (silently-failing writes that never trigger downstream logging). The pre-sprint diagnostic should verify or refute this hypothesis before sprint opens.

## Hard Constraints

1. **No regressions in existing admin panel functionality.** Whatever currently works must continue working.
2. **No regressions on the public surface.** Coach scheduler (Sprints 010–014) continues to function. The public page reads from the same Supabase, but only schema-stable fields, so admin work shouldn't bleed into public surface unless the schema itself changes.
3. **Audit log writes are append-only.** No edit ever modifies a prior audit log row. Audit log captures actor, action, entity, field, old value, new value, timestamp.
4. **Persistence semantics: confirmed-saved means saved.** UI confirmation reflects actual database state, not optimistic local state. If a save fails, the UI must show that, not a misleading success.
5. **Field-level granularity in audit log.** One row per field changed, not one row per save action that bundles multiple field changes opaquely.
6. **Mobile pairing required where the admin panel is currently mobile-functional.** If the admin panel is desktop-only by design, this remains the case.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions. **Pre-sprint diagnostic recommended** before sprint opens.

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, "Active risk during Sprints 010–014" section explains the workaround currently in use |
| Pre-sprint diagnostic notes | TBD | Root cause findings for persistence bug, audit log silence, edit coverage gaps |
| Existing admin panel routes | TBD (locate during Phase 1) | Current state of edit forms, save handlers, audit log invocations |
| ERD Current State | `docs/superpowers/specs/erd-current-state.md` | Schema reference for what fields exist and their types |

## Pre-Sprint Diagnostic (Required Before Promotion)

A diagnostic session must run before this spec promotes to `not_started`. The diagnostic should:

1. **Reproduce the persistence bug.** Make an edit, log out, log back in, observe whether the change persists. Capture network requests during the edit: does the save request fire? What does Supabase return? Is the response 2xx with a successful row update, or is something silently failing?

2. **Inventory uneditable fields.** List which player and user fields are currently uneditable in the admin panel and why (form omits them, save handler ignores them, FK constraint blocks them, type mismatch, etc.).

3. **Test the audit log hypothesis.** If the persistence bug is "saves don't actually round-trip," then audit log silence may be an automatic downstream consequence. If saves do round-trip but audit log doesn't fire, the two are independent issues. Determine which.

4. **Search functionality scoping.** Which fields should the search bar query? Confirm: name, email, school, position. Anything else?

5. **Capture findings in a diagnostic memo** that becomes input to this sprint's deliverable list.

## Deliverables (Draft — Will Sharpen After Diagnostic)

### D1 — Persistence Bug Fix

Whatever the root cause turns out to be, fix it. Acceptance criterion: edit a value, log out, log back in, change persists. Edit a value, switch to a different user via the toggle, switch back, change persists.

### D2 — Audit Log Wiring

All edits write to the existing `audit_log` table (or create the table if it doesn't yet exist) with: actor user_id, action ('update'), entity_type, entity_id, field_changed, old_value, new_value, timestamp.

If the persistence bug fix automatically resolves audit log silence (shared root cause hypothesis), this deliverable folds into D1. Otherwise it's its own work.

### D3 — Search Bar in Admin Panel

Search input that filters the student/user list by partial-match across: name, email, school, position. Real-time filtering as user types (debounced).

### D4 — Edit Coverage Expansion

All player table fields editable except `id` and other system-generated columns (`created_at`, `updated_at`, foreign key IDs that should only change via dedicated relationship UI).

Likely fields needing edit form additions (TBD via diagnostic):
- Height, weight, GPA, Hudl URL, X handle, hometown, also-plays sport, athletic stats (40 time, bench, etc.), photo URL
- Class year, position
- Status flags

For each field, the edit form must:
- Accept appropriate input types (number for height/weight/GPA, URL for links, etc.)
- Validate input format
- Round-trip to Supabase reliably (D1 + D2 cover this)

### D5 — Save Confirmation Reflects Actual State

Replace any optimistic UI confirmation with confirmation that fires only after the Supabase write succeeds. If the write fails, the UI shows the failure (not "saved"). Edit form clearly distinguishes saved-and-persisted vs. unsaved-local-changes (e.g., dirty-state indicator).

### D6 — User Toggle Behavior

When admin switches between user views (toggling between students/coaches/etc.), unsaved changes are either:
- Auto-saved before switching (if D5's "saved means saved" semantics permit)
- Or surface a "you have unsaved changes" prompt before switching

Preferred: explicit prompt. Decided during pre-sprint diagnostic.

## Open Questions to Resolve Before Promoting This Spec

- **Pre-sprint diagnostic must run first.** Without diagnostic findings, this sprint's scope is unbounded.
- **Audit log table exists?** If not, schema migration is part of D2.
- **RLS policies on audit_log.** Append-only requires write-only RLS for non-superuser roles.
- **Bulk edit / CSV import scope.** Likely carry-forward (post-Sprint 015) — flag as not in scope.
- **Field-level edit permissions.** Are some fields restricted to certain admin roles (e.g., only superuser can edit GPA)? Decide before sprint opens or carry-forward.

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| Persistence bug root cause is more complex than expected (e.g., RLS policy issue, type-handling bug, race condition between save and re-fetch) | High | Pre-sprint diagnostic. If diagnostic surfaces complexity, scope this sprint to the highest-priority subset and carry-forward the rest. |
| Edit coverage expansion breaks existing forms | Medium | Each new field added to the form is a separate Vitest assertion; full regression run before merge |
| Audit log volume grows quickly with field-level granularity | Low | Acceptable for now; consider archival/retention policy later |
| Sprint 014 (Coach Dashboard tab) writes to audit log differently than Sprint 015 establishes | Medium | Sequencing matters — if Sprint 014 ships before Sprint 015, Sprint 014 may need to retrofit to the audit log standard Sprint 015 establishes. Worth discussing in strategy before sequencing locks. |
| Public surface (Sprints 010–013) accidentally affected by admin panel changes | Medium | Public reads from same Supabase but only schema-stable fields; admin work shouldn't change schema unless explicitly part of an admin-side migration. Verify in regression. |

## Definition of Done (Draft)

- All 6 deliverables ship (or absorbed into each other if shared root cause)
- Edit any player field, log out, log back in — change persists
- Edit any player field, switch user toggle, switch back — change persists
- Search for partial name match across roster — student surfaces correctly
- Make any edit — corresponding audit_log row exists with correct field, old, new, actor, timestamp
- All player fields except IDs are editable
- Save confirmation reflects actual database state (no false "saved" messages)
- Vitest assertion count ≥ Sprint 014 floor + new assertions
- No regressions on the public surface (`/recruits` continues to function)
- No regressions on existing admin panel functionality

## Notes for Promotion

When promoting from `draft` to `not_started`:
1. **Run the pre-sprint diagnostic session FIRST.** This is non-negotiable. The diagnostic determines whether D1 and D2 fold into one root cause fix or remain separate, which materially changes sprint scope.
2. Resolve all open questions, especially audit log table existence and RLS policies
3. Inventory all uneditable fields and confirm which need edit form additions
4. Add Prompt 0 with diagnostic findings folded in
5. Confirm Sprint 014 retro is complete (or sequencing decision made if Sprint 015 runs before 014)

## Carry-Forward Items (Likely Not In This Sprint)

- Bulk edit / CSV import for roster updates
- Field-level edit history visible in admin UI (vs. just queryable in audit_log table)
- Field-level permission scoping (which admins can edit which fields)
- Schema field type migrations if diagnostic reveals type-handling root causes that justify them
- Audit log archival / retention policy

---
