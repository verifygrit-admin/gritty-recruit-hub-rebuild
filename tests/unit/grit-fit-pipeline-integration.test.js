/**
 * grit-fit-pipeline-integration.test.js — Sprint 004 Wave 5 Phase 1.
 *
 * REGRESSION CANARY: guards the full GRIT FIT data-flow pipeline. Sprint 004
 * Track B originally wired G9 into runGritFitScoring, but the Sprint 003
 * view-layer call to applyMatchReturnLogic overwrote G9's top30 before the
 * UI ever saw it. Phase 1 manual verification caught the double-pipeline
 * bug. Operator ruling: consolidate G9 into applyMatchReturnLogic as the
 * OUTER cap gate. applyMatchReturnLogic is now the single source of truth
 * for all cap logic across the app.
 *
 * These assertions exercise runGritFitScoring -> sort -> applyMatchReturnLogic
 * with the new { profile, schoolsPool } options argument, and verify G9's
 * cap-and-fill is visible at the end point. This is the test that would
 * have caught the original bug.
 */

import { describe, it, expect } from 'vitest';
import { runGritFitScoring } from '../../src/lib/scoring.js';
import {
  applyMatchReturnLogic,
  MATCH_RETURN_LIMIT,
} from '../../src/lib/grit-fit/matchReturnLogic.js';

// ---------------------------------------------------------------------------
// Real-world lat/lng for the two named G9 D2 schools
// ---------------------------------------------------------------------------
const BENTLEY = {
  unitid: 166027,
  school_name: 'Bentley University',
  institution_name: 'Bentley University',
  type: 'D2',
  latitude: 42.388,
  longitude: -71.217,
};
const MINES = {
  unitid: 126818,
  school_name: 'Colorado School of Mines',
  institution_name: 'Colorado School of Mines',
  type: 'D2',
  latitude: 39.751,
  longitude: -105.222,
};

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/**
 * Trigger-matching student profile.
 * WR with 72" / 180lb / 4.70 40 yields AF at D2 and D3 above 0.50 but AF at
 * Power4/G6/FCS below 0.50 — so topTier resolves to D2, not Power 4.
 * SAT 1550 + GPA 4.0 senior pushes acadRigorScore >= 0.85.
 * hs_lat/lng placed on east coast so Bentley is closer than Mines.
 * Modest boost (captain only = +0.05) so higher tiers remain below threshold.
 */
function triggerMatchingProfile() {
  return {
    position: 'WR',
    height: 72,
    weight: 180,
    speed_40: 4.70,
    gpa: 4.0,
    sat: 1550,
    hs_lat: 42.36,
    hs_lng: -71.06,
    state: 'MA',
    agi: 80000,
    dependents: 2,
    grad_year: 2027,
    captain: true,
  };
}

/**
 * Non-trigger-matching profile: middling athletics so AF@D2 ~ 0.30, well
 * below the 0.50 threshold.
 */
function nonTriggerProfile() {
  return {
    position: 'WR',
    height: 68,
    weight: 160,
    speed_40: 5.00,
    gpa: 2.8,
    sat: 1000,
    hs_lat: 42.36,
    hs_lng: -71.06,
    state: 'MA',
    agi: 80000,
    dependents: 2,
    grad_year: 2027,
  };
}

/**
 * Build a D2 school fixture that passes the engine's eligibility gates
 * (tier match, distance, academic rigor) for a senior-year student with
 * acadRigorScore >= 0.85.
 */
function makeD2(unitid, name, lat, lng, acadRigorSenior = 0.70) {
  return {
    unitid,
    school_name: name,
    institution_name: name,
    type: 'D2',
    latitude: lat,
    longitude: lng,
    acad_rigor_senior: acadRigorSenior,
    acad_rigor_test_opt_senior: acadRigorSenior,
    is_test_optional: false,
    coa_out_of_state: 50000,
    graduation_rate: 0.80,
    dltv: 1500000,
    control: 'Private',
    school_type: 'Selective',
    ncaa_division: '2-Div II',
    conference: 'NE10',
  };
}

function makeD3(unitid, name, lat, lng, acadRigorSenior) {
  return {
    unitid,
    school_name: name,
    institution_name: name,
    type: 'D3',
    latitude: lat,
    longitude: lng,
    acad_rigor_senior: acadRigorSenior,
    acad_rigor_test_opt_senior: acadRigorSenior,
    is_test_optional: false,
    coa_out_of_state: 50000,
    graduation_rate: 0.85,
    dltv: 1500000,
    control: 'Private',
    school_type: 'Selective',
    ncaa_division: '3-Div III',
    conference: 'NESCAC',
  };
}

/**
 * Pool with >=30 D2 (Trigger 3 passes) including Bentley + Mines, plus
 * D3 fill sources for the cap filler.
 */
function poolTriggerPassing() {
  const pool = [
    makeD2(BENTLEY.unitid, BENTLEY.school_name, BENTLEY.latitude, BENTLEY.longitude, 0.85),
    makeD2(MINES.unitid, MINES.school_name, MINES.latitude, MINES.longitude, 0.85),
  ];
  // 30 additional D2s within 450-mile reach of east-coast student (roughly
  // near Bentley) so they pass distance gate for D2 topTier.
  for (let i = 0; i < 30; i++) {
    pool.push(makeD2(300000 + i, `Generic D2 ${i}`, 42.0 + i * 0.05, -71.0 - i * 0.1, 0.70));
  }
  // 40 D3s with descending acadRigor so sort order is stable.
  for (let i = 0; i < 40; i++) {
    pool.push(makeD3(400000 + i, `D3 School ${i}`, 42.1 + i * 0.01, -71.1 - i * 0.01, 0.85 - i * 0.005));
  }
  return pool;
}

/**
 * Pool with only 10 D2 (Trigger 3 fails — need >=30).
 */
function poolTrigger3Failing() {
  const pool = [
    makeD2(BENTLEY.unitid, BENTLEY.school_name, BENTLEY.latitude, BENTLEY.longitude, 0.85),
    makeD2(MINES.unitid, MINES.school_name, MINES.latitude, MINES.longitude, 0.85),
  ];
  for (let i = 0; i < 8; i++) {
    pool.push(makeD2(300000 + i, `Generic D2 ${i}`, 42.0 + i * 0.05, -71.0 - i * 0.1, 0.70));
  }
  for (let i = 0; i < 40; i++) {
    pool.push(makeD3(400000 + i, `D3 School ${i}`, 42.1 + i * 0.01, -71.1 - i * 0.01, 0.85 - i * 0.005));
  }
  return pool;
}

/**
 * Run the full pipeline exactly as the view does.
 */
function runPipeline(profile, pool, options) {
  const result = runGritFitScoring(profile, pool);
  const eligibleSorted = (result.scored || [])
    .filter(s => s.eligible)
    .sort((a, b) => b.acadScore - a.acadScore);
  const top = applyMatchReturnLogic(
    eligibleSorted,
    result.athFit,
    result.acadRigorScore,
    MATCH_RETURN_LIMIT,
    options,
  );
  return { result, eligibleSorted, top };
}

// ---------------------------------------------------------------------------
// Assertion suite
// ---------------------------------------------------------------------------

describe('GRIT FIT pipeline integration — Sprint 004 Wave 5 Phase 1', () => {
  //
  // (1) Trigger-matching profile + pool → G9 cap-and-fill visible at end point
  //
  it('trigger-matching profile + pool → final top30 has Bentley + Mines + D3 fill (G9 visible at pipeline end)', () => {
    const profile = triggerMatchingProfile();
    const pool = poolTriggerPassing();
    const { result, top } = runPipeline(profile, pool, { profile, schoolsPool: pool });

    // Sanity check on the scoring engine's triggers before asserting the cap.
    expect(result.athFit.D2).toBeGreaterThanOrEqual(0.5);
    expect(result.athFit.D3).toBeGreaterThanOrEqual(0.5);
    expect(result.acadRigorScore).toBeGreaterThanOrEqual(0.85);

    const names = top.map(s => s.school_name);
    expect(names).toContain('Bentley University');
    expect(names).toContain('Colorado School of Mines');

    const d2s = top.filter(s => s.type === 'D2');
    const d3s = top.filter(s => s.type === 'D3');
    expect(d2s).toHaveLength(2);
    expect(d3s.length).toBeGreaterThan(0);
  });

  //
  // (2) Ordering + cap length + D3 monotonic descending
  //
  it('trigger-matching → Bentley/Mines first two, length ≤ 30, D3 fill descending', () => {
    const profile = triggerMatchingProfile();
    const pool = poolTriggerPassing();
    const { top } = runPipeline(profile, pool, { profile, schoolsPool: pool });

    expect(top.length).toBeLessThanOrEqual(30);
    // east-coast student → Bentley closer than Mines
    expect(top[0].school_name).toBe('Bentley University');
    expect(top[1].school_name).toBe('Colorado School of Mines');

    // D3 fill should start with the highest-rigor D3 — our fixture inserts
    // D3s with acad_rigor_senior descending (i=0 highest), and G9's stable
    // sort preserves that order when acadScore hasn't been computed on the
    // raw pool entries passed into the fill.
    const d3s = top.filter(s => s.type === 'D3');
    expect(d3s.length).toBeGreaterThan(0);
    expect(d3s[0].school_name).toBe('D3 School 0');
  });

  //
  // (3) Trigger 3 fails (< 30 D2 in pool) → G9 does NOT force Bentley+Mines cap
  //
  it('Trigger 3 fails (pool has < 30 D2) → G9 does NOT fire; Sprint 003 cap shape only', () => {
    const profile = triggerMatchingProfile();
    const pool = poolTrigger3Failing();
    const { top } = runPipeline(profile, pool, { profile, schoolsPool: pool });

    // Distinguishing property:
    //   - If G9 FIRED: top would contain Bentley + Mines PLUS a D3 fill from
    //     the raw pool (40 D3s available → length 30).
    //   - If G9 did NOT fire (Trigger 3 fails): Sprint 003's cap kicks in,
    //     operating on the already-eligible scored list. With topTier=D2,
    //     only D2 schools are eligible, so no D3 fill is available —
    //     Sprint 003 produces length 2 (Bentley + Mines only).
    // Asserting length < 30 and no D3 fill confirms G9 did not fire.
    const d3s = top.filter(s => s.type === 'D3');
    expect(d3s).toHaveLength(0);
    expect(top.length).toBeLessThan(30);
  });

  //
  // (4) Non-trigger profile → normal Sprint 003 flow
  //
  it('non-trigger-matching profile → normal top-N sort (no forced cap)', () => {
    const profile = nonTriggerProfile();
    const pool = poolTriggerPassing();
    const { result, top } = runPipeline(profile, pool, { profile, schoolsPool: pool });

    // Neither Sprint 003 nor G9 trigger should fire.
    expect(result.athFit.D2 < 0.5 || result.acadRigorScore < 0.85).toBe(true);
    // The output is normal top-N; should not be forcibly 2 D2s.
    const d2s = top.filter(s => s.type === 'D2');
    const onlyBentleyMines = d2s.length === 2
      && d2s.every(s => s.school_name === 'Bentley University'
        || s.school_name === 'Colorado School of Mines');
    expect(onlyBentleyMines).toBe(false);
  });

  //
  // (5) Backward compat: calling applyMatchReturnLogic WITHOUT options returns
  //     the same result as with the 4-arg signature (preserves Sprint 003
  //     behavior for existing callers / tests).
  //
  it('backward compat: 4-arg call signature produces identical result to 5-arg call with empty options', () => {
    const profile = triggerMatchingProfile();
    const pool = poolTriggerPassing();
    const result = runGritFitScoring(profile, pool);
    const eligibleSorted = (result.scored || [])
      .filter(s => s.eligible)
      .sort((a, b) => b.acadScore - a.acadScore);

    const fourArg = applyMatchReturnLogic(
      eligibleSorted,
      result.athFit,
      result.acadRigorScore,
      MATCH_RETURN_LIMIT,
    );
    const fiveArgEmpty = applyMatchReturnLogic(
      eligibleSorted,
      result.athFit,
      result.acadRigorScore,
      MATCH_RETURN_LIMIT,
      {},
    );
    expect(fourArg).toEqual(fiveArgEmpty);
  });

  //
  // (6) Pass-through purity: when G9 fires, the eligibleSorted input passed
  //     into applyMatchReturnLogic is NOT mutated.
  //
  it('pipeline purity: eligibleSorted input is not mutated by the G9-gated call', () => {
    const profile = triggerMatchingProfile();
    const pool = poolTriggerPassing();
    const result = runGritFitScoring(profile, pool);
    const eligibleSorted = (result.scored || [])
      .filter(s => s.eligible)
      .sort((a, b) => b.acadScore - a.acadScore);

    const snapshot = {
      length: eligibleSorted.length,
      firstUnitid: eligibleSorted[0]?.unitid,
      lastUnitid: eligibleSorted[eligibleSorted.length - 1]?.unitid,
    };
    applyMatchReturnLogic(
      eligibleSorted,
      result.athFit,
      result.acadRigorScore,
      MATCH_RETURN_LIMIT,
      { profile, schoolsPool: pool },
    );
    expect(eligibleSorted.length).toBe(snapshot.length);
    expect(eligibleSorted[0]?.unitid).toBe(snapshot.firstUnitid);
    expect(eligibleSorted[eligibleSorted.length - 1]?.unitid).toBe(snapshot.lastUnitid);
  });
});
