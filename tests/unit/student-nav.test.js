/**
 * student-nav.test.js
 *
 * Sprint 003 D2b — original Student View nav order.
 * Sprint 022 — adds MY GRIT GUIDES to student nav and GRIT GUIDES to coach nav.
 * Sprint 023 — adds MY PROFILE to coach/counselor nav (between DASHBOARD and
 *              GRIT GUIDES, mirroring the student journey position).
 */

import { describe, it, expect } from 'vitest';
import { STUDENT_NAV_LINKS, COACH_NAV_LINKS } from '../../src/lib/navLinks.js';

describe('STUDENT_NAV_LINKS', () => {
  it('has five items in journey order', () => {
    expect(STUDENT_NAV_LINKS.map(l => l.label)).toEqual([
      'HOME',
      'MY PROFILE',
      'MY GRIT FIT',
      'MY SHORTLIST',
      'MY GRIT GUIDES',
    ]);
  });

  it('routes each label to the right path', () => {
    const byLabel = Object.fromEntries(STUDENT_NAV_LINKS.map(l => [l.label, l.to]));
    expect(byLabel['HOME']).toBe('/');
    expect(byLabel['MY PROFILE']).toBe('/profile');
    expect(byLabel['MY GRIT FIT']).toBe('/gritfit');
    expect(byLabel['MY SHORTLIST']).toBe('/shortlist');
    expect(byLabel['MY GRIT GUIDES']).toBe('/grit-guides');
  });

  it('does not include legacy labels', () => {
    const labels = STUDENT_NAV_LINKS.map(l => l.label);
    expect(labels).not.toContain('PROFILE');
    expect(labels).not.toContain('SHORTLIST');
  });
});

describe('COACH_NAV_LINKS', () => {
  it('is HOME + DASHBOARD + MY PROFILE + GRIT GUIDES (Sprint 022 + 023)', () => {
    expect(COACH_NAV_LINKS.map(l => l.label)).toEqual([
      'HOME',
      'DASHBOARD',
      'MY PROFILE',
      'GRIT GUIDES',
    ]);
  });

  it('routes MY PROFILE to /coach/profile', () => {
    const byLabel = Object.fromEntries(COACH_NAV_LINKS.map(l => [l.label, l.to]));
    expect(byLabel['MY PROFILE']).toBe('/coach/profile');
  });
});
