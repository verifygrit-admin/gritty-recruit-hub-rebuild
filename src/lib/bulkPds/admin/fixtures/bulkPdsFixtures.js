/**
 * bulkPdsFixtures.js — Sprint 026 Phase 1b (Admin UI).
 *
 * Static fixture data for the Admin Bulk PDS Approval tab during Phase 1b.
 * Phase 2 will replace `adminBulkPdsClient` internals with live fetches to
 * `admin-read-bulk-pds` / `admin-approve-bulk-pds` / `admin-reject-bulk-pds`
 * Edge Functions (Agent 1c's deliverable). The fixture shape mirrors what
 * the live EF is expected to return per SPRINT_026_PLAN §3.
 *
 * Shape: each batch is a group of submissions sharing batch_id. Each entry
 * in `submissions` is a paired { staging, profile } object — `staging` is
 * the bulk_pds_submissions row as submitted, `profile` is the joined
 * public.profiles row keyed on student_user_id.
 *
 * Coach user_ids resolve through src/data/school-staff.js findStaffByUserId.
 * The BC High head coach (Paul Zukauskas) and Belmont Hill head coach
 * (Frank Roche) are used so the UI renders realistic coach identity blocks.
 */

// BC High head coach (Paul Zukauskas) — from src/data/school-staff.js
const BC_HIGH_COACH_USER_ID = '9177ba55-eb83-4bce-b4cd-01ce3078d4a3';
// Belmont Hill head coach (Frank Roche) — from src/data/school-staff.js
const BELMONT_HILL_COACH_USER_ID = '4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb';

export const PENDING_BATCHES_FIXTURE = [
  {
    batch_id: 'b1f0aaaa-1111-4111-8111-000000000001',
    coach_user_id: BC_HIGH_COACH_USER_ID,
    submitted_at: '2026-05-10T17:42:11.000Z',
    submissions: [
      {
        staging: {
          id: 's1aaaaa1-1111-4111-8111-000000000001',
          batch_id: 'b1f0aaaa-1111-4111-8111-000000000001',
          coach_user_id: BC_HIGH_COACH_USER_ID,
          student_user_id: 'stu0aaaa-1111-4111-8111-000000000001',
          student_name_snapshot: 'Marcus Bennett',
          student_email_snapshot: 'mbennett@student.bchigh.edu',
          student_grad_year_snapshot: 2027,
          student_high_school_snapshot: 'Boston College High School',
          height: '6-2',
          weight: 210,
          speed_40: 4.62,
          time_5_10_5: 4.41,
          time_l_drill: 7.05,
          bench_press: 275,
          squat: 405,
          clean: 235,
          submitted_at: '2026-05-10T17:42:11.000Z',
          approval_status: 'pending',
        },
        profile: {
          user_id: 'stu0aaaa-1111-4111-8111-000000000001',
          name: 'Marcus Bennett',
          email: 'mbennett@student.bchigh.edu',
          grad_year: 2027,
          high_school: 'Boston College High School',
          height: '6-1',
          weight: 195,
          speed_40: 4.75,
          time_5_10_5: null,
          time_l_drill: null,
          bench_press: 250,
          squat: 365,
          clean: 215,
        },
      },
      {
        staging: {
          id: 's1aaaaa2-1111-4111-8111-000000000002',
          batch_id: 'b1f0aaaa-1111-4111-8111-000000000001',
          coach_user_id: BC_HIGH_COACH_USER_ID,
          student_user_id: 'stu0aaaa-1111-4111-8111-000000000002',
          student_name_snapshot: 'Devon Carter',
          student_email_snapshot: 'dcarter@student.bchigh.edu',
          student_grad_year_snapshot: 2026,
          student_high_school_snapshot: 'Boston College High School',
          height: '5-11',
          weight: 185,
          speed_40: 4.55,
          time_5_10_5: 4.28,
          time_l_drill: 6.92,
          bench_press: 245,
          squat: 355,
          clean: 215,
          submitted_at: '2026-05-10T17:42:11.000Z',
          approval_status: 'pending',
        },
        profile: {
          user_id: 'stu0aaaa-1111-4111-8111-000000000002',
          name: 'Devon Carter',
          email: 'dcarter@student.bchigh.edu',
          grad_year: 2026,
          high_school: 'Boston College High School',
          height: '5-11',
          // Legacy data: weight stored as string in the database.
          weight: '180',
          speed_40: 4.6,
          time_5_10_5: null,
          time_l_drill: null,
          bench_press: 230,
          squat: 340,
          clean: 205,
        },
      },
      {
        staging: {
          id: 's1aaaaa3-1111-4111-8111-000000000003',
          batch_id: 'b1f0aaaa-1111-4111-8111-000000000001',
          coach_user_id: BC_HIGH_COACH_USER_ID,
          student_user_id: 'stu0aaaa-1111-4111-8111-000000000003',
          student_name_snapshot: 'Jordan Reyes',
          student_email_snapshot: 'jreyes@student.bchigh.edu',
          student_grad_year_snapshot: 2027,
          student_high_school_snapshot: 'Boston College High School',
          height: '6-0',
          weight: 200,
          speed_40: 4.68,
          time_5_10_5: 4.5,
          time_l_drill: 7.2,
          bench_press: 260,
          squat: 385,
          clean: 225,
          submitted_at: '2026-05-10T17:42:11.000Z',
          approval_status: 'pending',
        },
        profile: {
          user_id: 'stu0aaaa-1111-4111-8111-000000000003',
          name: 'Jordan Reyes',
          email: 'jreyes@student.bchigh.edu',
          grad_year: 2027,
          high_school: 'Boston College High School',
          height: '6-0',
          weight: 200,
          speed_40: 4.68,
          time_5_10_5: 4.5,
          time_l_drill: 7.2,
          bench_press: 260,
          squat: 385,
          clean: 225,
        },
      },
    ],
  },
  {
    batch_id: 'b2f0bbbb-2222-4222-8222-000000000002',
    coach_user_id: BELMONT_HILL_COACH_USER_ID,
    submitted_at: '2026-05-11T13:08:47.000Z',
    submissions: [
      {
        staging: {
          id: 's2bbbbb1-2222-4222-8222-000000000001',
          batch_id: 'b2f0bbbb-2222-4222-8222-000000000002',
          coach_user_id: BELMONT_HILL_COACH_USER_ID,
          student_user_id: 'stu0bbbb-2222-4222-8222-000000000001',
          student_name_snapshot: 'Aiden Walsh',
          student_email_snapshot: 'awalsh@belmonthill.org',
          student_grad_year_snapshot: 2026,
          student_high_school_snapshot: 'Belmont Hill School',
          height: '6-3',
          weight: 220,
          speed_40: 4.78,
          time_5_10_5: 4.6,
          time_l_drill: 7.3,
          bench_press: 285,
          squat: 415,
          clean: 245,
          submitted_at: '2026-05-11T13:08:47.000Z',
          approval_status: 'pending',
        },
        profile: {
          user_id: 'stu0bbbb-2222-4222-8222-000000000001',
          name: 'Aiden Walsh',
          email: 'awalsh@belmonthill.org',
          grad_year: 2026,
          high_school: 'Belmont Hill School',
          height: '6-2',
          weight: null,
          speed_40: null,
          time_5_10_5: null,
          time_l_drill: null,
          bench_press: null,
          squat: null,
          clean: null,
        },
      },
      {
        staging: {
          id: 's2bbbbb2-2222-4222-8222-000000000002',
          batch_id: 'b2f0bbbb-2222-4222-8222-000000000002',
          coach_user_id: BELMONT_HILL_COACH_USER_ID,
          student_user_id: 'stu0bbbb-2222-4222-8222-000000000002',
          student_name_snapshot: 'Liam O\'Sullivan',
          student_email_snapshot: 'losullivan@belmonthill.org',
          student_grad_year_snapshot: 2027,
          student_high_school_snapshot: 'Belmont Hill School',
          height: '5-10',
          weight: 175,
          speed_40: 4.52,
          time_5_10_5: 4.32,
          time_l_drill: 6.98,
          bench_press: 235,
          squat: 345,
          clean: 210,
          submitted_at: '2026-05-11T13:08:47.000Z',
          approval_status: 'pending',
        },
        profile: {
          user_id: 'stu0bbbb-2222-4222-8222-000000000002',
          name: 'Liam O\'Sullivan',
          email: 'losullivan@belmonthill.org',
          grad_year: 2027,
          high_school: 'Belmont Hill School',
          height: '5-10',
          weight: 170,
          speed_40: 4.6,
          time_5_10_5: null,
          time_l_drill: null,
          bench_press: 220,
          squat: 325,
          clean: 195,
        },
      },
    ],
  },
];

export default PENDING_BATCHES_FIXTURE;
