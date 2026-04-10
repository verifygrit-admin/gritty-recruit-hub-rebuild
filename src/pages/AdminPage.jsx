import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import SchoolsTableEditor from '../components/SchoolsTableEditor.jsx';
import AdminUsersTab from '../components/AdminUsersTab.jsx';
import AdminInstitutionsTab from '../components/AdminInstitutionsTab.jsx';
import AdminRecruitingEventsTab from '../components/AdminRecruitingEventsTab.jsx';
import AuditLogViewer from '../components/AuditLogViewer.jsx';
import DualAdminIndicator from '../components/DualAdminIndicator.jsx';

// AdminPage — Section D parent layout
// Composes the admin-panel leaf components under a 5-tab nav.
// Hosted under AdminRoute in App.jsx (/admin/*),
// so by the time this renders, the admin claim has already been verified.
//
// Intentionally does NOT use the Layout wrapper — the admin panel is a distinct
// surface from the student/coach app shell.

const TABS = [
  { key: 'schools', label: 'Schools', path: '/admin/schools' },
  { key: 'users', label: 'Users', path: '/admin/users' },
  { key: 'institutions', label: 'Institutions', path: '/admin/institutions' },
  { key: 'recruiting-events', label: 'Recruiting Events', path: '/admin/recruiting-events' },
  { key: 'audit', label: 'Audit Log', path: '/admin/audit' },
];

function deriveActiveTab(pathname) {
  // Match /admin/<tab> — default to 'schools' if bare /admin or unknown
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const match = TABS.find((t) => t.key === segment);
  return match ? match.key : 'schools';
}

export default function AdminPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = deriveActiveTab(location.pathname);
  const adminEmail = session?.user?.email || '';

  // Redirect bare /admin to /admin/schools
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    navigate('/admin/schools', { replace: true });
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login', { replace: true });
  };

  return (
    <div
      data-testid="admin-page"
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        color: '#2C2C2C',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Header bar — dual-admin indicator + sign out */}
      <header
        data-testid="admin-page-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E8E8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#8B3A3A',
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            GrittyOS Admin
          </h1>
          <DualAdminIndicator adminEmail={adminEmail} />
        </div>
        <button
          type="button"
          data-testid="admin-sign-out"
          onClick={handleSignOut}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            color: '#8B3A3A',
            border: '1px solid #8B3A3A',
            borderRadius: 4,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </header>

      {/* Tab bar */}
      <nav
        data-testid="admin-page-tabs"
        style={{
          display: 'flex',
          padding: '0 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E8E8',
          minHeight: 56,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`admin-tab-${tab.key}`}
            onClick={() => navigate(tab.path)}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: activeTab === tab.key ? '#8B3A3A' : '#6B6B6B',
              border: 'none',
              borderBottom:
                activeTab === tab.key
                  ? '3px solid #8B3A3A'
                  : '3px solid transparent',
              fontSize: '0.9375rem',
              fontWeight: activeTab === tab.key ? 700 : 500,
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main data-testid="admin-page-content">
        {activeTab === 'schools' && <SchoolsTableEditor adminEmail={adminEmail} />}
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'institutions' && <AdminInstitutionsTab />}
        {activeTab === 'recruiting-events' && <AdminRecruitingEventsTab />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </main>
    </div>
  );
}