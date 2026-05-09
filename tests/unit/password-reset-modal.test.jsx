/**
 * @vitest-environment jsdom
 *
 * password-reset-modal.test.jsx — Sprint 023
 *
 * Covers spec §8 test row #5: mismatched new/confirm fails locally with an
 * inline error and NO Supabase network calls. This is the trivially auto-
 * verifiable slice of the modal's mechanism (§3) — the rest of the rows
 * (live re-auth, real password update, "wrong current password" surface)
 * require a live Supabase session and belong in Playwright e2e.
 *
 * Both Supabase clients (the singleton and the secondary factory) are mocked
 * so a passing test proves the modal short-circuits BEFORE either is touched.
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

// Mock the singleton — must be hoisted before the modal import below.
const updateUserMock = vi.fn();
vi.mock('../../src/lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      updateUser: (...args) => updateUserMock(...args),
    },
  },
}));

// Mock the secondary client factory — surface a sentinel so we can assert it
// was not constructed during the local validation short-circuit.
const secondarySignInMock = vi.fn();
const secondarySignOutMock = vi.fn();
const createSecondaryMock = vi.fn(() => ({
  auth: {
    signInWithPassword: (...args) => secondarySignInMock(...args),
    signOut: (...args) => secondarySignOutMock(...args),
  },
}));
vi.mock('../../src/lib/secondarySupabaseClient.js', () => ({
  createSecondarySupabaseClient: (...args) => createSecondaryMock(...args),
}));

import PasswordResetModal from '../../src/components/PasswordResetModal.jsx';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  updateUserMock.mockReset();
  secondarySignInMock.mockReset();
  secondarySignOutMock.mockReset();
  createSecondaryMock.mockReset();
});

describe('PasswordResetModal — local validation short-circuit (spec §8 #5)', () => {
  it('mismatched new/confirm surfaces inline error and fires zero network calls', () => {
    const onClose = vi.fn();
    const { getByTestId, queryByTestId } = render(
      <PasswordResetModal isOpen={true} onClose={onClose} email="user@example.com" />
    );

    fireEvent.change(getByTestId('input-current-password'), { target: { value: 'old-correct' } });
    fireEvent.change(getByTestId('input-new-password'), { target: { value: 'new-strong-1' } });
    fireEvent.change(getByTestId('input-confirm-new-password'), { target: { value: 'new-different-2' } });

    fireEvent.click(getByTestId('button-submit-password-reset'));

    // Inline error is the spec-required surface.
    expect(queryByTestId('error-new-password-match')).not.toBeNull();

    // The mechanism (§3) is: local check first, then secondary signIn, then
    // primary updateUser. Local-fail must short-circuit BOTH downstream calls
    // so the user is never sent to the network with mismatched intent.
    expect(createSecondaryMock).not.toHaveBeenCalled();
    expect(secondarySignInMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();

    // Modal stays open; user is not logged out (onClose not auto-fired by error).
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders nothing when isOpen is false', () => {
    const { queryByTestId } = render(
      <PasswordResetModal isOpen={false} onClose={() => {}} email="user@example.com" />
    );
    expect(queryByTestId('password-reset-modal')).toBeNull();
  });
});
