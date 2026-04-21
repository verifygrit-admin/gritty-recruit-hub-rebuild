/**
 * hs-associations-aggregate.test.js — Sprint 001 D2 — RED
 *
 * Pure aggregation helper for HS Coach + Counselor school associations.
 * Takes raw rows from hs_coach_schools, hs_counselor_schools, hs_programs
 * and returns a map keyed by user_id:
 *   {
 *     [user_id]: { schoolName, isHeadCoach }   // isHeadCoach null for counselors
 *   }
 *
 * Collision rule (multiple schools per user): prefer the row with
 * is_head_coach=true. Otherwise first by linked_at ascending.
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateHsCoachAssociations,
  aggregateHsCounselorAssociations,
} from '../../supabase/functions/admin-read-users/associations.js';

// ── HS Coach aggregation ──────────────────────────────────────────────────────

describe('TC-S001-D2-ASSOC-001: aggregateHsCoachAssociations — empty input', () => {
  it('returns an empty map when no association rows', () => {
    expect(aggregateHsCoachAssociations([], [])).toEqual({});
  });
});

describe('TC-S001-D2-ASSOC-002: aggregateHsCoachAssociations — single row', () => {
  it('resolves school_name from hs_programs and surfaces is_head_coach', () => {
    const coachRows = [
      { coach_user_id: 'u1', hs_program_id: 'p1', is_head_coach: true, linked_at: '2024-01-01' },
    ];
    const programs = [{ id: 'p1', school_name: 'BC High' }];
    const out = aggregateHsCoachAssociations(coachRows, programs);
    expect(out).toEqual({ u1: { schoolName: 'BC High', isHeadCoach: true } });
  });
});

describe('TC-S001-D2-ASSOC-003: aggregateHsCoachAssociations — multi-school collision rule', () => {
  it('prefers the row where is_head_coach=true', () => {
    const coachRows = [
      { coach_user_id: 'u1', hs_program_id: 'p1', is_head_coach: false, linked_at: '2024-01-01' },
      { coach_user_id: 'u1', hs_program_id: 'p2', is_head_coach: true,  linked_at: '2024-06-01' },
    ];
    const programs = [
      { id: 'p1', school_name: 'Assistant Elsewhere' },
      { id: 'p2', school_name: 'Head Coach Here' },
    ];
    const out = aggregateHsCoachAssociations(coachRows, programs);
    expect(out.u1.schoolName).toBe('Head Coach Here');
    expect(out.u1.isHeadCoach).toBe(true);
  });

  it('falls back to the earliest linked_at when no is_head_coach row', () => {
    const coachRows = [
      { coach_user_id: 'u1', hs_program_id: 'p1', is_head_coach: false, linked_at: '2024-06-01' },
      { coach_user_id: 'u1', hs_program_id: 'p2', is_head_coach: false, linked_at: '2024-01-01' },
    ];
    const programs = [
      { id: 'p1', school_name: 'Later' },
      { id: 'p2', school_name: 'Earlier' },
    ];
    const out = aggregateHsCoachAssociations(coachRows, programs);
    expect(out.u1.schoolName).toBe('Earlier');
    expect(out.u1.isHeadCoach).toBe(false);
  });
});

describe('TC-S001-D2-ASSOC-004: aggregateHsCoachAssociations — program lookup misses', () => {
  it('surfaces null schoolName when hs_program_id has no matching program row', () => {
    const coachRows = [
      { coach_user_id: 'u1', hs_program_id: 'ghost', is_head_coach: true, linked_at: '2024-01-01' },
    ];
    const out = aggregateHsCoachAssociations(coachRows, []);
    expect(out.u1).toEqual({ schoolName: null, isHeadCoach: true });
  });
});

// ── HS Counselor aggregation ──────────────────────────────────────────────────

describe('TC-S001-D2-ASSOC-005: aggregateHsCounselorAssociations — empty input', () => {
  it('returns an empty map when no association rows', () => {
    expect(aggregateHsCounselorAssociations([], [])).toEqual({});
  });
});

describe('TC-S001-D2-ASSOC-006: aggregateHsCounselorAssociations — single row', () => {
  it('resolves school_name from hs_programs, isHeadCoach always null', () => {
    const rows = [
      { counselor_user_id: 'u1', hs_program_id: 'p1', linked_at: '2024-01-01' },
    ];
    const programs = [{ id: 'p1', school_name: 'BC High' }];
    const out = aggregateHsCounselorAssociations(rows, programs);
    expect(out).toEqual({ u1: { schoolName: 'BC High', isHeadCoach: null } });
  });
});

describe('TC-S001-D2-ASSOC-007: aggregateHsCounselorAssociations — multi-school collision rule', () => {
  it('picks the earliest linked_at row (no is_head_coach concept)', () => {
    const rows = [
      { counselor_user_id: 'u1', hs_program_id: 'p1', linked_at: '2024-06-01' },
      { counselor_user_id: 'u1', hs_program_id: 'p2', linked_at: '2024-01-01' },
    ];
    const programs = [
      { id: 'p1', school_name: 'Later' },
      { id: 'p2', school_name: 'Earlier' },
    ];
    const out = aggregateHsCounselorAssociations(rows, programs);
    expect(out.u1.schoolName).toBe('Earlier');
    expect(out.u1.isHeadCoach).toBeNull();
  });
});

describe('TC-S001-D2-ASSOC-008: aggregateHsCounselorAssociations — program lookup misses', () => {
  it('surfaces null schoolName when hs_program_id has no matching program row', () => {
    const rows = [
      { counselor_user_id: 'u1', hs_program_id: 'ghost', linked_at: '2024-01-01' },
    ];
    const out = aggregateHsCounselorAssociations(rows, []);
    expect(out.u1).toEqual({ schoolName: null, isHeadCoach: null });
  });
});
