/**
 * StaffProfilePage — Sprint 023 Goal 2.
 *
 * Coach + counselor "My Profile" page. Single role-aware component (per spec
 * §6 — one component, role-aware heading) covering both `hs_coach` and
 * `hs_guidance_counselor` user_types. Mounted at `/coach/profile`.
 *
 * Personal Info section — exactly four rows:
 *   1. Name           — editable. Read from `public.users.full_name` for the
 *                       current `auth.uid()`. Falls back to
 *                       `findStaffByUserId(session.user.id)` from
 *                       `src/data/school-staff.js` if `full_name` is NULL
 *                       (covers the two unknown coach UUIDs intentionally
 *                       left NULL by migration 0046's backfill — see Sprint
 *                       023 §9 carry-forward and Sprint 024 admin pass).
 *                       Saves write to `public.users.full_name` via the
 *                       `users_update_own_full_name` RLS policy added in
 *                       migration 0046 (UPDATE allowed for `auth.uid() =
 *                       user_id`, with WITH CHECK preventing escalation of
 *                       `user_type | account_status | email_verified |
 *                       payment_status`).
 *   2. High School    — read-only. Display name from `useSchoolIdentity()`,
 *                       which already does the `hs_coach_schools` /
 *                       `hs_counselor_schools` → `hs_programs.school_name`
 *                       join for both staff roles. Single-HS rule applies
 *                       (Sprint 023 §5 DP#2 — production query confirmed
 *                       100% of staff currently link to exactly one HS).
 *   3. Email          — read-only, sourced from `session.user.email`. Same
 *                       disabled visual + microcopy as ProfilePage's Email
 *                       row (mirrored byte-identically for parity).
 *   4. Password       — button opening the shared `<PasswordResetModal />`
 *                       (mirrors the Password row added to ProfilePage in
 *                       Sprint 023 Phase 2C). Modal owns its own success UX
 *                       (inline banner + 1s auto-close), so this caller
 *                       does NOT render a toast on password update.
 *
 * Role gate: any other `user_type` lands on an "Access denied" panel that
 * mirrors the shape of the gate already in `CoachDashboardPage.jsx`. Direct
 * URL access is the failure mode this guard exists for — students hitting
 * `/coach/profile` (test #8 in spec §8) get a clean denial rather than a
 * malformed render.
 *
 * Heading copy:
 *   - `hs_coach`              → "Coach Profile"
 *   - `hs_guidance_counselor` → "Counselor Profile"
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSchoolIdentity } from '../hooks/useSchoolIdentity.js';
import { supabase } from '../lib/supabaseClient.js';
import { findStaffByUserId } from '../data/school-staff.js';
import PasswordResetModal from '../components/PasswordResetModal.jsx';

const ALLOWED_ROLES = ['hs_coach', 'hs_guidance_counselor'];

// Inline-style constants — mirror ProfilePage.jsx Personal Info section so
// the two pages render with identical row chrome.
const sectionStyle = { marginBottom: 32 };
const headingStyle = {
  fontSize: '1.5rem', fontWeight: 600, color: '#2C2C2C',
  margin: '0 0 16px 0', lineHeight: 1.4,
};
const labelStyle = {
  display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4,
};
const helpStyle = { fontSize: '0.875rem', color: '#6B6B6B', marginTop: 4 };
const inputBase = {
  width: '100%', padding: '12px 16px', border: '1px solid #D4D4D4',
  borderRadius: 4, fontSize: '1rem', color: '#2C2C2C', lineHeight: 1.5,
  backgroundColor: '#FFFFFF', boxSizing: 'border-box', outline: 'none',
};
const inputDisabled = {
  backgroundColor: '#F5F5F5', border: '1px solid #E8E8E8',
  color: '#6B6B6B', cursor: 'not-allowed',
};
const errorMsgStyle = {
  fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block',
};
const fieldWrap = { marginBottom: 16 };

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { session, userType, loading: authLoading } = useAuth();
  const { schoolFullName, loading: schoolLoading } = useSchoolIdentity();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [toast, setToast] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const isAllowed = ALLOWED_ROLES.includes(userType);

  // Load full_name from public.users; fall back to school-staff.js if null.
  useEffect(() => {
    if (authLoading) return;
    if (!session || !isAllowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', session.user.id)
        .single();
      if (cancelled) return;
      const fallbackStaff = findStaffByUserId(session.user.id);
      const initialName = (data?.full_name && data.full_name.trim())
        || fallbackStaff?.name
        || '';
      setName(initialName);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [session, userType, authLoading, isAllowed]);

  // Auto-dismiss success toast after 3s; error toasts stay until dismissed.
  useEffect(() => {
    if (!toast || toast.type !== 'success') return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ full_name: trimmed })
      .eq('user_id', session.user.id);
    setSaving(false);
    if (error) {
      setToast({ type: 'error', msg: 'Failed to save profile. Please try again.' });
    } else {
      setName(trimmed);
      setToast({ type: 'success', msg: 'Profile saved.' });
    }
  };

  // ── Role gate (test #8) ──
  if (!authLoading && (!session || !isAllowed)) {
    return (
      <div data-testid="staff-profile-page" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-maroon)', margin: '0 0 8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '1rem', color: '#6B6B6B' }}>
          The Coach Profile page is available to coaches and guidance counselors only.
        </p>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div data-testid="staff-profile-page" style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>
        Loading profile...
      </div>
    );
  }

  const heading = userType === 'hs_coach' ? 'Coach Profile' : 'Counselor Profile';
  const email = session?.user?.email || '';
  // useSchoolIdentity returns schoolFullName as null while resolving or for
  // an unresolvable staff link. While loading, show a hint; otherwise render
  // whatever resolved (or empty if still null).
  const highSchoolDisplay = schoolLoading
    ? 'Loading...'
    : (schoolFullName || '');

  return (
    <div data-testid="staff-profile-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#2C2C2C', margin: 0 }}>
          {heading}
        </h2>
      </div>

      {/* Toast — mirrors ProfilePage toast pattern (line ~411 of ProfilePage.jsx). */}
      {toast && (
        <div
          data-testid={toast.type === 'success' ? 'toast-success' : 'toast-error'}
          style={{
            padding: '8px 16px', borderRadius: 4, marginBottom: 16,
            fontSize: '0.875rem', color: '#FFFFFF',
            backgroundColor: toast.type === 'success' ? '#4CAF50' : '#F44336',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>{toast.msg}</span>
          {toast.type === 'error' && (
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'none', border: 'none', color: '#FFFFFF',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSave}>
        <section style={sectionStyle}>
          <h3 style={headingStyle}>Personal Info</h3>
          <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', marginBottom: 16 }} />

          {/* Name — editable, required */}
          <div style={fieldWrap} data-testid="form-field-staff-name">
            <label htmlFor="staff-name" style={labelStyle}>
              Name <span style={{ color: '#F44336' }}>*</span>
            </label>
            <input
              id="staff-name"
              type="text"
              data-testid="input-staff-name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
              aria-required={true}
              style={{
                ...inputBase,
                ...(nameError ? { border: '2px solid #F44336', backgroundColor: '#FFF5F5' } : {}),
              }}
            />
            {nameError && (
              <span data-testid="error-staff-name" style={errorMsgStyle} aria-live="polite">
                {nameError}
              </span>
            )}
          </div>

          {/* High School — read-only, sourced from useSchoolIdentity */}
          <div style={fieldWrap} data-testid="form-field-staff-high-school">
            <label htmlFor="staff-high-school" style={labelStyle}>High School</label>
            <input
              id="staff-high-school"
              type="text"
              data-testid="input-staff-high-school-readonly"
              value={highSchoolDisplay}
              disabled={true}
              style={{ ...inputBase, ...inputDisabled }}
            />
            <span style={helpStyle}>(Managed by your school — contact support to update)</span>
          </div>

          {/* Email — read-only, sourced from session.user.email */}
          <div style={fieldWrap} data-testid="form-field-staff-email">
            <label htmlFor="staff-email" style={labelStyle}>Email</label>
            <input
              id="staff-email"
              type="text"
              data-testid="input-staff-email-readonly"
              value={email}
              disabled={true}
              style={{ ...inputBase, ...inputDisabled }}
            />
            <span style={helpStyle}>(From your account — cannot edit here)</span>
          </div>

          {/* Password — button opens shared modal. Mirrors ProfilePage row. */}
          <div style={fieldWrap} data-testid="form-field-staff-password">
            <label style={labelStyle}>Password</label>
            <button
              type="button"
              data-testid="button-open-password-reset"
              onClick={() => setShowPasswordModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FFFFFF',
                color: 'var(--brand-maroon)',
                border: '1px solid var(--brand-maroon)',
                borderRadius: 4,
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              Change Password
            </button>
            <span style={helpStyle}>(Opens a secure dialog to update your account password)</span>
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/coach')}
            style={{
              background: 'transparent', border: 'none', color: 'var(--brand-maroon)',
              fontSize: '1rem', cursor: 'pointer', padding: '12px 16px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="button-save-staff-profile"
            disabled={saving}
            aria-busy={saving}
            style={{
              padding: '12px 32px',
              backgroundColor: saving ? '#E8E8E8' : 'var(--brand-maroon)',
              color: saving ? '#6B6B6B' : '#FFFFFF',
              border: 'none', borderRadius: 4,
              fontSize: '1rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)', minHeight: 44,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        email={email}
      />
    </div>
  );
}
