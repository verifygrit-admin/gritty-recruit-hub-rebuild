/**
 * diffStagingVsProfile.test.js — Sprint 026 Phase 1b (Admin UI)
 *
 * Pure-function test for the field-delta computation that powers the
 * Admin Bulk PDS Approval compare-row UI. Per SPRINT_026_PLAN §4.1:
 *   - Same values → no diff
 *   - Numeric coercion ("180" vs 180) → no diff
 *   - null vs value → flagged as changed
 *
 * Contract:
 *   diffStagingVsProfile(staging, profile) → {
 *     [fieldName]: { staging: any, profile: any, changed: boolean }
 *   }
 *
 * Fields covered: height (text), weight, speed_40, time_5_10_5,
 * time_l_drill, bench_press, squat, clean.
 */

import { describe, it, expect } from 'vitest';
import { diffStagingVsProfile } from '../../../src/lib/bulkPds/admin/diffStagingVsProfile.js';

describe('diffStagingVsProfile — identical values', () => {
  it('returns changed:false for every field when values match exactly', () => {
    const staging = { height: '6-2', weight: 200, speed_40: 4.7, time_5_10_5: 4.5, time_l_drill: 7.1, bench_press: 250, squat: 350, clean: 225 };
    const profile = { height: '6-2', weight: 200, speed_40: 4.7, time_5_10_5: 4.5, time_l_drill: 7.1, bench_press: 250, squat: 350, clean: 225 };
    const out = diffStagingVsProfile(staging, profile);
    for (const key of Object.keys(staging)) {
      expect(out[key].changed).toBe(false);
    }
  });
});

describe('diffStagingVsProfile — numeric coercion', () => {
  it('treats "180" and 180 as equal (string-vs-number legacy data)', () => {
    const out = diffStagingVsProfile({ weight: '180' }, { weight: 180 });
    expect(out.weight.changed).toBe(false);
  });

  it('treats "4.7" and 4.7 as equal', () => {
    const out = diffStagingVsProfile({ speed_40: '4.7' }, { speed_40: 4.7 });
    expect(out.speed_40.changed).toBe(false);
  });

  it('does NOT coerce height (text field) — different strings are changed', () => {
    const out = diffStagingVsProfile({ height: '6-2' }, { height: '6-1' });
    expect(out.height.changed).toBe(true);
  });
});

describe('diffStagingVsProfile — null vs value', () => {
  it('flags null staging vs numeric profile as changed', () => {
    const out = diffStagingVsProfile({ weight: null }, { weight: 200 });
    expect(out.weight.changed).toBe(true);
  });

  it('flags numeric staging vs null profile as changed', () => {
    const out = diffStagingVsProfile({ bench_press: 250 }, { bench_press: null });
    expect(out.bench_press.changed).toBe(true);
  });

  it('treats null vs null as unchanged', () => {
    const out = diffStagingVsProfile({ squat: null }, { squat: null });
    expect(out.squat.changed).toBe(false);
  });

  it('treats undefined vs null as unchanged', () => {
    const out = diffStagingVsProfile({ clean: undefined }, { clean: null });
    expect(out.clean.changed).toBe(false);
  });
});

describe('diffStagingVsProfile — different numeric values', () => {
  it('flags 200 vs 210 as changed', () => {
    const out = diffStagingVsProfile({ weight: 200 }, { weight: 210 });
    expect(out.weight.changed).toBe(true);
    expect(out.weight.staging).toBe(200);
    expect(out.weight.profile).toBe(210);
  });
});

describe('diffStagingVsProfile — output shape', () => {
  it('includes staging and profile values on every field entry', () => {
    const out = diffStagingVsProfile({ height: '6-3' }, { height: '6-2' });
    expect(out.height).toEqual({ staging: '6-3', profile: '6-2', changed: true });
  });

  it('covers all 8 measurable fields even when only a subset is in input', () => {
    const out = diffStagingVsProfile({}, {});
    const expectedFields = ['height', 'weight', 'speed_40', 'time_5_10_5', 'time_l_drill', 'bench_press', 'squat', 'clean'];
    for (const f of expectedFields) {
      expect(out).toHaveProperty(f);
      expect(out[f].changed).toBe(false);
    }
  });
});
