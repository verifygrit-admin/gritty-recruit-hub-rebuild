// entityRegistry — Sprint 027.
// Master registry consumed by AccountUpdatesShell, BulkEditDrawer, every
// *View.jsx, and every dispatcher (fetchPagedRows, applyBatchEdit,
// applyCreate, applyDelete). Single source of truth — DO NOT duplicate
// whitelists elsewhere in the client.
//
// Mirror of docs/specs/.admin-acct-updates/COLUMN_WHITELISTS.md Master entity
// registry. Server-side EFs hold their own copy of these arrays (defense in
// depth — the EF whitelist is the security boundary, not this client one).

// ---------- per-entity UPDATE whitelists ----------

export const STUDENTS_UPDATE_WHITELIST = [
  'name','phone','twitter','parent_guardian_email',
  'high_school','grad_year','state','hs_lat','hs_lng',
  'position','height','weight','speed_40','gpa','sat',
  'time_5_10_5','time_l_drill','bench_press','squat','clean',
  'expected_starter','captain','all_conference','all_state',
  'agi','dependents',
  'status','hudl_url','avatar_storage_path',
];

export const HS_COACHES_UPDATE_WHITELIST_USERS = [
  'account_status','email_verified','activated_by','activated_at',
  'payment_status','trial_started_at','full_name',
];
export const HS_COACHES_UPDATE_WHITELIST_LINK = ['is_head_coach','hs_program_id'];

export const COUNSELORS_UPDATE_WHITELIST_USERS = [
  'account_status','email_verified','activated_by','activated_at',
  'payment_status','trial_started_at','full_name',
];
export const COUNSELORS_UPDATE_WHITELIST_LINK = ['hs_program_id'];

export const HIGH_SCHOOLS_UPDATE_WHITELIST = [
  'school_name','address','city','state','zip',
  'conference','division','state_athletic_association',
];

export const COLLEGES_UPDATE_WHITELIST = [
  'school_name','state','city','control','school_type','type','ncaa_division','conference',
  'latitude','longitude',
  'coa_out_of_state','est_avg_merit','avg_merit_award','share_stu_any_aid','share_stu_need_aid',
  'need_blind_school','dltv','adltv','adltv_rank','admissions_rate',
  'acad_rigor_senior','acad_rigor_junior','acad_rigor_soph','acad_rigor_freshman',
  'acad_rigor_test_opt_senior','acad_rigor_test_opt_junior','acad_rigor_test_opt_soph','acad_rigor_test_opt_freshman',
  'is_test_optional','graduation_rate','avg_gpa','avg_sat',
  'recruiting_q_link','coach_link','prospect_camp_link','field_level_questionnaire',
  'athletics_phone','athletics_email',
];

export const COLLEGE_COACHES_UPDATE_WHITELIST = [
  'unitid','name','title','email','photo_url','twitter_handle','is_head_coach','profile_url',
];
export const COLLEGE_COACHES_CREATE_WHITELIST = COLLEGE_COACHES_UPDATE_WHITELIST;
export const COLLEGE_COACHES_CREATE_REQUIRED = ['unitid','name'];

export const RECRUITING_EVENTS_UPDATE_WHITELIST = [
  'unitid','event_type','event_name','event_date','end_date','registration_deadline',
  'location','cost_dollars','registration_url','status','description',
];
export const RECRUITING_EVENTS_CREATE_WHITELIST = RECRUITING_EVENTS_UPDATE_WHITELIST;
export const RECRUITING_EVENTS_CREATE_REQUIRED = ['unitid','event_date'];

// ---------- master registry ----------

export const ENTITY_REGISTRY = {
  students: {
    label: 'Students',
    table: 'profiles',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: STUDENTS_UPDATE_WHITELIST,
    create_enabled: false,
    delete_enabled: false,
    has_link_table: false,
    has_updated_at: true,
    audit_table_name: 'profiles',
  },
  hs_coaches: {
    label: 'HS Coaches',
    table: 'users',
    pk: 'id',
    pk_type: 'uuid',
    user_type_filter: 'hs_coach',
    update_whitelist_users: HS_COACHES_UPDATE_WHITELIST_USERS,
    update_whitelist_link: HS_COACHES_UPDATE_WHITELIST_LINK,
    link_table: 'hs_coach_schools',
    link_fk_to_user: 'coach_user_id',
    create_enabled: false,
    delete_enabled: false,
    has_link_table: true,
    has_updated_at: false, // public.users has no updated_at
    audit_table_name: 'users',
  },
  counselors: {
    label: 'Counselors',
    table: 'users',
    pk: 'id',
    pk_type: 'uuid',
    user_type_filter: 'hs_guidance_counselor',
    update_whitelist_users: COUNSELORS_UPDATE_WHITELIST_USERS,
    update_whitelist_link: COUNSELORS_UPDATE_WHITELIST_LINK,
    link_table: 'hs_counselor_schools',
    link_fk_to_user: 'counselor_user_id',
    create_enabled: false,
    delete_enabled: false,
    has_link_table: true,
    has_updated_at: false,
    audit_table_name: 'users',
  },
  high_schools: {
    label: 'High Schools',
    table: 'hs_programs',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: HIGH_SCHOOLS_UPDATE_WHITELIST,
    create_enabled: false,
    delete_enabled: false,
    has_link_table: false,
    has_updated_at: false, // hs_programs has no updated_at
    audit_table_name: 'hs_programs',
  },
  colleges: {
    label: 'Colleges',
    table: 'schools',
    pk: 'unitid',
    pk_type: 'integer',
    update_whitelist: COLLEGES_UPDATE_WHITELIST,
    create_enabled: false,
    delete_enabled: false,
    has_link_table: false,
    has_updated_at: true, // schools.last_updated (renamed handled in EF)
    updated_at_col: 'last_updated',
    audit_table_name: 'schools',
  },
  college_coaches: {
    label: 'College Coaches',
    table: 'college_coaches',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: COLLEGE_COACHES_UPDATE_WHITELIST,
    create_whitelist: COLLEGE_COACHES_CREATE_WHITELIST,
    create_required: COLLEGE_COACHES_CREATE_REQUIRED,
    create_enabled: true,
    delete_enabled: true,
    has_link_table: false,
    has_updated_at: true, // added by 0052
    audit_table_name: 'college_coaches',
  },
  recruiting_events: {
    label: 'Recruiting Events',
    table: 'recruiting_events',
    pk: 'id',
    pk_type: 'uuid',
    update_whitelist: RECRUITING_EVENTS_UPDATE_WHITELIST,
    create_whitelist: RECRUITING_EVENTS_CREATE_WHITELIST,
    create_required: RECRUITING_EVENTS_CREATE_REQUIRED,
    create_enabled: true,
    delete_enabled: true,
    has_link_table: false,
    has_updated_at: true, // added by 0052
    audit_table_name: 'recruiting_events',
  },
};

export const ENTITY_KEYS = [
  'students','hs_coaches','counselors','high_schools',
  'colleges','college_coaches','recruiting_events',
];

export function getEntity(key) {
  const e = ENTITY_REGISTRY[key];
  if (!e) throw new Error(`Unknown entity key: ${key}`);
  return e;
}
