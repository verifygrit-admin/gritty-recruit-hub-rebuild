// columnConfigs — Sprint 027.
// Per-entity AdminTableEditor column configs. The `editable` flag here is for
// AdminTableEditor's inline-edit affordance — Sprint 027 uses BulkEditDrawer
// for writes, so all columns are surfaced as editable=false in the table
// (drawer handles editing). The `width` and `label` shape this file owns;
// the editable column SET is owned by entityRegistry.js (security boundary).
//
// All read-only columns (PK, auth-linked) are surfaced in the table for
// context but lock at the drawer level (see BulkEditDrawer logic).

// ---------- helpers ----------

const col = (key, label, width = '140px') => ({ key, label, editable: false, width });
const colWide = (key, label) => col(key, label, '200px');
const colNarrow = (key, label) => col(key, label, '90px');

// ---------- per-entity column configs ----------

const STUDENTS_COLUMNS = [
  col('name', 'Name', '160px'),
  colWide('email', 'Email'),
  col('high_school', 'HS', '160px'),
  colNarrow('grad_year', 'Grad'),
  colNarrow('state', 'State'),
  colNarrow('position', 'Pos'),
  colNarrow('height', 'Ht'),
  colNarrow('weight', 'Wt'),
  colNarrow('speed_40', '40yd'),
  colNarrow('gpa', 'GPA'),
  colNarrow('sat', 'SAT'),
  col('status', 'Status', '100px'),
];

const HS_COACHES_COLUMNS = [
  col('full_name', 'Name', '160px'),
  colWide('email', 'Email'),
  col('account_status', 'Status', '100px'),
  col('payment_status', 'Payment', '100px'),
  colNarrow('email_verified', 'Verified'),
  col('hs_program_name', 'School', '160px'), // joined display field
  colNarrow('is_head_coach', 'Head'),
];

const COUNSELORS_COLUMNS = [
  col('full_name', 'Name', '160px'),
  colWide('email', 'Email'),
  col('account_status', 'Status', '100px'),
  col('payment_status', 'Payment', '100px'),
  colNarrow('email_verified', 'Verified'),
  col('hs_program_name', 'School', '160px'),
];

const HIGH_SCHOOLS_COLUMNS = [
  col('school_name', 'Name', '200px'),
  col('city', 'City', '120px'),
  colNarrow('state', 'State'),
  colNarrow('zip', 'ZIP'),
  col('conference', 'Conference', '160px'),
  col('division', 'Div', '100px'),
];

const COLLEGES_COLUMNS = [
  colNarrow('unitid', 'UNITID'),
  col('school_name', 'School', '200px'),
  col('city', 'City', '120px'),
  colNarrow('state', 'State'),
  col('ncaa_division', 'Div', '100px'),
  col('conference', 'Conference', '160px'),
  colNarrow('avg_gpa', 'GPA'),
  colNarrow('avg_sat', 'SAT'),
  colNarrow('graduation_rate', 'Grad'),
  colWide('athletics_email', 'Athletics Email'),
];

const COLLEGE_COACHES_COLUMNS = [
  col('name', 'Name', '160px'),
  col('title', 'Title', '140px'),
  colNarrow('unitid', 'UNITID'),
  colWide('email', 'Email'),
  col('twitter_handle', 'Twitter', '120px'),
  colNarrow('is_head_coach', 'Head'),
];

const RECRUITING_EVENTS_COLUMNS = [
  col('event_type', 'Type', '120px'),
  col('event_name', 'Name', '200px'),
  col('event_date', 'Date', '120px'),
  colNarrow('unitid', 'UNITID'),
  col('status', 'Status', '120px'),
  col('location', 'Location', '160px'),
  colNarrow('cost_dollars', 'Cost'),
];

export const COLUMN_CONFIGS = {
  students: STUDENTS_COLUMNS,
  hs_coaches: HS_COACHES_COLUMNS,
  counselors: COUNSELORS_COLUMNS,
  high_schools: HIGH_SCHOOLS_COLUMNS,
  colleges: COLLEGES_COLUMNS,
  college_coaches: COLLEGE_COACHES_COLUMNS,
  recruiting_events: RECRUITING_EVENTS_COLUMNS,
};

export function getColumns(entityKey) {
  const c = COLUMN_CONFIGS[entityKey];
  if (!c) throw new Error(`No column config for entity: ${entityKey}`);
  return c;
}
