/**
 * PasswordResetModal — Sprint 023 Goal 1/3.
 *
 * Shared centered-overlay modal used by student My Profile (ProfilePage.jsx)
 * and the new coach/counselor My Profile page (StaffProfilePage.jsx).
 *
 * Mechanism (per spec §3 — operator-locked, do NOT deviate):
 *   1. Validate locally that new === confirm. If mismatch, surface inline
 *      error, no network call.
 *   2. Re-authenticate the current_password via a SECONDARY Supabase client
 *      (createSecondarySupabaseClient). The secondary client has
 *      persistSession: false + a custom storageKey, so signInWithPassword on
 *      it does NOT overwrite the active session's tokens in localStorage.
 *   3. On secondary re-auth success: call supabase.auth.updateUser({
 *      password }) on the active singleton. This rotates the password on the
 *      authenticated user without re-signing-in.
 *   4. ALWAYS call secondary.auth.signOut() afterwards (success or failure)
 *      to discard the ephemeral instance's in-memory tokens.
 *   5. On any failure: surface inline error in the modal. NEVER log the user
 *      out. The active singleton is untouched throughout.
 *
 * Close-on-success behavior: this modal shows an inline success message and
 * auto-closes after ~1s. The caller does NOT need to render a toast (chosen
 * over the alternative of bubbling success up — keeps the modal a complete
 * unit; caller just supplies isOpen/onClose/email).
 *
 * Standard modal hygiene (borrowed from SlideOutShell):
 *   - Body scroll lock while open.
 *   - Escape closes (unless mid-submit).
 *   - Backdrop click closes (unless mid-submit).
 *   - aria-modal + aria-labelledby + role="dialog".
 *
 * Props:
 *   isOpen: boolean — controlled visibility.
 *   onClose: () => void — close handler (X / Escape / backdrop / post-success).
 *   email: string — the active user's email; the modal does NOT call
 *     getSession/getUser. Caller (ProfilePage / StaffProfilePage) supplies it.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { createSecondarySupabaseClient } from '../lib/secondarySupabaseClient.js';

const BODY_SCROLL_LOCK_CLASS = 'password-reset-modal-scroll-lock';
const SUCCESS_AUTOCLOSE_MS = 1000;

// Inline-style constants — match ProfilePage Personal Info row styling.
const labelStyle = {
  display: 'block',
  fontSize: '1rem',
  color: '#2C2C2C',
  marginBottom: 4,
};
const helpStyle = {
  fontSize: '0.875rem',
  color: '#6B6B6B',
  marginTop: 4,
};
const errorMsgStyle = {
  fontSize: '0.875rem',
  color: '#F44336',
  marginTop: 4,
  display: 'block',
};
const fieldWrap = { marginBottom: 16 };
const inputBase = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '1rem',
  color: '#2C2C2C',
  lineHeight: 1.5,
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
  outline: 'none',
};
const inputErrorBase = {
  ...inputBase,
  border: '2px solid #F44336',
  backgroundColor: '#FFF5F5',
};

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 16,
};
const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  padding: 32,
  maxWidth: 480,
  width: '100%',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  boxSizing: 'border-box',
  maxHeight: '90vh',
  overflowY: 'auto',
};
const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#2C2C2C',
  margin: '0 0 8px 0',
  lineHeight: 1.3,
};
const subtitleStyle = {
  fontSize: '0.95rem',
  color: '#6B6B6B',
  margin: '0 0 20px 0',
  lineHeight: 1.5,
};
const buttonRowStyle = {
  display: 'flex',
  gap: 12,
  marginTop: 24,
  justifyContent: 'flex-end',
};
const cancelButtonStyle = {
  padding: '12px 20px',
  backgroundColor: '#FFFFFF',
  color: '#6B6B6B',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 44,
};
const submitButtonStyle = (disabled) => ({
  padding: '12px 20px',
  backgroundColor: '#8B3A3A',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 4,
  fontSize: '1rem',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  minHeight: 44,
  opacity: disabled ? 0.7 : 1,
});
const successBannerStyle = {
  backgroundColor: '#E8F5E9',
  border: '1px solid #4CAF50',
  borderRadius: 4,
  padding: '10px 12px',
  marginTop: 16,
  color: '#2E7D32',
  fontSize: '0.95rem',
};
const generalErrorStyle = {
  backgroundColor: '#FFF5F5',
  border: '1px solid #F44336',
  borderRadius: 4,
  padding: '10px 12px',
  marginTop: 16,
  color: '#C62828',
  fontSize: '0.95rem',
};

export default function PasswordResetModal({ isOpen, onClose, email }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const cardRef = useRef(null);
  const firstInputRef = useRef(null);

  // Reset form state when the modal closes (so a re-open is clean).
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setErrors({});
      setGeneralError('');
      setSubmitting(false);
      setSuccess(false);
    }
  }, [isOpen]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add(BODY_SCROLL_LOCK_CLASS);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove(BODY_SCROLL_LOCK_CLASS);
    };
  }, [isOpen]);

  // Escape key closes (but not mid-submit).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, submitting]);

  // Focus first input when modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      if (firstInputRef.current) firstInputRef.current.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Auto-close on success.
  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => {
      onClose?.();
    }, SUCCESS_AUTOCLOSE_MS);
    return () => clearTimeout(t);
  }, [success, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    // Validation step 1 — local checks first; no network call on failure.
    const v = {};
    if (!currentPassword) v.current = 'Current password is required';
    if (!newPassword) v.newPw = 'New password is required';
    if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
      v.match = 'Passwords do not match';
    }
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setSubmitting(true);

    // Validation step 2 — re-auth current password on a SECONDARY client.
    // The secondary client has persistSession: false + a custom storageKey,
    // so its signInWithPassword does NOT touch the active singleton's tokens.
    const secondary = createSecondarySupabaseClient();
    try {
      const { error: signInError } = await secondary.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ current: 'Current password is incorrect.' });
        setSubmitting(false);
        // Defensive — even on failure, sign out the ephemeral instance.
        try { await secondary.auth.signOut(); } catch { /* ignore */ }
        return;
      }

      // Validation step 3 — rotate password on the active singleton.
      // This does NOT log the user out; it updates the password on the
      // currently authenticated session.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      // Validation step 4 — ALWAYS sign out the ephemeral instance.
      try { await secondary.auth.signOut(); } catch { /* ignore */ }

      if (updateError) {
        // Surface Supabase's message verbatim (covers password complexity
        // / length defaults at the Supabase Auth level).
        setGeneralError(updateError.message || 'Failed to update password. Please try again.');
        setSubmitting(false);
        return;
      }

      // Validation step 5 — success. Show inline confirmation; auto-close.
      setSuccess(true);
      setSubmitting(false);
    } catch (err) {
      // Defensive sign-out on any unexpected throw.
      try { await secondary.auth.signOut(); } catch { /* ignore */ }
      setGeneralError(err?.message || 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={backdropStyle}
      onClick={handleBackdropClick}
      data-testid="password-reset-modal-backdrop"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-modal-title"
        data-testid="password-reset-modal"
        style={cardStyle}
      >
        <h2 id="password-reset-modal-title" style={titleStyle}>
          Change Password
        </h2>
        <p style={subtitleStyle}>
          Enter your current password, then choose a new one.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldWrap}>
            <label htmlFor="pw-current" style={labelStyle}>
              Current Password <span style={{ color: '#F44336' }}>*</span>
            </label>
            <input
              ref={firstInputRef}
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting || success}
              style={errors.current ? inputErrorBase : inputBase}
              data-testid="input-current-password"
            />
            {errors.current && (
              <span
                style={errorMsgStyle}
                aria-live="polite"
                data-testid="error-current-password"
              >
                {errors.current}
              </span>
            )}
          </div>

          <div style={fieldWrap}>
            <label htmlFor="pw-new" style={labelStyle}>
              New Password <span style={{ color: '#F44336' }}>*</span>
            </label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting || success}
              style={errors.newPw ? inputErrorBase : inputBase}
              data-testid="input-new-password"
            />
            {errors.newPw && (
              <span style={errorMsgStyle} aria-live="polite">
                {errors.newPw}
              </span>
            )}
            <div style={helpStyle}>
              Use at least 6 characters (Supabase default).
            </div>
          </div>

          <div style={fieldWrap}>
            <label htmlFor="pw-confirm" style={labelStyle}>
              Confirm New Password <span style={{ color: '#F44336' }}>*</span>
            </label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              disabled={submitting || success}
              style={errors.match ? inputErrorBase : inputBase}
              data-testid="input-confirm-new-password"
            />
            {errors.match && (
              <span
                style={errorMsgStyle}
                aria-live="polite"
                data-testid="error-new-password-match"
              >
                {errors.match}
              </span>
            )}
          </div>

          {generalError && (
            <div
              style={generalErrorStyle}
              aria-live="polite"
              data-testid="error-password-general"
            >
              {generalError}
            </div>
          )}

          {success && (
            <div
              style={successBannerStyle}
              aria-live="polite"
              data-testid="success-password-updated"
            >
              Password updated.
            </div>
          )}

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={cancelButtonStyle}
              data-testid="button-cancel-password-reset"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              aria-busy={submitting}
              style={submitButtonStyle(submitting || success)}
              data-testid="button-submit-password-reset"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
