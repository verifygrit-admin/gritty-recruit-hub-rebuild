import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import SchoolsTableEditor from '../components/SchoolsTableEditor.jsx';
import AuditLogViewer from '../components/AuditLogViewer.jsx';
import DualAdminIndicator from '../components/DualAdminIndicator.jsx';

// AdminPage — Section D parent layout
// Composes the five admin-panel leaf components. Hosted under AdminRoute in App.jsx,
// so by the time this renders, the admin claim has already been verified.
//
// Intentionally does NOT use the Layout wrapper — the admin panel is a distinct
// surface from the student/coach app shell.
export default function AdminPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schools'); // 'schools' | 'audit'

  const adminEmail = session?.user?.email || '';

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
        }}
      >
        <button
          type="button"
          data-testid="admin-tab-schools"
          onClick={() => setActiveTab('schools')}
          style={{
            padding: '12px 20px',
            backgroundColor: 'transparent',
            color: activeTab === 'schools' ? '#8B3A3A' : '#6B6B6B',
            border: 'none',
            borderBottom: activeTab === 'schools' ? '3px solid #8B3A3A' : '3px solid transparent',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'schools' ? 700 : 500,
            cursor: 'pointer',
            marginBottom: -1,
          }}
        >
          Schools
        </button>
        <button
          type="button"
          data-testid="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 20px',
            backgroundColor: 'transparent',
            color: activeTab === 'audit' ? '#8B3A3A' : '#6B6B6B',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid #8B3A3A' : '3px solid transparent',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'audit' ? 700 : 500,
            cursor: 'pointer',
            marginBottom: -1,
          }}
        >
          Audit Log
        </button>
      </nav>

      {/* Tab content */}
      <main data-testid="admin-page-content">
        {activeTab === 'schools' && <SchoolsTableEditor adminEmail={adminEmail} />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </main>
    </div>
  );
}
