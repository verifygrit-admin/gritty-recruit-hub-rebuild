/**
 * student-nav.test.js — Sprint 003 D2b (Menu reordering)
 *
 * Asserts the Student View nav order and labels match the spec:
 *   HOME → MY PROFILE → MY GRIT FIT → MY SHORTLIST
 *
 * Coach nav unchanged.
 */

import { describe, it, expect } from 'vitest';
import { STUDENT_NAV_LINKS, COACH_NAV_LINKS } from '../../src/lib/navLinks.js';

describe('STUDENT_NAV_LINKS', () => {
  it('has four items in journey order', () => {
    expect(STUDENT_NAV_LINKS.map(l => l.label)).toEqual([
      'HOME',
      'MY PROFILE',
      'MY GRIT FIT',
      'MY SHORTLIST',
    ]);
  });

  it('routes each label to the right path', () => {
    const byLabel = Object.fromEntries(STUDENT_NAV_LINKS.map(l => [l.label, l.to]));
    expect(byLabel['HOME']).toBe('/');
    expect(byLabel['MY PROFILE']).toBe('/profile');
    expect(byLabel['MY GRIT FIT']).toBe('/gritfit');
    expect(byLabel['MY SHORTLIST']).toBe('/shortlist');
  });

  it('does not include legacy labels', () => {
    const labels = STUDENT_NAV_LINKS.map(l => l.label);
    expect(labels).not.toContain('PROFILE');
    expect(labels).not.toContain('SHORTLIST');
  });
});

describe('COACH_NAV_LINKS', () => {
  it('is unchanged: HOME + DASHBOARD', () => {
    expect(COACH_NAV_LINKS.map(l => l.label)).toEqual(['HOME', 'DASHBOARD']);
  });
});
