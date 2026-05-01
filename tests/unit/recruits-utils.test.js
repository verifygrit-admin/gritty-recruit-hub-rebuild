/**
 * recruits-utils.test.js — Sprint 011 Phase 2 utils
 *
 * Covers two pure utilities consumed by the data hook + RecruitCard:
 *   - normalizeTwitter(raw): strips @, scheme, x.com/, twitter.com/ prefixes;
 *     returns null when input is null/empty so the caller can omit the link.
 *   - computeRecruitingProgress(rows): aggregates Phase 0 SQL formula
 *     client-side. Takes array of short_list_items rows
 *     ({ recruiting_journey_steps: jsonb }), returns { schoolsShortlisted,
 *     recruitingProgressPct }. Matches the SQL aggregation that produced
 *     the prototype's "41 schools · 32%" exemplar (Ayden Watkins).
 */

import { describe, it, expect } from 'vitest';
import { normalizeTwitter, computeRecruitingProgress } from '../../src/lib/recruits/utils.js';

// ── normalizeTwitter ─────────────────────────────────────────────────────

describe('normalizeTwitter — null / empty handling', () => {
  it('returns null for null', () => {
    expect(normalizeTwitter(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeTwitter(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeTwitter('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeTwitter('   ')).toBeNull();
  });
});

describe('normalizeTwitter — bare handles', () => {
  it('passes through a bare handle', () => {
    expect(normalizeTwitter('ayden')).toBe('ayden');
  });

  it('strips a leading @', () => {
    expect(normalizeTwitter('@ayden')).toBe('ayden');
  });

  it('strips multiple leading @ signs (defensive)', () => {
    expect(normalizeTwitter('@@ayden')).toBe('ayden');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTwitter('  @ayden  ')).toBe('ayden');
  });
});

describe('normalizeTwitter — full URLs', () => {
  it('strips https://x.com/', () => {
    expect(normalizeTwitter('https://x.com/ayden')).toBe('ayden');
  });

  it('strips http://x.com/', () => {
    expect(normalizeTwitter('http://x.com/ayden')).toBe('ayden');
  });

  it('strips https://twitter.com/', () => {
    expect(normalizeTwitter('https://twitter.com/ayden')).toBe('ayden');
  });

  it('strips http://twitter.com/', () => {
    expect(normalizeTwitter('http://twitter.com/ayden')).toBe('ayden');
  });

  it('strips bare x.com/ prefix', () => {
    expect(normalizeTwitter('x.com/ayden')).toBe('ayden');
  });

  it('strips bare twitter.com/ prefix', () => {
    expect(normalizeTwitter('twitter.com/ayden')).toBe('ayden');
  });

  it('strips www. subdomain on x.com', () => {
    expect(normalizeTwitter('https://www.x.com/ayden')).toBe('ayden');
  });

  it('strips www. subdomain on twitter.com', () => {
    expect(normalizeTwitter('https://www.twitter.com/ayden')).toBe('ayden');
  });

  it('strips a trailing slash', () => {
    expect(normalizeTwitter('https://x.com/ayden/')).toBe('ayden');
  });

  it('strips a trailing query string', () => {
    expect(normalizeTwitter('https://x.com/ayden?ref=foo')).toBe('ayden');
  });
});

describe('normalizeTwitter — combinations', () => {
  it('handles @-prefixed URLs (defensive)', () => {
    expect(normalizeTwitter('@https://x.com/ayden')).toBe('ayden');
  });

  it('preserves underscores and digits', () => {
    expect(normalizeTwitter('@ayden_w27')).toBe('ayden_w27');
  });
});

// ── computeRecruitingProgress ────────────────────────────────────────────

const FULL_15_STEPS_NONE_DONE = Array.from({ length: 15 }, (_, i) => ({
  step_id: i + 1,
  label: `Step ${i + 1}`,
  completed: false,
  completed_at: null,
}));

const FULL_15_STEPS_FIRST_DONE = FULL_15_STEPS_NONE_DONE.map((s, i) => ({
  ...s,
  completed: i === 0,
}));

const FULL_15_STEPS_ALL_DONE = FULL_15_STEPS_NONE_DONE.map((s) => ({
  ...s,
  completed: true,
}));

describe('computeRecruitingProgress — empty input', () => {
  it('zero rows returns 0 schools and null progress', () => {
    expect(computeRecruitingProgress([])).toEqual({
      schoolsShortlisted: 0,
      recruitingProgressPct: null,
    });
  });

  it('null input returns zero / null', () => {
    expect(computeRecruitingProgress(null)).toEqual({
      schoolsShortlisted: 0,
      recruitingProgressPct: null,
    });
  });

  it('undefined input returns zero / null', () => {
    expect(computeRecruitingProgress(undefined)).toEqual({
      schoolsShortlisted: 0,
      recruitingProgressPct: null,
    });
  });
});

describe('computeRecruitingProgress — single row', () => {
  it('one row, none completed → 1 school, 0% progress', () => {
    const result = computeRecruitingProgress([
      { recruiting_journey_steps: FULL_15_STEPS_NONE_DONE },
    ]);
    expect(result.schoolsShortlisted).toBe(1);
    expect(result.recruitingProgressPct).toBe(0);
  });

  it('one row, first step completed → 1 school, ~6.7%', () => {
    const result = computeRecruitingProgress([
      { recruiting_journey_steps: FULL_15_STEPS_FIRST_DONE },
    ]);
    expect(result.schoolsShortlisted).toBe(1);
    // 1 of 15 = 6.666... → rounded to 1 decimal = 6.7
    expect(result.recruitingProgressPct).toBe(6.7);
  });

  it('one row, all completed → 1 school, 100%', () => {
    const result = computeRecruitingProgress([
      { recruiting_journey_steps: FULL_15_STEPS_ALL_DONE },
    ]);
    expect(result.schoolsShortlisted).toBe(1);
    expect(result.recruitingProgressPct).toBe(100);
  });
});

describe('computeRecruitingProgress — Phase 0 exemplar', () => {
  it('reproduces Ayden Watkins fixture: 41 schools, ~32.4%', () => {
    // 41 shortlist rows, 15 steps each = 615 total step-slots
    // 32.4% of 615 = 199.26 → simulate 199 completed slots distributed
    // 199 / 615 = 32.357... rounded to 1 decimal = 32.4
    const rows = Array.from({ length: 41 }, () => ({
      recruiting_journey_steps: [...FULL_15_STEPS_NONE_DONE],
    }));
    let completedRemaining = 199;
    for (const row of rows) {
      row.recruiting_journey_steps = row.recruiting_journey_steps.map((s) => {
        if (completedRemaining > 0) {
          completedRemaining -= 1;
          return { ...s, completed: true };
        }
        return s;
      });
    }
    const result = computeRecruitingProgress(rows);
    expect(result.schoolsShortlisted).toBe(41);
    expect(result.recruitingProgressPct).toBe(32.4);
  });
});

describe('computeRecruitingProgress — robustness', () => {
  it('rounds to one decimal place', () => {
    // 1 of 3 = 33.333... → 33.3
    const rows = [
      {
        recruiting_journey_steps: [
          { step_id: 1, completed: true },
          { step_id: 2, completed: false },
          { step_id: 3, completed: false },
        ],
      },
    ];
    expect(computeRecruitingProgress(rows).recruitingProgressPct).toBe(33.3);
  });

  it('skips rows with non-array recruiting_journey_steps', () => {
    const rows = [
      { recruiting_journey_steps: FULL_15_STEPS_FIRST_DONE },
      { recruiting_journey_steps: null },
      { recruiting_journey_steps: undefined },
      { recruiting_journey_steps: 'corrupt' },
    ];
    // Only the first row contributes: 1/15 = 6.7
    const result = computeRecruitingProgress(rows);
    // schoolsShortlisted is the row count (4), but progress derives from the
    // valid row(s) only (corrupt rows contribute zero step-slots)
    expect(result.schoolsShortlisted).toBe(4);
    expect(result.recruitingProgressPct).toBe(6.7);
  });

  it('treats step.completed as truthy boolean check (defensive)', () => {
    const rows = [
      {
        recruiting_journey_steps: [
          { step_id: 1, completed: true },
          { step_id: 2, completed: false },
        ],
      },
    ];
    expect(computeRecruitingProgress(rows).recruitingProgressPct).toBe(50);
  });
});
