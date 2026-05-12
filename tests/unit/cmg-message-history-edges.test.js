/**
 * cmg-message-history-edges.test.js — Sprint 025 Phase 9
 *
 * Gap-closure coverage for src/components/cmg/MessageHistory.jsx helpers.
 * Complements the Phase 8 suite in cmg-message-history.test.js by exercising:
 *   - Bucket boundaries in formatRelativeDate (exact 60 min, exact 24 h,
 *     exact 7 days, year-cross M/D/YY).
 *   - Future-date fall-through to absolute format.
 *   - Scenario lookup priority: id wins when both id and title are present;
 *     unknown-id + title falls back; unknown-id + no title returns null title.
 *   - Negative input guards on bodyPreview (non-string types).
 */

import { describe, it, expect } from 'vitest';
import {
  formatRelativeDate,
  lookupScenarioTitle,
  bodyPreview,
} from '../../src/components/cmg/MessageHistory.jsx';

describe('formatRelativeDate — bucket boundaries', () => {
  const NOW = new Date('2026-05-12T12:00:00Z').getTime();

  it('exactly 60 minutes flips from "Xm ago" to "1h ago"', () => {
    const iso = new Date(NOW - 60 * 60_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('1h ago');
  });

  it('exactly 24 hours flips from "Xh ago" to "yesterday"', () => {
    const iso = new Date(NOW - 24 * 3_600_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('yesterday');
  });

  it('exactly 7 days renders as "M/D" (not "X days ago")', () => {
    // 7 days before 2026-05-12 → 2026-05-05 → "5/5".
    const iso = new Date(NOW - 7 * 86_400_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('5/5');
  });

  it('year boundary — Dec 30 2025 (>30 days back) renders M/D/YY with two-digit year', () => {
    // 2026-05-12 minus ~133 days lands in 2025 → uses "12/30/25" form.
    const iso = '2025-12-30T12:00:00Z';
    expect(formatRelativeDate(iso, NOW)).toBe('12/30/25');
  });

  it('future date (clock skew) falls through to absolute M/D/YY form', () => {
    // 5 minutes in the future → deltaMs is negative; helper falls through to
    // the >30-day / future-date branch (MM/DD/YY).
    const future = new Date(NOW + 5 * 60_000).toISOString();
    const out = formatRelativeDate(future, NOW);
    expect(out).toBe('5/12/26');
  });
});

describe('lookupScenarioTitle — id vs title priority', () => {
  it('scenario_id wins when both id and scenario_title are present', () => {
    // id=4 resolves to "Introducing Myself"; the record's scenario_title
    // ("Bogus Title") is overridden because the id matched the dispatcher.
    const out = lookupScenarioTitle({ scenario_id: 4, scenario_title: 'Bogus Title' });
    expect(out.id).toBe(4);
    expect(out.title).toBe('Introducing Myself');
  });

  it('unknown scenario_id with scenario_title falls back to the denormalized title', () => {
    // id=99 is not in CMG_SCENARIOS — fall through to the legacy title field.
    const out = lookupScenarioTitle({ scenario_id: 99, scenario_title: 'Custom Title' });
    expect(out.id).toBe(99);
    expect(out.title).toBe('Custom Title');
  });

  it('unknown scenario_id with no title returns { id, title: null }', () => {
    const out = lookupScenarioTitle({ scenario_id: 99 });
    expect(out.id).toBe(99);
    expect(out.title).toBeNull();
  });

  it('legacy scenario_number resolves through the same id path', () => {
    // Confirms scenario_number is a true alias for scenario_id at lookup time.
    const out = lookupScenarioTitle({ scenario_number: 1 });
    expect(out.id).toBe(1);
    expect(out.title).toBeTruthy();
  });
});

describe('bodyPreview — non-string guards', () => {
  it('returns "—" for non-string inputs (number, object, boolean)', () => {
    expect(bodyPreview(42)).toBe('—');
    expect(bodyPreview({})).toBe('—');
    expect(bodyPreview(true)).toBe('—');
  });
});
