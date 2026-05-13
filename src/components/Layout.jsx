import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import HudlLogo from './HudlLogo.jsx';
import { useSchoolIdentity } from '../hooks/useSchoolIdentity.js';
import { STUDENT_NAV_LINKS, COACH_NAV_LINKS } from '../lib/navLinks.js';
import SlideOutShell from './SlideOutShell.jsx';
import { ToastProvider } from './Toast.jsx';
// Sprint 017 HF-B — JS-imported background assets (bypasses CSS-relative
// asset resolution; restored to the proven pre-3b pattern, generalized for
// two schools). See C-12 carry-forward: spaces in production asset filenames
// are fragile across build/CDN chains.
import bcHighBg from '../assets/bchigh-team.jpg';
import belmontHillBg from '../assets/Belmont Hill background.jpg';

/**
 * AvatarBadge — renders a circular avatar for the header.
 *
 * Fallback chain:
 *   1. Photo from Supabase Storage (avatar_storage_path set)
 *   2. Hudl logo SVG mark (hudl_url set but no storage path / image error)
 *   3. First-letter circle (name initial, always available)
 */
function AvatarBadge({ storagePath, hudlUrl, name, size = 32, avatarError, onError }) {
  let avatarUrl = null;
  if (storagePath && !avatarError) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    avatarUrl = data?.publicUrl || null;
  }

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      border: '2px solid rgba(255,255,255,0.5)',
      flexShrink: 0,
      backgroundColor: 'var(--brand-mobile-menu-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={onError}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : hudlUrl ? (
        <HudlLogo size={size * 0.75} withBg={false} style={{ flexShrink: 0 }} />
      ) : (
        <span style={{ color: '#FFFFFF', fontSize: size * 0.45, fontWeight: 700, lineHeight: 1 }}>
          {initial}
        </span>
      )}
    </div>
  );
}

const studentNavLinks = STUDENT_NAV_LINKS;
const coachNavLinks = COACH_NAV_LINKS;

// Sprint 017 HF-B — school-keyed background image map. Slugs match
// useSchoolIdentity / RECRUIT_SCHOOLS convention. Anon path falls back to
// bcHighBg in the consumer (preserves existing anon LandingPage default).
const SCHOOL_BACKGROUNDS = {
  'bc-high': bcHighBg,
  'belmont-hill': belmontHillBg,
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, userType, signOut } = useAuth();

  // Sprint 017 D5 — school identity is owned by useSchoolIdentity. The prior
  // inline resolver hardcoded 'BC HIGH' for coach/counselor sessions, which
  // mis-themed any non-BC-High partner school. Hook returns null for
  // unresolvable cases; consumer falls back to 'GRITTY' for masthead display.
  const { schoolName: resolvedSchoolName, schoolSlug } = useSchoolIdentity();
  const schoolName = resolvedSchoolName || 'GRITTY';

  // HF-B — main background image, JS-import driven. Anon (or unconfigured
  // school) falls back to bcHighBg matching prior anon visual default.
  const bgUrl = (schoolSlug && SCHOOL_BACKGROUNDS[schoolSlug]) || bcHighBg;

  // Sprint 025 Phase 3 — sandwich/drawer nav. Default closed at all viewports.
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [avatarStoragePath, setAvatarStoragePath] = useState(null);
  const [hudlUrl, setHudlUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  // Student profile fetch (name + avatar + hudl_url only — school identity
  // moved to useSchoolIdentity above). Coaches/counselors don't need this.
  useEffect(() => {
    if (!session) return;
    const isStudent = userType !== 'hs_coach' && userType !== 'hs_guidance_counselor';
    if (!isStudent) return;
    supabase.from('profiles')
      .select('name, avatar_storage_path, hudl_url')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.name) setStudentName(data.name.split(' ')[0]); // first name only
        setAvatarStoragePath(data.avatar_storage_path || null);
        setHudlUrl(data.hudl_url || null);
      });
  }, [session, userType]);

  // Body-class side-effect — drives Sprint 017 D5/3b CSS swap. One set-and-
  // remove pass per schoolSlug change; no cleanup-on-dependency-change to
  // avoid flash-of-unstyled-content during user/role transitions.
  useEffect(() => {
    document.body.classList.remove('school-bc-high', 'school-belmont-hill');
    if (schoolSlug) document.body.classList.add(`school-${schoolSlug}`);
  }, [schoolSlug]);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const navLinks = userType === 'hs_coach' || userType === 'hs_guidance_counselor'
    ? coachNavLinks : studentNavLinks;

  const isStudent = userType !== 'hs_coach' && userType !== 'hs_guidance_counselor';
  const displayName = studentName || session?.user.email;

  return (
    <ToastProvider>
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar — single <header> at all viewports. Sandwich icon (left) +
          wordmark. User strip lives inside the drawer. Sprint 025 Phase 3.
          zIndex: 10 keeps the header above any page-level full-bleed
          `position: fixed` background (e.g. BulkPdsBackground on
          /coach/player-updates) that would otherwise occlude the nav. */}
      <header style={{
        backgroundColor: 'var(--brand-maroon)',
        padding: '0 24px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            type="button"
            className="layout-sandwich-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen ? 'true' : 'false'}
            data-testid="layout-sandwich-btn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.25rem',
              fontFamily: 'var(--font-heading)',
            }}>
              {schoolName} RECRUIT HUB
            </span>
          </Link>
        </div>
      </header>

      {/* Drawer — slides from left on desktop, from bottom on mobile (the
          SlideOutShell mobile bottom-slide kicks in below 768px automatically). */}
      <SlideOutShell
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="left"
        widthDesktop="min(80vw, 320px)"
        ariaLabel="Main menu"
        closeButtonLabel="Close menu"
      >
        <div className="layout-drawer-body">
          {/* Drawer header — wordmark inside the panel for identity */}
          <div className="layout-drawer-wordmark">
            <span style={{ fontFamily: 'var(--font-heading)' }}>{schoolName}</span>
            <span style={{ fontFamily: 'var(--font-heading)' }}>RECRUIT HUB</span>
          </div>

          {/* Nav list — the panel root for the auth nav testid. NavLink applies
              aria-current="page" automatically when its route matches. */}
          {session && (
            <nav
              className="layout-drawer-nav"
              data-testid="authenticated-nav"
              aria-label="Primary navigation"
            >
              {navLinks.map(({ to, label, testId }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className="layout-drawer-link"
                  data-testid={testId}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* User strip — avatar + email + sign out, OR sign-in link */}
          <div className="layout-drawer-user">
            {session ? (
              <>
                <div className="layout-drawer-user-row">
                  {isStudent && (
                    <AvatarBadge
                      storagePath={avatarStoragePath}
                      hudlUrl={hudlUrl}
                      name={displayName}
                      size={36}
                      avatarError={avatarError}
                      onError={() => setAvatarError(true)}
                    />
                  )}
                  <span className="layout-drawer-user-email">{displayName}</span>
                </div>
                <button
                  type="button"
                  data-testid="signout-btn"
                  onClick={handleSignOut}
                  className="layout-drawer-signout"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                data-testid="unauthenticated-nav"
                className="layout-drawer-link layout-drawer-link--signin"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </SlideOutShell>

      {/* Main content. Sprint 017 HF-B: background-image driven by JS-imported
          asset URL (bgUrl) keyed on schoolSlug. The CSS-relative resolution
          path used in 3b broke on the spaces-in-filename Belmont Hill asset
          across the production CDN chain — JS-import restores reliability.
          The `layout-main` className is retained for backward compatibility
          (no current CSS rules consume it post-HF-B). */}
      <main className="layout-main" style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}>
        {/* Sprint 018 — overlay tint. Hardened against two regression
            modes that produced production "no wash" symptom:
            (1) `inset: 0` shorthand replaced with explicit
            top/right/bottom/left longhand (eliminates Safari < 14.1
            and any React style-processing edge case that would
            collapse the box to 0×0); (2) `var(--brand-overlay-rgba)`
            given an explicit rgba fallback so the property never
            becomes invalid if the variable fails to resolve at
            paint time. The token still drives the school-conditional
            tint via :root / body.school-belmont-hill in index.css. */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'var(--brand-overlay-rgba, rgba(245, 239, 224, 0.9))',
          pointerEvents: 'none',
        }} />
        <div
          className="layout-content-well"
          style={{ width: '100%', maxWidth: 1200, padding: 48, position: 'relative', zIndex: 1 }}
        >
          {children}
        </div>
      </main>

      {/* Footer — zIndex matches header so page-level full-bleed fixed
          backgrounds don't paint over it either. */}
      <footer style={{
        height: 48,
        backgroundColor: '#2C2C2C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        position: 'relative',
        zIndex: 10,
      }}>
        <span style={{ color: '#E8E8E8', fontSize: '0.75rem' }}>
          &copy; 2026 GrittyFB
        </span>
      </footer>
    </div>
    </ToastProvider>
  );
}
