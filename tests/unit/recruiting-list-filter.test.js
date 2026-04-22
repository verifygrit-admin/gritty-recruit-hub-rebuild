/**
 * recruiting-list-filter.test.js — Sprint 003 D3 — Recruiting List filter.
 */

import { describe, it, expect } from 'vitest';
import {
  applyRecruitingListFilter,
  RECRUITING_LIST_OPTIONS,
  RECRUITING_LIST_DEFAULT,
} from '../../src/lib/map/recruitingListFilter.js';

const schools = [
  { unitid: 1 }, { unitid: 2 }, { unitid: 3 }, { unitid: 4 }, { unitid: 5 },
];
const gritFit = new Set([2, 4]);
const shortlist = new Set([4, 5]);

describe('RECRUITING_LIST_OPTIONS', () => {
  it('exports three options in the right order', () => {
    expect(RECRUITING_LIST_OPTIONS.map(o => o.value)).toEqual(['all', 'gritfit', 'shortlist']);
  });

  it('default is "all"', () => {
    expect(RECRUITING_LIST_DEFAULT).toBe('all');
  });
});

describe('applyRecruitingListFilter', () => {
  it('"all" returns every school', () => {
    expect(applyRecruitingListFilter(schools, 'all', gritFit, shortlist)).toEqual(schools);
  });

  it('"gritfit" returns only Grit Fit recommendations', () => {
    expect(applyRecruitingListFilter(schools, 'gritfit', gritFit, shortlist).map(s => s.unitid))
      .toEqual([2, 4]);
  });

  it('"shortlist" returns only shortlisted schools', () => {
    expect(applyRecruitingListFilter(schools, 'shortlist', gritFit, shortlist).map(s => s.unitid))
      .toEqual([4, 5]);
  });

  it('returns [] when schools is null or not an array', () => {
    expect(applyRecruitingListFilter(null, 'all', gritFit, shortlist)).toEqual([]);
    expect(applyRecruitingListFilter(undefined, 'gritfit', gritFit, shortlist)).toEqual([]);
  });
});
