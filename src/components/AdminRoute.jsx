import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';

// AdminRoute — Section D, Component 2
// Guards /admin routes. Renders children only when the active Supabase session has
// app_metadata.role === 'admin'. On mount and on session changes, reads the session
// directly from useAuth() (no jwt-decode — Path B).
//
// Session countdown:
//   - Uses session.expires_at (unix seconds) as expiry source.
//   - At T-120s, surfaces a non-dismissible banner with MM:SS countdown.
//   - At T-0, clears the session and redirects to /admin-login?reason=session-expired.
//   - No silent refresh, no extend button. Hard expiry.
export default function AdminRoute({ children }) {
  const { session, loading } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [expired, setExpired] = useState(false);

  const expiresAtSec = session?.expires_at ?? null;

  useEffect(() => {
    if (!expiresAtSec) {
      setSecondsRemaining(null);
      return undefined;
    }

    // Prime immediately so the banner appears without a 1s wait.
    const tick = () => {
      const remaining = Math.floor(expiresAtSec - Date.now() / 1000);
      if (remaining <= 0) {
        setSecondsRemaining(0);
        setExpired(true);
      } else {
        setSecondsRemaining(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtSec]);

  // On hard expiry, sign out and redirect. Runs in a separate effect so the
  // render path stays clean and the countdown effect stays focused.
  useEffect(() => {
    if (expired) {
      (async () => {
        await supabase.auth.signOut();
      })();
    }
  }, [expired]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/admin-login" replace />;
  }

  const role = session.user?.app_metadata?.role;
  if (role !== 'admin') {
    return <Navigate to="/admin-login" replace />;
  }

  if (expired) {
    return <Navigate to="/admin-login?reason=session-expired" replace />;
  }

  const showCountdownBanner = secondsRemaining !== null && secondsRemaining <= 120 && secondsRemaining > 0;
  const mm = showCountdownBanner ? String(Math.floor(secondsRemaining / 60)).padStart(1, '0') : '';
  const ss = showCountdownBanner ? String(secondsRemaining % 60).padStart(2, '0') : '';

  return (
    <>
      {showCountdownBanner && (
        <div
          data-testid="admin-session-countdown-banner"
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#C62828',
            color: '#FFFFFF',
            padding: '12px 24px',
            textAlign: 'center',
            fontSize: '0.95rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            letterSpacing: '0.02em',
          }}
        >
          Your admin session expires in {mm}:{ss} — save your work.
        </div>
      )}
      <div style={{ paddingTop: showCountdownBanner ? 48 : 0 }}>{children}</div>
    </>
  );
}
