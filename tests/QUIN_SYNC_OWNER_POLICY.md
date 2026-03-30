# Quin Sync Owner Policy

**Owner:** Quin (QA Agent)
**Date:** 2026-03-29
**Authority:** Item 5 Decision 1 (Chris-approved, 2026-03-29)
**Code reference:** `src/lib/nextStepsUtils.js` header comments (cross-referenced)

---

## Purpose

This policy assigns Quin as the named sync owner for test-copy fidelity in the
gritty-recruit-hub-rebuild test suite. It converts the passive "update if source
changes" comment pattern into an active gate obligation with a named owner.

## Scope

Quin monitors the following source-to-test synchronization points:

| Source File | Extracted To | What to Check |
|-------------|-------------|---------------|
| `src/lib/scoring.js` (normCDF, private) | `src/lib/nextStepsUtils.js` (normCDF, exported) | Formula parity — A&S 7.1.26 approximation must be identical |
| `src/lib/constants.js` (ATH_STANDARDS) | consumed by `nextStepsUtils.js` via import | No copy — import is live. No sync needed unless import path changes. |
| `src/lib/scoring.js` (calcAthleticFit null guard) | `src/lib/nextStepsUtils.js` (getMetricScores null guard) | Both must use the same `speed40 ? ... : 0` pattern |

## Sentinel Check Process

### When it fires

At every pre-PASS gate where ANY of the following files have been modified in
the current session:

- `src/lib/scoring.js`
- `src/lib/constants.js`
- `src/lib/nextStepsUtils.js`
- `src/components/NextStepsDashboard.jsx`

### What Quin checks

1. **normCDF parity** — Open `scoring.js` and `nextStepsUtils.js` side by side.
   Confirm the normCDF implementations are identical (same constants, same formula).
   If scoring.js normCDF changed, update nextStepsUtils.js to match.

2. **Null speed guard parity** — Confirm `calcAthleticFit` in scoring.js and
   `getMetricScores` in nextStepsUtils.js both use the same guard pattern for
   falsy speed40 values.

3. **ACAD_CLUSTER_FLOOR values** — Confirm the values in nextStepsUtils.js match
   what the business logic requires. If academic thresholds have been updated
   anywhere, nextStepsUtils.js must reflect the change.

4. **Test assertion validity** — Confirm that hardcoded expected values in
   `scoring-null-speed.test.js` and `dashboard-logic.test.js` are still correct
   given any source changes.

### Gate language

When Quin completes the sentinel check, the output must include:

```
SENTINEL CHECK — [date]
Files modified this session: [list]
normCDF parity: CONFIRMED / DRIFT DETECTED — [detail]
Null guard parity: CONFIRMED / DRIFT DETECTED — [detail]
ACAD_CLUSTER_FLOOR: CONFIRMED / DRIFT DETECTED — [detail]
Test assertions: CONFIRMED / UPDATE REQUIRED — [detail]
```

If any item reads DRIFT DETECTED or UPDATE REQUIRED, the pre-PASS gate is
BLOCKED until the drift is resolved.

## Task-Close Gate Item

For any task-close (PROTO-GLOBAL-016) where the modified files include scoring.js,
constants.js, or nextStepsUtils.js, Scout's Step 4 (protocol compliance) must
include confirmation that Quin's sentinel check has been completed. If Quin was
not invoked during the session, Scout flags:

```
[SCOUT WATCH] Sentinel check required — scoring/constants files modified
but Quin sentinel check not completed. PROTO-GLOBAL-016 Step 4 blocked.
```

## Relationship to nextStepsUtils.js

This policy is the standalone governance document. The `nextStepsUtils.js` file
header contains an abbreviated reference pointing here. Both must exist — the
header comments serve developers reading the code; this file serves agents
running the gate.

If this policy is updated, the header comment in `nextStepsUtils.js` must be
reviewed for consistency (and vice versa). Quin owns both.
