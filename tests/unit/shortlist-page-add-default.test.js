/**
 * shortlist-page-add-default.test.js — Sprint 004 Wave 0 CW-1-followup
 *
 * Covers the Shortlist default-write shape for schools NOT present in the
 * schools table (i.e. unscored / no GRIT FIT result available).
 *
 * Decision: CW-1-followup operator ruling (2026-04-22).
 *   The "not_evaluated" sentinel is retired UI-wide. Student-side default
 *   writes clear status: grit_fit_status = null, grit_fit_labels = [].
 *
 * Scope boundary: A-4 (student-side fetch default). Coach-side paths are
 * not in scope for this test.
 */

import { describe, it, expect } from 'vitest';
import { buildUnscoredShortlistDefault } from '../../src/pages/ShortlistPage.jsx';

describe('Shortlist add/backfill default — unscored school', () => {
  it('writes grit_fit_status = null and grit_fit_labels = [] (no "not_evaluated")', () => {
    const patch = buildUnscoredShortlistDefault('2026-04-22T00:00:00.000Z');

    expect(patch.grit_fit_status).toBeNull();
    expect(patch.grit_fit_labels).toEqual([]);

    // Regression guard: the retired sentinel must not resurface.
    expect(patch.grit_fit_status).not.toBe('not_evaluated');
    expect(patch.grit_fit_labels).not.toContain('not_evaluated');

    // updated_at is written (kept for supabase .update contract parity).
    expect(patch.updated_at).toBe('2026-04-22T00:00:00.000Z');
  });
});
