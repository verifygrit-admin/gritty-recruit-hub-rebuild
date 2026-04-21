import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';
import {
  ACCOUNTS_COLUMNS,
  STUDENT_ATHLETES_COLUMNS,
  COLLEGE_COACHES_COLUMNS,
  COLLEGE_COACHES_EMPTY_MESSAGE,
  HS_COACHES_COLUMNS,
  COUNSELORS_COLUMNS,
  PARENTS_COLUMNS,
} from '../lib/adminUsersColumns.js';

// AdminUsersTab — Users tab with six entity-type toggles.
// Sprint 001 D2: column configs moved to src/lib/adminUsersColumns.js so the
// session spec's ordering is test-enforced. Preformats boolean columns for
// human-readable rendering.

const SUB_TABLES = [
  { key: 'users',               label: 'Accounts',         columns: ACCOUNTS_COLUMNS,          rowKey: 'id', userType: null },
  { key: 'student-athletes',    label: 'Student Athletes', columns: STUDENT_ATHLETES_COLUMNS,  rowKey: 'id', userType: 'student_athlete' },
  { key: 'college-coaches',     label: 'College Coaches',  columns: COLLEGE_COACHES_COLUMNS,   rowKey: 'id', userType: 'college_coach' },
  { key: 'hs-coaches',          label: 'HS Coaches',       columns: HS_COACHES_COLUMNS,        rowKey: 'id', userType: 'hs_coach' },
  { key: 'guidance-counselors', label: 'Counselors',       columns: COUNSELORS_COLUMNS,        rowKey: 'id', userType: 'hs_guidance_counselor' },
  { key: 'parents',             label: 'Parents',          columns: PARENTS_COLUMNS,           rowKey: 'id', userType: 'parent' },
];

// --- Row preformat: humanize booleans, dates, etc. ---
function yesNoDash(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}

function formatCreated(v) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function preformatRow(row) {
  return {
    ...row,
    created_at: formatCreated(row.created_at),
    has_password: yesNoDash(row.has_password),
    email_verified: yesNoDash(row.email_verified),
    is_head_coach: yesNoDash(row.is_head_coach),
    captain: yesNoDash(row.captain),
    all_conference: yesNoDash(row.all_conference),
    all_state: yesNoDash(row.all_state),
    expected_starter: yesNoDash(row.expected_starter),
  };
}

// --- Slide-out field group configs (unchanged scope this sprint) ---

const FIELD_GROUP_CONFIGS = {
  users: (row) => [
    {
      title: 'Account Info',
      fields: [
        { key: 'id', label: 'User ID', value: row.id, readOnly: true },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
        { key: 'created_at', label: 'Created', value: row.created_at, readOnly: true },
        { key: 'user_type', label: 'User Type', value: row.user_type, readOnly: true },
      ],
    },
    {
      title: 'Account Status',
      fields: [
        { key: 'account_status', label: 'Status', value: row.account_status, type: 'select', options: [
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'pending', label: 'Pending' },
        ]},
        { key: 'email_verified', label: 'Email Verified', value: row.email_verified, readOnly: true },
        { key: 'has_password', label: 'Has Password', value: row.has_password, readOnly: true },
      ],
    },
  ],

  'student-athletes': (row) => [
    {
      title: 'Profile',
      fields: [
        { key: 'name', label: 'Name', value: row.name, readOnly: true },
        { key: 'position', label: 'Position', value: row.position, readOnly: true },
        { key: 'high_school', label: 'High School', value: row.high_school, readOnly: true },
        { key: 'grad_year', label: 'Grad Year', value: row.grad_year, type: 'number' },
        { key: 'state', label: 'State', value: row.state, readOnly: true },
      ],
    },
    {
      title: 'Physical Attributes',
      fields: [
        { key: 'height', label: 'Height', value: row.height },
        { key: 'weight', label: 'Weight', value: row.weight, type: 'number' },
        { key: 'speed_40', label: '40yd Speed', value: row.speed_40, type: 'number' },
        { key: 'agi', label: 'AGI', value: row.agi, type: 'number' },
      ],
    },
    {
      title: 'Academic',
      fields: [
        { key: 'gpa', label: 'GPA', value: row.gpa, readOnly: true, type: 'number' },
        { key: 'sat', label: 'SAT', value: row.sat, readOnly: true, type: 'number' },
      ],
    },
    {
      title: 'Recruiting Status',
      fields: [
        { key: 'recruiting_status', label: 'Status', value: row.recruiting_status },
        { key: 'expected_starter', label: 'Expected Starter', value: row.expected_starter, readOnly: true },
        { key: 'captain', label: 'Captain', value: row.captain, readOnly: true },
        { key: 'all_conference', label: 'All-Conference', value: row.all_conference, readOnly: true },
        { key: 'all_state', label: 'All-State', value: row.all_state, readOnly: true },
      ],
    },
  ],

  'hs-coaches': (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'name', label: 'Full Name', value: row.name, readOnly: true },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel' },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
      ],
    },
    {
      title: 'School Association',
      fields: [
        { key: 'school_name', label: 'School', value: row.school_name, readOnly: true },
        { key: 'is_head_coach', label: 'Head Coach', value: row.is_head_coach, readOnly: true },
      ],
    },
  ],

  'guidance-counselors': (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'name', label: 'Full Name', value: row.name, readOnly: true },
      ],
    },
    {
      title: 'School Association',
      fields: [
        { key: 'school_name', label: 'School', value: row.school_name, readOnly: true },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel' },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
      ],
    },
  ],

  parents: (row) => [
    {
      title: 'Contact',
      fields: [
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
      ],
    },
    // Associated Student Athlete deferred to Sprint 002 (no parent↔student link table).
  ],
};

// --- POR tooltip configs — unchanged from 016-C scaffold ---

const POR_CONFIGS = {
  'student-athletes': {
    tabContext: 'student-athletes',
    getTooltipData: (row) => ({
      title: row.name || `Athlete #${row.id}`,
      confidenceScore: row.confidence_score ?? null,
      primaryScore: row.primary_score ?? null,
      gpaFit: row.gpa_fit ?? null,
      athleticRating: row.athletic_rating ?? null,
      recruitingStage: row.recruiting_status ?? null,
      lastUpdated: row.updated_at ?? null,
    }),
  },
  'guidance-counselors': {
    tabContext: 'guidance-counselors',
    getTooltipData: (row) => ({
      title: row.name || `Counselor #${row.id}`,
      associatedSchools: row.school_name ?? null,
      studentCount: row.supervised_student_count ?? null,
      lastLogin: row.last_login ?? null,
      lastUpdated: row.last_updated ?? row.updated_at ?? null,
    }),
  },
  'hs-coaches': {
    tabContext: 'hs-coaches',
    getTooltipData: (row) => ({
      title: row.name || `Coach #${row.id}`,
      associatedSchools: row.school_name ?? null,
      isHeadCoach: typeof row.is_head_coach === 'boolean' ? row.is_head_coach : null,
      studentCount: row.coached_student_count ?? null,
      lastLogin: row.last_login ?? null,
      lastUpdated: row.last_updated ?? row.updated_at ?? null,
    }),
  },
  parents: {
    tabContext: 'parents',
    getTooltipData: (row) => ({
      title: row.name || `Parent #${row.id}`,
      accountStatus: row.account_status ?? null,
      lastLogin: row.last_login ?? null,
    }),
  },
};

const FORM_TITLES = {
  users: (row) => `Account — ${row.email || ''} (ID: ${row.id || ''})`,
  'student-athletes': (row) => `Athlete — ${row.name || ''} (ID: ${row.id || ''})`,
  'hs-coaches': (row) => `HS Coach — ${row.name || ''} (ID: ${row.id || ''})`,
  'guidance-counselors': (row) => `Counselor — ${row.name || ''} (ID: ${row.id || ''})`,
  parents: (row) => `Parent — ${row.email || ''} (ID: ${row.id || ''})`,
};

export default function AdminUsersTab() {
  const isDesktop = useIsDesktop();
  const [activeSubTable, setActiveSubTable] = useState('users');
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const current = SUB_TABLES.find((t) => t.key === activeSubTable) || SUB_TABLES[0];

  const loadUsers = useCallback(async (userType) => {
    setLoading(true);
    setLoadError('');
    setRows([]);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (!jwt) {
        setLoadError('No active admin session. Please sign in again.');
        setLoading(false);
        return;
      }

      const params = userType ? `?user_type=${userType}` : '';
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-read-users${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
      });

      if (!res.ok) {
        setLoadError(`Failed to load users (HTTP ${res.status}). The admin-read-users Edge Function may not be deployed yet.`);
        setLoading(false);
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setLoadError(body?.error || 'Failed to load users.');
        setLoading(false);
        return;
      }

      setRows(body.users || []);
      setLoading(false);
    } catch {
      setLoadError('Network error loading users. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // College Coaches intentionally does not fetch — data pipeline pending.
    if (current.key === 'college-coaches') {
      setRows([]);
      setLoading(false);
      setLoadError('');
      return;
    }
    loadUsers(current.userType);
  }, [activeSubTable, current.key, current.userType, loadUsers]);

  const displayRows = useMemo(() => rows.map(preformatRow), [rows]);

  const handleRowClick = useCallback((row) => {
    setSelectedRow(row);
    setFormData({ ...row });
  }, []);

  const handleFieldChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedRow(null);
    setFormData({});
  }, []);

  const handleSave = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleSubTableChange = useCallback((key) => {
    setActiveSubTable(key);
    setSelectedRow(null);
    setFormData({});
  }, []);

  const getFieldGroups = FIELD_GROUP_CONFIGS[activeSubTable];
  const getTitle = FORM_TITLES[activeSubTable];
  const fieldGroups = selectedRow && getFieldGroups ? getFieldGroups(formData) : [];

  const isCollegeCoaches = current.key === 'college-coaches';

  return (
    <div data-testid="admin-users-tab">
      {/* Sub-table pill nav */}
      <div
        data-testid="admin-users-sub-nav"
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 24px 0 24px',
          flexWrap: 'wrap',
        }}
      >
        {SUB_TABLES.map((sub) => (
          <button
            key={sub.key}
            type="button"
            data-testid={`admin-users-sub-${sub.key}`}
            onClick={() => handleSubTableChange(sub.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: activeSubTable === sub.key ? '1px solid #8B3A3A' : '1px solid #D4D4D4',
              backgroundColor: activeSubTable === sub.key ? '#8B3A3A' : '#FFFFFF',
              color: activeSubTable === sub.key ? '#FFFFFF' : '#6B6B6B',
              fontSize: '0.8125rem',
              fontWeight: activeSubTable === sub.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {isCollegeCoaches ? (
        <div
          data-testid="college-coaches-empty-state"
          style={{
            padding: 48,
            textAlign: 'center',
            color: '#6B6B6B',
            fontSize: '0.875rem',
          }}
        >
          {COLLEGE_COACHES_EMPTY_MESSAGE}
        </div>
      ) : (
        <>
          <AdminTableEditor
            columns={current.columns}
            rows={displayRows}
            rowKey={current.rowKey}
            tableName={current.label.toLowerCase()}
            loading={loading}
            loadError={loadError}
            onRetry={() => loadUsers(current.userType)}
            isDesktop={isDesktop}
            onRowClick={handleRowClick}
            porConfig={POR_CONFIGS[activeSubTable] || null}
          />

          <SlideOutForm
            isOpen={!!selectedRow}
            onClose={handleClose}
            title={selectedRow && getTitle ? getTitle(formData) : ''}
            fieldGroups={fieldGroups}
            isDesktop={isDesktop}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
}
