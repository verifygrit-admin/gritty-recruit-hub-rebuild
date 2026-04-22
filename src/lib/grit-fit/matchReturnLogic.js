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
 */

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
 * Apply the D4 match-return logic.
 * Returns a new array (never mutates input).
 */
export function applyMatchReturnLogic(scoredEligible, athFit, academicRigorScore, limit = MATCH_RETURN_LIMIT) {
  if (!Array.isArray(scoredEligible)) return [];
  if (!qualifiesForD2Cap(athFit, academicRigorScore)) {
    return scoredEligible.slice(0, limit);
  }

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
  return combined;
}
