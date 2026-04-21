import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { ADMIN_TABS, deriveActiveTab } from '../lib/adminTabs.js';
import AdminUsersTab from '../components/AdminUsersTab.jsx';
import AdminInstitutionsTab from '../components/AdminInstitutionsTab.jsx';
import AdminRecruitingEventsTab from '../components/AdminRecruitingEventsTab.jsx';
import AuditLogViewer from '../components/AuditLogViewer.jsx';
import DualAdminIndicator from '../components/DualAdminIndicator.jsx';

// AdminPage — Section D parent layout (Sprint 001 D1).
// Four-tab nav: Users, Institutions, Recruiting Events, Audit Log.
// Hosted under AdminRoute in App.jsx (/admin/*); admin claim already verified.

export default function AdminPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = deriveActiveTab(location.pathname);
  const adminEmail = session?.user?.email || '';

  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/users', { replace: true });
    }
  }, [location.pathname, navigate]);

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
        {ADMIN_TABS.map((tab) => (
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
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'institutions' && <AdminInstitutionsTab />}
        {activeTab === 'recruiting-events' && <AdminRecruitingEventsTab />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </main>
    </div>
  );
}