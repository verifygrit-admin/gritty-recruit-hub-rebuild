/**
 * home-copy.test.js — Sprint 004 Wave 2 (H1).
 * Verbatim test on the welcome header template and substitution.
 */

import { describe, it, expect } from 'vitest';
import { welcomeHeader, WELCOME_HEADER_TEMPLATE } from '../../src/lib/copy/homeCopy.js';

describe('homeCopy — H1 welcome header', () => {
  it('welcomeHeader("Chris") returns the expected two-line string', () => {
    const expected =
      'Welcome back, Chris!\nYour results are in! Check out your GRIT FIT matches and update your college football Short List.';
    expect(welcomeHeader('Chris')).toBe(expected);
  });

  it('template preserves the [First Name] placeholder literal', () => {
    expect(WELCOME_HEADER_TEMPLATE).toContain('[First Name]');
  });

  // Sprint 004 Phase 1 F1 regression guard:
  // Second line must end with '.' (period), NOT '!'.
  // First line's trailing '!' after the name is preserved.
  it('F1 regression: first line ends with "!" and second line ends with "."', () => {
    const [line1, line2] = welcomeHeader('Chris').split('\n');
    expect(line1.endsWith('!')).toBe(true);
    expect(line2.endsWith('.')).toBe(true);
    expect(line2.endsWith('!')).toBe(false);
  });
});
