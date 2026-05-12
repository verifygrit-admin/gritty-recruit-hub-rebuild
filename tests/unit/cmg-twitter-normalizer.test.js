/**
 * cmg-twitter-normalizer.test.js — Sprint 025 hotfix (2026-05-12)
 *
 * Operator-reported bug: a bare Twitter handle in public.profiles.twitter
 * rendered as a relative-path <a href="..."> across CMG surfaces, producing
 * broken links like https://app.grittyfb.com/{handle}. Fix: normalize every
 * accepted shape to the canonical https://x.com/{handle} URL at the
 * substitution boundary (src/lib/cmg/substitute.js) and at the Phase4Profile
 * auto-fill render site.
 *
 * Coverage:
 *   1. normalizeTwitterUrl on the eight real Supabase sample shapes plus
 *      defensive variants (twitter.com canonicalization, trailing slash /
 *      query / fragment stripping, http → https, null / empty / whitespace
 *      / "@"-alone).
 *   2. Integration: substitute() with a scenario-style body template and
 *      ctx.profile.twitter = bare handle renders the full URL in the body.
 */

import { describe, it, expect } from 'vitest';
import { normalizeTwitterUrl } from '../../src/lib/cmg/twitter.js';
import { substitute } from '../../src/lib/cmg/substitute.js';

describe('normalizeTwitterUrl — handle shapes', () => {
  it('"@JesseBargar27" → "https://x.com/JesseBargar27"', () => {
    expect(normalizeTwitterUrl('@JesseBargar27')).toBe('https://x.com/JesseBargar27');
  });

  it('bare "ElijahDonnalson" → "https://x.com/ElijahDonnalson"', () => {
    expect(normalizeTwitterUrl('ElijahDonnalson')).toBe('https://x.com/ElijahDonnalson');
  });

  it('preserves underscores: "Luke_kell7" → "https://x.com/Luke_kell7"', () => {
    expect(normalizeTwitterUrl('Luke_kell7')).toBe('https://x.com/Luke_kell7');
  });

  it('digits-in-handle preserved: "ThomasGirmay27"', () => {
    expect(normalizeTwitterUrl('ThomasGirmay27')).toBe('https://x.com/ThomasGirmay27');
  });
});

describe('normalizeTwitterUrl — URL shapes', () => {
  it('full https://x.com/ URL → unchanged', () => {
    expect(normalizeTwitterUrl('https://x.com/foo')).toBe('https://x.com/foo');
  });

  it('twitter.com canonicalized to x.com', () => {
    expect(normalizeTwitterUrl('https://twitter.com/bar')).toBe('https://x.com/bar');
  });

  it('http canonicalized to https + twitter.com → x.com', () => {
    expect(normalizeTwitterUrl('http://twitter.com/baz')).toBe('https://x.com/baz');
  });

  it('trailing slash stripped', () => {
    expect(normalizeTwitterUrl('https://x.com/foo/')).toBe('https://x.com/foo');
  });

  it('query string stripped', () => {
    expect(normalizeTwitterUrl('https://x.com/foo?ref=share')).toBe('https://x.com/foo');
  });

  it('fragment stripped', () => {
    expect(normalizeTwitterUrl('https://x.com/foo#about')).toBe('https://x.com/foo');
  });

  it('www. subdomain handled', () => {
    expect(normalizeTwitterUrl('https://www.x.com/foo')).toBe('https://x.com/foo');
  });
});

describe('normalizeTwitterUrl — null / empty handling', () => {
  it('null → null', () => {
    expect(normalizeTwitterUrl(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(normalizeTwitterUrl(undefined)).toBeNull();
  });

  it('empty string → null', () => {
    expect(normalizeTwitterUrl('')).toBeNull();
  });

  it('whitespace-only → null', () => {
    expect(normalizeTwitterUrl('   ')).toBeNull();
  });

  it('"@" alone → null (no handle)', () => {
    expect(normalizeTwitterUrl('@')).toBeNull();
  });

  it('non-string (number) → null', () => {
    expect(normalizeTwitterUrl(123)).toBeNull();
  });
});

describe('substitute — Twitter token integration', () => {
  it('bare handle in ctx.profile.twitter resolves to full URL in rendered body', () => {
    const template =
      'You can see my latest highlights on Twitter/X: [Twitter profile link]';
    const ctx = {
      profile: { twitter: 'ThomasGirmay27' },
      form: {},
      recipient: {},
    };
    const result = substitute(template, ctx);
    expect(result).toBe(
      'You can see my latest highlights on Twitter/X: https://x.com/ThomasGirmay27',
    );
  });

  it('@-prefixed handle in ctx.profile.twitter resolves to full URL', () => {
    const ctx = { profile: { twitter: '@JesseBargar27' }, form: {}, recipient: {} };
    expect(substitute('[Twitter profile link]', ctx)).toBe('https://x.com/JesseBargar27');
  });

  it('empty twitter leaves the token bracketed (unfilled passthrough)', () => {
    const ctx = { profile: { twitter: '' }, form: {}, recipient: {} };
    expect(substitute('[Twitter profile link]', ctx)).toBe('[Twitter profile link]');
  });

  it('null twitter leaves the token bracketed (unfilled passthrough)', () => {
    const ctx = { profile: { twitter: null }, form: {}, recipient: {} };
    expect(substitute('[Twitter profile link]', ctx)).toBe('[Twitter profile link]');
  });
});
