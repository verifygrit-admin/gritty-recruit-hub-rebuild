/**
 * nextStepsUtils.js — Extracted dashboard logic from NextStepsDashboard.jsx
 *
 * Owner: Quin (QA Agent) — extraction authorized by Item 5 Decision 3 (2026-03-29)
 *
 * SYNC OWNER POLICY
 * Quin owns the sentinel check for this file. At every pre-PASS gate where
 * scoring.js, constants.js, or NextStepsDashboard.jsx has been modified,
 * Quin must verify that this file's logic is still consistent with the source.
 * Full policy: tests/QUIN_SYNC_OWNER_POLICY.md
 *
 * WHY THIS FILE EXISTS
 * NextStepsDashboard.jsx contained deriveReason, getMetricScores, ACAD_CLUSTER_FLOOR,
 * and a local normCDF. Those functions are pure logic with no React dependency — they
 * are testable in isolation. Extracting them here allows dashboard-logic.test.js to
 * import them directly without a component copy.
 *
 * normCDF NOTE
 * scoring.js defines normCDF privately (not exported). DEC-CFBRB-042 prohibits
 * modifying scoring.js. The normCDF below is an authorized single copy for
 * nextStepsUtils.js — identical to the scoring.js implementation (A&S 7.1.26).
 * If scoring.js ever changes its normCDF formula, Patch must notify Quin so this
 * copy can be synchronized. That sync is part of the Quin Sentinel Check.
 *
 * NULL SPEED GUARD FIX
 * The original getMetricScores in NextStepsDashboard.jsx had a defect: when speed40
 * was 0 or null, passing 0 through normCDF produced sScore ≈ 1.0 (near-perfect),
 * which is incorrect. The fix below matches the guard already present in
 * scoring.js calcAthleticFit:
 *   sScore = speed40 ? 1 - normCDF(...) : 0
 * This is a one-line correction applied during the authorized extraction.
 */

import { ATH_STANDARDS } from './constants.js';

// ── normCDF — A&S 7.1.26 approximation ────────────────────────────────────────
// Authorized copy. Origin: scoring.js (private, not exported per DEC-CFBRB-042).
// SENTINEL: if scoring.js normCDF changes, this must be updated to match.
export function normCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfc =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
    t *
    Math.exp(-x * x);
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}

// ── ACAD_CLUSTER_FLOOR ─────────────────────────────────────────────────────────
// Effective cluster floor GPA by class year — derived from acad_rigor distributions.
// These are the second-lowest distinct Min_GPA values across all 662 schools.
// Below these values, ~75% of schools' academic gates fail immediately.
// Used as a warning threshold in deriveReason — not a hard scoring gate.
export const ACAD_CLUSTER_FLOOR = {
  Senior: 2.50,
  Junior: 2.50,
  Soph: 2.40,
  Freshman: 2.30,
};

// ── getMetricScores ────────────────────────────────────────────────────────────
/**
 * Decompose athletic fit into per-metric scores for display.
 *
 * NULL SPEED GUARD: speed40 = 0 is treated as "no time on file" and scores 0.
 * Passing 0 through normCDF produces sScore ≈ 1.0 (near-perfect), which is wrong.
 * This guard matches calcAthleticFit in scoring.js exactly.
 *
 * @param {string} position
 * @param {number} height — in inches
 * @param {number} weight — in lbs
 * @param {number} speed40 — 40-yard dash time; 0 or falsy = no time on file
 * @param {string} tier — must be a key in ATH_STANDARDS
 * @returns {{ hScore: number, wScore: number, sScore: number, std?: object }}
 */
export function getMetricScores(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return { hScore: 0, wScore: 0, sScore: 0 };
  const hScore = normCDF((height - std.h50) / 1.5);
  const wScore = normCDF((weight - std.w50) / (std.w50 * 0.05));
  // FIX (2026-03-29): null speed guard added during extraction.
  // Original had no guard — 0 produced sScore ≈ 1.0. Now matches calcAthleticFit.
  const sScore = speed40 ? 1 - normCDF((speed40 - std.s50) / 0.15) : 0;
  return { hScore, wScore, sScore, std };
}

// ── deriveReason ──────────────────────────────────────────────────────────────
/**
 * Derive zero-match reason from scoring result and profile.
 *
 * Priority: athletic (no topTier) → academic (GPA below cluster floor) → combined.
 *
 * @param {Object} scoringResult — return value of runGritFitScoring
 * @param {Object} profile — student profile with gpa field
 * @param {string} classLabel — 'Senior' | 'Junior' | 'Soph' | 'Freshman'
 * @returns {'athletic' | 'academic' | 'combined'}
 */
export function deriveReason(scoringResult, profile, classLabel) {
  const { topTier, gates } = scoringResult;
  const requiredGpa = ACAD_CLUSTER_FLOOR[classLabel] || 2.3;
  const gpa = profile.gpa ? +profile.gpa : 0;

  if (!topTier) return 'athletic';
  if (gpa < requiredGpa) return 'academic';
  if (gates.passAll === 0) return 'combined';
  return 'combined';
}
