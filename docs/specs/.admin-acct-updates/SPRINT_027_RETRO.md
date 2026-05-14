# Sprint 027 Retro — Admin Account Updates

**Branch:** `sprint-027/admin-account-updates`
**Duration:** 2026-05-13 (single-day sprint, 4 phases)
**Status:** CLOSED, awaiting Phase 4 push + PR review
**Final commit:** `e52dfea` (Phase 4 audit script) — 6 commits ahead of master

---

## Scope vs delivered

### Operator's 5 done-state goals (from `sprint-027-session-spec.txt`)

| # | Goal | Delivered |
|---|---|---|
| 1 | Admin RW on 7 entities, RO on auth-linked fields (id, uuid, user_id, email, password) | ✓ Per Q4 lock; enforced at EF whitelist + drawer compile-time gate |
| 2 | Tab only available in Admin View | ✓ Reuses existing `AdminRoute` (`app_metadata.role === 'admin'`) |
| 3 | Modeled on Player Updates form, with: (A) 10-row cap, (B) no second-party verification, (C) 7 toggles | ✓ All three; 10-cap hard-enforced (Q6); single review→confirm flow; toggle bar with 7 entities |
| 4 | Create/Delete enabled only for Colleges, College Coaches, Recruiting Events | ✓ Q5 hard-disabled (UI hidden, not just gated) for the 4 auth-linked entities — verified via DOM-absence in Phase 3 negative tests |
| 5 | Full happy path: login → tab → toggle → select up to 10 → edit → review → submit | ✓ All 50 positive smoke tests pass against live DB |

**All 5 goals achieved.**

### Plan vs reality

- **Spec discrepancy resolved up-front (Q1):** Spec narrative said "8 toggles" but enumerated 7. Operator confirmed 7. Plan locked.
- **Plan stretch:** Operator originally targeted `42 positive + 9 negative = 51 e2e tests`. Delivered `50 positive + 12 negative + 1 validation smoke = 63 tests`. Extras came from entity-specific assertions warranted by the architecture (PDS hint, link-section header, Q5 DOM-absent verification, CREATE/DELETE flows for create-enabled entities, parameterized 3.N.3 across 4 auth-linked entities).
- **Carry-forward closed in-sprint:** CF-027-2 (migration tracking drift). Backfill in `0051` migration + audit script in Phase 4 + discovery that the project has two tracking tables (public.* AND supabase_migrations.schema_migrations).

---

## Deviations summary (operator-accepted)

| # | Deviation | Phase | Operator response |
|---|---|---|---|
| 1 | Transactional batch writes deferred — sequential per-row with no rollback (mirrors admin-update-school) | Phase 2 | Accepted as P25-5; admin re-submits failed rows from diff panel |
| 2 | Group A built without subagent dispatch | Phase 2 | Approved — serial foundational work |
| 3 | Group B/C subagents did read-only review + polish proposals (not write) | Phase 2 | Approved — thin views = thin subagent scope |
| 4 | Browser smoke deferred to Phase 3 | Phase 2 | Approved — Phase 3 is the right home |
| 5 | 0052 applied in Group A (not Group C) | Phase 2 | Approved — uniform 409 coverage decision pulled it forward |
| 6 | 2 subagent typos in Phase 3 selection-count assertions (`"of 4 selected"` vs `"of 10 selected"` cap) | Phase 3 | Auto-fixed; re-run clean |
| 7 | CF-027-2 truth turned out to be two-table tracking, not single-table drift | Phase 4 | Audit script updated to query both; clean result |

No spec deviations. All 5 done-state goals delivered as specified.

---

## P25 carry-forward to Sprint 028

All 6 polish items remain unaddressed — none blocked Phase 3 verification.

| ID | Item | Source | Sprint 028 priority |
|---|---|---|---|
| P25-1 | Boolean fields render as toggle/checkbox in CreateRowModal + BulkEditDrawer | College Coaches subagent (`is_head_coach` text input) | LOW (admin-only; works as text) |
| P25-2 | Date fields render as `<input type="date">` (event_date, end_date, registration_deadline) | Recruiting Events subagent | MEDIUM (3 date fields per row; UX gap) |
| P25-3 | Enum CHECK-constrained fields render as `<select>` (event_type, status) | Recruiting Events subagent | MEDIUM (no discoverability of valid values) |
| P25-4 | School picker (`unitid` typeahead) for College Coaches + Recruiting Events Create forms | Both create-enabled entity subagents | MEDIUM (FK validation UX) |
| P25-5 | Per-batch transaction semantics (or richer partial-failure error reporting in EF response) | HS Coaches subagent | LOW (existing pattern works; mirrors admin-update-school) |
| P25-6 | Refactor `DeleteConfirmModal` to use `row[cfg.pk]` instead of hardcoded `row.id` | College Coaches subagent | LOW (both delete-enabled entities use uuid PK) |

Recommendation: bundle P25-2 + P25-3 + P25-4 into a "form-input upgrade" Sprint 028 ticket. P25-1 / P25-5 / P25-6 can defer further.

---

## Carry-forward flag status

| Flag ID | Description | Status |
|---|---|---|
| CF-027-1 | ERD doc stale (8 cols across 2 tables + 1 new table since 2026-05-02 generation) | **CARRIED** to next ERD-update sprint per operator directive |
| CF-027-2 | `public.supabase_migrations` missing 11 tracking rows | **CLOSED** in-sprint — backfilled in 0051; audit script in Phase 4 detected the two-table reality and now queries both |
| CF-027-3 | `partner_high_schools` and `hs_programs` are parallel partner-school registries | **CARRIED** to future structural sprint per operator directive (Q2 lock; partner_high_schools untouched) |
| CF-027-4 | 2 NULL `full_name` UUIDs in `public.users` (`fa8fa926…`, `9169818d…`) | **OPEN** — operator can backfill via Sprint 027's HS Coaches form post-deploy |

---

## Test coverage delivered

### E2E suite — `tests/e2e/admin-account-updates/`

```
9 spec files, 63 tests, 4.2 min runtime
  - 50 positive (entity smoke + CREATE/DELETE flows)
  - 12 negative (Q5 DOM-absent, 409 conflict, 11th-cap, audit count, etc.)
  - 1 validation smoke (storageState + admin role gate)
```

**Auth pattern:** Service-role-minted admin session via `supabase.auth.admin.generateLink('magiclink') → verifyOtp(token_hash)` in Playwright globalSetup. No password ever needed. Session storageState gitignored.

**46 evidence screenshots** committed under `tests/e2e/admin-account-updates/screenshots/`.

### Coverage gap (intentional)

- **Mobile viewport:** Sprint 027 admin tabs render on desktop only (matches AdminTableEditor pattern). No mobile e2e.
- **Cross-browser:** Chromium only (matches existing `playwright.config.js` Phase-1 scope per QA_STRATEGY_PHASE1.md).
- **Concurrent multi-admin:** 409 conflict tested with one admin + one out-of-band SQL bump. True two-browser concurrent-admin scenario not exercised.

---

## Runtime metrics

### Migrations applied

| Migration | What it does | Rows touched | Time to apply |
|---|---|---|---|
| `0051_account_updates_admin_write_policies.sql` | 17 admin-write policies + admin_audit_log.field column + index + 11-row tracking backfill | 1 schema change + 11 inserts | ~2s |
| `0052_account_updates_soft_delete_and_updated_at.sql` | deleted_at + updated_at + set_updated_at trigger fn + 2 triggers | 4 column adds + 1 fn + 2 triggers | ~1s |

### Edge Functions deployed

| EF | LOC (incl. comments) | Auth gate | Notes |
|---|---|---|---|
| `admin-read-accounts` | 215 | getUser + admin role | Entity dispatch; 7 entities; soft-delete filter |
| `admin-update-account` | 285 | getUser + admin role | Per-field audit; nested-diff; 409 check; 10-row cap |
| `admin-create-account` | 130 | getUser + admin role | Entity-gated to 2 (3 enum incl. colleges-blocked); required-field check |
| `admin-delete-account` | 105 | getUser + admin role | Soft delete; full-row pre-image audit |

### Frontend code added

| Path | Files | Notes |
|---|---|---|
| `src/pages/AdminAccountUpdatesPage.jsx` | 1 | Page + ToastProvider scope |
| `src/components/account-updates/` | 8 (shell, toggle, drawer, review, create modal, delete modal, empty state, screenshots dir) | |
| `src/components/account-updates/views/` | 7 (one per entity, all thin) | |
| `src/lib/adminAccountUpdates/` | 7 (registry, columnConfigs, diffPayload, 4 dispatchers) | |
| Modified: `src/lib/adminTabs.js`, `src/pages/AdminPage.jsx`, `src/components/AdminTableEditor.jsx` | 3 | Tab wiring + optional `col.render` prop |

### Test suite

```
9 spec files | 63 tests | 4.2 min headless | 46 evidence screenshots
1 npm script added: npm run audit:migrations
```

### Live DB state at sprint close

```
public.profiles                  — 36 rows
public.users                     — 40 rows  (4 hs_coach, 4 hs_guidance_counselor, rest student/etc)
public.hs_programs               — 2 rows
public.schools                   — 662 rows
public.college_coaches           — 0 rows  (all Phase 3 seeds + creates hard-deleted in afterAll)
public.recruiting_events         — 0 rows  (same)
public.admin_audit_log           — 10 rows pre-Phase-3 + N from Phase 3 cleanup tests
                                   (audit rows persist by design; not cleaned up)
```

---

## What worked well

1. **Phase ordering with operator gates between each phase.** Catching architectural questions in Phase 1 (Q1-Q8) saved rework later. Operator's CHECK WITH ME at every phase boundary kept scope tight.
2. **Service-role session-mint for Phase 3 e2e auth.** No password needed; clean, repeatable, secure (key never leaves dev machine).
3. **Architecture lock in Phase 1: thin views + unified shell.** Made Group B/C parallel "subagent dispatch" possible as read-only review rather than concurrent code-writes.
4. **Per-field audit (Q7).** 50 audit rows per 10×5 bulk submit is verbose but searchable — `(table_name, row_id, field, created_at DESC)` index makes "what did admin X change to field F" a single-row lookup.

## What to improve next sprint

1. **Two-tracking-table reality** should be documented as a project invariant. The audit script now handles it, but future contributors will hit the same discovery friction Phase 4 did.
2. **Subagent prompts for selection-count assertions** should include explicit "the cap is 10, not the live row count" — both subagents that wrote `"of 4 selected"` / `"of 2 selected"` mis-read the shell template.
3. **Boolean / date / enum input UX** is a recognized gap (P25-1 through P25-3). Worth bundling a Sprint 028 "form-input upgrade" task.

---

## Sprint 027 commit log (final)

```
e52dfea sprint-027/Phase 4: scripts/audit-migration-tracking.js (CF-027-2 follow-up)
0d26a27 sprint-027/Phase 3: e2e suite — 63 tests pass (50 positive + 12 negative + 1 smoke)
e94bb27 sprint-027/Group D: cross-entity data-plane smoke report
ca8fb6a sprint-027/Group C: create + delete EFs + modals + Shell wiring + polish
ad62585 sprint-027/Group B: per-entity column-config polish from 4 subagent reports
1225029 sprint-027/Group A: scaffolding + EFs (read+update) + migrations
```

6 commits. Branch ready for push.

---

**Sprint 027 closes after operator approves Phase 4 push + PR.**

MERGED 566b910 on 2026-05-13.
