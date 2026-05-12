/**
 * validateBulkPdsCards.test.js — Sprint 026 Phase 1a (Coach UI).
 *
 * Per-card error-map tests:
 *   - empty fields → valid (no errors)
 *   - non-numeric in numeric field → error
 *   - negative numbers → error
 *   - height accepts "6-2"
 */

import { describe, it, expect } from 'vitest';
import { validateBulkPdsCards } from '../../../src/lib/bulkPds/validateBulkPdsCards.js';

const card = (user_id, fields = {}) => ({
  student: { user_id },
  fields: {
    height: '', weight: '', speed_40: '', time_5_10_5: '',
    time_l_drill: '', bench_press: '', squat: '', clean: '',
    ...fields,
  },
});

describe('validateBulkPdsCards', () => {
  it('returns empty object when all fields are empty', () => {
    const errors = validateBulkPdsCards([card('a'), card('b')]);
    expect(errors).toEqual({});
  });

  it('accepts valid numeric strings and height text', () => {
    const errors = validateBulkPdsCards([card('a', {
      height: '6-2', weight: '215', speed_40: '4.65', bench_press: '275',
    })]);
    expect(errors).toEqual({});
  });

  it('rejects non-numeric strings in numeric fields', () => {
    const errors = validateBulkPdsCards([card('a', { weight: 'heavy', speed_40: 'fast' })]);
    expect(errors.a.weight).toMatch(/number/i);
    expect(errors.a.speed_40).toMatch(/number/i);
  });

  it('rejects negative numbers', () => {
    const errors = validateBulkPdsCards([card('a', { weight: '-10', squat: '-5' })]);
    expect(errors.a.weight).toMatch(/zero or positive/i);
    expect(errors.a.squat).toMatch(/zero or positive/i);
  });

  it('keys errors by student_user_id; valid cards are absent', () => {
    const errors = validateBulkPdsCards([
      card('valid', { weight: '200' }),
      card('bad',   { weight: '-1' }),
    ]);
    expect(errors.valid).toBeUndefined();
    expect(errors.bad).toBeDefined();
  });

  it('height accepts any non-empty text — "6-2", "5\'11", "72"', () => {
    const errors = validateBulkPdsCards([
      card('a', { height: '6-2' }),
      card('b', { height: "5'11" }),
      card('c', { height: '72' }),
    ]);
    expect(errors).toEqual({});
  });
});
