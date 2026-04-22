/**
 * G9 — D2-capable, high-academic subordinate step.
 *
 * RATIONALE (preserved from spec per Sprint 004 deliverable G9):
 * High-academic students returning too many D2 schools would see those
 * schools labeled "Below Academic Fit" due to the student's academic
 * qualifications exceeding typical D2 academic rigor. This would produce
 * recommendations with lower degree value and lower degree ROI than a
 * properly-filtered D3 selection for the same student.
 *
 * TRIGGER (all three conditions must hold):
 *   1. Student AF@D2 >= 0.50 AND student AF@D3 >= 0.50
 *   2. Student Academic Rigor Score >= 0.85
 *   3. Count of D2 schools in pool where student AF@D2 >= 0.50 is >= 30
 *      (Reading A per operator ruling B-1 — pool-level scalar check)
 *
 * WHEN TRIGGER FIRES:
 *   - Cap D2 returns at 2: {Bentley University, Colorado School of Mines},
 *     filtered by Recruit Reach proximity ordering.
 *   - Fill remainder of MATCH_RETURN_LIMIT=30 with top-Academic-Rigor D3
 *     schools (where student AF@D3 >= 0.50), descending on acadScore.
 *   - Total always <= 30; no synthetic padding if D3 pool exhausted.
 *
 * PURITY:
 *   - Pure function. Returns a new scoringOutput-shaped object.
 *   - Does not mutate inputs (tests assert Object.is reference preservation
 *     on the input scoringOutput).
 */

const AF_THRESHOLD = 0.50;
const ACAD_RIGOR_THRESHOLD = 0.85;
const D2_COUNT_THRESHOLD = 30;
const MATCH_RETURN_LIMIT = 30;
const D2_CAP_NAMES = ['Bentley University', 'Colorado School of Mines'];

/**
 * Local haversine (miles) — inlined to avoid a circular import with scoring.js.
 * Matches the haversine implementation exported from ../scoring.js.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.pow(Math.sin(dLat / 2), 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.pow(Math.sin(dLng / 2), 2);
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Apply the G9 subordinate step to a scoringOutput object.
 *
 * @param {Object} scoringOutput - Result of runGritFitScoring(profile, pool).
 *   Must contain: { top30, top50, scored, athFit, acadRigorScore }.
 * @param {Object} studentProfile - Student profile with hs_lat / hs_lng for
 *   proximity calculation.
 * @param {Array<Object>} schoolsPool - Full schools pool for D2-count trigger
 *   and D3 fill sourcing.
 * @returns {Object} New scoringOutput-shaped object (or the original, unchanged,
 *   if trigger does not fire).
 */
export function applyG9SubordinateStep(scoringOutput, studentProfile, schoolsPool) {
  if (!scoringOutput || !studentProfile || !Array.isArray(schoolsPool)) {
    return scoringOutput;
  }

  const { athFit, acadRigorScore } = scoringOutput;
  const afD2 = (athFit && typeof athFit.D2 === 'number') ? athFit.D2 : 0;
  const afD3 = (athFit && typeof athFit.D3 === 'number') ? athFit.D3 : 0;

  // Trigger 1 — both AF scalars at/above threshold
  const trigger1 = afD2 >= AF_THRESHOLD && afD3 >= AF_THRESHOLD;

  // Trigger 2 — academic rigor score at/above threshold
  const trigger2 = (acadRigorScore ?? 0) >= ACAD_RIGOR_THRESHOLD;

  // Trigger 3 — Reading A: if AF@D2 qualifies, count all D2 schools in pool;
  //             else the count is 0.
  const d2PoolCount = afD2 >= AF_THRESHOLD
    ? schoolsPool.filter(s => s && s.type === 'D2').length
    : 0;
  const trigger3 = d2PoolCount >= D2_COUNT_THRESHOLD;

  if (!(trigger1 && trigger2 && trigger3)) {
    // Pass-through — preserve input reference (tests use Object.is / toEqual).
    return scoringOutput;
  }

  // ------------------------------------------------------------------
  // Trigger fired. Build a new top30.
  // ------------------------------------------------------------------

  const refLat = studentProfile.hs_lat ? +studentProfile.hs_lat : null;
  const refLng = studentProfile.hs_lng ? +studentProfile.hs_lng : null;

  function distTo(school) {
    const lat = parseFloat(school.latitude);
    const lng = parseFloat(school.longitude);
    if (!lat || !lng || refLat == null || refLng == null) return Infinity;
    return haversine(refLat, refLng, lat, lng);
  }

  // (a) Named D2 cap — filter pool to {Bentley, Mines}, then order by proximity.
  const cappedD2s = schoolsPool
    .filter(s => s && s.type === 'D2' && D2_CAP_NAMES.includes(s.school_name))
    .slice()
    .sort((a, b) => distTo(a) - distTo(b));

  // (b) D3 fill — descending acadScore. Trigger1 already confirmed AF@D3 ≥ 0.50
  //     at the student level, so all D3 schools in the pool qualify.
  const d3Fill = schoolsPool
    .filter(s => s && s.type === 'D3')
    .slice()
    .sort((a, b) => (b.acadScore ?? 0) - (a.acadScore ?? 0));

  const remainingSlots = Math.max(0, MATCH_RETURN_LIMIT - cappedD2s.length);
  const newTop30 = [...cappedD2s, ...d3Fill.slice(0, remainingSlots)];

  return {
    ...scoringOutput,
    top30: newTop30,
  };
}
