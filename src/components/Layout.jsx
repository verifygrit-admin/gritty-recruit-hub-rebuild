import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';

const studentNavLinks = [
  { to: '/', label: 'HOME' },
  { to: '/gritfit', label: 'MY GRIT FIT' },
  { to: '/shortlist', label: 'SHORTLIST' },
  { to: '/profile', label: 'PROFILE' },
];

const coachNavLinks = [
  { to: '/', label: 'HOME' },
  { to: '/coach', label: 'DASHBOARD' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, userType, signOut } = useAuth();
  const [schoolName, setSchoolName] = useState('GRITTY');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('high_school').eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (data?.high_school) {
          // Use short name: "Boston College High School" → "BC HIGH"
          const name = data.high_school.toUpperCase();
          // Truncate if too long for header
          setSchoolName(name.length > 20 ? name.substring(0, 20) : name);
        } else if (userType === 'hs_coach' || userType === 'hs_guidance_counselor') {
          setSchoolName('BC HIGH');
        }
      });
  }, [session, userType]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinks = userType === 'hs_coach' || userType === 'hs_guidance_counselor'
    ? coachNavLinks : studentNavLinks;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile menu styles */}
      <style>{`
        .layout-nav-desktop { display: flex; }
        .layout-user-desktop { display: flex; }
        .layout-hamburger { display: none; }
        .layout-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .layout-nav-desktop { display: none !important; }
          .layout-user-desktop { display: none !important; }
          .layout-hamburger { display: flex !important; }
          .layout-mobile-menu { display: flex !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        backgroundColor: '#8B3A3A',
        padding: '0 24px',
        position: 'relative',
      }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.25rem',
              fontFamily: "var(--font-heading)",
            }}>
              {schoolName} RECRUIT HUB
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="layout-nav-desktop" data-testid="authenticated-nav" style={{ gap: 24, alignItems: 'center' }}>
            {navLinks.map(({ to, label }) => {
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

          {/* Desktop user/sign-out */}
          <div className="layout-user-desktop" style={{ alignItems: 'center', gap: 16 }}>
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

          {/* Hamburger button (mobile only) */}
          <button
            className="layout-hamburger"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="4" y1="6" x2="20" y2="18" />
                  <line x1="4" y1="18" x2="20" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div
            className="layout-mobile-menu"
            style={{
              flexDirection: 'column',
              gap: 0,
              backgroundColor: '#7A3232',
              padding: '8px 0 16px',
              borderTop: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {navLinks.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 400,
                    padding: '12px 24px',
                    borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                    backgroundColor: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}
            {session ? (
              <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', display: 'block', marginBottom: 8 }}>
                  {session.user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'none',
                    border: '1px solid #FFFFFF',
                    borderRadius: 4,
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    padding: '6px 16px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '0.9rem', padding: '12px 24px' }}>
                Sign In
              </Link>
            )}
          </div>
        )}
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
