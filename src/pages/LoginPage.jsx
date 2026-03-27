import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      // Auth state change triggers AuthProvider — it fetches user_type.
      // Route based on user_type after a brief delay for context to update.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setServerError('An error occurred. Please try again later.');
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_type')
        .eq('user_id', session.user.id)
        .single();

      if (userError || !userData) {
        setServerError('An error occurred. Please try again later.');
        setLoading(false);
        return;
      }

      // MVP role routing: coaches/counselors → coach view, students → landing
      if (userData.user_type === 'hs_coach' || userData.user_type === 'hs_guidance_counselor') {
        navigate('/coach');
      } else {
        navigate('/');
      }
    } catch {
      setServerError('An error occurred. Please try again later.');
    }
    setLoading(false);
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
        data-testid="auth-header-title"
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#8B3A3A',
          margin: '0 0 8px 0',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          lineHeight: 1.3,
        }}
      >
        Sign In
      </h2>
      <p
        data-testid="auth-header-subtitle"
        style={{ fontSize: '1rem', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: 1.6 }}
      >
        Enter your email and password to access your account.
      </p>

      <form onSubmit={handleSubmit}>
        <div data-testid="form-field-email" style={{ marginBottom: 16 }}>
          <label data-testid="label-email" htmlFor="email" style={{ display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4 }}>
            Email <span style={{ color: '#F44336' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            data-testid="input-email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle('email')}
            onFocus={(e) => { if (!errors.email) { e.target.style.border = '2px solid #8B3A3A'; e.target.style.boxShadow = '0 0 0 3px rgba(139,58,58,0.1)'; } }}
            onBlur={(e) => { if (!errors.email) { e.target.style.border = '1px solid #D4D4D4'; e.target.style.boxShadow = 'none'; } }}
          />
          {errors.email && (
            <span data-testid="error-email" style={{ fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block' }} aria-live="polite">
              {errors.email}
            </span>
          )}
        </div>

        <div data-testid="form-field-password" style={{ marginBottom: 16 }}>
          <label data-testid="label-password" htmlFor="password" style={{ display: 'block', fontSize: '1rem', color: '#2C2C2C', marginBottom: 4 }}>
            Password <span style={{ color: '#F44336' }}>*</span>
          </label>
          <input
            id="password"
            type="password"
            data-testid="input-password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle('password')}
            onFocus={(e) => { if (!errors.password) { e.target.style.border = '2px solid #8B3A3A'; e.target.style.boxShadow = '0 0 0 3px rgba(139,58,58,0.1)'; } }}
            onBlur={(e) => { if (!errors.password) { e.target.style.border = '1px solid #D4D4D4'; e.target.style.boxShadow = 'none'; } }}
          />
          {errors.password && (
            <span data-testid="error-password" style={{ fontSize: '0.875rem', color: '#F44336', marginTop: 4, display: 'block' }} aria-live="polite">
              {errors.password}
            </span>
          )}
        </div>

        {serverError && (
          <div data-testid="toast-error" style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #F44336',
            borderRadius: 4,
            padding: '8px 12px',
            marginBottom: 16,
            color: '#C62828',
            fontSize: '0.875rem',
          }} aria-live="polite">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          data-testid="button-sign-in"
          disabled={loading}
          aria-busy={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: loading ? '#8B3A3A' : '#8B3A3A',
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

      <div style={{ marginTop: 8 }}>
        <Link
          to="/forgot-password"
          data-testid="link-forgot-password"
          style={{ color: '#8B3A3A', fontSize: '1rem', textDecoration: 'none' }}
        >
          Forgot Password?
        </Link>
      </div>

      <div data-testid="divider" style={{ position: 'relative', margin: '24px 0', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8E8' }} />
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', padding: '0 8px' }}>or</span>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8E8' }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#6B6B6B', fontSize: '1rem' }}>Don&apos;t have an account? </span>
        <Link to="/register" data-testid="link-create-account" style={{ color: '#8B3A3A', textDecoration: 'none', fontSize: '1rem' }}>
          Create Account
        </Link>
      </div>
    </AuthPageLayout>
  );
}
