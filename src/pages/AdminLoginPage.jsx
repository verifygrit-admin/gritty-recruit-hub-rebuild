import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout.jsx';
import { supabase } from '../lib/supabaseClient.js';

// AdminLoginPage — Section D, Component 1
// Dedicated admin entry point. Validates credentials + verifies app_metadata.role === 'admin'.
// If claim missing: signs the user out immediately and surfaces an error.
// No jwt-decode — uses the Supabase session object directly (Path B, confirmed DEC).
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason'); // e.g., 'session-expired'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Please enter a valid email';
    if (!password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setServerError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Verify admin claim from Supabase session object (Path B — no jwt-decode).
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setServerError('An error occurred. Please try again later.');
        setLoading(false);
        return;
      }

      const role = session.user?.app_metadata?.role;
      if (role !== 'admin') {
        // Non-admin account — sign out immediately so no residual student/coach session remains.
        await supabase.auth.signOut();
        setServerError('This account does not have admin privileges');
        setLoading(false);
        return;
      }

      // Admin claim verified — route into the panel.
      navigate('/admin');
    } catch {
      setServerError('An error occurred. Please try again later.');
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '12px 16px',
    border: errors[field] ? '2px solid #F44336' : '1px solid #D4D4D4',
    borderRadius: 4,
    fontSize: '1rem',
    color: '#2C2C2C',
    lineHeight: 1.5,
    backgroundColor: errors[field] ? '#FFF5F5' : '#FFFFFF',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <AuthPageLayout>
      <h2
        data-testid="admin-auth-header-title"
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#8B3A3A',
          margin: '0 0 8px 0',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          lineHeight: 1.3,
        }}
      >
        Admin Sign In
      </h2>
      <p
        data-testid="admin-auth-header-subtitle"
        style={{ fontSize: '1rem', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: 1.6 }}
      >
        Restricted access. Admin credentials only.
      </p>

      {reason === 'session-expired' && (
        <div
          data-testid="admin-session-expired-notice"
          style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #F44336',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 16,
            color: '#C62828',
            fontSize: '0.875rem',
          }}
          aria-live="polite"
        >
          Session expired — please sign in again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div data-testid="admin-form-field-email" style={{ marginBottom: 16 }}>
          <label
            data-testid="admin-label-email"
            htmlFor="admin-email"
            style={{ display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4 }}
          >
            Email <span style={{ color: '#F44336' }}>*</span>
          </label>
          <input
            id="admin-email"
            type="email"
            data-testid="admin-input-email"
            placeholder="admin@grittyfb.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle('email')}
            autoComplete="username"
          />
          {errors.email && (
            <span
              data-testid="admin-error-email"
              style={{ fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block' }}
              aria-live="polite"
            >
              {errors.email}
            </span>
          )}
        </div>

        <div data-testid="admin-form-field-password" style={{ marginBottom: 16 }}>
          <label
            data-testid="admin-label-password"
            htmlFor="admin-password"
            style={{ display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4 }}
          >
            Password <span style={{ color: '#F44336' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              data-testid="admin-input-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle('password'), paddingRight: 64 }}
              autoComplete="current-password"
            />
            <button
              type="button"
              data-testid="admin-toggle-password"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: 'absolute',
                top: '50%',
                right: 8,
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#6B6B6B',
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && (
            <span
              data-testid="admin-error-password"
              style={{ fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block' }}
              aria-live="polite"
            >
              {errors.password}
            </span>
          )}
        </div>

        {serverError && (
          <div
            data-testid="admin-toast-error"
            style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #F44336',
              borderRadius: 4,
              padding: '8px 12px',
              marginBottom: 16,
              color: '#C62828',
              fontSize: '0.875rem',
            }}
            aria-live="polite"
          >
            {serverError}
          </div>
        )}

        <button
          type="submit"
          data-testid="admin-button-sign-in"
          disabled={loading}
          aria-busy={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#8B3A3A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            fontSize: '1rem',
            fontWeight: 700,
            lineHeight: 1.5,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            minHeight: 44,
            marginTop: 24,
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthPageLayout>
  );
}
