/**
 * grit-fit-explainer.test.js — Sprint 003 D4 (GRIT FIT Explainer section).
 * Pure data test on the operator-editable copy constant.
 */

import { describe, it, expect } from 'vitest';
import { GRIT_FIT_EXPLAINER } from '../../src/lib/copy/gritFitExplainerCopy.js';

describe('GRIT_FIT_EXPLAINER', () => {
  it('exports a heading string', () => {
    expect(typeof GRIT_FIT_EXPLAINER.heading).toBe('string');
    expect(GRIT_FIT_EXPLAINER.heading.length).toBeGreaterThan(0);
  });

  it('exports at least 2 paragraphs of substantive copy', () => {
    expect(Array.isArray(GRIT_FIT_EXPLAINER.paragraphs)).toBe(true);
    expect(GRIT_FIT_EXPLAINER.paragraphs.length).toBeGreaterThanOrEqual(2);
    for (const p of GRIT_FIT_EXPLAINER.paragraphs) {
      expect(p.length).toBeGreaterThanOrEqual(80);
    }
  });

  it('mentions the D2+D3 framing the spec requires', () => {
    const joined = GRIT_FIT_EXPLAINER.paragraphs.join(' ').toLowerCase();
    expect(joined).toContain('d2');
    expect(joined).toContain('d3');
  });
});
