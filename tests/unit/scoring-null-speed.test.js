/**
 * scoring-null-speed.test.js — Item 5 Scoring Gate Tests
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-29
 * Suite: TC-ITEM5-001 through TC-ITEM5-005
 *
 * Covers:
 *   TC-ITEM5-001: calcAthleticFit returns reduced score when speed40 is null
 *   TC-ITEM5-002: calcAthleticFit scores correctly for valid speed40
 *   TC-ITEM5-003: calcAthleticFit returns 0 for unknown tier/position
 *   TC-ITEM5-004: calcAthleticFit treats speed40=0 identically to null
 *   TC-ITEM5-005: runGritFitScoring zero-match profile — top30 empty
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { calcAthleticFit, runGritFitScoring } from '../../src/lib/scoring.js';
import { makeProfileStub } from './fixtures/profiles.js';
import { makeSchoolStub } from './fixtures/schools.js';

// ── TC-ITEM5-001 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-001: calcAthleticFit — null speed_40 returns reduced score', () => {
  it('returns a score between 0 and 0.667 when speed40 is null (sScore forced to 0)', () => {
    const result = calcAthleticFit('WR', 73, 185, null, 'G6');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0.667);
  });

  it('result is less than what a valid fast speed would produce', () => {
    const nullResult = calcAthleticFit('WR', 73, 185, null, 'G6');
    const withSpeed = calcAthleticFit('WR', 73, 185, 4.55, 'G6');
    expect(nullResult).toBeLessThan(withSpeed);
  });

  it('sScore contribution is 0 — overall score is approximately (hScore + wScore) / 3', () => {
    // At G6 WR median h=73, w=185: hScore ≈ 0.5, wScore ≈ 0.5
    // Expected: (0.5 + 0.5 + 0) / 3 ≈ 0.333
    const result = calcAthleticFit('WR', 73, 185, null, 'G6');
    expect(result).toBeGreaterThan(0.28);
    expect(result).toBeLessThan(0.40);
  });
});

// ── TC-ITEM5-002 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-002: calcAthleticFit — valid speed40 scores correctly', () => {
  it('returns ~0.5 when athlete is at median h/w/speed for G6 WR', () => {
    const result = calcAthleticFit('WR', 73, 185, 4.55, 'G6');
    expect(result).toBeGreaterThan(0.40);
    expect(result).toBeLessThan(0.65);
  });

  it('returns a higher score for athlete faster than median', () => {
    const medianResult = calcAthleticFit('WR', 73, 185, 4.55, 'G6');
    const fastResult = calcAthleticFit('WR', 73, 185, 4.35, 'G6');
    expect(fastResult).toBeGreaterThan(medianResult);
  });

  it('returns a lower score for athlete slower than median', () => {
    const medianResult = calcAthleticFit('WR', 73, 185, 4.55, 'G6');
    const slowResult = calcAthleticFit('WR', 73, 185, 4.80, 'G6');
    expect(slowResult).toBeLessThan(medianResult);
  });
});

// ── TC-ITEM5-003 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-003: calcAthleticFit — unknown tier/position returns 0', () => {
  it('returns 0 for a tier not in ATH_STANDARDS', () => {
    const result = calcAthleticFit('WR', 73, 185, 4.55, 'Not A Tier');
    expect(result).toBe(0);
  });

  it('returns 0 for an unknown position within a valid tier', () => {
    const result = calcAthleticFit('QUARTERBACK', 75, 210, 4.60, 'Power 4');
    expect(result).toBe(0);
  });
});

// ── TC-ITEM5-004 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-004: calcAthleticFit — speed40=0 treated identically to null', () => {
  it('speed40=0 and speed40=null produce the same score', () => {
    const nullResult = calcAthleticFit('WR', 73, 185, null, 'G6');
    const zeroResult = calcAthleticFit('WR', 73, 185, 0, 'G6');
    expect(zeroResult).toBe(nullResult);
  });

  it('speed40=0 does NOT produce a near-perfect score (regression guard)', () => {
    const result = calcAthleticFit('WR', 73, 185, 0, 'G6');
    expect(result).toBeLessThan(0.50);
  });
});

// ── TC-ITEM5-005 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-005: runGritFitScoring — zero-match profile', () => {
  it('returns empty top30 when profile athletic tier has no matching schools', () => {
    const profile = makeProfileStub({
      position: 'WR',
      height: 65,
      weight: 145,
      speed_40: 5.50,
      gpa: 3.5,
      sat: 1100,
      state: 'MA',
    });

    const schools = [
      makeSchoolStub({ type: 'G6' }),
      makeSchoolStub({ unitid: 100002, type: 'G6' }),
    ];

    const result = runGritFitScoring(profile, schools);
    expect(result.top30).toHaveLength(0);
    expect(result.gates.passAll).toBe(0);
  });

  it('returns empty top30 when no school is within recruit reach distance', () => {
    const profile = makeProfileStub({
      hs_lat: 21.3069,
      hs_lng: -157.8583,
      state: 'HI',
      position: 'WR',
      height: 73,
      weight: 185,
      speed_40: 4.55,
    });

    const schools = [
      makeSchoolStub({ type: 'G6', latitude: '42.36', longitude: '-71.05' }),
    ];

    const result = runGritFitScoring(profile, schools);
    expect(result.top30).toHaveLength(0);
    expect(result.gates.passDist).toBe(0);
  });
});
