// Sprint 001 D2 — Users tab toggle column configs.
// Extracted from AdminUsersTab.jsx so the session spec's ordering can be
// validated by tests/unit/admin-users-columns.test.js.

export const ACCOUNTS_COLUMNS = [
  { key: 'id',              label: 'ID',             editable: false, width: '80px' },
  { key: 'created_at',      label: 'Created',        editable: false, width: '140px' },
  { key: 'user_type',       label: 'User Type',      editable: false, width: '170px' },
  { key: 'name',            label: 'Full Name',      editable: false, width: '160px' },
  { key: 'email',           label: 'Email',          editable: false, width: '220px' },
  { key: 'has_password',    label: 'Has Password',   editable: false, width: '110px' },
  { key: 'email_verified',  label: 'Email Verified', editable: true,  width: '120px' },
  { key: 'account_status',  label: 'Status',         editable: true,  width: '120px' },
];

export const STUDENT_ATHLETES_COLUMNS = [
  { key: 'id',                label: 'ID',                editable: false, width: '80px' },
  { key: 'name',              label: 'Full Name',         editable: false, width: '160px' },
  { key: 'position',          label: 'Position',          editable: false, width: '100px' },
  { key: 'recruiting_status', label: 'Recruiting Status', editable: true,  width: '140px' },
  { key: 'grad_year',         label: 'Grad Year',         editable: true,  width: '100px' },
  { key: 'height',            label: 'Height',            editable: true,  width: '80px' },
  { key: 'weight',            label: 'Weight',            editable: true,  width: '80px' },
  { key: 'speed_40',          label: '40yd',              editable: true,  width: '80px' },
  { key: 'agi',               label: 'AGI',               editable: true,  width: '80px' },
  { key: 'captain',           label: 'Captain',           editable: true,  width: '80px' },
  { key: 'all_conference',    label: 'All-Conf',          editable: true,  width: '90px' },
  { key: 'all_state',         label: 'All-State',         editable: true,  width: '90px' },
  { key: 'expected_starter',  label: 'Starter',           editable: true,  width: '80px' },
  { key: 'gpa',               label: 'GPA',               editable: false, width: '60px' },
  { key: 'sat',               label: 'SAT',               editable: false, width: '60px' },
];

// College Coaches: intentional empty state — data pipeline pending.
// The toggle short-circuits to the empty message in AdminUsersTab.jsx.
export const COLLEGE_COACHES_COLUMNS = [];
export const COLLEGE_COACHES_EMPTY_MESSAGE = 'No college coaches found';

export const HS_COACHES_COLUMNS = [
  { key: 'id',           label: 'ID',         editable: false, width: '80px' },
  { key: 'name',         label: 'Full Name',  editable: false, width: '160px' },
  { key: 'phone',        label: 'Phone',      editable: true,  width: '140px' },
  { key: 'is_head_coach', label: 'Head Coach', editable: false, width: '100px' },
  { key: 'school_name',  label: 'School',     editable: false, width: '220px' },
  { key: 'created_at',   label: 'Created',    editable: false, width: '140px' },
];

// Counselors: Head Coach column removed per 2026-04-21 ruling — no structural
// support in hs_counselor_schools (no is_head_coach column on that table).
// Spec §2 listed it as an artifact of parallel structure with HS Coaches.
export const COUNSELORS_COLUMNS = [
  { key: 'id',          label: 'ID',        editable: false, width: '80px' },
  { key: 'name',        label: 'Full Name', editable: false, width: '160px' },
  { key: 'phone',       label: 'Phone',     editable: true,  width: '140px' },
  { key: 'school_name', label: 'School',    editable: false, width: '220px' },
  { key: 'created_at',  label: 'Created',   editable: false, width: '140px' },
];

export const PARENTS_COLUMNS = [
  { key: 'email', label: 'Email', editable: false, width: '260px' },
];
