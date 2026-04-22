/**
 * overlay-logic.test.js — Sprint 003 D3 (Map merge) — overlay state resolution.
 */

import { describe, it, expect } from 'vitest';
import { getOverlayState } from '../../src/lib/map/overlayLogic.js';

const school = (unitid) => ({ unitid, school_name: `S${unitid}` });

describe('getOverlayState', () => {
  const gritFit = new Set([101, 102]);
  const shortlist = new Set([102, 103]);

  it("returns 'none' when the school is unmatched by both sets", () => {
    expect(getOverlayState(school(999), gritFit, shortlist)).toBe('none');
  });

  it("returns 'star' when the school is a Grit Fit recommendation only", () => {
    expect(getOverlayState(school(101), gritFit, shortlist)).toBe('star');
  });

  it("returns 'check' when the school is shortlisted only", () => {
    expect(getOverlayState(school(103), gritFit, shortlist)).toBe('check');
  });

  it("returns 'both' when the school is Grit Fit AND shortlisted", () => {
    expect(getOverlayState(school(102), gritFit, shortlist)).toBe('both');
  });

  it("returns 'none' for null or malformed input", () => {
    expect(getOverlayState(null, gritFit, shortlist)).toBe('none');
    expect(getOverlayState({}, gritFit, shortlist)).toBe('none');
    expect(getOverlayState({ unitid: null }, gritFit, shortlist)).toBe('none');
  });

  it('tolerates missing Set args without throwing', () => {
    expect(getOverlayState(school(101), undefined, undefined)).toBe('none');
    expect(getOverlayState(school(101), gritFit, undefined)).toBe('star');
    expect(getOverlayState(school(103), undefined, shortlist)).toBe('check');
  });
});
