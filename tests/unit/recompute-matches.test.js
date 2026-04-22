/**
 * recompute-matches.test.js — Sprint 003 D4 (What-If sliders recomputation).
 *
 * Verifies buildOverriddenProfile merges correctly and recomputeMatches runs
 * the full scoring pipeline end-to-end on a fixture profile, returning a
 * scoringResult-shaped object. We do not re-test scoring internals here —
 * just that overrides flow through and match-return-logic is applied.
 */

import { describe, it, expect } from 'vitest';
import {
  buildOverriddenProfile,
  recomputeMatches,
  SLIDER_KEYS,
} from '../../src/lib/grit-fit/recomputeMatches.js';

describe('buildOverriddenProfile', () => {
  const base = { height: 72, weight: 200, speed_40: 4.6, gpa: 3.5, sat: 1200, position: 'WR' };

  it('returns the base profile when overrides are empty', () => {
    expect(buildOverriddenProfile(base, {})).toEqual(base);
  });

  it('only overrides whitelisted slider keys', () => {
    const merged = buildOverriddenProfile(base, { gpa: 4.0, position: 'QB' });
    expect(merged.gpa).toBe(4.0);
    expect(merged.position).toBe('WR'); // not in SLIDER_KEYS — preserved
  });

  it('ignores null / undefined / empty-string override values', () => {
    const merged = buildOverriddenProfile(base, { gpa: null, sat: '', height: undefined });
    expect(merged.gpa).toBe(3.5);
    expect(merged.sat).toBe(1200);
    expect(merged.height).toBe(72);
  });

  it('exposes the SLIDER_KEYS list', () => {
    expect(SLIDER_KEYS).toEqual(['height', 'weight', 'speed_40', 'gpa', 'sat']);
  });
});

describe('recomputeMatches', () => {
  // Minimal viable schools fixture: 3 schools of varying tiers so scoring
  // produces nonzero output without depending on real tier data.
  const schools = [
    {
      unitid: 1, school_name: 'A', type: 'D3',
      latitude: 42.3, longitude: -71.0,
      acad_rigor_senior: 0.3, acad_rigor_test_opt_senior: 0.3,
      coa_out_of_state: 50000, graduation_rate: 80, dltv: 1500000,
      control: 'Private', school_type: 'Selective', ncaa_division: '3-Div III',
      conference: 'NESCAC',
    },
    {
      unitid: 2, school_name: 'B', type: 'D2',
      latitude: 42.3, longitude: -71.2,
      acad_rigor_senior: 0.4, acad_rigor_test_opt_senior: 0.4,
      coa_out_of_state: 40000, graduation_rate: 70, dltv: 1200000,
      control: 'Private', school_type: 'Selective', ncaa_division: '2-Div II',
      conference: 'NE10',
    },
  ];

  const baseProfile = {
    position: 'WR', height: 71, weight: 180, speed_40: 4.7,
    gpa: 3.5, sat: 1200,
    hs_lat: 42.3, hs_lng: -71.1, state: 'MA',
    grad_year: new Date().getFullYear() + 1,
  };

  it('returns a scoringResult-shaped object with athFit and scorecards', () => {
    const result = recomputeMatches(baseProfile, schools, {});
    expect(result).toHaveProperty('athFit');
    expect(result).toHaveProperty('academicRigorScore');
    expect(result).toHaveProperty('testOptionalScore');
    expect(Array.isArray(result.top30)).toBe(true);
  });

  it('overrides shift the academic rigor score', () => {
    const base = recomputeMatches(baseProfile, schools, {});
    const higher = recomputeMatches(baseProfile, schools, { gpa: 4.0, sat: 1500 });
    expect(higher.academicRigorScore).toBeGreaterThan(base.academicRigorScore);
  });
});
