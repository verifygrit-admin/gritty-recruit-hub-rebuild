/**
 * dashboard-logic.test.js — Item 5 NextSteps Dashboard Logic Tests
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-29
 * Suite: TC-ITEM5-006 through TC-ITEM5-010
 *
 * Imports directly from src/lib/nextStepsUtils.js — no component copy needed.
 * This was the purpose of the extraction (Item 5 Decision 3).
 *
 * Covers:
 *   TC-ITEM5-006: deriveReason returns 'athletic' when topTier is null
 *   TC-ITEM5-007: deriveReason returns 'academic' when GPA below ACAD_CLUSTER_FLOOR
 *   TC-ITEM5-008: deriveReason returns 'combined' when topTier present, GPA OK, passAll 0
 *   TC-ITEM5-009: getMetricScores null speed guard — sScore is 0 when speed40 is 0
 *   TC-ITEM5-010: getMetricScores unknown position/tier returns zero object
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  deriveReason,
  getMetricScores,
  ACAD_CLUSTER_FLOOR,
} from '../../src/lib/nextStepsUtils.js';
import { makeProfileStub } from './fixtures/profiles.js';
import { makeScoringResult } from './fixtures/scoringResults.js';

// ── TC-ITEM5-006 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-006: deriveReason — returns athletic when topTier is null', () => {
  it('returns "athletic" when scoringResult.topTier is null regardless of GPA', () => {
    const result = makeScoringResult({ topTier: null, gates: { passAll: 0 } });
    const profile = makeProfileStub({ gpa: 3.8 });
    expect(deriveReason(result, profile, 'Junior')).toBe('athletic');
  });

  it('returns "athletic" when topTier is null even with very low GPA', () => {
    const result = makeScoringResult({ topTier: null, gates: { passAll: 0 } });
    const profile = makeProfileStub({ gpa: 1.5 });
    expect(deriveReason(result, profile, 'Senior')).toBe('athletic');
  });

  it('returns "athletic" when topTier is null and profile.gpa is undefined', () => {
    const result = makeScoringResult({ topTier: null, gates: { passAll: 0 } });
    const profile = makeProfileStub({ gpa: undefined });
    expect(deriveReason(result, profile, 'Freshman')).toBe('athletic');
  });
});

// ── TC-ITEM5-007 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-007: deriveReason — returns academic when GPA below floor', () => {
  it('returns "academic" for Senior with GPA below 2.50', () => {
    expect(ACAD_CLUSTER_FLOOR['Senior']).toBe(2.50);
    const result = makeScoringResult({ topTier: 'G6' });
    const profile = makeProfileStub({ gpa: 2.3, grad_year: 2026 });
    expect(deriveReason(result, profile, 'Senior')).toBe('academic');
  });

  it('returns "academic" for Junior with GPA below 2.50', () => {
    expect(ACAD_CLUSTER_FLOOR['Junior']).toBe(2.50);
    const result = makeScoringResult({ topTier: 'FCS' });
    const profile = makeProfileStub({ gpa: 2.1 });
    expect(deriveReason(result, profile, 'Junior')).toBe('academic');
  });

  it('returns "academic" for Soph with GPA below 2.40', () => {
    expect(ACAD_CLUSTER_FLOOR['Soph']).toBe(2.40);
    const result = makeScoringResult({ topTier: 'D2' });
    const profile = makeProfileStub({ gpa: 2.2 });
    expect(deriveReason(result, profile, 'Soph')).toBe('academic');
  });

  it('returns "academic" for Freshman with GPA below 2.30', () => {
    expect(ACAD_CLUSTER_FLOOR['Freshman']).toBe(2.30);
    const result = makeScoringResult({ topTier: 'D3' });
    const profile = makeProfileStub({ gpa: 2.1 });
    expect(deriveReason(result, profile, 'Freshman')).toBe('academic');
  });

  it('does NOT return "academic" when GPA is exactly at the floor', () => {
    const result = makeScoringResult({ topTier: 'G6', gates: { passAll: 0 } });
    const profile = makeProfileStub({ gpa: 2.50 });
    expect(deriveReason(result, profile, 'Senior')).toBe('combined');
  });
});

// ── TC-ITEM5-008 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-008: deriveReason — returns combined when topTier present, GPA OK, passAll 0', () => {
  it('returns "combined" when topTier is set, GPA is above floor, but passAll is 0', () => {
    const result = makeScoringResult({
      topTier: 'G6',
      gates: { passAthletic: 2, passDist: 0, passAcad: 2, passAll: 0 },
    });
    const profile = makeProfileStub({ gpa: 3.5 });
    expect(deriveReason(result, profile, 'Junior')).toBe('combined');
  });

  it('returns "combined" regardless of which specific gate failed', () => {
    const result = makeScoringResult({
      topTier: 'Power 4',
      gates: { passAthletic: 5, passDist: 5, passAcad: 0, passAll: 0 },
    });
    const profile = makeProfileStub({ gpa: 3.8 });
    expect(deriveReason(result, profile, 'Senior')).toBe('combined');
  });
});

// ── TC-ITEM5-009 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-009: getMetricScores — null speed guard (sScore = 0 when speed40 is 0)', () => {
  it('returns sScore = 0 when speed40 is 0', () => {
    const { sScore } = getMetricScores('WR', 73, 185, 0, 'G6');
    expect(sScore).toBe(0);
  });

  it('returns sScore = 0 when speed40 is null', () => {
    const { sScore } = getMetricScores('WR', 73, 185, null, 'G6');
    expect(sScore).toBe(0);
  });

  it('returns sScore = 0 when speed40 is undefined', () => {
    const { sScore } = getMetricScores('WR', 73, 185, undefined, 'G6');
    expect(sScore).toBe(0);
  });

  it('returns sScore > 0 when speed40 is a valid fast time', () => {
    const { sScore } = getMetricScores('WR', 73, 185, 4.35, 'G6');
    expect(sScore).toBeGreaterThan(0.5);
  });

  it('sScore with speed40=0 is less than sScore with speed40=4.55 (regression guard)', () => {
    const { sScore: zeroSpeed } = getMetricScores('WR', 73, 185, 0, 'G6');
    const { sScore: medianSpeed } = getMetricScores('WR', 73, 185, 4.55, 'G6');
    expect(zeroSpeed).toBeLessThan(medianSpeed);
  });

  it('hScore and wScore are still calculated normally when speed40 is 0', () => {
    const { hScore, wScore } = getMetricScores('WR', 73, 185, 0, 'G6');
    expect(hScore).toBeGreaterThan(0.3);
    expect(wScore).toBeGreaterThan(0.3);
  });
});

// ── TC-ITEM5-010 ────────────────────────────────────────────────────────────────

describe('TC-ITEM5-010: getMetricScores — unknown position/tier returns zero object', () => {
  it('returns { hScore: 0, wScore: 0, sScore: 0 } for unknown tier', () => {
    const scores = getMetricScores('WR', 73, 185, 4.55, 'Unknown Tier');
    expect(scores).toEqual({ hScore: 0, wScore: 0, sScore: 0 });
  });

  it('returns { hScore: 0, wScore: 0, sScore: 0 } for unknown position', () => {
    const scores = getMetricScores('FULLBACK', 72, 240, 4.65, 'G6');
    expect(scores).toEqual({ hScore: 0, wScore: 0, sScore: 0 });
  });

  it('does not throw for null position', () => {
    expect(() => getMetricScores(null, 73, 185, 4.55, 'G6')).not.toThrow();
    const scores = getMetricScores(null, 73, 185, 4.55, 'G6');
    expect(scores).toEqual({ hScore: 0, wScore: 0, sScore: 0 });
  });

  it('returns std in the result object for a valid position/tier pair', () => {
    const scores = getMetricScores('WR', 73, 185, 4.55, 'G6');
    expect(scores.std).toBeDefined();
    expect(scores.std.h50).toBe(73);
    expect(scores.std.w50).toBe(185);
    expect(scores.std.s50).toBe(4.55);
  });
});
