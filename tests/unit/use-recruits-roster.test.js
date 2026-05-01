/**
 * use-recruits-roster.test.js — Sprint 011 Phase 2 step 9
 *
 * Defense in depth at the data layer (Path A row-only RLS leaves the column
 * boundary in the hook's SELECT clause). Asserts the SELECT clause string
 * contains every whitelisted column AND zero excluded column names. A
 * future hook regression that pulls SELECT * or names an excluded column
 * fails CI before merge.
 *
 * Also covers composeProfileWithAggregate — the pure aggregator that merges
 * a profile row, its shortlist rows, and a resolved avatar URL into the
 * single ProfileWithAggregate shape consumed by RecruitCard.
 */

import { describe, it, expect } from 'vitest';
import {
  PROFILES_WHITELIST_SELECT,
  composeProfileWithAggregate,
} from '../../src/hooks/useRecruitsRoster.js';

// Locked PII whitelist (Phase 0 audit; Sprint 011 hard constraint #5).
const RENDERED_WHITELIST = [
  'name',
  'high_school',
  'grad_year',
  'state',
  'position',
  'height',
  'weight',
  'speed_40',
  'gpa',
  'twitter',
  'hudl_url',
  'avatar_storage_path',
  'expected_starter',
  'captain',
  'all_conference',
  'all_state',
];

// user_id is not "rendered" but is required for join + React key.
const DATA_LAYER_REQUIRED = ['user_id'];

const EXCLUDED_COLUMNS = [
  'email',
  'phone',
  'parent_guardian_email',
  'agi',
  'dependents',
  'hs_lat',
  'hs_lng',
  'last_login',
  'created_at',
  'updated_at',
  'last_grit_fit_run_at',
  'last_grit_fit_zero_match',
  'status',
  'sat',
  'id',
];

function parseSelectColumns(selectStr) {
  return selectStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

// ── SELECT clause whitelist enforcement ──────────────────────────────────

describe('PROFILES_WHITELIST_SELECT — contains every whitelisted column', () => {
  const cols = parseSelectColumns(PROFILES_WHITELIST_SELECT);

  for (const col of RENDERED_WHITELIST) {
    it(`includes whitelisted column "${col}"`, () => {
      expect(cols).toContain(col);
    });
  }

  for (const col of DATA_LAYER_REQUIRED) {
    it(`includes data-layer-required column "${col}"`, () => {
      expect(cols).toContain(col);
    });
  }
});

describe('PROFILES_WHITELIST_SELECT — excludes every PII / sensitive column', () => {
  const cols = parseSelectColumns(PROFILES_WHITELIST_SELECT);

  for (const col of EXCLUDED_COLUMNS) {
    it(`does not include excluded column "${col}"`, () => {
      expect(cols).not.toContain(col);
    });
  }

  it('does not contain a wildcard "*"', () => {
    expect(PROFILES_WHITELIST_SELECT).not.toContain('*');
  });

  it('column count matches whitelist length (no surprise additions)', () => {
    expect(cols).toHaveLength(RENDERED_WHITELIST.length + DATA_LAYER_REQUIRED.length);
  });
});

// ── composeProfileWithAggregate ──────────────────────────────────────────

describe('composeProfileWithAggregate', () => {
  const profile = {
    user_id: 'u1',
    name: 'Ayden Watkins',
    high_school: 'Boston College High School',
    grad_year: 2027,
    state: 'MA',
    position: 'CB',
    height: '5\'11"',
    weight: 175,
    speed_40: 4.52,
    gpa: 3.4,
    twitter: '@ayden',
    hudl_url: 'https://hudl.com/ayden',
    avatar_storage_path: 'u1/avatar.jpg',
    expected_starter: true,
    captain: false,
    all_conference: false,
    all_state: false,
  };

  it('attaches avatarUrl from the resolver', () => {
    const result = composeProfileWithAggregate(profile, [], 'https://cdn/u1.jpg');
    expect(result.avatarUrl).toBe('https://cdn/u1.jpg');
  });

  it('drops avatar_storage_path from the merged shape', () => {
    const result = composeProfileWithAggregate(profile, [], 'https://cdn/u1.jpg');
    expect(result.avatar_storage_path).toBeUndefined();
  });

  it('attaches schoolsShortlisted=0 + recruitingProgressPct=null on empty shortlist', () => {
    const result = composeProfileWithAggregate(profile, [], null);
    expect(result.schoolsShortlisted).toBe(0);
    expect(result.recruitingProgressPct).toBeNull();
  });

  it('aggregates a populated shortlist correctly', () => {
    const steps = Array.from({ length: 15 }, (_, i) => ({
      step_id: i + 1,
      completed: i === 0,
    }));
    const rows = [{ recruiting_journey_steps: steps }];
    const result = composeProfileWithAggregate(profile, rows, null);
    expect(result.schoolsShortlisted).toBe(1);
    expect(result.recruitingProgressPct).toBe(6.7);
  });

  it('does NOT carry through arbitrary fields from the input profile (defense)', () => {
    const piiBomb = {
      ...profile,
      email: 'leak@example.com',
      phone: '5555555555',
      agi: 99999,
    };
    const result = composeProfileWithAggregate(piiBomb, [], null);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.agi).toBeUndefined();
  });
});
