/**
 * athletic-fit-thresholds.test.js — Sprint 003 D4 (Per-division Athletic Fit).
 * Boundary-heavy — exactly 0.5 is "fit", exactly 0.4 is "stretch".
 */

import { describe, it, expect } from 'vitest';
import {
  classifyAthleticFit,
  FIT_BUCKETS,
  FIT_THRESHOLDS,
} from '../../src/lib/grit-fit/athleticFitThresholds.js';

describe('classifyAthleticFit', () => {
  it('returns "fit" at exactly 0.50 (boundary)', () => {
    expect(classifyAthleticFit(0.5).tone).toBe('fit');
  });

  it('returns "fit" above 0.50', () => {
    expect(classifyAthleticFit(0.75).tone).toBe('fit');
    expect(classifyAthleticFit(1).tone).toBe('fit');
  });

  it('returns "stretch" at exactly 0.40 (boundary)', () => {
    expect(classifyAthleticFit(0.4).tone).toBe('stretch');
  });

  it('returns "stretch" between 0.40 and 0.50', () => {
    expect(classifyAthleticFit(0.45).tone).toBe('stretch');
    expect(classifyAthleticFit(0.499).tone).toBe('stretch');
  });

  it('returns "below" just under 0.40', () => {
    expect(classifyAthleticFit(0.399).tone).toBe('below');
    expect(classifyAthleticFit(0).tone).toBe('below');
  });

  it('returns "below" for null, undefined, NaN', () => {
    expect(classifyAthleticFit(null).tone).toBe('below');
    expect(classifyAthleticFit(undefined).tone).toBe('below');
    expect(classifyAthleticFit(NaN).tone).toBe('below');
  });

  it('each bucket exports a color, bg, and label', () => {
    for (const b of Object.values(FIT_BUCKETS)) {
      expect(b.color).toMatch(/^#/);
      expect(b.bg).toMatch(/^#/);
      expect(b.label).toBeTruthy();
    }
  });

  it('exposes thresholds for UI consumption', () => {
    expect(FIT_THRESHOLDS.FIT_MIN).toBe(0.5);
    expect(FIT_THRESHOLDS.STRETCH_MIN).toBe(0.4);
  });
});
