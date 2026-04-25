/**
 * @vitest-environment jsdom
 *
 * g5-map-popup-status.test.js — Sprint 004 Phase 1 F2.
 *
 * Regression guard for the revert of G5's slide-out to the Sprint 003 popup:
 *   - buildStatusPillHtml(statusKey) returns a well-formed inline HTML pill
 *     with the correct background / text color / label for a known key.
 *   - Empty / null / unknown keys yield '' (A-2: no pill rendered).
 *   - derivePopupStatusKey composes computeGritFitStatuses and surfaces the
 *     highest-priority label (or null for no-label schools).
 *
 * No jsdom required — pure string assertions on exported helpers.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildStatusPillHtml,
  derivePopupStatusKey,
} from '../../src/components/GritFitMapView.jsx';
import { STATUS_LABELS } from '../../src/lib/statusLabels.js';

describe('F2 map popup status pill — buildStatusPillHtml', () => {
  it('returns empty string for null / undefined / empty key (A-2 guard)', () => {
    expect(buildStatusPillHtml(null)).toBe('');
    expect(buildStatusPillHtml(undefined)).toBe('');
    expect(buildStatusPillHtml('')).toBe('');
  });

  it('returns empty string for unknown key (defensive)', () => {
    expect(buildStatusPillHtml('not_a_real_status')).toBe('');
  });

  it('for "currently_recommended" — includes bg color and label from STATUS_LABELS', () => {
    const html = buildStatusPillHtml('currently_recommended');
    const cfg = STATUS_LABELS.currently_recommended;
    expect(html).toContain('data-testid="popup-status-pill"');
    expect(html).toContain('data-status="currently_recommended"');
    expect(html).toContain(cfg.bg);
    expect(html).toContain(cfg.label);
  });

  it('for "outside_geographic_reach" — includes expected label/color', () => {
    const html = buildStatusPillHtml('outside_geographic_reach');
    const cfg = STATUS_LABELS.outside_geographic_reach;
    expect(html).toContain(cfg.bg);
    expect(html).toContain(cfg.label);
  });

  it('for "below_athletic_fit" (Highly Recruitable) — label matches', () => {
    const html = buildStatusPillHtml('below_athletic_fit');
    expect(html).toContain('Highly Recruitable');
  });
});

describe('F2 map popup status pill — derivePopupStatusKey', () => {
  const topTier = 'FCS';
  const recruitReach = 500;

  it('eligible matchRank<=50 school yields "currently_recommended"', () => {
    const school = {
      unitid: 1,
      type: 'FCS',
      eligible: true,
      matchRank: 5,
      dist: 50,
      schoolRigor: 0,
      athleteAcad: 0,
    };
    expect(derivePopupStatusKey(school, topTier, recruitReach)).toBe('currently_recommended');
  });

  it('school with dist > recruitReach yields "outside_geographic_reach"', () => {
    const school = {
      unitid: 2,
      type: 'FCS',
      eligible: false,
      matchRank: 999,
      dist: 5000,
      schoolRigor: 0,
      athleteAcad: 0,
    };
    // Silence diagnostic warn only for the neutral-school case; this fixture
    // hits outside_geographic_reach so it shouldn't warn.
    expect(derivePopupStatusKey(school, topTier, recruitReach)).toBe('outside_geographic_reach');
  });

  it('no-applicable-labels school yields null (A-2: no pill)', () => {
    // Sprint 005 P2.5: diagnostic emit demoted from warn to debug.
    const warnSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const school = {
      unitid: 3,
      type: 'FCS',
      eligible: false,
      matchRank: 999,
      dist: 100,
      schoolRigor: 0,
      athleteAcad: 0,
    };
    expect(derivePopupStatusKey(school, topTier, recruitReach)).toBeNull();
    warnSpy.mockRestore();
  });

  it('combined: derive+build produces HTML fragment for recommended school', () => {
    const school = {
      unitid: 4,
      type: 'FCS',
      eligible: true,
      matchRank: 10,
      dist: 100,
      schoolRigor: 0,
      athleteAcad: 0,
    };
    const key = derivePopupStatusKey(school, topTier, recruitReach);
    const html = buildStatusPillHtml(key);
    expect(html).toContain('Currently Recommended');
  });

  it('unknown/broken school returns null rather than throwing', () => {
    // Sprint 005 P2.5: diagnostic emit demoted from warn to debug.
    const warnSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const result = derivePopupStatusKey(undefined, null, null);
    // Either returns null or throws — must return null per contract.
    expect(result).toBeNull();
    warnSpy.mockRestore();
  });
});
