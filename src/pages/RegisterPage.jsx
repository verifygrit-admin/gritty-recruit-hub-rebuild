import { Link } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout.jsx';

export default function RegisterPage() {
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
        Account Activation Required
      </h2>
      <p
        data-testid="auth-header-subtitle"
        style={{ fontSize: '1rem', color: '#6B6B6B', margin: '0 0 24px 0', lineHeight: 1.6 }}
      >
        Account activation is by invitation only. If you were given credentials by your coach or school, please contact them to activate your account.
      </p>

      <div data-testid="info-contact" style={{ marginTop: 16 }}>
        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: 0 }}>
          Questions or need assistance?
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '4px 0 0 0' }}>
          Contact: <a href="mailto:support@grittyfb.com" style={{ color: '#8B3A3A', textDecoration: 'none' }}>support@grittyfb.com</a>
        </p>
      </div>

      <div data-testid="divider" style={{ position: 'relative', margin: '24px 0', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8E8' }} />
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', padding: '0 8px' }}>or</span>
        <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8E8' }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#6B6B6B', fontSize: '1rem' }}>Have an account? </span>
        <Link to="/login" data-testid="link-sign-in" style={{ color: '#8B3A3A', textDecoration: 'none', fontSize: '1rem' }}>
          Sign In
        </Link>
      </div>
    </AuthPageLayout>
  );
}
