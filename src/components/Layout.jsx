import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const studentNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/gritfit', label: 'GRIT FIT' },
  { to: '/shortlist', label: 'Shortlist' },
  { to: '/profile', label: 'Profile' },
];

const coachNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/coach', label: 'Dashboard' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, userType, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 64,
        backgroundColor: '#8B3A3A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '1.25rem',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}>
            GRITTY RECRUIT HUB
          </span>
        </Link>

        <nav data-testid="authenticated-nav" style={{ display: 'flex', gap: 24 }}>
          {(userType === 'hs_coach' || userType === 'hs_guidance_counselor' ? coachNavLinks : studentNavLinks).map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  paddingBottom: 4,
                  borderBottom: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {session ? (
            <>
              <span style={{ color: '#FFFFFF', fontSize: '0.75rem' }}>
                {session.user.email}
              </span>
              <button
                data-testid="signout-btn"
                onClick={handleSignOut}
                style={{
                  background: 'none',
                  border: '1px solid #FFFFFF',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  padding: '4px 12px',
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" data-testid="unauthenticated-nav" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '0.875rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{
        flex: 1,
        backgroundColor: '#F5EFE0',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 1200, padding: 48 }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        height: 48,
        backgroundColor: '#2C2C2C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}>
        <span style={{ color: '#E8E8E8', fontSize: '0.75rem' }}>
          &copy; 2026 GrittyFB
        </span>
      </footer>
    </div>
  );
}
