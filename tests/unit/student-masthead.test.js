/**
 * student-masthead.test.js — Sprint 003 D1 (Masthead Rename)
 *
 * Covers getSchoolShortName — the pure lookup that drives the Student View
 * masthead. Layout.jsx calls this with profiles.high_school and renders
 * `${schoolShortName} RECRUIT HUB`.
 */

import { describe, it, expect } from 'vitest';
import { getSchoolShortName, SCHOOL_SHORT_NAMES } from '../../src/lib/schoolShortName.js';

describe('getSchoolShortName', () => {
  it('returns "BC HIGH" for "Boston College High School"', () => {
    expect(getSchoolShortName('Boston College High School')).toBe('BC HIGH');
  });

  it('falls back to an uppercase truncation for unmapped names', () => {
    expect(getSchoolShortName('Some Other School')).toBe('SOME OTHER SCHOOL');
  });

  it('returns "GRITTY" for empty or null inputs', () => {
    expect(getSchoolShortName('')).toBe('GRITTY');
    expect(getSchoolShortName(null)).toBe('GRITTY');
    expect(getSchoolShortName(undefined)).toBe('GRITTY');
  });

  it('exposes the exact-match map so operators can extend it', () => {
    expect(SCHOOL_SHORT_NAMES['Boston College High School']).toBe('BC HIGH');
  });
});
