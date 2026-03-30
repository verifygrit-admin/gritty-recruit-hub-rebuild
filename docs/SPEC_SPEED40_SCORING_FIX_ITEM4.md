# SPEC: speed_40 Null Scoring Fix — Item 4
**Author:** Patch
**Status:** READY FOR AUTHORIZATION
**Date:** 2026-03-29
**Decision basis:** Chris's answers to Patch's three pre-spec questions (session 2026-03-29)

---

## Problem Statement

`speed_40` is a required scoring input in `calcAthleticFit`. When the field is null or empty, the current code passes `speedNum = 0` to the normal CDF formula:

```js
// scoring.js line 67
const sScore = 1 - normCDF((speed40 - std.s50) / 0.15);
```

With `speed40 = 0` and `std.s50` in the range of approximately 4.4–5.3 depending on tier and position, the expression `(0 - std.s50) / 0.15` evaluates to roughly -29 to -35. `normCDF` at that z-score returns near 0. Therefore `1 - near-0 ≈ 1.0`.

**A null 40 time produces an sScore of approximately 1.0 — the maximum possible athletic speed score.** This is the opposite of worst-case. Students without a 40 time are being given a near-perfect speed score and passing athletic tiers they should not pass.

---

## Chris's Answers

| # | Question | Answer |
|---|----------|--------|
| Q1 | Null handling behavior | Option A: score as 0 (worst-case), with tooltip/modal prompting the student to enter their 40 time |
| Q2 | Profile visual indicator | Yes — speed_40 field should visually indicate it affects scoring |
| Q3 | Live impact concern | None — all BC High students have 40 data from bulk import |

---

## Scope

| File | Change Required |
|------|----------------|
| `src/lib/scoring.js` | Fix `calcAthleticFit` to return sScore = 0 when speed40 is null/0 |
| `src/pages/ProfilePage.jsx` | Add scoring impact indicator on speed_40 label |
| `src/pages/GritFitPage.jsx` | Add null-speed_40 banner prompting the student to enter their 40 time |
| `src/lib/constants.js` | No change required |

---

## Change 1 — scoring.js: Fix null speed_40 in calcAthleticFit

### Root cause

`runGritFitScoring` converts null speed_40 to 0:

```js
// Line 179-180 (current)
const speedNum = speed_40 ? +speed_40 : 0;
```

Then `calcAthleticFit` receives `speedNum = 0` and the CDF formula produces sScore ≈ 1.0 instead of 0.

### Fix strategy

Two-part fix:
1. Add an explicit null-guard inside `calcAthleticFit` — when `speed40` is 0 or falsy, set `sScore = 0`.
2. Keep `speedNum = speed_40 ? +speed_40 : 0` unchanged (it is used elsewhere for height/weight parity and the value must be numeric).

The guard lives inside `calcAthleticFit` rather than at the call site so that the contract is enforced at the function boundary regardless of how it is called.

### Old code

```js
// src/lib/scoring.js — lines 62-69 (current)
export function calcAthleticFit(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return 0;
  const hScore = normCDF((height - std.h50) / 1.5);
  const wScore = normCDF((weight - std.w50) / (std.w50 * 0.05));
  const sScore = 1 - normCDF((speed40 - std.s50) / 0.15);
  return (hScore + wScore + sScore) / 3;
}
```

### New code

```js
// src/lib/scoring.js — lines 62-72 (replacement)
export function calcAthleticFit(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return 0;
  const hScore = normCDF((height - std.h50) / 1.5);
  const wScore = normCDF((weight - std.w50) / (std.w50 * 0.05));
  // speed40 = 0 means no 40 time on file — score as 0 (worst-case) per Item 4 decision.
  // Passing 0 through the CDF produces sScore ≈ 1.0 (near-perfect), which is wrong.
  const sScore = speed40 ? 1 - normCDF((speed40 - std.s50) / 0.15) : 0;
  return (hScore + wScore + sScore) / 3;
}
```

### Downstream effect on runGritFitScoring

No change to `runGritFitScoring` is required. `speedNum = speed_40 ? +speed_40 : 0` already produces 0 for null, and the fixed `calcAthleticFit` now handles 0 correctly.

The effect on scoring: without a 40 time, athletic fit scores will be lower across all tiers. The student's `topTier` may be null or shift down. This is the correct behavior — Option A (worst-case). The student is prompted to enter their 40 time to improve their score.

---

## Change 2 — ProfilePage.jsx: Add scoring impact indicator to speed_40 field

### Current state

```jsx
// ProfilePage.jsx — line 530 (current)
<div style={thirdCol}>{renderInput('speed_40', '40-Yard Dash (seconds)', 'input-speed-40', { type: 'number', placeholder: '4.65', help: '(Best time in seconds)' })}</div>
```

The `renderInput` helper supports a `help` string rendered below the field. There is no indication that this field affects scoring.

### Fix strategy

Replace the plain help string with a combined help message that includes a scoring impact note. A small amber badge inline in the label is the lightest change — no new component needed. We use the `renderInput` label slot to add the indicator and update the help text.

Because `renderInput` renders `{label}` as-is with an optional required asterisk, we can pass a JSX element as the label. However, `renderInput` calls `data-testid={`label-${field}`}` on the `<label>` element, so passing JSX is safe — it renders inside the label tag.

### Old code

```jsx
// ProfilePage.jsx — line 530 (current)
<div style={thirdCol}>{renderInput('speed_40', '40-Yard Dash (seconds)', 'input-speed-40', { type: 'number', placeholder: '4.65', help: '(Best time in seconds)' })}</div>
```

### New code

```jsx
// ProfilePage.jsx — line 530 (replacement)
<div style={thirdCol}>{renderInput('speed_40', (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    40-Yard Dash (seconds)
    <span
      title="Your 40 time directly affects your athletic fit score. Missing or slow 40 time lowers your matches."
      style={{
        fontSize: '0.7rem', fontWeight: 700, color: '#FFFFFF',
        backgroundColor: '#FF9800', borderRadius: 3,
        padding: '1px 5px', letterSpacing: '0.02em', cursor: 'help',
      }}
    >
      AFFECTS SCORE
    </span>
  </span>
), 'input-speed-40', { type: 'number', placeholder: '4.65', help: '(Best time in seconds — missing 40 time scores as worst-case)' })}</div>
```

### Notes

- The amber badge uses `#FF9800` (orange — consistent with the existing financial privacy notice border color in the form).
- `title` attribute provides tooltip text on hover — no additional tooltip component needed, satisfying Q1's tooltip requirement at the profile-form level.
- `help` text is updated from `(Best time in seconds)` to `(Best time in seconds — missing 40 time scores as worst-case)` to reinforce Option A behavior.
- `renderInput` renders `{label}` directly inside a `<label>` element — JSX is safe here.

---

## Change 3 — GritFitPage.jsx: Null-speed_40 banner

### Purpose

When a student's profile has no `speed_40` value and scoring runs, display a persistent inline banner on the GritFitPage prompting them to enter their 40 time. This satisfies Q1's modal/prompt requirement at the results-view level without requiring a modal component.

### Placement

Below the `GritFitScoreDashboard` block and above the view toggle group. The banner is only shown when `profile.speed_40` is null/falsy and `scoringResult` is present (i.e., scoring ran successfully).

### Old code

```jsx
// GritFitPage.jsx — lines 305-317 (current)
      {/* Score Dashboard */}
      {scoringResult && (
        <GritFitScoreDashboard
          scores={{
            athleticFit: scoringResult.athFit?.[scoringResult.topTier] ?? null,
            academicRigor: scoringResult.acadRigorScore ?? null,
            testOptional: scoringResult.acadTestOptScore ?? null,
          }}
          studentName={profile?.name?.split(' ')[0]}
        />
      )}

      {/* View Toggle */}
```

### New code

```jsx
// GritFitPage.jsx — lines 305-326 (replacement)
      {/* Score Dashboard */}
      {scoringResult && (
        <GritFitScoreDashboard
          scores={{
            athleticFit: scoringResult.athFit?.[scoringResult.topTier] ?? null,
            academicRigor: scoringResult.acadRigorScore ?? null,
            testOptional: scoringResult.acadTestOptScore ?? null,
          }}
          studentName={profile?.name?.split(' ')[0]}
        />
      )}

      {/* Speed40 missing banner — Item 4 */}
      {scoringResult && !profile?.speed_40 && (
        <div
          data-testid="speed40-missing-banner"
          role="alert"
          style={{
            margin: '0 0 20px',
            padding: '12px 16px',
            backgroundColor: '#FFF3E0',
            borderLeft: '4px solid #FF9800',
            borderRadius: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.95rem', color: '#2C2C2C' }}>
            <strong>Your 40-yard dash time is missing.</strong>{' '}
            Without it, your speed is scored at 0 — your athletic fit and match count may be lower than your actual ability.
            Enter your best estimate to improve your results.
          </span>
          <button
            data-testid="speed40-missing-banner-cta"
            onClick={() => navigate('/profile')}
            style={{
              padding: '8px 20px',
              backgroundColor: '#FF9800',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Update Profile
          </button>
        </div>
      )}

      {/* View Toggle */}
```

### Notes

- `role="alert"` ensures screen readers announce the banner on mount.
- The banner disappears automatically on the next scoring run after the student saves a 40 time — no dismiss state required.
- `#FFF3E0` / `#FF9800` is consistent with the financial privacy notice color language already in ProfilePage.
- `data-testid="speed40-missing-banner"` and `data-testid="speed40-missing-banner-cta"` are hookable by Quin.

---

## constants.js — No Change Required

`ATH_STANDARDS` defines `s50` (median 40 time by tier and position). These are not affected. The fix does not change what a "good" 40 time means — it only changes what a missing 40 time means.

---

## Test Scenarios for Quin

### TC-S40-01: null speed_40 produces sScore = 0
**Setup:** Call `calcAthleticFit(position, height, weight, 0, tier)` for any valid position/tier combination.
**Expected:** Return value is `(hScore + wScore + 0) / 3`, not `(hScore + wScore + ~1.0) / 3`.
**Verify:** The return value is meaningfully lower than the same call with a valid speed40 (e.g., 4.5).

### TC-S40-02: valid speed_40 is unaffected
**Setup:** Call `calcAthleticFit(position, height, weight, 4.5, tier)` for any valid combination.
**Expected:** sScore is calculated via CDF formula as before. Return value unchanged from pre-fix behavior.

### TC-S40-03: runGritFitScoring with null speed_40
**Setup:** Pass a profile with `speed_40: null` (or omit the field) to `runGritFitScoring` with a valid schools array.
**Expected:** `speedNum = 0`, `calcAthleticFit` called with `speed40 = 0`, athletic fit scores are lower than with a valid speed40. No NaN or thrown exception.

### TC-S40-04: runGritFitScoring with valid speed_40
**Setup:** Same profile with `speed_40: 4.65`.
**Expected:** Athletic fit scores are higher. No regression from pre-fix behavior.

### TC-S40-05: speed40-missing-banner renders when speed_40 is null
**Setup (Playwright):** Log in as a student with no speed_40 in their profile. Navigate to `/gritfit`.
**Expected:** `[data-testid="speed40-missing-banner"]` is visible. Text includes "40-yard dash time is missing".

### TC-S40-06: speed40-missing-banner not rendered when speed_40 is present
**Setup (Playwright):** Log in as a student with a valid speed_40. Navigate to `/gritfit`.
**Expected:** `[data-testid="speed40-missing-banner"]` is not in the DOM.

### TC-S40-07: Update Profile CTA navigates to /profile
**Setup (Playwright):** Speed40 missing banner is visible. Click `[data-testid="speed40-missing-banner-cta"]`.
**Expected:** Page navigates to `/profile`.

### TC-S40-08: AFFECTS SCORE badge visible on profile form
**Setup (Playwright):** Navigate to `/profile`.
**Expected:** The "AFFECTS SCORE" badge is visible adjacent to the 40-Yard Dash label. `title` attribute contains scoring impact text.

### TC-S40-09: help text updated
**Setup (Playwright):** Navigate to `/profile`.
**Expected:** The help text below the 40-Yard Dash field includes "missing 40 time scores as worst-case".

### TC-S40-10: Banner disappears after speed_40 is saved
**Setup (Playwright):** Student has no speed_40. Navigate to `/gritfit` — banner visible. Navigate to `/profile`, enter 4.65, save. Navigate back to `/gritfit`.
**Expected:** `[data-testid="speed40-missing-banner"]` is not visible after profile save and recalculate.

---

## Done Conditions

- [ ] `calcAthleticFit` returns `(hScore + wScore + 0) / 3` when `speed40` is 0 or falsy
- [ ] `calcAthleticFit` behavior with a valid speed40 is identical to pre-fix
- [ ] No NaN produced by `runGritFitScoring` with a null speed_40 profile
- [ ] "AFFECTS SCORE" amber badge visible on `speed_40` label in ProfilePage
- [ ] Help text on speed_40 field references worst-case scoring
- [ ] `speed40-missing-banner` renders on GritFitPage when profile.speed_40 is null/falsy and scoringResult is present
- [ ] Banner does not render when profile.speed_40 has a value
- [ ] "Update Profile" CTA navigates to `/profile`
- [ ] TC-S40-01 through TC-S40-10 pass
- [ ] No Vitest regressions in existing scoring unit tests

---

## Application Order (for Nova)

Apply in this sequence to avoid a partially broken state:

1. `scoring.js` — `calcAthleticFit` fix (pure logic, no UI dependency)
2. `ProfilePage.jsx` — speed_40 label + help text (pure UI, no logic dependency)
3. `GritFitPage.jsx` — null-speed_40 banner (depends on scoring.js fix being in place for accurate score context)

No deploy step required before applying changes — all three files are client-side.

After applying: run `npm run test` (Vitest) to confirm no regressions before Playwright run.

---

## Push Gate

Per PROTO-GLOBAL-004 Event 2: push check fires before any Playwright run or Dexter PASS is recorded against these changes.
