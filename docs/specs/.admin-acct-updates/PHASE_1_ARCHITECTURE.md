# Phase 1 Architecture — Sprint 027 Account Updates

**Date:** 2026-05-13
**Status:** ARCHITECTURE LOCKED. No code implementation in this phase — stubs only.
**Inputs:** `sprint-027-session-spec.txt`, `sprint-027-session-plan.md`, `erd-drift-sprint027.md`, `READ_ONLY_FIELDS.md`, `RLS_GAPS.md`, `COLUMN_WHITELISTS.md`.

This document is the authoritative source for Phase 2 build subagents.

---

## 1. Route + tab placement

- **Path:** `/admin/account-updates` (sub-route of existing `/admin/*`)
- **Guard:** Existing `src/components/AdminRoute.jsx` (no new guard) — JWT `app_metadata.role === 'admin'` per `AdminRoute.jsx:62`. chris@grittyfb.com already carries the role.
- **Tab order in `src/lib/adminTabs.js`** (current 5 tabs becomes 6):
  1. `users` → `/admin/users`
  2. `institutions` → `/admin/institutions`
  3. `recruiting-events` → `/admin/recruiting-events`
  4. `bulk-pds` → `/admin/bulk-pds`
  5. **`account-updates` → `/admin/account-updates`** *(NEW — inserted before audit per Plan §1.1)*
  6. `audit` → `/admin/audit`
- **AdminPage branch** (`src/pages/AdminPage.jsx:132-138`): add `{activeTab === 'account-updates' && <AdminAccountUpdatesPage />}`.

---

## 2. Component tree

All paths under `src/`:

```
pages/
  AdminAccountUpdatesPage.jsx                    [NEW - shell wrapper]
components/account-updates/
  AccountUpdatesShell.jsx                        [NEW - orchestrator]
  AccountUpdatesToggleBar.jsx                    [NEW - 7-button toggle]
  BulkEditDrawer.jsx                             [NEW - select up to 10 → edit → review → confirm]
  ReviewDiffPanel.jsx                            [NEW - per-row diff display]
  CreateRowModal.jsx                             [NEW - 3 create-enabled entities only]
  DeleteConfirmModal.jsx                         [NEW - 3 delete-enabled entities only]
  EmptyState.jsx                                 [NEW - "No records — use Create to add" / generic]
  views/
    StudentsView.jsx                             [NEW - thin: column config + EF dispatch]
    HsCoachesView.jsx                            [NEW]
    CounselorsView.jsx                           [NEW]
    HighSchoolsView.jsx                          [NEW]
    CollegesView.jsx                             [NEW]
    CollegeCoachesView.jsx                       [NEW - imports CreateRowModal + DeleteConfirmModal]
    RecruitingEventsView.jsx                     [NEW - imports CreateRowModal + DeleteConfirmModal]
lib/adminAccountUpdates/
  entityRegistry.js                              [NEW - master registry from COLUMN_WHITELISTS.md]
  columnConfigs.js                               [NEW - per-entity AdminTableEditor column config]
  diffPayload.js                                 [NEW - pure function: (original, edited) → diff]
  applyBatchEdit.js                              [NEW - dispatcher: call admin-update-account]
  applyCreate.js                                 [NEW - dispatcher: call admin-create-account]
  applyDelete.js                                 [NEW - dispatcher: call admin-delete-account]
  fetchPagedRows.js                              [NEW - dispatcher: call admin-read-accounts]
```

### Composition rules
1. `AdminAccountUpdatesPage` is a thin wrapper. All logic lives in `AccountUpdatesShell`.
2. `AccountUpdatesShell` owns: active toggle state, paged row state, selection state (max 10), drawer open state, create/delete modal state, fetch + write dispatchers.
3. `AccountUpdatesShell` reuses existing `src/components/AdminTableEditor.jsx` for read display (columns config per active toggle).
4. Each `*View.jsx` is **thin** — just exports column config + entity key. No data fetching, no state. The shell consumes the export and passes it to `AdminTableEditor` and `BulkEditDrawer`.
5. `CreateRowModal` and `DeleteConfirmModal` are **NOT imported** by the 4 auth-linked views (`StudentsView`, `HsCoachesView`, `CounselorsView`, `HighSchoolsView`). Compile-time gate per Q5 LOCKED.
6. `BulkEditDrawer` reads the entity's UPDATE whitelist from `entityRegistry.js` at render time — never accepts ad-hoc column lists.
7. `diffPayload.js` is a **pure function**, easily TDD'd in Phase 2 (`tests/unit/diffPayload.test.js`).

### State machine (drawer)

```
IDLE
  ↓ user selects row 1
SELECTED (1..10)
  ↓ user clicks "Bulk Edit"
EDITING
  ↓ user types in fields → diff updates live
  ↓ user clicks "Update"
REVIEW (diff panel renders)
  ↓ user clicks "Confirm"
SUBMITTING
  ↓ EF responds
  ├→ 200: SUCCESS → toast → reset to IDLE
  ├→ 409 (conflict): SHOW_CONFLICT → "Row was modified — refresh"
  └→ 4xx/5xx: ERROR → show error → return to EDITING
```

11th selection attempt at any state in `SELECTED (1..10)` triggers a toast (Q6 LOCKED) and does not change selection.

---

## 3. EF contracts

All four EFs follow the auth-gate pattern from `supabase/functions/admin-update-school/index.ts:117-132`:
1. Extract Bearer token from `Authorization` header.
2. `userClient.auth.getUser(accessToken)` (per DEC 016-C WT-B — `getSession()` returns null in stateless EF).
3. Check `userData.user.app_metadata?.role === 'admin'`. Reject 403 if not.
4. Use service-role client for all DB operations.

CORS pattern same as `admin-update-school`. CORS allow methods varies per EF (GET / PUT / POST / DELETE).

### 3.1 `admin-read-accounts`

- **Path:** `supabase/functions/admin-read-accounts/index.ts`
- **Method:** `GET`
- **Query string:** `?entity=<key>&page=<n>&page_size=<n>&sort=<col>&dir=<asc|desc>`
- **Required:** `entity` (one of the 7 keys); defaults: `page=1, page_size=50, sort=<entity-default>, dir=asc`
- **Response 200:**
  ```ts
  type ReadResponse = {
    success: true;
    rows: Record<string, unknown>[]; // shape depends on entity (joined for hs_coaches/counselors)
    total: number;
    page: number;
    page_size: number;
    entity: EntityKey;
  };
  ```
- **Response 4xx/5xx:** `{ success: false, error: string }`
- **Joins:**
  - `hs_coaches` joins `users → hs_coach_schools → hs_programs` (LEFT JOIN — coaches without a link still appear)
  - `counselors` joins `users → hs_counselor_schools → hs_programs` (LEFT JOIN)
  - `students` joins `profiles → users` (LEFT JOIN — surfaces account_status, payment_status as RO display)
  - All other entities — single-table read
- **Soft-delete filter:** For `college_coaches` and `recruiting_events`, `WHERE deleted_at IS NULL` after the `0052` migration is applied. Until then, no filter.

### 3.2 `admin-update-account`

- **Path:** `supabase/functions/admin-update-account/index.ts`
- **Method:** `PUT`
- **Body:**
  ```ts
  type UpdateRequest = {
    entity: EntityKey;
    batch: Array<{
      row_id: string | number; // PK value (uuid or unitid integer)
      diff: Record<string, unknown> | { users?: Record<string, unknown>; hs_coach_schools?: Record<string, unknown> };
      updated_at_check?: string; // ISO timestamp; required for tables with updated_at
    }>;
    admin_email: string;
  };
  ```
- **For `hs_coaches` and `counselors`:** the diff has nested `users` and `<link_table>` keys (per `COLUMN_WHITELISTS.md` example).
- **For all other entities:** the diff is a flat field → value map.
- **Whitelist enforcement:** Every key in `diff` must be in the entity's `update_whitelist[*]` from `entityRegistry`. Any unknown key → 400.
- **Transactional:** Single PostgreSQL transaction wraps all rows in the batch (`BEGIN; ... COMMIT;` via service-role client). All-or-nothing.
- **Conflict check:** For tables with `updated_at`, compare `updated_at_check` to current value before write. Mismatch → 409.
- **Audit log writes:** Per Q7, **one row per field changed** to `public.admin_audit_log`. Schema (post-`0051`):
  - `admin_email` = `admin_email` from request
  - `action` = `'UPDATE'`
  - `table_name` = entity table (or link table for nested writes — both audited)
  - `row_id` = PK value (cast to text)
  - `field` = column name *(NEW from `0051`)*
  - `old_value` = `{ <field>: <old> }` jsonb
  - `new_value` = `{ <field>: <new> }` jsonb
  - `created_at` = `now()`
- **Response 200:**
  ```ts
  type UpdateResponse = {
    success: true;
    updated_count: number;
    audit_count: number; // total field-rows written
    updated_rows: Array<Record<string, unknown>>; // refreshed view of each updated row
  };
  ```
- **Response 409:**
  ```ts
  type ConflictResponse = {
    success: false;
    error: 'Conflict';
    conflicts: Array<{ row_id: string | number; current_updated_at: string; sent_updated_at: string }>;
  };
  ```

### 3.3 `admin-create-account`

- **Path:** `supabase/functions/admin-create-account/index.ts`
- **Method:** `POST`
- **Body:**
  ```ts
  type CreateRequest = {
    entity: 'colleges' | 'college_coaches' | 'recruiting_events'; // hard-gated to the 3 enabled entities
    row: Record<string, unknown>;
    admin_email: string;
  };
  ```
- **Entity gate:** EF rejects with 400 if `entity` is not one of the 3 create-enabled entities. **Defense-in-depth — UI never sends others, but EF enforces.** (Note: `colleges` is in this gate enum, but the underlying `schools_deny_insert` policy will block the write at the DB layer. Sprint 027 UI never sends `colleges` to this EF — but the gate symmetry is intentional documentation.)
- **Required fields:** Every field in entity's `create_required` must be present. Missing → 400.
- **Whitelist enforcement:** Every key in `row` must be in entity's `create_whitelist`. Unknown → 400.
- **Audit:** One row to `admin_audit_log` with `action='INSERT'`, `field=null`, `old_value=null`, `new_value=<row jsonb>`.
- **Response 200:** `{ success: true, row: <inserted row with PK> }`
- **Response 4xx/5xx:** `{ success: false, error: string }`

### 3.4 `admin-delete-account`

- **Path:** `supabase/functions/admin-delete-account/index.ts`
- **Method:** `DELETE`
- **Body:**
  ```ts
  type DeleteRequest = {
    entity: 'colleges' | 'college_coaches' | 'recruiting_events';
    row_id: string;
    admin_email: string;
  };
  ```
- **Entity gate:** Same as create. (`colleges` is in the type enum but `schools_deny_delete` blocks at DB layer.)
- **Soft delete:** `UPDATE <table> SET deleted_at = now() WHERE <pk> = row_id` — depends on `0052` adding `deleted_at`.
- **Audit:** One row, `action='DELETE'`, `field=null`, `old_value=<full row>`, `new_value=null`.
- **Response 200:** `{ success: true, row_id }`

---

## 4. RLS plan (`0051` migration written, NOT applied)

File: `supabase/migrations/0051_account_updates_admin_write_policies.sql` (written this phase).

**Contents (17 policies + 1 schema delta + 1 backfill):**

| # | Object | Action |
|---|---|---|
| 1 | `admin_audit_log.field` | ADD COLUMN (nullable text) |
| 2 | `admin_audit_log_lookup_idx` | CREATE INDEX (table_name, row_id, field, created_at DESC) |
| 3 | `profiles_admin_update` | UPDATE policy |
| 4 | `users_admin_update` | UPDATE policy |
| 5 | `hs_programs_admin_update` | UPDATE policy |
| 6-8 | `college_coaches_admin_insert/update/delete` | INSERT, UPDATE, DELETE policies |
| 9-11 | `recruiting_events_admin_insert/update/delete` | INSERT, UPDATE, DELETE policies |
| 12 | `admin_audit_log_admin_insert` | INSERT policy |
| 13-15 | `hs_coach_schools_admin_insert/update/delete` | INSERT, UPDATE, DELETE policies (link table) |
| 16-18 | `hs_counselor_schools_admin_insert/update/delete` | INSERT, UPDATE, DELETE policies (link table) |
| 19 | supabase_migrations backfill | 11-row INSERT … ON CONFLICT DO NOTHING |

All policy DDL is wrapped in `DROP POLICY IF EXISTS … ; CREATE POLICY …` for idempotency. Single `BEGIN; ... COMMIT;`.

**Apply command (Phase 2 task 2.A3):**
```bash
npm run migrate -- supabase/migrations/0051_account_updates_admin_write_policies.sql
```

`scripts/migrate.js` writes its own `supabase_migrations` row at line 134 — verified during Phase 1.

---

## 5. Phase 2 execution-ordering implications

The shell, drawer, and `entityRegistry` are the foundation; nothing in Group B or C builds without them. Phase 2 task ordering (already in `sprint-027-session-plan.md` §Phase 2) holds:

- **Group A (serial)** — A1 scaffolding, A2 wiring, A3 migration apply, A4 read EF, A5 update EF
- **Group B (parallel × 4)** — Students, HS Coaches, Counselors, High Schools views
- **Group C (parallel + serial)** — C1 create EF, C2 delete EF, C3 modals, then C4-C6 College/CollegeCoaches/RecruitingEvents views in parallel
- **Group D (serial)** — cross-entity smoke

The `0052` migration (soft-delete columns on `college_coaches` and `recruiting_events`) is a Phase 2 task (C2 dependency), not Phase 1.

---

## 6. Open items / decisions deferred to Phase 2

These are explicit "Phase 1 says: leave to Phase 2" items.

1. **`updated_at` columns on tables that lack them.** `college_coaches` and `recruiting_events` have no `updated_at` — concurrent edit conflict check (Q6 from earlier plan, not from this spec set) is therefore SKIPPED for these two. If Phase 2 wants conflict checks, add `updated_at` in `0052`. Recommend skip — these tables start at 0 rows and concurrent admin edit is unrealistic in the near term.
2. **Bulk PDS dual-write UI note.** Per Phase 0 Issue 1, the 5 PDS measurable fields in Students view show: **"Direct edit bypasses bulk PDS audit chain."** Phase 2 component owner (`StudentsView.jsx`) implements as a per-field hint string in the column config.
3. **Pagination defaults per entity.** `students` ~36 rows, `users` ~40, `schools` 662, others 0-5. Recommend `page_size=50` default for all (covers everything but Colleges); Colleges defaults to `page_size=100` with operator-changeable selector.

---

## 7. Phase 1 done condition

- [x] Architecture doc written (this file)
- [x] Migration `0051` written (not applied)
- [x] Column whitelists written (`COLUMN_WHITELISTS.md`)
- [ ] Component stubs created (Phase 1.5)
- [ ] EF stubs created (Phase 1.6)
- [ ] Plan updated with Phase 1 decisions (Phase 1.7)

After all 6 → halt for operator review. Phase 2 cannot start until operator authorizes.
