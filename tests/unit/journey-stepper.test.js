/**
 * journey-stepper.test.js — Sprint 003 D2a (Home view user journey)
 *
 * Home view now mounts a three-step vertical journey. This test covers the
 * pure data source (HOME_JOURNEY_STEPS) — rendering correctness is covered
 * by Playwright since Vitest runs in node env without jsdom.
 */

import { describe, it, expect } from 'vitest';
import { HOME_JOURNEY_STEPS } from '../../src/lib/copy/homeJourneyCopy.js';

describe('HOME_JOURNEY_STEPS', () => {
  it('exports exactly three steps', () => {
    expect(HOME_JOURNEY_STEPS).toHaveLength(3);
  });

  it('ordered My Profile → My Grit Fit → My Short List', () => {
    expect(HOME_JOURNEY_STEPS.map(s => s.heading)).toEqual([
      'My Profile',
      'My Grit Fit',
      'My Short List',
    ]);
  });

  it('each step carries a heading, body, cta label, and href', () => {
    for (const step of HOME_JOURNEY_STEPS) {
      expect(step.heading).toBeTruthy();
      expect(step.body).toBeTruthy();
      expect(step.cta).toBeTruthy();
      expect(step.href).toBeTruthy();
    }
  });

  it('routes CTAs to the student view routes', () => {
    const byId = Object.fromEntries(HOME_JOURNEY_STEPS.map(s => [s.id, s]));
    expect(byId.profile.href).toBe('/profile');
    expect(byId.gritfit.href).toBe('/gritfit');
    expect(byId.shortlist.href).toBe('/shortlist');
  });

  it('body copy is long enough to explain the step (>= 80 chars)', () => {
    for (const step of HOME_JOURNEY_STEPS) {
      expect(step.body.length).toBeGreaterThanOrEqual(80);
    }
  });
});
