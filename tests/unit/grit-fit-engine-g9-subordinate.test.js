/**
 * grit-fit-engine-g9-subordinate.test.js — Sprint 004 G9 (Wave 0, Track B).
 *
 * FAILING-TEST-ONLY scaffold. No implementation exists yet. All 8 assertions
 * in this file are expected to fail with an import/undefined error until the
 * G9 subordinate step is implemented in a future wave.
 *
 * Deliverable: docs/specs/sprint-004/sprint_004_session_spec.md — G9.
 *
 * ============================================================================
 * FUNCTION UNDER TEST — contract proposed by this test file
 * ============================================================================
 *
 * @function applyG9SubordinateStep
 * @description Final subordinate step for the GRIT FIT scoring engine.
 *   Activates ONLY when all three trigger conditions hold:
 *     (1) Student Athletic Fit >= 0.50 at BOTH D2 AND D3.
 *     (2) Student Academic Rigor Score >= 0.85.
 *     (3) Student's profile generates >= 30 candidate D2 schools, where a
 *         candidate D2 school is any school in the pool with type === 'D2'
 *         and the student's Athletic Fit at D2 >= 0.50. (The AF check at D2
 *         is a property of the student's athFit map, not per-school in this
 *         reading — so the count reduces to: schools in pool with type 'D2'
 *         when athFit.D2 >= 0.50, else zero.)
 *
 *   When triggered, the subordinate step:
 *     - Caps D2 returns at TWO schools. The two eligible D2 schools are
 *       "Bentley University" and "Colorado School of Mines". Ordering
 *       between them is determined by Recruit Reach proximity — i.e. the
 *       haversine distance between the student's (hs_lat, hs_lng) and each
 *       school's (latitude, longitude). Closer school returns first.
 *     - Fills remaining slots (up to the match-return limit of 30) with the
 *       highest-Academic-Rigor D3 schools from the pool where student
 *       Athletic Fit at D3 >= 0.50 (again a property of the student's
 *       athFit map).
 *     - If only one of Bentley / Colorado School of Mines is present in the
 *       pool for this specific student (e.g. the other was filtered out at
 *       engine time), only that one returns and the D3 fill expands.
 *
 *   When NOT triggered, returns scoringOutput unchanged (same object identity
 *   is acceptable; the test only asserts shape equivalence on top30/scored).
 *
 * @param {Object} scoringOutput - Result of runGritFitScoring(profile, pool).
 *   Must contain: { top30, top50, scored, athFit, acadRigorScore }.
 * @param {Object} studentProfile - Student profile with hs_lat / hs_lng for
 *   proximity calculation (same shape passed to runGritFitScoring).
 * @param {Array<Object>} schoolsPool - The full schools pool used by the
 *   scoring engine. Used (a) to count candidate D2 schools for trigger 3, and
 *   (b) to source the D3 fill.
 * @returns {Object} scoringOutput with top30 (and top50 where applicable)
 *   replaced by the G9-filtered list when the step fires, otherwise the
 *   original scoringOutput unchanged.
 *
 * ============================================================================
 * ASSERTION MATRIX (8 cases)
 * ============================================================================
 *   a) All triggers + Bentley closer  -> Bentley[0], Mines[1], D3 fill.
 *   b) All triggers + Mines closer    -> Mines[0], Bentley[1], D3 fill.
 *   c) Trigger 1 fails via D2 < 0.50  -> output unchanged.
 *   d) Trigger 1 fails via D3 < 0.50  -> output unchanged.
 *   e) Trigger 2 fails (acad < 0.85)  -> output unchanged.
 *   f) Trigger 3 fails (< 30 D2 cands)-> output unchanged.
 *   g) All triggers, Bentley in pool but Mines absent -> [Bentley, ...D3 fill].
 *   h) All triggers, Mines in pool but Bentley absent -> [Mines, ...D3 fill].
 *
 * ============================================================================
 * SPEC AMBIGUITY FLAGGED (not resolved by this test file)
 * ============================================================================
 *   1. Trigger 3 uses the phrase "candidate D2 schools where student Athletic
 *      Fit at D2 >= 50%". Reading A (adopted here): the AF-at-D2 threshold is
 *      a property of the student's athFit map, so the count reduces to
 *      count(schools with type === 'D2') when athFit.D2 >= 0.50. Reading B
 *      would be a per-school calc, but per-school AF in the existing engine
 *      already derives from athFit[school.type] which is the same student
 *      athFit value for every D2 school. We adopt Reading A, consistent with
 *      the operator-confirmed reading in the Track B briefing.
 *   2. "Fill remainder of GRIT FIT recommendation slots" — we assume the
 *      match-return limit is 30 (same as Sprint 003 D4's MATCH_RETURN_LIMIT).
 *      The spec does not restate the number; G9 could in principle read a
 *      different limit. Tests assume 30.
 *   3. Mutation semantics — tests do not assert whether applyG9SubordinateStep
 *      mutates its scoringOutput argument or returns a new object. Both are
 *      acceptable. Future implementation wave should pick one and document it.
 */

import { describe, it, expect } from 'vitest';
import { applyG9SubordinateStep } from '../../src/lib/scoring/g9SubordinateStep.js';

// ---------------------------------------------------------------------------
// Real-world lat/lng for the two named D2 schools (used in radius-filter
// regression assertions added in Sprint 005 D2). For ordering tests in cases
// (a) and (b), we use synthetic coordinates that place BOTH Bentley and Mines
// within the student's recruit reach, so the existing ordering-by-proximity
// semantics can be exercised without colliding with the new radius filter.
// ---------------------------------------------------------------------------
const BENTLEY_LAT = 42.388;
const BENTLEY_LNG = -71.217; // Waltham, MA
const MINES_LAT = 39.751;
const MINES_LNG = -105.222; // Golden, CO

// A student lat/lng on the east coast — Bentley is far closer than Mines.
const EAST_COAST_LAT = 42.36;
const EAST_COAST_LNG = -71.06;

// A student lat/lng in Denver — Mines is far closer than Bentley.
const DENVER_LAT = 39.74;
const DENVER_LNG = -104.99;

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

/**
 * Minimum profile shape needed by the G9 step. Only fields the step inspects
 * are required — full profile is not. We pass enough to compute proximity.
 */
function makeProfile({ lat = EAST_COAST_LAT, lng = EAST_COAST_LNG, ...rest } = {}) {
  return {
    position: 'WR',
    hs_lat: lat,
    hs_lng: lng,
    grad_year: 2027,
    ...rest,
  };
}

function makeBentley(overrides = {}) {
  return {
    unitid: 166027,
    school_name: 'Bentley University',
    institution_name: 'Bentley University',
    type: 'D2',
    latitude: BENTLEY_LAT,
    longitude: BENTLEY_LNG,
    acadScore: 0.92,
    schoolRigor: 0.92,
    eligible: true,
    ...overrides,
  };
}

function makeMines(overrides = {}) {
  return {
    unitid: 126818,
    school_name: 'Colorado School of Mines',
    institution_name: 'Colorado School of Mines',
    type: 'D2',
    latitude: MINES_LAT,
    longitude: MINES_LNG,
    acadScore: 0.91,
    schoolRigor: 0.91,
    eligible: true,
    ...overrides,
  };
}

/**
 * Generate `count` generic D2 schools (non-Bentley, non-Mines) used to pad
 * the candidate-D2 count above (or below) the 30-school trigger threshold.
 */
function makeGenericD2s(count, startId = 200000) {
  return Array.from({ length: count }, (_, i) => ({
    unitid: startId + i,
    school_name: `Generic D2 ${i}`,
    institution_name: `Generic D2 ${i}`,
    type: 'D2',
    latitude: 40 + i * 0.01,
    longitude: -80 - i * 0.01,
    acadScore: 0.70,
    schoolRigor: 0.70,
    eligible: true,
  }));
}

/**
 * Generate a representative D3 pool of `count` schools, descending acadScore
 * so the first is highest-ranked.
 */
function makeD3Pool(count, startId = 300000) {
  return Array.from({ length: count }, (_, i) => ({
    unitid: startId + i,
    school_name: `D3 School ${i}`,
    institution_name: `D3 School ${i}`,
    type: 'D3',
    latitude: 41 + i * 0.01,
    longitude: -72 - i * 0.01,
    acadScore: 0.95 - i * 0.005,
    schoolRigor: 0.95 - i * 0.005,
    eligible: true,
  }));
}

/**
 * Build a scoringOutput stub approximating what runGritFitScoring produces.
 * Callers override `athFit`, `acadRigorScore`, and seed `scored`/`top30`.
 */
function makeScoringOutput({
  athFit = { D2: 0.60, D3: 0.70 },
  acadRigorScore = 0.90,
  scored = [],
  top30 = [],
  top50 = [],
} = {}) {
  return {
    athFit,
    athFitBase: athFit,
    boost: 0,
    acadRigorScore,
    acadTestOptScore: acadRigorScore,
    topTier: 'D2',
    recruitReach: 450,
    scored,
    top30,
    top50: top50.length ? top50 : top30,
    gates: { passAthletic: scored.length, passDist: scored.length, passAcad: scored.length, passAll: top30.length },
  };
}

// ---------------------------------------------------------------------------
// Assertion suite
// ---------------------------------------------------------------------------

describe('applyG9SubordinateStep — Sprint 004 G9 (Wave 0 failing-test scaffold)', () => {
  //
  // --- (a) All triggers met; Bentley closer than Mines -----------------------
  //
  it('a) all triggers met + Bentley closer → Bentley first, Mines second, D3 fill', () => {
    // Sprint 005 D2 — Recruit Reach is now applied as a final filter to the
    // mixed D2/D3 pool. To test ORDERING semantics independently of the new
    // radius filter, both D2 cap schools are placed within reach of the
    // student here (synthetic coordinates near the student), and Bentley is
    // placed strictly closer.
    const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
    const d3Pool = makeD3Pool(40);
    const pool = [
      makeBentley({ latitude: EAST_COAST_LAT + 0.10, longitude: EAST_COAST_LNG }), // ~7 mi
      makeMines({ latitude: EAST_COAST_LAT + 1.50, longitude: EAST_COAST_LNG }),    // ~104 mi
      ...makeGenericD2s(30),
      ...d3Pool,
    ];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.90,
      scored: pool,
      top30: [pool[0], pool[1], ...d3Pool.slice(0, 28)],
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    const d2s = result.top30.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(2);
    expect(d2s[0].school_name).toBe('Bentley University');
    expect(d2s[1].school_name).toBe('Colorado School of Mines');
    const d3s = result.top30.filter(s => s.type === 'D3');
    expect(d3s.length).toBeGreaterThan(0);
    expect(d3s[0].school_name).toBe('D3 School 0');
  });

  //
  // --- (b) All triggers met; Mines closer than Bentley -----------------------
  //
  it('b) all triggers met + Mines closer → Mines first, Bentley second, D3 fill', () => {
    // Sprint 005 D2 — same fixture pattern as (a): both D2 cap schools placed
    // within reach of the student so ordering is tested independent of the
    // new radius filter.
    const profile = makeProfile({ lat: DENVER_LAT, lng: DENVER_LNG });
    const d3Pool = makeD3Pool(40, 300000)
      .map((s, i) => ({
        ...s,
        latitude: DENVER_LAT + 0.05 + i * 0.01,
        longitude: DENVER_LNG + 0.05 + i * 0.01,
      }));
    const pool = [
      makeBentley({ latitude: DENVER_LAT + 1.50, longitude: DENVER_LNG }), // ~104 mi
      makeMines({ latitude: DENVER_LAT + 0.10, longitude: DENVER_LNG }),   // ~7 mi
      ...makeGenericD2s(30),
      ...d3Pool,
    ];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.90,
      scored: pool,
      top30: [pool[1], pool[0], ...d3Pool.slice(0, 28)],
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    const d2s = result.top30.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(2);
    expect(d2s[0].school_name).toBe('Colorado School of Mines');
    expect(d2s[1].school_name).toBe('Bentley University');
  });

  //
  // --- (c) Trigger 1a fails: student AF @ D2 < 0.50 --------------------------
  //
  it('c) AF @ D2 < 0.50 (D3 fine) → subordinate step does NOT fire; output unchanged', () => {
    const profile = makeProfile();
    const d3Pool = makeD3Pool(40);
    const pool = [makeBentley(), makeMines(), ...makeGenericD2s(30), ...d3Pool];
    const originalTop30 = [makeBentley(), makeMines(), ...d3Pool.slice(0, 28)];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.45, D3: 0.70 }, // D2 below threshold
      acadRigorScore: 0.90,
      scored: pool,
      top30: originalTop30,
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    expect(result.top30).toEqual(originalTop30);
  });

  //
  // --- (d) Trigger 1b fails: student AF @ D3 < 0.50 --------------------------
  //
  it('d) AF @ D3 < 0.50 (D2 fine) → subordinate step does NOT fire; output unchanged', () => {
    const profile = makeProfile();
    const d3Pool = makeD3Pool(40);
    const pool = [makeBentley(), makeMines(), ...makeGenericD2s(30), ...d3Pool];
    const originalTop30 = [makeBentley(), makeMines(), ...d3Pool.slice(0, 28)];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.45 }, // D3 below threshold
      acadRigorScore: 0.90,
      scored: pool,
      top30: originalTop30,
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    expect(result.top30).toEqual(originalTop30);
  });

  //
  // --- (e) Trigger 2 fails: acadRigorScore < 0.85 ---------------------------
  //
  it('e) acadRigorScore < 0.85 → subordinate step does NOT fire; output unchanged', () => {
    const profile = makeProfile();
    const d3Pool = makeD3Pool(40);
    const pool = [makeBentley(), makeMines(), ...makeGenericD2s(30), ...d3Pool];
    const originalTop30 = [makeBentley(), makeMines(), ...d3Pool.slice(0, 28)];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.80, // below threshold
      scored: pool,
      top30: originalTop30,
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    expect(result.top30).toEqual(originalTop30);
  });

  //
  // --- (f) Trigger 3 fails: < 30 candidate D2 schools -----------------------
  //
  it('f) < 30 candidate D2 schools → subordinate step does NOT fire; output unchanged', () => {
    const profile = makeProfile();
    const d3Pool = makeD3Pool(40);
    // Only 10 generic D2s + Bentley + Mines = 12 D2 candidates, well below 30.
    const pool = [makeBentley(), makeMines(), ...makeGenericD2s(10), ...d3Pool];
    const originalTop30 = [makeBentley(), makeMines(), ...d3Pool.slice(0, 28)];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.90,
      scored: pool,
      top30: originalTop30,
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    expect(result.top30).toEqual(originalTop30);
  });

  //
  // --- (g) All triggers met, but only Bentley available for this student ----
  //
  it('g) all triggers met; only Bentley qualifies → Bentley returns, D3 fill expands', () => {
    const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
    const d3Pool = makeD3Pool(40);
    // Pool contains Bentley but NOT Mines, plus enough generic D2s to satisfy trigger 3.
    const pool = [makeBentley(), ...makeGenericD2s(30), ...d3Pool];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.90,
      scored: pool,
      top30: [makeBentley(), ...d3Pool.slice(0, 29)],
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    const d2s = result.top30.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(1);
    expect(d2s[0].school_name).toBe('Bentley University');
    // Remaining slots should be D3 fill, highest-rigor first.
    const d3s = result.top30.filter(s => s.type === 'D3');
    expect(d3s[0].school_name).toBe('D3 School 0');
  });

  //
  // --- (h) All triggers met, but only Mines available for this student ------
  //
  it('h) all triggers met; only Mines qualifies → Mines returns, D3 fill expands', () => {
    // Sprint 005 D2 — D3 fill must be within radius of the student. Mines
    // (real lat/lng) is ~22 mi from Denver, well inside D2 reach. The D3
    // pool is generated near Denver so the fill is non-empty post-radius.
    const profile = makeProfile({ lat: DENVER_LAT, lng: DENVER_LNG });
    const d3Pool = makeD3Pool(40, 300000)
      .map((s, i) => ({
        ...s,
        latitude: DENVER_LAT + 0.05 + i * 0.01,
        longitude: DENVER_LNG + 0.05 + i * 0.01,
      }));
    // Pool contains Mines but NOT Bentley, plus enough generic D2s to satisfy trigger 3.
    const pool = [makeMines(), ...makeGenericD2s(30), ...d3Pool];
    const scoringOutput = makeScoringOutput({
      athFit: { D2: 0.60, D3: 0.70 },
      acadRigorScore: 0.90,
      scored: pool,
      top30: [makeMines(), ...d3Pool.slice(0, 29)],
    });

    const result = applyG9SubordinateStep(scoringOutput, profile, pool);

    const d2s = result.top30.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(1);
    expect(d2s[0].school_name).toBe('Colorado School of Mines');
    const d3s = result.top30.filter(s => s.type === 'D3');
    expect(d3s[0].school_name).toBe('D3 School 0');
  });

  // ---------------------------------------------------------------------------
  // Sprint 005 D2 — Recruit Reach radius applied AFTER the academic mixer
  // ---------------------------------------------------------------------------
  // The high-academic D2/D3 mixer (G9) used to skip the radius check. After
  // the Sprint 005 fix, both halves of the mix (the named D2 cap and the D3
  // fill) must drop schools outside the per-tier RECRUIT_BUDGETS radius.
  // The four assertions below pin that contract.
  // ---------------------------------------------------------------------------

  describe('Sprint 005 D2 — Recruit Reach radius post-mixer', () => {
    it('i) drops D3 schools outside the D3 radius (450 mi) after the mixer fires', () => {
      const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
      // 5 nearby D3s (within radius), 5 far D3s (Pacific coast, > 2000 mi).
      const nearD3s = makeD3Pool(5, 300000).map((s, i) => ({
        ...s,
        latitude: EAST_COAST_LAT + i * 0.05,
        longitude: EAST_COAST_LNG + i * 0.05,
      }));
      const farD3s = makeD3Pool(5, 310000).map((s, i) => ({
        ...s,
        latitude: 47.6 + i * 0.05,   // Seattle-ish
        longitude: -122.3 + i * 0.05,
        // Boost acadScore so absent the radius filter, these would rank first.
        acadScore: 0.99 - i * 0.001,
        schoolRigor: 0.99 - i * 0.001,
      }));
      const pool = [
        makeBentley({ latitude: EAST_COAST_LAT + 0.10, longitude: EAST_COAST_LNG }),
        makeMines({ latitude: EAST_COAST_LAT + 1.50, longitude: EAST_COAST_LNG }),
        ...makeGenericD2s(30),
        ...nearD3s,
        ...farD3s,
      ];
      const scoringOutput = makeScoringOutput({
        athFit: { D2: 0.60, D3: 0.70 },
        acadRigorScore: 0.90,
        scored: pool,
        top30: [],
      });

      const result = applyG9SubordinateStep(scoringOutput, profile, pool);
      const d3s = result.top30.filter(s => s.type === 'D3');
      // Every D3 returned must be a near (in-radius) one — none of the
      // higher-acadScore Pacific-coast D3s should leak through despite
      // ranking better academically.
      const nearIds = new Set(nearD3s.map(s => s.unitid));
      d3s.forEach(s => expect(nearIds.has(s.unitid)).toBe(true));
    });

    it('j) drops the Bentley/Mines D2 cap entry that is outside D2 radius (600 mi)', () => {
      // Real-coord positions: student in Boston, Mines in Golden CO -> ~1700 mi
      // -> Mines must be filtered out by the new D2-radius check. Bentley
      // remains and is the only D2 in the result.
      const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
      const nearD3s = makeD3Pool(20, 300000).map((s, i) => ({
        ...s,
        latitude: EAST_COAST_LAT + i * 0.05,
        longitude: EAST_COAST_LNG + i * 0.05,
      }));
      const pool = [
        makeBentley(),                     // real coords: ~3 mi from student -> in radius
        makeMines(),                       // real coords: ~1700 mi from student -> out of radius
        ...makeGenericD2s(30),
        ...nearD3s,
      ];
      const scoringOutput = makeScoringOutput({
        athFit: { D2: 0.60, D3: 0.70 },
        acadRigorScore: 0.90,
        scored: pool,
        top30: [],
      });

      const result = applyG9SubordinateStep(scoringOutput, profile, pool);
      const d2s = result.top30.filter(s => s.type === 'D2');
      expect(d2s).toHaveLength(1);
      expect(d2s[0].school_name).toBe('Bentley University');
    });

    it('k) every returned school passes the per-tier Recruit Reach radius', () => {
      // Mixed pool: in- and out-of-radius schools at every tier we touch.
      const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
      const inRadiusD3s = makeD3Pool(10, 300000).map((s, i) => ({
        ...s,
        latitude: EAST_COAST_LAT + i * 0.05,
        longitude: EAST_COAST_LNG + i * 0.05,
      }));
      const outOfRadiusD3s = makeD3Pool(10, 310000).map((s, i) => ({
        ...s,
        latitude: 47.6 + i * 0.05,
        longitude: -122.3 + i * 0.05,
      }));
      const pool = [
        makeBentley(),
        makeMines(),                                         // out of D2 radius for east-coast student
        ...makeGenericD2s(30),
        ...inRadiusD3s,
        ...outOfRadiusD3s,
      ];
      const scoringOutput = makeScoringOutput({
        athFit: { D2: 0.60, D3: 0.70 },
        acadRigorScore: 0.90,
        scored: pool,
        top30: [],
      });

      const result = applyG9SubordinateStep(scoringOutput, profile, pool);
      // Every returned school's haversine distance must be <= the per-tier
      // RECRUIT_BUDGETS radius.
      const R = 3959;
      function hav(lat1, lng1, lat2, lng2) {
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(a));
      }
      const radiusByTier = { D2: 600, D3: 450 };
      result.top30.forEach(s => {
        const d = hav(EAST_COAST_LAT, EAST_COAST_LNG, +s.latitude, +s.longitude);
        const r = radiusByTier[s.type];
        expect(d).toBeLessThanOrEqual(r);
      });
    });

    it('l) radius is applied AFTER the mixer (academic ordering preserved within in-radius D3s)', () => {
      // High-academic-but-far D3s should be dropped; mid-academic in-radius
      // D3s should fill the slots in DESCENDING acadScore order. Asserts
      // the radius filter is the LAST filter, not interleaved with sort.
      const profile = makeProfile({ lat: EAST_COAST_LAT, lng: EAST_COAST_LNG });
      const inRadiusMid = [
        { unitid: 400001, school_name: 'Near-Mid A', type: 'D3',
          latitude: EAST_COAST_LAT + 0.10, longitude: EAST_COAST_LNG,
          acadScore: 0.70, schoolRigor: 0.70, eligible: true },
        { unitid: 400002, school_name: 'Near-Mid B', type: 'D3',
          latitude: EAST_COAST_LAT + 0.20, longitude: EAST_COAST_LNG,
          acadScore: 0.85, schoolRigor: 0.85, eligible: true },
        { unitid: 400003, school_name: 'Near-Mid C', type: 'D3',
          latitude: EAST_COAST_LAT + 0.30, longitude: EAST_COAST_LNG,
          acadScore: 0.60, schoolRigor: 0.60, eligible: true },
      ];
      const farHigh = [
        { unitid: 400101, school_name: 'Far-High A', type: 'D3',
          latitude: 47.6, longitude: -122.3,
          acadScore: 0.99, schoolRigor: 0.99, eligible: true },
      ];
      const pool = [
        makeBentley({ latitude: EAST_COAST_LAT + 0.10, longitude: EAST_COAST_LNG }),
        ...makeGenericD2s(30),
        ...inRadiusMid,
        ...farHigh,
      ];
      const scoringOutput = makeScoringOutput({
        athFit: { D2: 0.60, D3: 0.70 },
        acadRigorScore: 0.90,
        scored: pool,
        top30: [],
      });

      const result = applyG9SubordinateStep(scoringOutput, profile, pool);
      const d3s = result.top30.filter(s => s.type === 'D3');
      // Far-High A must be dropped despite being top-acadScore.
      expect(d3s.find(s => s.school_name === 'Far-High A')).toBeUndefined();
      // The three near-mid D3s appear in descending acadScore.
      const order = d3s.slice(0, 3).map(s => s.school_name);
      expect(order).toEqual(['Near-Mid B', 'Near-Mid A', 'Near-Mid C']);
    });
  });
});
