/**
 * match-return-logic.test.js — Sprint 003 D4 (new match-return rule).
 *
 * Covers:
 *   - default ranking for non-qualifying profiles
 *   - D2-cap-at-2 for qualifying profiles
 *   - Recruit Reach interaction (if a qualifying D2 is not eligible in the
 *     scored list it cannot be returned)
 *   - boundary: acadRigorScore exactly 0.85 qualifies
 */

import { describe, it, expect } from 'vitest';
import {
  applyMatchReturnLogic,
  qualifiesForD2Cap,
  HIGH_ACADEMIC_THRESHOLD,
  D2_CAP,
  MATCH_RETURN_LIMIT,
} from '../../src/lib/grit-fit/matchReturnLogic.js';

function mk(unitid, type, acadScore, school_name = `S${unitid}`) {
  return { unitid, type, acadScore, school_name, eligible: true };
}

describe('qualifiesForD2Cap', () => {
  it('true when D2 ≥ 0.5, D3 ≥ 0.5, acad ≥ 0.85', () => {
    expect(qualifiesForD2Cap({ D2: 0.51, D3: 0.6 }, 0.86)).toBe(true);
  });
  it('true at exact boundary acad = 0.85', () => {
    expect(qualifiesForD2Cap({ D2: 0.5, D3: 0.5 }, 0.85)).toBe(true);
  });
  it('false when acad < 0.85', () => {
    expect(qualifiesForD2Cap({ D2: 0.8, D3: 0.8 }, 0.849)).toBe(false);
  });
  it('false when D2 or D3 < 0.5', () => {
    expect(qualifiesForD2Cap({ D2: 0.49, D3: 0.7 }, 0.9)).toBe(false);
    expect(qualifiesForD2Cap({ D2: 0.7, D3: 0.49 }, 0.9)).toBe(false);
  });
  it('false on missing athFit or acadScore', () => {
    expect(qualifiesForD2Cap(null, 0.9)).toBe(false);
    expect(qualifiesForD2Cap({ D2: 0.5, D3: 0.5 }, null)).toBe(false);
  });
});

describe('applyMatchReturnLogic — non-qualifying profiles', () => {
  it('returns top N unchanged when profile does not qualify', () => {
    const scored = Array.from({ length: 35 }, (_, i) => mk(1000 + i, 'Power 4', 1 - i * 0.01));
    const athFit = { 'Power 4': 0.9, 'D2': 0.2, 'D3': 0.2 };
    const out = applyMatchReturnLogic(scored, athFit, 0.9);
    expect(out).toHaveLength(MATCH_RETURN_LIMIT);
    expect(out[0].unitid).toBe(1000);
    expect(out[29].unitid).toBe(1029);
  });
});

describe('applyMatchReturnLogic — qualifying profiles', () => {
  const athFit = { 'D2': 0.6, 'D3': 0.7 };
  const acad = 0.9;

  it('caps D2 returns at 2 (Bentley + Colorado School of Mines)', () => {
    const scored = [
      mk(1, 'D2', 0.95, 'Bentley University'),
      mk(2, 'D2', 0.94, 'Colorado School of Mines'),
      mk(3, 'D2', 0.93, 'Some Other D2'),
      mk(4, 'D2', 0.92, 'Another D2'),
      ...Array.from({ length: 40 }, (_, i) => mk(100 + i, 'D3', 0.9 - i * 0.01)),
    ];
    const out = applyMatchReturnLogic(scored, athFit, acad);
    const d2s = out.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(D2_CAP);
    const d2Names = d2s.map(s => s.school_name).sort();
    expect(d2Names).toEqual(['Bentley University', 'Colorado School of Mines']);
  });

  it('fills remaining slots with highest-qualifying D3 schools', () => {
    const scored = [
      mk(1, 'D2', 0.95, 'Bentley University'),
      mk(2, 'D2', 0.94, 'Colorado School of Mines'),
      ...Array.from({ length: 40 }, (_, i) => mk(100 + i, 'D3', 0.9 - i * 0.01)),
    ];
    const out = applyMatchReturnLogic(scored, athFit, acad);
    expect(out).toHaveLength(MATCH_RETURN_LIMIT);
    const d3s = out.filter(s => s.type === 'D3');
    expect(d3s).toHaveLength(MATCH_RETURN_LIMIT - D2_CAP);
    expect(d3s[0].unitid).toBe(100);
  });

  it('respects Recruit Reach — qualifying D2 outside reach is absent from input and therefore from output', () => {
    // Bentley is out of reach → not in scored list. Only Colorado School of Mines present.
    const scored = [
      mk(2, 'D2', 0.94, 'Colorado School of Mines'),
      ...Array.from({ length: 40 }, (_, i) => mk(100 + i, 'D3', 0.9 - i * 0.01)),
    ];
    const out = applyMatchReturnLogic(scored, athFit, acad);
    const d2s = out.filter(s => s.type === 'D2');
    expect(d2s).toHaveLength(1);
    expect(d2s[0].school_name).toBe('Colorado School of Mines');
    const d3s = out.filter(s => s.type === 'D3');
    expect(d3s).toHaveLength(MATCH_RETURN_LIMIT - 1);
  });

  it('returns fewer than MATCH_RETURN_LIMIT when D3 pool is small', () => {
    const scored = [
      mk(1, 'D2', 0.95, 'Bentley University'),
      mk(2, 'D2', 0.94, 'Colorado School of Mines'),
      mk(100, 'D3', 0.9),
      mk(101, 'D3', 0.85),
    ];
    const out = applyMatchReturnLogic(scored, athFit, acad);
    expect(out).toHaveLength(4);
  });

  it('HIGH_ACADEMIC_THRESHOLD is 0.85', () => {
    expect(HIGH_ACADEMIC_THRESHOLD).toBe(0.85);
  });
});
