/**
 * table-sort.test.js — Sprint 004 G7a
 *
 * Pure-function tests for sortSchoolsByMobileKey. Node env (no jsdom / RTL).
 *
 * Ordering contract:
 *   rank       — ascending matchRank (best first)
 *   distance   — ascending dist (closest first)
 *   adltv      — descending adltv (highest value first)
 *   annualCost — ascending netCost (lowest cost first)
 *   null/undefined values go last in every case
 *   function returns a NEW array (does not mutate input)
 */

import { describe, it, expect } from 'vitest';
import { sortSchoolsByMobileKey } from '../../src/lib/grit-fit/tableSort.js';

const fixtures = [
  { unitid: 1, matchRank: 3, dist: 120, adltv: 50000, netCost: 22000 },
  { unitid: 2, matchRank: 1, dist: 300, adltv: 10000, netCost: 8000  },
  { unitid: 3, matchRank: 2, dist: 45,  adltv: 95000, netCost: 31000 },
  { unitid: 4, matchRank: 4, dist: 220, adltv: 30000, netCost: 15000 },
];

describe('G7a — sortSchoolsByMobileKey', () => {
  it('rank: ascending matchRank (best first)', () => {
    const out = sortSchoolsByMobileKey(fixtures, 'rank');
    expect(out.map(s => s.matchRank)).toEqual([1, 2, 3, 4]);
  });

  it('distance: ascending dist (closest first)', () => {
    const out = sortSchoolsByMobileKey(fixtures, 'distance');
    expect(out.map(s => s.dist)).toEqual([45, 120, 220, 300]);
  });

  it('adltv: descending adltv (highest value first)', () => {
    const out = sortSchoolsByMobileKey(fixtures, 'adltv');
    expect(out.map(s => s.adltv)).toEqual([95000, 50000, 30000, 10000]);
  });

  it('annualCost: ascending netCost (lowest first)', () => {
    const out = sortSchoolsByMobileKey(fixtures, 'annualCost');
    expect(out.map(s => s.netCost)).toEqual([8000, 15000, 22000, 31000]);
  });

  it('null / undefined values go last in every direction', () => {
    const withNulls = [
      { unitid: 10, matchRank: 2, dist: null,      adltv: null,      netCost: null      },
      { unitid: 11, matchRank: 1, dist: 50,        adltv: 40000,     netCost: 10000     },
      { unitid: 12, matchRank: 3, dist: undefined, adltv: undefined, netCost: undefined },
      { unitid: 13, matchRank: 4, dist: 200,       adltv: 80000,     netCost: 25000     },
    ];

    // distance (asc) — real values first, nulls last
    const byDist = sortSchoolsByMobileKey(withNulls, 'distance');
    expect(byDist.slice(0, 2).map(s => s.dist)).toEqual([50, 200]);
    const distTail = byDist.slice(2).map(s => s.dist);
    expect(distTail.every(v => v == null)).toBe(true);

    // adltv (desc) — nulls still last even in descending direction
    const byAdltv = sortSchoolsByMobileKey(withNulls, 'adltv');
    expect(byAdltv.slice(0, 2).map(s => s.adltv)).toEqual([80000, 40000]);
    const adltvTail = byAdltv.slice(2).map(s => s.adltv);
    expect(adltvTail.every(v => v == null)).toBe(true);

    // annualCost (asc) — nulls last
    const byCost = sortSchoolsByMobileKey(withNulls, 'annualCost');
    expect(byCost.slice(0, 2).map(s => s.netCost)).toEqual([10000, 25000]);
    const costTail = byCost.slice(2).map(s => s.netCost);
    expect(costTail.every(v => v == null)).toBe(true);
  });

  it('returns a new array and does not mutate input', () => {
    const input = [...fixtures];
    const before = input.map(s => s.unitid);
    const out = sortSchoolsByMobileKey(input, 'rank');
    expect(out).not.toBe(input);
    expect(input.map(s => s.unitid)).toEqual(before);
  });

  it('unknown key falls back to rank semantics', () => {
    const out = sortSchoolsByMobileKey(fixtures, 'totally-unknown');
    expect(out.map(s => s.matchRank)).toEqual([1, 2, 3, 4]);
  });

  it('non-array input returns empty array', () => {
    expect(sortSchoolsByMobileKey(null, 'rank')).toEqual([]);
    expect(sortSchoolsByMobileKey(undefined, 'rank')).toEqual([]);
  });
});
