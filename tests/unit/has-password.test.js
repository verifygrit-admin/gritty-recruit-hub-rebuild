/**
 * has-password.test.js — Sprint 001 D2 "Has Password" derivation — RED
 *
 * Pure helper: returns true when auth.users.encrypted_password is a non-empty
 * string, false otherwise. Used by admin-read-users EF to merge a has_password
 * boolean onto each returned user row. Graceful on null / undefined / whitespace.
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { hasPassword } from '../../src/lib/hasPassword.js';

describe('TC-S001-D2-HP-001: hasPassword — non-empty encrypted_password', () => {
  it('returns true for a typical bcrypt hash', () => {
    expect(hasPassword({ encrypted_password: '$2a$10$abcdefghijklmnopqrstuvwxy' })).toBe(true);
  });

  it('returns true for any non-empty string (length > 0)', () => {
    expect(hasPassword({ encrypted_password: 'x' })).toBe(true);
  });
});

describe('TC-S001-D2-HP-002: hasPassword — empty or missing', () => {
  it('returns false for empty string', () => {
    expect(hasPassword({ encrypted_password: '' })).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(hasPassword({ encrypted_password: '   ' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasPassword({ encrypted_password: null })).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasPassword({ encrypted_password: undefined })).toBe(false);
  });

  it('returns false when the field is missing entirely', () => {
    expect(hasPassword({})).toBe(false);
  });
});

describe('TC-S001-D2-HP-003: hasPassword — defensive inputs', () => {
  it('returns false for a null user object', () => {
    expect(hasPassword(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasPassword(undefined)).toBe(false);
  });

  it('returns false for a non-object (string, number)', () => {
    expect(hasPassword('not-an-object')).toBe(false);
    expect(hasPassword(42)).toBe(false);
  });
});
