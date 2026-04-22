/**
 * tooltip-copy.test.js — Sprint 004 Wave 2 (G8).
 * One assertion per key. "Your Annual Cost" is verbatim-required.
 * ADTLV spelling preserved per ruling A-9 — guard against ADLTV reconciliation.
 */

import { describe, it, expect } from 'vitest';
import { TABLE_TOOLTIPS } from '../../src/lib/copy/tooltipCopy.js';

describe('TABLE_TOOLTIPS — G8', () => {
  it('Rank placeholder matches', () => {
    expect(TABLE_TOOLTIPS.Rank).toBe('Your GRIT FIT rank for this school.');
  });

  it('Div placeholder matches', () => {
    expect(TABLE_TOOLTIPS.Div).toBe('NCAA Division: D1, D2, or D3.');
  });

  it('Conf placeholder matches', () => {
    expect(TABLE_TOOLTIPS.Conf).toBe('Athletic conference affiliation.');
  });

  it('Distance placeholder matches', () => {
    expect(TABLE_TOOLTIPS.Distance).toBe('Distance from your home in miles.');
  });

  it('ADTLV placeholder matches and does NOT contain ADLTV (ruling A-9 guard)', () => {
    expect(TABLE_TOOLTIPS.ADTLV).toBe(
      'Academic Degree Lifetime Value — preserved spelling, operator to reconcile.'
    );
    // Regression guard: ruling A-9 preserves ADTLV spelling; do not reconcile to ADLTV.
    expect(TABLE_TOOLTIPS.ADTLV).not.toContain('ADLTV');
  });

  it('Your Annual Cost verbatim with required phrase', () => {
    expect(TABLE_TOOLTIPS['Your Annual Cost']).toBe(
      'Your Annual Cost: an estimate using parent financial info in Student Profile.'
    );
    expect(TABLE_TOOLTIPS['Your Annual Cost']).toContain(
      'estimate using parent financial info in Student Profile'
    );
  });
});
