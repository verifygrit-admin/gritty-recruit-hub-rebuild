/**
 * admin-tabs.test.js — Sprint 001 D1 (Tab Remediation) — RED phase
 *
 * Owner: Sprint 001
 * Suite: TC-S001-D1-001 through TC-S001-D1-006
 *
 * Covers:
 *   TC-S001-D1-001: ADMIN_TABS exports exactly four tabs
 *   TC-S001-D1-002: ADMIN_TABS does not include a 'schools' tab
 *   TC-S001-D1-003: ADMIN_TABS tabs render in spec order: users, institutions, recruiting-events, audit
 *   TC-S001-D1-004: deriveActiveTab('/admin/institutions') returns 'institutions'
 *   TC-S001-D1-005: deriveActiveTab('/admin') falls back to first remaining tab ('users'), never 'schools'
 *   TC-S001-D1-006: deriveActiveTab('/admin/schools') falls back to first remaining tab ('users')
 *
 * Decision basis: Sprint 001 spec Deliverable 1 — remove Schools tab, final order
 *   Users, Institutions, Recruiting Events, Audit Log.
 *
 * Implementation deferred: src/lib/adminTabs.js does not exist yet. These tests
 * will fail on import until AdminPage.jsx's TABS constant and deriveActiveTab
 * function are extracted into that module.
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { ADMIN_TABS, deriveActiveTab } from '../../src/lib/adminTabs.js';

// ── TC-S001-D1-001 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-001: ADMIN_TABS exports exactly four tabs', () => {
  it('has length 4', () => {
    expect(ADMIN_TABS).toHaveLength(4);
  });
});

// ── TC-S001-D1-002 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-002: ADMIN_TABS does not include a schools tab', () => {
  it('contains no tab with key "schools"', () => {
    const keys = ADMIN_TABS.map((t) => t.key);
    expect(keys).not.toContain('schools');
  });

  it('contains no tab path ending in /schools', () => {
    const paths = ADMIN_TABS.map((t) => t.path);
    expect(paths.some((p) => p.endsWith('/schools'))).toBe(false);
  });
});

// ── TC-S001-D1-003 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-003: ADMIN_TABS order matches spec', () => {
  it('tab keys are in order: users, institutions, recruiting-events, audit', () => {
    const keys = ADMIN_TABS.map((t) => t.key);
    expect(keys).toEqual(['users', 'institutions', 'recruiting-events', 'audit']);
  });

  it('tab labels are in order: Users, Institutions, Recruiting Events, Audit Log', () => {
    const labels = ADMIN_TABS.map((t) => t.label);
    expect(labels).toEqual(['Users', 'Institutions', 'Recruiting Events', 'Audit Log']);
  });
});

// ── TC-S001-D1-004 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-004: deriveActiveTab resolves valid /admin/<tab> paths', () => {
  it('returns "institutions" for /admin/institutions', () => {
    expect(deriveActiveTab('/admin/institutions')).toBe('institutions');
  });

  it('returns "users" for /admin/users', () => {
    expect(deriveActiveTab('/admin/users')).toBe('users');
  });

  it('returns "recruiting-events" for /admin/recruiting-events', () => {
    expect(deriveActiveTab('/admin/recruiting-events')).toBe('recruiting-events');
  });

  it('returns "audit" for /admin/audit', () => {
    expect(deriveActiveTab('/admin/audit')).toBe('audit');
  });
});

// ── TC-S001-D1-005 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-005: deriveActiveTab falls back to first remaining tab on bare /admin', () => {
  it('returns "users" for /admin', () => {
    expect(deriveActiveTab('/admin')).toBe('users');
  });

  it('returns "users" for /admin/', () => {
    expect(deriveActiveTab('/admin/')).toBe('users');
  });

  it('never falls back to "schools"', () => {
    expect(deriveActiveTab('/admin')).not.toBe('schools');
    expect(deriveActiveTab('/admin/')).not.toBe('schools');
  });
});

// ── TC-S001-D1-006 ─────────────────────────────────────────────────────────────

describe('TC-S001-D1-006: deriveActiveTab falls back when given the removed schools path', () => {
  it('returns "users" for /admin/schools (the removed tab)', () => {
    expect(deriveActiveTab('/admin/schools')).toBe('users');
  });

  it('returns "users" for any unknown tab segment', () => {
    expect(deriveActiveTab('/admin/does-not-exist')).toBe('users');
  });
});
