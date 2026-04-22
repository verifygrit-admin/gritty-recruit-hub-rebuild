/**
 * matchReturnLogic — Sprint 003 D4.
 *
 * Implements the new match-return rule for high-academic, D2+D3-qualifying
 * student profiles:
 *
 *   When ALL of:
 *     athFit['D2'] >= 0.50
 *     athFit['D3'] >= 0.50
 *     academicRigorScore >= 0.85
 *
 *   Then the match-return cap is:
 *     - at most 2 qualifying D2 schools (Bentley University and Colorado
 *       School of Mines), subject to the existing Recruit Reach — i.e. the
 *       two D2 schools are only included if they are already eligible in the
 *       scored list.
 *     - remaining slots (up to 30 total) filled with highest-qualifying
 *       D3 schools.
 *
 *   Students NOT meeting the combined threshold: default ranking unchanged.
 *
 * Pure function. No DB access. Inputs:
 *   - scoredEligible: already filtered & sorted (descending by acadScore)
 *     array of scored school records, as produced by runGritFitScoring.
 *   - athFit: { [tier]: number }
 *   - academicRigorScore: number (0..1)
 *
 * Sprint 004 Phase 1 consolidation (Wave 5): applyMatchReturnLogic is now
 * the single source of truth for all cap logic across the app. The G9
 * subordinate step (src/lib/scoring/g9SubordinateStep.js) is invoked here
 * as an OUTER gate — it runs after Sprint 003's D4 cap and replaces the
 * result when G9's 3-trigger condition fires. This removes the
 * double-pipeline bug where G9 was computed inside runGritFitScoring but
 * silently overwritten at the view layer.
 *
 * The G9 gate fires only when both `options.profile` and `options.schoolsPool`
 * are supplied. Callers that don't pass these (tests, legacy paths) get the
 * pre-Wave-5 Sprint 003 behavior — backward compatible by construction.
 */

import { applyG9SubordinateStep } from '../scoring/g9SubordinateStep.js';
import { runGritFitScoring } from '../scoring.js';

export const HIGH_ACADEMIC_THRESHOLD = 0.85;
export const D2_QUALIFYING_UNITIDS = []; // operator-extendable; used if matching by unitid preferred
export const D2_QUALIFYING_NAMES = ['Bentley University', 'Colorado School of Mines'];
export const D2_CAP = 2;
export const MATCH_RETURN_LIMIT = 30;

export function qualifiesForD2Cap(athFit, academicRigorScore) {
  if (!athFit) return false;
  const d2 = athFit['D2'];
  const d3 = athFit['D3'];
  if (d2 == null || d3 == null) return false;
  if (academicRigorScore == null) return false;
  return d2 >= 0.5 && d3 >= 0.5 && academicRigorScore >= HIGH_ACADEMIC_THRESHOLD;
}

function isQualifyingD2(school) {
  if (!school) return false;
  if (school.type !== 'D2') return false;
  if (D2_QUALIFYING_UNITIDS.length && school.unitid != null) {
    if (D2_QUALIFYING_UNITIDS.includes(school.unitid)) return true;
  }
  const name = (school.school_name || '').trim();
  return D2_QUALIFYING_NAMES.some(qn => name.toLowerCase() === qn.toLowerCase());
}

/**
 * Apply the match-return logic.
 * Returns a new array (never mutates input).
 *
 * @param {Array} scoredEligible - filtered & sorted (desc by acadScore) scored schools
 * @param {Object} athFit - { [tier]: number }
 * @param {number} academicRigorScore - 0..1
 * @param {number} [limit=MATCH_RETURN_LIMIT]
 * @param {Object} [options] - Optional G9 outer-gate inputs. Both fields required
 *   to engage G9; absence skips the G9 gate (preserves Sprint 003 behavior).
 * @param {Object} [options.profile] - student profile (needs hs_lat/hs_lng)
 * @param {Array}  [options.schoolsPool] - full schools pool for D2-count + D3 fill
 * @param {Array}  [options.scored] - OPTIONAL enriched school records (from
 *   runGritFitScoring(profile, schoolsPool).scored). When absent, the G9 gate
 *   re-runs scoring internally to derive it so G9's new top30 carries per-school
 *   enrichments (matchRank, netCost, adltv, droi, breakEven, dist, isTestOpt).
 *   Pass-through consumers can supply this to avoid the extra scoring pass.
 */
export function applyMatchReturnLogic(
  scoredEligible,
  athFit,
  academicRigorScore,
  limit = MATCH_RETURN_LIMIT,
  options = {},
) {
  if (!Array.isArray(scoredEligible)) return [];

  // ── Sprint 003 cap logic ────────────────────────────────────────────────
  let sprintThreeCap;
  if (!qualifiesForD2Cap(athFit, academicRigorScore)) {
    sprintThreeCap = scoredEligible.slice(0, limit);
  } else {
    const qualifyingD2s = scoredEligible.filter(s => isQualifyingD2(s)).slice(0, D2_CAP);
    const d3s = scoredEligible.filter(s => s.type === 'D3');

    // Keep any highest-ranked non-D2 non-D3 ineligible by default for this cohort —
    // the spec defines the return as "remaining 28–30 slots filled with highest-
    // qualifying D3 schools." Non-D2/D3 returns are not part of the cap rule.
    const remainingSlots = Math.max(0, limit - qualifyingD2s.length);
    const fill = d3s.slice(0, remainingSlots);

    const seen = new Set();
    const combined = [];
    for (const s of [...qualifyingD2s, ...fill]) {
      if (s.unitid != null && seen.has(s.unitid)) continue;
      if (s.unitid != null) seen.add(s.unitid);
      combined.push(s);
      if (combined.length >= limit) break;
    }
    sprintThreeCap = combined;
  }

  // ── Sprint 004 G9 outer gate ────────────────────────────────────────────
  // Only reshape the cap if G9's 3-trigger condition holds. If profile or
  // schoolsPool absent (tests / callers that don't need G9 gating), return
  // the Sprint 003 cap unchanged. When G9 fires, g9Result.top30 is a NEW
  // array (Bentley + Mines + D3 fill); when it passes through, it's the
  // same reference we passed in. Safe either way.
  //
  // Wave 5 Phase 1 F4 fix — supply `scored` to the G9 step so its rebuilt
  // top30 carries per-school enrichments (netCost, adltv, droi, breakEven,
  // matchRank, dist, isTestOpt, athleteAcad). The incoming `scoredEligible`
  // is the enriched-AND-topTier-eligible slice; when topTier === D2, D3
  // records are absent from it and the G9 D3 fill would otherwise return
  // raw pool records stripped of Money Map data / ranking. We therefore
  // derive (or accept) the full `scored` array here. If options.scored is
  // provided by the caller, it is used directly (optimal). Otherwise the
  // scoring engine is re-run on (profile, schoolsPool) as a fallback so
  // the fix works without a consumer-file change.
  if (options.profile && options.schoolsPool) {
    let scored = Array.isArray(options.scored) ? options.scored : null;
    if (!scored) {
      try {
        scored = runGritFitScoring(options.profile, options.schoolsPool).scored || [];
      } catch {
        scored = [];
      }
    }
    const scoringOutputShape = {
      top30: sprintThreeCap,
      athFit,
      acadRigorScore: academicRigorScore,
      scored,
    };
    const g9Result = applyG9SubordinateStep(
      scoringOutputShape,
      options.profile,
      options.schoolsPool,
    );
    return g9Result.top30;
  }
  return sprintThreeCap;
}
