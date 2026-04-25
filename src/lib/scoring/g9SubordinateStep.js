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
 * SPRINT 005 D2 FIX — RECRUIT REACH RADIUS:
 *   The pre-Sprint-005 implementation of this subordinate step did NOT
 *   re-apply the Recruit Reach radius filter to the academically-mixed
 *   D2+D3 pool. Result: D3 fill could include schools far outside the
 *   student's realistic recruit reach (e.g. Pacific-coast D3 schools for
 *   a Boston student). The Sprint 005 fix re-applies a radius filter as
 *   the FINAL step in both halves of the mix:
 *     - The named D2 cap (Bentley/Mines) is filtered by D2 radius (600 mi).
 *     - The D3 fill is filtered by D3 radius (450 mi).
 *   Per-tier radius is sourced from RECRUIT_BUDGETS in src/lib/constants.js
 *   so this stays in sync with the rest of the engine. Schools missing
 *   lat/lng (or with student lat/lng absent) are EXCLUDED — failing-
 *   closed is consistent with the rest of the engine's gateDist
 *   treatment (scoring.js distance defaults to 9999 when lat/lng missing,
 *   which fails the radius gate).
 *
 * ENRICHMENT PRESERVATION (Sprint 004 Wave 5 Phase 1 fix, F4):
 *   - When building the new top30, each selected school is resolved through
 *     `scoringOutput.scored` (enriched records from runGritFitScoring) BEFORE
 *     falling back to the raw pool record. This preserves per-school
 *     enrichments (acadScore, matchRank/matchTier, netCost, adltv, droi,
 *     breakEven, dist, isTestOpt, athleteAcad, etc.) on the returned list
 *     so downstream consumers (MoneyMap, table ranking, Test Optional
 *     indicator, shortlist-add) see the same shape they see on the
 *     non-G9-fire path. Fall-back to pool preserves backward-compat with
 *     unit-test fixtures that do not supply `scored`.
 *
 * PURITY:
 *   - Pure function. Returns a new scoringOutput-shaped object.
 *   - Does not mutate inputs (tests assert Object.is reference preservation
 *     on the input scoringOutput).
 */

import { RECRUIT_BUDGETS } from '../constants.js';

const AF_THRESHOLD = 0.50;
const ACAD_RIGOR_THRESHOLD = 0.85;
const D2_COUNT_THRESHOLD = 30;
const MATCH_RETURN_LIMIT = 30;
const D2_CAP_NAMES = ['Bentley University', 'Colorado School of Mines'];

// Sprint 005 D2 fix — per-tier radius (miles) for the post-mixer Recruit Reach
// filter. Sourced from RECRUIT_BUDGETS so a future radius change in
// constants.js propagates here without a code change in this file.
const D2_RADIUS = RECRUIT_BUDGETS.D2;
const D3_RADIUS = RECRUIT_BUDGETS.D3;

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
  //
  // Per-school enrichment preservation (Wave 5 Phase 1 F4 fix): build a
  // lookup over scoringOutput.scored (by unitid, then by school_name) so
  // that each selected school carries the enrichments produced by
  // runGritFitScoring. Fall back to the raw pool record when no enriched
  // match exists (defensive; also preserves backward-compat with G9 unit
  // test fixtures that do not supply an independent `scored` array).
  // ------------------------------------------------------------------

  const scored = Array.isArray(scoringOutput.scored) ? scoringOutput.scored : [];
  const scoredByUnitid = new Map();
  const scoredByName = new Map();
  for (const s of scored) {
    if (!s) continue;
    if (s.unitid != null && !scoredByUnitid.has(s.unitid)) scoredByUnitid.set(s.unitid, s);
    if (s.school_name && !scoredByName.has(s.school_name)) scoredByName.set(s.school_name, s);
  }

  /**
   * Resolve a raw pool record to its enriched counterpart in `scored` when
   * available. Falls back to the raw pool record (defensive) so this change
   * is backward-compatible with callers that do not populate `scored`.
   */
  function enrich(poolRecord) {
    if (!poolRecord) return poolRecord;
    if (poolRecord.unitid != null && scoredByUnitid.has(poolRecord.unitid)) {
      return scoredByUnitid.get(poolRecord.unitid);
    }
    if (poolRecord.school_name && scoredByName.has(poolRecord.school_name)) {
      return scoredByName.get(poolRecord.school_name);
    }
    return poolRecord;
  }

  const refLat = studentProfile.hs_lat ? +studentProfile.hs_lat : null;
  const refLng = studentProfile.hs_lng ? +studentProfile.hs_lng : null;

  function distTo(school) {
    const lat = parseFloat(school.latitude);
    const lng = parseFloat(school.longitude);
    if (!lat || !lng || refLat == null || refLng == null) return Infinity;
    return haversine(refLat, refLng, lat, lng);
  }

  // Sprint 005 D2 fix — Recruit Reach radius predicate. Applied as the FINAL
  // filter to both the named D2 cap and the D3 fill. Schools whose distance
  // cannot be computed (missing lat/lng on either side) are excluded —
  // mirrors the fail-closed behavior of the engine's primary gateDist
  // (which assigns dist = 9999 in the same scenario).
  function withinRadius(school, radiusMiles) {
    const d = distTo(school);
    return Number.isFinite(d) && d <= radiusMiles;
  }

  // (a) Named D2 cap — filter pool to {Bentley, Mines}, then order by proximity.
  //     Resolve each to its enriched counterpart for the final list.
  //     Sprint 005 D2 fix: also drop any that fall outside the D2 recruit reach
  //     radius (600 mi). Bentley/Mines are typically far apart, so for a given
  //     student often only one will qualify — that is intentional and matches
  //     the existing G9 single-school cases (g/h).
  const cappedD2s = schoolsPool
    .filter(s => s && s.type === 'D2' && D2_CAP_NAMES.includes(s.school_name))
    .filter(s => withinRadius(s, D2_RADIUS))
    .slice()
    .sort((a, b) => distTo(a) - distTo(b))
    .map(enrich);

  // (b) D3 fill — descending acadScore. Trigger1 already confirmed AF@D3 ≥ 0.50
  //     at the student level, so all D3 schools in the pool qualify on tier.
  //     Sprint 005 D2 fix: re-apply the D3 Recruit Reach radius (450 mi) here
  //     so the high-academic mixer cannot return D3 schools outside the
  //     student's realistic reach. This is the bug the fix targets — pre-fix,
  //     the mixer ignored radius and could surface cross-country D3s.
  //     Resolve each to its enriched counterpart so acadScore / matchRank /
  //     netCost / adltv / droi / breakEven / dist / isTestOpt are present.
  const d3Fill = schoolsPool
    .filter(s => s && s.type === 'D3')
    .filter(s => withinRadius(s, D3_RADIUS))
    .map(enrich)
    .slice()
    .sort((a, b) => (b.acadScore ?? 0) - (a.acadScore ?? 0));

  const remainingSlots = Math.max(0, MATCH_RETURN_LIMIT - cappedD2s.length);
  const newTop30 = [...cappedD2s, ...d3Fill.slice(0, remainingSlots)];

  return {
    ...scoringOutput,
    top30: newTop30,
  };
}
