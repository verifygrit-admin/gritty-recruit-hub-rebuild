ITEM 5 COVERAGE MEMO
QA Agent: Quin
Date: 2026-03-29
Scope: Coach Dashboard Implementation + Null Speed Gate + NextSteps Dashboard Logic

---

## 1. TEST FILES AND COMPONENT OWNERSHIP

### scoring-null-speed.test.js (Vitest unit suite)
TC range: TC-ITEM5-001 through TC-ITEM5-005
Source under test: src/lib/scoring.js
Functions exercised: calcAthleticFit, runGritFitScoring

| TC | Description | Component |
|----|-------------|-----------|
| TC-ITEM5-001 | calcAthleticFit returns reduced score when speed40 is null | scoring.js |
| TC-ITEM5-002 | calcAthleticFit scores correctly for valid speed40 values | scoring.js |
| TC-ITEM5-003 | calcAthleticFit returns 0 for unknown tier or position | scoring.js |
| TC-ITEM5-004 | speed40=0 treated identically to null (regression guard) | scoring.js |
| TC-ITEM5-005 | runGritFitScoring zero-match profile — top30 empty | scoring.js |

### dashboard-logic.test.js (Vitest unit suite)
TC range: TC-ITEM5-006 through TC-ITEM5-010
Source under test: src/lib/nextStepsUtils.js (extracted per Item 5 Decision 3)
Functions exercised: deriveReason, getMetricScores, ACAD_CLUSTER_FLOOR constant

| TC | Description | Component |
|----|-------------|-----------|
| TC-ITEM5-006 | deriveReason returns 'athletic' when topTier is null | nextStepsUtils.js |
| TC-ITEM5-007 | deriveReason returns 'academic' when GPA below ACAD_CLUSTER_FLOOR | nextStepsUtils.js |
| TC-ITEM5-008 | deriveReason returns 'combined' when topTier present, GPA OK, passAll 0 | nextStepsUtils.js |
| TC-ITEM5-009 | getMetricScores — sScore is 0 when speed40 is null, 0, or undefined | nextStepsUtils.js |
| TC-ITEM5-010 | getMetricScores returns zero object for unknown position or tier | nextStepsUtils.js |

### coach-dashboard-tabs.spec.js (Playwright E2E suite)
TC range: TC-ITEM5-011 through TC-ITEM5-015
Source under test: CoachDashboardPage.jsx (DOM assertions via data-testid selectors)
Auth dependency: TEST_COACH_EMAIL / TEST_COACH_PASSWORD (coach account); TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD (student account for TC-015)

| TC | Description | Component |
|----|-------------|-----------|
| TC-ITEM5-011 | Coach dashboard renders three tabs in correct DOM order | CoachDashboardPage.jsx |
| TC-ITEM5-012 | Students tab is active by default on dashboard load | CoachDashboardPage.jsx |
| TC-ITEM5-013 | Clicking Calendar tab activates it and deactivates Students | CoachDashboardPage.jsx |
| TC-ITEM5-014 | Clicking Reports tab activates it and deactivates others | CoachDashboardPage.jsx |
| TC-ITEM5-015 | Access-denied state renders when student role navigates to /coach | CoachDashboardPage.jsx |

Total TC count: 15 (TC-ITEM5-001 through TC-ITEM5-015)

---

## 2. NULL SPEED_40 ASSERTION LOGIC

The null speed_40 guard is tested at two levels.

### Level 1 — calcAthleticFit (scoring.js, TC-ITEM5-001 and TC-ITEM5-004)

The scoring function computes a composite of three sub-scores: hScore (height), wScore (weight), sScore (40-yard dash speed). When speed40 is null or 0, sScore must be forced to 0 — not computed against median.

TC-ITEM5-001 assertion chain:
- result is in range [0, 0.667] — upper bound is (1 + 1 + 0) / 3
- null result is strictly less than result with a fast valid speed
- for a median-height, median-weight WR at G6 with null speed, result falls in [0.28, 0.40], which approximates (0.5 + 0.5 + 0) / 3

TC-ITEM5-004 regression guard:
- speed40=0 and speed40=null produce identical output (toBe equality)
- speed40=0 does NOT produce a near-perfect score — result must be less than 0.50

The toBe equality check in TC-ITEM5-004 is intentional and strict. If the implementation treats 0 as a valid fast time (which would produce a very high sScore due to inversion of the speed scale), this test fails immediately and routes to Patch.

### Level 2 — getMetricScores (nextStepsUtils.js, TC-ITEM5-009)

TC-ITEM5-009 tests the decomposed metric-score function directly:
- speed40=0 returns sScore === 0
- speed40=null returns sScore === 0
- speed40=undefined returns sScore === 0
- speed40=4.35 (fast) returns sScore > 0.5
- Regression guard: sScore with speed40=0 is strictly less than sScore with speed40=4.55
- hScore and wScore are computed normally even when speed40 is 0 — the null guard is isolated to sScore only

---

## 3. IMPLEMENTATION GAPS DISCOVERED DURING TEST WRITING

### GAP: getMetricScores not exported from scoring.js

During test authoring it became clear that the dashboard rendering logic embedded in the NextSteps component (later CoachDashboardPage) could not be unit-tested without first extracting the business logic into a separate module. The function getMetricScores and deriveReason did not exist as named exports at test-writing time — they were inline computations inside JSX.

This is the basis for Item 5 Decision 3 (extraction of nextStepsUtils.js). Without that extraction, dashboard-logic.test.js TC-ITEM5-006 through TC-ITEM5-010 cannot run. The extraction was a Nova deliverable — tests were written against the intended API shape before the module existed. If Nova's extraction does not match the expected export shape, the import line in dashboard-logic.test.js will fail at module resolution, not at assertion level, producing a clean "missing export" error that routes directly to Nova/Patch.

### GAP: TABS constant copy in test file (Item 5 Decision 2)

An earlier draft of coach-dashboard-tabs.spec.js copied the TABS constant from CoachDashboardPage.jsx into the test file to assert label strings. This creates a maintenance trap: if the TABS constant changes in production code, the test copy drifts silently and the test passes against stale expectations. Decision 2 resolved this by switching all assertions to DOM-based checks using data-testid selectors and text content assertions pulled directly from the rendered page. The test no longer imports or copies TABS.

---

## 4. IDENTIFIED GAPS (QA-GAP-ITEM5-A through QA-GAP-ITEM5-D)

### QA-GAP-ITEM5-A
Component: CoachDashboardPage.jsx
Gap: No test for tab panel content visibility. TC-ITEM5-011 through TC-ITEM5-014 confirm tabs render and activate by border-color state, but do not assert that the correct panel content becomes visible (or that other panel content becomes hidden) when a tab is clicked.
Severity: Medium
Status: DEFERRED — tab panel content is placeholder at time of Item 5 implementation. Test to be written when panel content is defined.

### QA-GAP-ITEM5-B
Component: scoring.js / nextStepsUtils.js
Gap: No test for ADLTV or COA null handling. The scoring system references these financial model fields but no test asserts behavior when they are null, zero, or undefined.
Severity: High
Status: OPEN — routes to Quin for test authoring when COA/ADLTV fields are confirmed in schema. Precondition: David confirms field names in Supabase profiles table.

### QA-GAP-ITEM5-C
Component: CoachDashboardPage.jsx
Gap: TC-ITEM5-011 through TC-ITEM5-015 depend on seeded coach and student accounts via environment variables. If TEST_COACH_EMAIL or TEST_STUDENT_EMAIL are not set in CI, all five Playwright tests self-skip (test.skip guard is in place). This is intentional behavior but means the E2E suite produces no coverage signal for the coach dashboard in CI until credentials are provisioned.
Severity: High — coverage gap in CI, not in test logic
Status: OPEN — routes to Scout for CI environment variable provisioning decision. Quin cannot provision secrets.

### QA-GAP-ITEM5-D
Component: runGritFitScoring
Gap: TC-ITEM5-005 tests two zero-match scenarios (poor athlete profile; distance exceeds recruit reach). There is no test for a zero-match caused by the academic gate alone (GPA below floor with otherwise-qualifying athletic and distance profile). This third zero-match vector is not covered.
Severity: Medium
Status: OPEN — Quin will author TC-ITEM5-016 targeting this vector in the next test authoring cycle. No Nova/Patch dependency; this is a pure unit test addition.

---

## 5. FIXTURE DEPENDENCIES

All unit tests in scoring-null-speed.test.js and dashboard-logic.test.js depend on:
- tests/unit/fixtures/profiles.js — makeProfileStub factory
- tests/unit/fixtures/schools.js — makeSchoolStub factory
- tests/unit/fixtures/scoringResults.js — makeScoringResult factory

These fixtures are Item 5 deliverables. If they do not exist at test run time, the Vitest suite will fail at import resolution before any assertions execute. The failure message will be explicit ("Cannot find module './fixtures/profiles.js'") and routes to Nova for fixture authoring.

---

## 6. RUN COMMANDS

Vitest (TC-001 through TC-010):
  npm run test:unit

Playwright (TC-011 through TC-015):
  npx playwright test tests/coach-dashboard-tabs.spec.js

Prerequisite for Playwright suite:
  TEST_COACH_EMAIL, TEST_COACH_PASSWORD, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD must be set in environment or CI secrets.

---

Filed: 2026-03-29
Owner: Quin (QA Agent)
