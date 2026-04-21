/**
 * institutions-athletes-aggregate.test.js — POR Tooltip (Athletes Interested)
 *
 * Owner: Nova (Orchestrator, backend)
 * Date: 2026-04-20
 * Sprint: 001 — Deliverable 3
 *
 * Covers the pure aggregation helper that turns short_list_items + profiles
 * into { athletesInterested: string[], athleteInterestCount: number } keyed
 * by unitid, for merging into the admin-read-institutions EF response.
 *
 * Suite: TC-POR-ATH-001 through TC-POR-ATH-006
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { aggregateAthletesByUnitid } from '../../supabase/functions/admin-read-institutions/aggregate.js';

// ── TC-POR-ATH-001 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-001: empty short_list_items → every institution gets [] and 0', () => {
  it('returns an empty map when short_list_items is empty', () => {
    const result = aggregateAthletesByUnitid([], []);
    expect(result).toEqual({});
  });

  it('returns an empty map when short_list_items is empty even if profiles exist', () => {
    const profiles = [{ user_id: 'u1', name: 'Ayden Watkins' }];
    const result = aggregateAthletesByUnitid([], profiles);
    expect(result).toEqual({});
  });
});

// ── TC-POR-ATH-002 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-002: single athlete on one institution', () => {
  it('returns the athlete name and count=1 for that unitid', () => {
    const shortListItems = [{ user_id: 'u1', unitid: 100001 }];
    const profiles = [{ user_id: 'u1', name: 'Ayden Watkins' }];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001]).toEqual({
      athletesInterested: ['Ayden Watkins'],
      athleteInterestCount: 1,
    });
  });
});

// ── TC-POR-ATH-003 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-003: multiple athletes on one institution — sorted alphabetically', () => {
  it('returns names in alphabetical order', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u2', unitid: 100001 },
      { user_id: 'u3', unitid: 100001 },
    ];
    const profiles = [
      { user_id: 'u1', name: 'Zane Young' },
      { user_id: 'u2', name: 'Ayden Watkins' },
      { user_id: 'u3', name: 'Marcus Blake' },
    ];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual([
      'Ayden Watkins',
      'Marcus Blake',
      'Zane Young',
    ]);
    expect(result[100001].athleteInterestCount).toBe(3);
  });
});

// ── TC-POR-ATH-004 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-004: athlete on multiple institutions — name appears on each', () => {
  it('places the same athlete on every unitid they appear in', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u1', unitid: 100002 },
      { user_id: 'u1', unitid: 100003 },
    ];
    const profiles = [{ user_id: 'u1', name: 'Ayden Watkins' }];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual(['Ayden Watkins']);
    expect(result[100002].athletesInterested).toEqual(['Ayden Watkins']);
    expect(result[100003].athletesInterested).toEqual(['Ayden Watkins']);
    expect(result[100001].athleteInterestCount).toBe(1);
    expect(result[100002].athleteInterestCount).toBe(1);
    expect(result[100003].athleteInterestCount).toBe(1);
  });
});

// ── TC-POR-ATH-005 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-005: missing profile row for user_id — excluded, no crash', () => {
  it('drops short_list_items entries whose user_id has no matching profile', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u-missing', unitid: 100001 },
      { user_id: 'u2', unitid: 100001 },
    ];
    const profiles = [
      { user_id: 'u1', name: 'Ayden Watkins' },
      { user_id: 'u2', name: 'Marcus Blake' },
    ];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual([
      'Ayden Watkins',
      'Marcus Blake',
    ]);
    expect(result[100001].athleteInterestCount).toBe(2);
  });

  it('does not create an entry for a unitid with only orphan user_ids', () => {
    const shortListItems = [{ user_id: 'u-missing', unitid: 100999 }];
    const profiles = [{ user_id: 'u1', name: 'Ayden Watkins' }];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100999]).toBeUndefined();
  });
});

// ── TC-POR-ATH-006 ──────────────────────────────────────────────────────────────

describe('TC-POR-ATH-006: null/empty name in profile — excluded', () => {
  it('drops profiles with null name', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u2', unitid: 100001 },
    ];
    const profiles = [
      { user_id: 'u1', name: null },
      { user_id: 'u2', name: 'Marcus Blake' },
    ];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual(['Marcus Blake']);
    expect(result[100001].athleteInterestCount).toBe(1);
  });

  it('drops profiles with empty-string name', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u2', unitid: 100001 },
    ];
    const profiles = [
      { user_id: 'u1', name: '' },
      { user_id: 'u2', name: 'Marcus Blake' },
    ];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual(['Marcus Blake']);
    expect(result[100001].athleteInterestCount).toBe(1);
  });

  it('drops profiles with whitespace-only name', () => {
    const shortListItems = [
      { user_id: 'u1', unitid: 100001 },
      { user_id: 'u2', unitid: 100001 },
    ];
    const profiles = [
      { user_id: 'u1', name: '   ' },
      { user_id: 'u2', name: 'Marcus Blake' },
    ];
    const result = aggregateAthletesByUnitid(shortListItems, profiles);
    expect(result[100001].athletesInterested).toEqual(['Marcus Blake']);
    expect(result[100001].athleteInterestCount).toBe(1);
  });
});
