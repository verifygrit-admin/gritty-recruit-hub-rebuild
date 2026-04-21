/**
 * admin-users-columns.test.js — Sprint 001 D2 Users Tab Toggle Remediation — RED
 *
 * Six toggle column configs extracted from AdminUsersTab.jsx into
 * src/lib/adminUsersColumns.js so they can be validated against the session spec.
 *
 * Spec source: docs/specs/sprint-001/sprint_001_session_spec.md §2
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  ACCOUNTS_COLUMNS,
  STUDENT_ATHLETES_COLUMNS,
  COLLEGE_COACHES_COLUMNS,
  HS_COACHES_COLUMNS,
  COUNSELORS_COLUMNS,
  PARENTS_COLUMNS,
  COLLEGE_COACHES_EMPTY_MESSAGE,
} from '../../src/lib/adminUsersColumns.js';

function labels(columns) {
  return columns.map((c) => c.label);
}

function keys(columns) {
  return columns.map((c) => c.key);
}

// ── TC-S001-D2-001: Accounts toggle ───────────────────────────────────────────

describe('TC-S001-D2-001: Accounts toggle column order', () => {
  it('labels are in spec order', () => {
    expect(labels(ACCOUNTS_COLUMNS)).toEqual([
      'ID',
      'Created',
      'User Type',
      'Full Name',
      'Email',
      'Has Password',
      'Email Verified',
      'Status',
    ]);
  });

  it('has a Has Password column keyed to a field derivable from auth.users', () => {
    const hp = ACCOUNTS_COLUMNS.find((c) => c.label === 'Has Password');
    expect(hp).toBeDefined();
    expect(typeof hp.key).toBe('string');
    expect(hp.key.length).toBeGreaterThan(0);
  });

  it('has a Full Name column (single name field, not first/last)', () => {
    const fn = ACCOUNTS_COLUMNS.find((c) => c.label === 'Full Name');
    expect(fn).toBeDefined();
    expect(keys(ACCOUNTS_COLUMNS)).not.toContain('first_name');
    expect(keys(ACCOUNTS_COLUMNS)).not.toContain('last_name');
  });

  it('has a User Type column sourced from the public.users enum', () => {
    const ut = ACCOUNTS_COLUMNS.find((c) => c.label === 'User Type');
    expect(ut).toBeDefined();
    expect(ut.key).toBe('user_type');
  });
});

// ── TC-S001-D2-002: Student Athletes toggle ───────────────────────────────────

describe('TC-S001-D2-002: Student Athletes toggle column order', () => {
  it('labels are in spec order', () => {
    expect(labels(STUDENT_ATHLETES_COLUMNS)).toEqual([
      'ID',
      'Full Name',
      'Position',
      'Recruiting Status',
      'Grad Year',
      'Height',
      'Weight',
      '40yd',
      'AGI',
      'Captain',
      'All-Conf',
      'All-State',
      'Starter',
      'GPA',
      'SAT',
    ]);
  });

  it('collapses First/Last to a single Full Name column', () => {
    const k = keys(STUDENT_ATHLETES_COLUMNS);
    expect(k).not.toContain('first_name');
    expect(k).not.toContain('last_name');
    expect(STUDENT_ATHLETES_COLUMNS.find((c) => c.label === 'Full Name')).toBeDefined();
  });
});

// ── TC-S001-D2-003: College Coaches toggle ────────────────────────────────────

describe('TC-S001-D2-003: College Coaches toggle is an intentional empty state', () => {
  it('renders no field headers (empty column config)', () => {
    expect(Array.isArray(COLLEGE_COACHES_COLUMNS)).toBe(true);
    expect(COLLEGE_COACHES_COLUMNS).toHaveLength(0);
  });

  it('carries the spec-required empty state message', () => {
    expect(COLLEGE_COACHES_EMPTY_MESSAGE).toBe('No college coaches found');
  });
});

// ── TC-S001-D2-004: HS Coaches toggle ─────────────────────────────────────────

describe('TC-S001-D2-004: HS Coaches toggle column order', () => {
  it('labels are in spec order', () => {
    expect(labels(HS_COACHES_COLUMNS)).toEqual([
      'ID',
      'Full Name',
      'Phone',
      'Head Coach',
      'School',
      'Created',
    ]);
  });

  it('collapses First/Last to Full Name', () => {
    const k = keys(HS_COACHES_COLUMNS);
    expect(k).not.toContain('first_name');
    expect(k).not.toContain('last_name');
  });

  it('includes Head Coach and School columns sourced from hs_coach_schools join', () => {
    const head = HS_COACHES_COLUMNS.find((c) => c.label === 'Head Coach');
    const school = HS_COACHES_COLUMNS.find((c) => c.label === 'School');
    expect(head).toBeDefined();
    expect(school).toBeDefined();
  });
});

// ── TC-S001-D2-005: Counselors toggle ─────────────────────────────────────────

describe('TC-S001-D2-005: Counselors toggle column order', () => {
  // Head Coach column removed (2026-04-21 ruling): hs_counselor_schools has no
  // is_head_coach column, so the field was structurally empty.
  it('labels are in spec order — Head Coach removed', () => {
    expect(labels(COUNSELORS_COLUMNS)).toEqual([
      'ID',
      'Full Name',
      'Phone',
      'School',
      'Created',
    ]);
  });

  it('collapses First/Last to Full Name', () => {
    const k = keys(COUNSELORS_COLUMNS);
    expect(k).not.toContain('first_name');
    expect(k).not.toContain('last_name');
  });

  it('does not include a Head Coach column (no structural source)', () => {
    expect(labels(COUNSELORS_COLUMNS)).not.toContain('Head Coach');
    expect(keys(COUNSELORS_COLUMNS)).not.toContain('is_head_coach');
  });
});

// ── TC-S001-D2-006: Parents toggle ────────────────────────────────────────────

describe('TC-S001-D2-006: Parents toggle renders Email only this sprint', () => {
  it('has exactly one column — Email', () => {
    expect(labels(PARENTS_COLUMNS)).toEqual(['Email']);
  });

  it('does not include Associated Student Athlete (deferred to Sprint 002)', () => {
    expect(labels(PARENTS_COLUMNS)).not.toContain('Associated Student Athlete');
    expect(keys(PARENTS_COLUMNS)).not.toContain('associated_student_id');
    expect(keys(PARENTS_COLUMNS)).not.toContain('associated_student_name');
  });
});

// ── TC-S001-D2-007: Shape invariants ──────────────────────────────────────────

describe('TC-S001-D2-007: every non-empty column config has well-formed entries', () => {
  const suites = {
    ACCOUNTS_COLUMNS,
    STUDENT_ATHLETES_COLUMNS,
    HS_COACHES_COLUMNS,
    COUNSELORS_COLUMNS,
    PARENTS_COLUMNS,
  };

  for (const [name, cols] of Object.entries(suites)) {
    it(`${name}: every entry has string key, string label, boolean editable, string width`, () => {
      for (const c of cols) {
        expect(typeof c.key).toBe('string');
        expect(c.key.length).toBeGreaterThan(0);
        expect(typeof c.label).toBe('string');
        expect(c.label.length).toBeGreaterThan(0);
        expect(typeof c.editable).toBe('boolean');
        expect(typeof c.width).toBe('string');
      }
    });

    it(`${name}: keys are unique`, () => {
      const k = keys(cols);
      expect(new Set(k).size).toBe(k.length);
    });
  }
});
