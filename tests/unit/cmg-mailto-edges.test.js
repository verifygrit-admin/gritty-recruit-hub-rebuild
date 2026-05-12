/**
 * cmg-mailto-edges.test.js — Sprint 025 Phase 9
 *
 * Gap-closure coverage for src/lib/cmg/mailto.js. Complements the Phase 7
 * suite in cmg-mailto.test.js by exercising:
 *   - URL-encoding fidelity for special characters in the body
 *     (newlines, ampersands, equals signs, plus signs, hash signs).
 *   - Exact LONG_BODY_THRESHOLD boundaries (2000 → NOT long; 2001 → IS long).
 *   - Empty signature produces a body with no trailing blank lines.
 *   - openMailto is a safe no-op when window is undefined.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildMailto, openMailto } from '../../src/lib/cmg/mailto.js';

describe('buildMailto — special character encoding', () => {
  it('round-trips ampersands, equals, plus, hash, and newlines through URLSearchParams', () => {
    const body = 'a & b = c + d # e\nnewline';
    const { url } = buildMailto({
      email: 'student@example.com',
      subject: 'S',
      body,
      signature: '',
    });
    const params = new URLSearchParams(url.split('?')[1]);
    // URLSearchParams round-trip preserves the literal payload — the wire form
    // is percent-encoded, but get() returns the raw string.
    expect(params.get('body')).toBe(body);
  });

  it('percent-encodes the email portion of the mailto URL', () => {
    const { url } = buildMailto({
      email: 'a+b@example.com',
      subject: '',
      body: '',
      signature: '',
    });
    expect(url.startsWith('mailto:a%2Bb%40example.com?')).toBe(true);
  });
});

describe('buildMailto — exact threshold boundaries', () => {
  it('body length exactly 2000 is NOT long', () => {
    const { isLong } = buildMailto({
      email: 'a@b.com',
      subject: 's',
      body: 'a'.repeat(2000),
      signature: '',
    });
    expect(isLong).toBe(false);
  });

  it('body length exactly 2001 IS long', () => {
    const { isLong } = buildMailto({
      email: 'a@b.com',
      subject: 's',
      body: 'a'.repeat(2001),
      signature: '',
    });
    expect(isLong).toBe(true);
  });

  it('threshold is body+signature combined (joined by \\n\\n)', () => {
    // 1997 + "\n\n" (2 chars) + 1 = 2000 → NOT long.
    const { isLong } = buildMailto({
      email: 'a@b.com',
      subject: 's',
      body: 'a'.repeat(1997),
      signature: 'b',
    });
    expect(isLong).toBe(false);
  });
});

describe('buildMailto — empty signature', () => {
  it('omits the \\n\\n join when signature is empty string', () => {
    const { url } = buildMailto({
      email: 'a@b.com',
      subject: 's',
      body: 'Hello',
      signature: '',
    });
    const params = new URLSearchParams(url.split('?')[1]);
    // No trailing blank lines — body stands alone.
    expect(params.get('body')).toBe('Hello');
  });

  it('omits the \\n\\n join when signature is null / undefined', () => {
    const a = buildMailto({ email: 'a@b.com', subject: 's', body: 'Hi', signature: null });
    const b = buildMailto({ email: 'a@b.com', subject: 's', body: 'Hi', signature: undefined });
    expect(new URLSearchParams(a.url.split('?')[1]).get('body')).toBe('Hi');
    expect(new URLSearchParams(b.url.split('?')[1]).get('body')).toBe('Hi');
  });
});

describe('openMailto — environment guards', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('does not throw when window is undefined (non-browser env)', () => {
    // The vitest default environment is jsdom; temporarily remove window to
    // simulate the non-browser path (Node SSR, Worker, etc.).
    delete globalThis.window;
    expect(() => openMailto('mailto:test@example.com')).not.toThrow();
  });

  it('assigns window.location.href when window is defined', () => {
    // Replace window with a stub we can observe; restored in afterEach.
    const setHref = vi.fn();
    globalThis.window = { location: { set href(v) { setHref(v); } } };
    openMailto('mailto:x@y.com?subject=hi');
    expect(setHref).toHaveBeenCalledWith('mailto:x@y.com?subject=hi');
  });
});
