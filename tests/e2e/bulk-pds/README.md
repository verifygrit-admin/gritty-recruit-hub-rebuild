# Bulk PDS E2E Specs — Sprint 026

Owner: Agent 1d (Test Agent)
Status: SCAFFOLD — these specs depend on Phase 2 wire-up (coach UI, admin UI, EFs) and will run RED until then.

## Playwright config

Reuses the existing root config at `playwright.config.js` (`testDir: './tests'`, `testMatch: '**/*.spec.js'`). The bulk-pds specs are co-located under `tests/e2e/bulk-pds/` and are picked up automatically.

## Tags

All specs are tagged `@bulk-pds`. Run only the bulk-pds suite with:

```
npx playwright test --grep @bulk-pds
```

## Fixture / seed gaps (blockers)

The following fixtures do not exist yet and must be seeded before these specs go green:

- `TEST_COACH_EMAIL` / `TEST_COACH_PASSWORD` — coach account with at least 2 confirmed `hs_coach_students` links. Sprint 025 regression suite already declares these env vars; we reuse the contract.
- `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` — admin account with `app_metadata.role === 'admin'`. Not declared in the existing regression suite. Must be added before `admin-bulk-pds-approval.spec.js` can pass.
- `TEST_STUDENT_EMAIL` / `TEST_STUDENT_PASSWORD` — for the Note 1 lock spec; already declared in regression suite.
- Seeded pending batch in `bulk_pds_submissions` (for admin approval spec) — created at-runtime by the coach submission spec ideally, OR seeded out-of-band. Until Phase 2 lands, the admin spec is a structural placeholder.

## Specs

| Spec | Plan §4.4 row | Selectors used |
|------|---------------|----------------|
| `coach-player-updates.spec.js` | row 1 | per SELECTORS.md coach view |
| `coach-player-updates-mobile.spec.js` | row 4 | same; viewport 375x667 |
| `admin-bulk-pds-approval.spec.js` | row 2 | per SELECTORS.md admin panel |
| `profile-note1-lock.spec.js` | row 3 | absence-of-selector spec (no new testids) |
