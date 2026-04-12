import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AdminUsersTab — Users tab with sub-nav for 6 entity tables.
// OBJ-4 (Session 016-C): Supabase data wired via admin-read-users Edge Function.
// Decision 6: Sortable columns handled by AdminTableEditor.

const USERS_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'email', label: 'Email', editable: false, width: '220px' },
  { key: 'account_status', label: 'Status', editable: true, width: '120px' },
  { key: 'email_verified', label: 'Email Verified', editable: true, width: '120px' },
  { key: 'payment_status', label: 'Payment', editable: true, width: '120px' },
  { key: 'trial_started_at', label: 'Trial Started', editable: true, width: '140px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

const STUDENT_ATHLETES_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'position', label: 'Position', editable: false, width: '100px' },
  { key: 'recruiting_status', label: 'Recruiting Status', editable: true, width: '140px' },
  { key: 'grad_year', label: 'Grad Year', editable: true, width: '100px' },
  { key: 'height', label: 'Height', editable: true, width: '80px' },
  { key: 'weight', label: 'Weight', editable: true, width: '80px' },
  { key: 'speed_40', label: '40yd', editable: true, width: '80px' },
  { key: 'agi', label: 'AGI', editable: true, width: '80px' },
  { key: 'captain', label: 'Captain', editable: true, width: '80px' },
  { key: 'all_conference', label: 'All-Conf', editable: true, width: '90px' },
  { key: 'all_state', label: 'All-State', editable: true, width: '90px' },
  { key: 'expected_starter', label: 'Starter', editable: true, width: '80px' },
  { key: 'gpa', label: 'GPA', editable: false, width: '60px' },
  { key: 'sat', label: 'SAT', editable: false, width: '60px' },
];

const COLLEGE_COACHES_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'first_name', label: 'First Name', editable: false, width: '120px' },
  { key: 'last_name', label: 'Last Name', editable: false, width: '120px' },
  { key: 'phone', label: 'Phone', editable: true, width: '140px' },
  { key: 'preferred_contact_method', label: 'Contact Pref', editable: true, width: '120px' },
  { key: 'school_name', label: 'School', editable: false, width: '200px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

const HS_COACHES_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'first_name', label: 'First Name', editable: false, width: '120px' },
  { key: 'last_name', label: 'Last Name', editable: false, width: '120px' },
  { key: 'phone', label: 'Phone', editable: true, width: '140px' },
  { key: 'is_head_coach', label: 'Head Coach', editable: true, width: '100px' },
  { key: 'primary_school', label: 'School', editable: false, width: '200px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

const GUIDANCE_COUNSELORS_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'first_name', label: 'First Name', editable: false, width: '120px' },
  { key: 'last_name', label: 'Last Name', editable: false, width: '120px' },
  { key: 'phone', label: 'Phone', editable: true, width: '140px' },
  { key: 'email', label: 'Email', editable: true, width: '220px' },
  { key: 'school_name', label: 'School', editable: false, width: '200px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

const PARENTS_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'name', label: 'Name', editable: false, width: '160px' },
  { key: 'phone', label: 'Phone', editable: true, width: '140px' },
  { key: 'email', label: 'Email', editable: true, width: '220px' },
  { key: 'associated_student_id', label: 'Student', editable: true, width: '120px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

const SUB_TABLES = [
  { key: 'users', label: 'Accounts', columns: USERS_COLUMNS, rowKey: 'id', userType: null },
  { key: 'student-athletes', label: 'Student Athletes', columns: STUDENT_ATHLETES_COLUMNS, rowKey: 'id', userType: 'student_athlete' },
  { key: 'college-coaches', label: 'College Coaches', columns: COLLEGE_COACHES_COLUMNS, rowKey: 'id', userType: 'college_coach' },
  { key: 'hs-coaches', label: 'HS Coaches', columns: HS_COACHES_COLUMNS, rowKey: 'id', userType: 'hs_coach' },
  { key: 'guidance-counselors', label: 'Counselors', columns: GUIDANCE_COUNSELORS_COLUMNS, rowKey: 'id', userType: 'hs_guidance_counselor' },
  { key: 'parents', label: 'Parents', columns: PARENTS_COLUMNS, rowKey: 'id', userType: 'parent' },
];

// --- Entity-specific field group configs (per Quill spec Section 4) ---

const FIELD_GROUP_CONFIGS = {
  users: (row) => [
    {
      title: 'Account Info',
      fields: [
        { key: 'id', label: 'User ID', value: row.id, readOnly: true },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
        { key: 'created_at', label: 'Created', value: row.created_at, readOnly: true },
      ],
    },
    {
      title: 'Account Status',
      fields: [
        { key: 'account_status', label: 'Status', value: row.account_status, type: 'select', options: [
          { value: 'active', label: 'Active' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'pending', label: 'Pending' },
        ]},
        { key: 'email_verified', label: 'Email Verified', value: row.email_verified, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
        { key: 'payment_status', label: 'Payment Status', value: row.payment_status, type: 'select', options: [
          { value: 'paid', label: 'Paid' },
          { value: 'trial', label: 'Trial' },
          { value: 'expired', label: 'Expired' },
          { value: 'free', label: 'Free' },
        ]},
        { key: 'trial_started_at', label: 'Trial Started', value: row.trial_started_at, type: 'date' },
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
        { key: 'grad_year', label: 'Grad Year', value: row.grad_year, type: 'select', options: [
          { value: '2025', label: '2025' },
          { value: '2026', label: '2026' },
          { value: '2027', label: '2027' },
          { value: '2028', label: '2028' },
          { value: '2029', label: '2029' },
        ]},
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
        { key: 'recruiting_status', label: 'Status', value: row.recruiting_status, type: 'select', options: [
          { value: 'prospect', label: 'Prospect' },
          { value: 'recruit', label: 'Recruit' },
          { value: 'committed', label: 'Committed' },
          { value: 'signed', label: 'Signed' },
        ]},
        { key: 'expected_starter', label: 'Expected Starter', value: row.expected_starter, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
        { key: 'captain', label: 'Captain', value: row.captain, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
        { key: 'all_conference', label: 'All-Conference', value: row.all_conference, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
        { key: 'all_state', label: 'All-State', value: row.all_state, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
      ],
    },
  ],

  'college-coaches': (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'first_name', label: 'First Name', value: row.first_name, readOnly: true },
        { key: 'last_name', label: 'Last Name', value: row.last_name, readOnly: true },
        { key: 'title', label: 'Title', value: row.title, maxLength: 255 },
        { key: 'specialization', label: 'Specialization', value: row.specialization, maxLength: 255 },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel', required: true, maxLength: 20 },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
        { key: 'preferred_contact_method', label: 'Contact Preference', value: row.preferred_contact_method, type: 'select', options: [
          { value: 'phone', label: 'Phone' },
          { value: 'email', label: 'Email' },
          { value: 'both', label: 'Both' },
        ]},
      ],
    },
    {
      title: 'School Association',
      fields: [
        { key: 'school_name', label: 'School', value: row.school_name, readOnly: true },
        { key: 'school_id', label: 'School ID', value: row.school_id, readOnly: true },
      ],
    },
  ],

  'hs-coaches': (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'first_name', label: 'First Name', value: row.first_name, readOnly: true },
        { key: 'last_name', label: 'Last Name', value: row.last_name, readOnly: true },
        { key: 'title', label: 'Title', value: row.title, maxLength: 255 },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel', required: true, maxLength: 20 },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
      ],
    },
    {
      title: 'School Association',
      fields: [
        { key: 'primary_school', label: 'Primary School', value: row.primary_school, readOnly: true },
        { key: 'is_head_coach', label: 'Head Coach', value: row.is_head_coach, type: 'select', options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]},
      ],
    },
  ],

  'guidance-counselors': (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'first_name', label: 'First Name', value: row.first_name, readOnly: true },
        { key: 'last_name', label: 'Last Name', value: row.last_name, readOnly: true },
      ],
    },
    {
      title: 'School Association',
      fields: [
        { key: 'school_name', label: 'School', value: row.school_name, readOnly: true },
        { key: 'school_id', label: 'School ID', value: row.school_id, readOnly: true },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel', required: true, maxLength: 20 },
        { key: 'email', label: 'Email', value: row.email, readOnly: true, type: 'email' },
      ],
    },
  ],

  parents: (row) => [
    {
      title: 'Basic Info',
      fields: [
        { key: 'name', label: 'Name', value: row.name, required: true, maxLength: 255 },
        { key: 'relationship', label: 'Relationship', value: row.relationship, type: 'select', options: [
          { value: 'parent', label: 'Parent' },
          { value: 'guardian', label: 'Guardian' },
          { value: 'other', label: 'Other' },
        ]},
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'phone', label: 'Phone', value: row.phone, type: 'tel', required: true, maxLength: 20 },
        { key: 'email', label: 'Email', value: row.email, type: 'email', required: true, maxLength: 254 },
      ],
    },
    {
      title: 'Student Link',
      fields: [
        { key: 'associated_student_name', label: 'Student Name', value: row.associated_student_name, readOnly: true },
        { key: 'student_id', label: 'Student ID', value: row.student_id, readOnly: true },
      ],
    },
  ],
};

// --- POR tooltip configs for confirmed tab contexts (spec §1.1, §1.2) ---
// Field names are PROVISIONAL — pending WT-B Patch schema confirmation.
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
  'college-coaches': {
    tabContext: 'college-coaches',
    getTooltipData: (row) => ({
      title: `${row.first_name || ''} ${row.last_name || ''}`.trim() || `Coach #${row.id}`,
      confidenceScore: row.confidence_score ?? null,
      divisionBreakdown: row.division_breakdown ?? null,
      activePrograms: row.active_programs ?? null,
      successRate: row.success_rate ?? null,
      lastUpdated: row.updated_at ?? null,
    }),
  },
};

// Form title generators per entity type
const FORM_TITLES = {
  users: (row) => `Account — ${row.email || ''} (ID: ${row.id || ''})`,
  'student-athletes': (row) => `Athlete — ${row.name || ''} (ID: ${row.id || ''})`,
  'college-coaches': (row) => `Coach — ${row.first_name || ''} ${row.last_name || ''} (ID: ${row.id || ''})`,
  'hs-coaches': (row) => `HS Coach — ${row.first_name || ''} ${row.last_name || ''} (ID: ${row.id || ''})`,
  'guidance-counselors': (row) => `Counselor — ${row.first_name || ''} ${row.last_name || ''} (ID: ${row.id || ''})`,
  parents: (row) => `Parent — ${row.name || ''} (ID: ${row.id || ''})`,
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
    } catch (err) {
      setLoadError('Network error loading users. Please try again.');
      setLoading(false);
    }
  }, []);

  // Fetch data on mount and when sub-tab changes
  useEffect(() => {
    loadUsers(current.userType);
  }, [activeSubTable, current.userType, loadUsers]);

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
    // TODO (016-C follow-up): Wire to admin-update-users Edge Function.
    // Reads are wired; writes will follow the admin-update-school pattern.
    handleClose();
  }, [handleClose]);

  const handleSubTableChange = useCallback((key) => {
    setActiveSubTable(key);
    // Close any open form when switching sub-tables
    setSelectedRow(null);
    setFormData({});
  }, []);

  const getFieldGroups = FIELD_GROUP_CONFIGS[activeSubTable];
  const getTitle = FORM_TITLES[activeSubTable];
  const fieldGroups = selectedRow && getFieldGroups ? getFieldGroups(formData) : [];

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

      <AdminTableEditor
        columns={current.columns}
        rows={rows}
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
    </div>
  );
}
