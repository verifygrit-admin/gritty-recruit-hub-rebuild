/**
 * cmg-substitute-edges.test.js — Sprint 025 Phase 9
 *
 * Gap-closure coverage for src/lib/cmg/substitute.js. Complements the
 * Phase 5A suite in cmg-substitute.test.js by exercising:
 *   - All remaining token variants ([Abbv Grad Year], [GPA], [College Name],
 *     [Name of Camp], [Name of the Camp]) — confirms each maps to its canonical
 *     form/profile field through SUBSTITUTION_TOKENS.
 *   - Empty / null inputs (template, profile object).
 *   - Longest-match precedence when a shorter token is a prefix of a longer one.
 *   - Tokenize behavior with unknown bracketed runs (passed through as text).
 *   - substituteToSegments edge cases: autofilled-only template, adjacent-text
 *     merging across form-filled segments, null/empty inputs.
 *   - renderSegments direct export (sibling of renderSegmentsToPlainText).
 */

import { describe, it, expect } from 'vitest';
import {
  substitute,
  substituteToSegments,
  renderSegments,
  tokenize,
  resolveToken,
} from '../../src/lib/cmg/substitute.js';

const profile = {
  name: 'Ayden Watkins',
  grad_year: 2027,
  position: 'WR',
  high_school: 'BC High',
  state: 'MA',
  gpa: '3.8',
};

describe('substitute — token variants', () => {
  it('resolves [Abbv Grad Year] variant the same as [Abbrev Grad Year]', () => {
    const out = substitute('[Abbrev Grad Year] / [Abbv Grad Year]', { profile, form: {} });
    expect(out).toBe("'27 / '27");
  });

  it('resolves [GPA] variant to profile.gpa', () => {
    const out = substitute('GPA: [GPA]', { profile, form: {} });
    expect(out).toBe('GPA: 3.8');
  });

  it('resolves [College Name] variant to form.school_name', () => {
    const out = substitute('[College Name]', { profile, form: { school_name: 'Alabama' } });
    expect(out).toBe('Alabama');
  });

  it('resolves [Name of Camp] and [Name of the Camp] variants to form.camp_name', () => {
    const ctx = { profile, form: { camp_name: 'Elite Camp' } };
    expect(substitute('[Name of Camp]', ctx)).toBe('Elite Camp');
    expect(substitute('[Name of the Camp]', ctx)).toBe('Elite Camp');
  });
});

describe('substitute — null / empty inputs', () => {
  it('returns empty string for null template', () => {
    expect(substitute(null, { profile, form: {} })).toBe('');
  });

  it('returns empty string for empty template', () => {
    expect(substitute('', { profile, form: {} })).toBe('');
  });

  it('leaves every profile token bracketed when profile is empty object', () => {
    const out = substitute('[Position] [HS Name] [State]', { profile: {}, form: {} });
    expect(out).toBe('[Position] [HS Name] [State]');
  });

  it('returns null from resolveToken when ctx is missing entirely', () => {
    expect(resolveToken('[Position]', undefined)).toBeNull();
  });

  it('returns null from resolveToken for unknown token keys', () => {
    expect(resolveToken('[Not A Real Token]', { profile })).toBeNull();
  });
});

describe('substitute — longest-match precedence', () => {
  it('matches [Last Name of the Assistant Coach...] before [Last Name] when both appear', () => {
    const template =
      'Coach [Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact] / Coach [Last Name]';
    const ctx = {
      profile,
      form: { ac_or_rc_last_name: 'Jones' },
      recipient: { last_name: 'Smith' },
    };
    expect(substitute(template, ctx)).toBe('Coach Jones / Coach Smith');
  });
});

describe('tokenize — unknown bracket handling', () => {
  it('passes an unknown bracketed run through as plain text (no false-positive token match)', () => {
    const entries = tokenize('Hello [Not A Token] world');
    // The bracket sequence is not in SUBSTITUTION_TOKENS, so it falls into the
    // text bucket character-by-character — a single merged text entry.
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ kind: 'text', value: 'Hello [Not A Token] world', token: null });
  });

  it('returns empty array for empty template', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('substituteToSegments — edge shapes', () => {
  it('returns empty array for null / empty template', () => {
    expect(substituteToSegments(null, { profile, form: {} })).toEqual([]);
    expect(substituteToSegments('', { profile, form: {} })).toEqual([]);
  });

  it('autofilled-only template emits autofilled segments without surrounding text', () => {
    const segs = substituteToSegments('[Position][HS Name]', { profile, form: {} });
    expect(segs).toEqual([
      { kind: 'autofilled', value: 'WR' },
      { kind: 'autofilled', value: 'BC High' },
    ]);
  });

  it('form-filled values merge with surrounding literal text into one text segment', () => {
    // Form-source values render as plain text so they fold into the surrounding
    // literal text — proves the pushSegment merging is per-kind, not per-entry.
    const segs = substituteToSegments(
      'Hi at [School Name] today.',
      { profile, form: { school_name: 'Alabama' }, recipient: {} },
    );
    expect(segs).toEqual([{ kind: 'text', value: 'Hi at Alabama today.' }]);
  });
});

describe('renderSegments — direct export', () => {
  it('joins all segment kinds verbatim regardless of label', () => {
    const segs = [
      { kind: 'text', value: 'Coach ' },
      { kind: 'unfilled', value: '[Last Name]' },
      { kind: 'autofilled', value: ' from WR' },
    ];
    expect(renderSegments(segs)).toBe('Coach [Last Name] from WR');
  });

  it('returns empty string for empty / non-array inputs', () => {
    expect(renderSegments([])).toBe('');
    expect(renderSegments(null)).toBe('');
    expect(renderSegments(undefined)).toBe('');
  });
});
