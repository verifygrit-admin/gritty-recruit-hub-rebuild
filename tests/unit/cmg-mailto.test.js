/**
 * cmg-mailto.test.js — Sprint 025 Phase 7
 *
 * Covers:
 *   - buildMailto: subject + body encoding, body+signature join, isLong
 *     threshold, empty-email throw.
 *   - renderSegmentsToPlainText: joins all segment kinds (text + autofilled
 *     + unfilled) into a single plain string; unfilled segments keep their
 *     bracketed form; empty array → empty string.
 */

import { describe, it, expect } from 'vitest';
import { buildMailto } from '../../src/lib/cmg/mailto.js';
import { renderSegmentsToPlainText } from '../../src/lib/cmg/substitute.js';

describe('buildMailto', () => {
  it('encodes subject + body and joins body with signature using \\n\\n', () => {
    const { url, isLong } = buildMailto({
      email: 'student@example.com',
      subject: 'Camp interest — Ayden Watkins (2027)',
      body: 'Coach Smith,\n\nIm interested.',
      signature: 'Ayden Watkins\nWR / 2027',
    });
    expect(url.startsWith('mailto:student%40example.com?')).toBe(true);
    // URLSearchParams uses '+' for space and percent-encodes the rest.
    const query = url.split('?')[1];
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe('Camp interest — Ayden Watkins (2027)');
    expect(params.get('body')).toBe(
      'Coach Smith,\n\nIm interested.\n\nAyden Watkins\nWR / 2027',
    );
    expect(isLong).toBe(false);
  });

  it('handles null subject as empty string', () => {
    const { url } = buildMailto({
      email: 'a@b.com',
      subject: null,
      body: 'Hi',
      signature: 'Sig',
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('subject')).toBe('');
    expect(params.get('body')).toBe('Hi\n\nSig');
  });

  it('returns isLong=true when body + signature exceeds 2000 chars', () => {
    const longBody = 'a'.repeat(2100);
    const { isLong } = buildMailto({
      email: 'a@b.com',
      subject: 'x',
      body: longBody,
      signature: '',
    });
    expect(isLong).toBe(true);
  });

  it('returns isLong=false for a body just under threshold', () => {
    const body = 'a'.repeat(1999);
    const { isLong } = buildMailto({
      email: 'a@b.com',
      subject: 's',
      body,
      signature: '',
    });
    expect(isLong).toBe(false);
  });

  it('throws on empty / null / whitespace email', () => {
    expect(() => buildMailto({ email: '', subject: 's', body: 'b', signature: '' })).toThrow(/email is required/);
    expect(() => buildMailto({ email: null, subject: 's', body: 'b', signature: '' })).toThrow(/email is required/);
    expect(() => buildMailto({ email: '   ', subject: 's', body: 'b', signature: '' })).toThrow(/email is required/);
  });
});

describe('renderSegmentsToPlainText', () => {
  it('joins text + autofilled + unfilled segments into one plain string', () => {
    const segments = [
      { kind: 'text', value: 'Coach ' },
      { kind: 'unfilled', value: '[Last Name]' },
      { kind: 'text', value: ', my name is ' },
      { kind: 'autofilled', value: 'Ayden Watkins' },
      { kind: 'text', value: '.' },
    ];
    expect(renderSegmentsToPlainText(segments)).toBe(
      'Coach [Last Name], my name is Ayden Watkins.',
    );
  });

  it('preserves bracketed form for unfilled tokens', () => {
    const segments = [
      { kind: 'unfilled', value: '[School Name]' },
      { kind: 'text', value: ' is awesome.' },
    ];
    expect(renderSegmentsToPlainText(segments)).toBe('[School Name] is awesome.');
  });

  it('returns empty string for empty array', () => {
    expect(renderSegmentsToPlainText([])).toBe('');
  });

  it('returns empty string for non-array input', () => {
    expect(renderSegmentsToPlainText(null)).toBe('');
    expect(renderSegmentsToPlainText(undefined)).toBe('');
  });
});
