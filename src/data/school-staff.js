/**
 * school-staff.js — Sprint 017 D5 (Phase 3d)
 *
 * Single source of truth for partner-school staff (head coach + counselors)
 * displayed in the student profile-confirmation flow. Keyed by the same slug
 * convention used in `recruits-schools.js` and returned by `useSchoolIdentity`.
 *
 * Why this file exists:
 *   Sprint 011's c9960d1 commit ripped out a dynamic-fetch pattern that JOINed
 *   `profiles` to resolve coach/counselor names. The dynamic shape was
 *   structurally broken: coaches and counselors do NOT have `public.profiles`
 *   rows (the seed scripts populate `auth.users` + `public.users` only),
 *   `public.users` carries no name columns, and student RLS on `profiles`
 *   does not grant SELECT access to staff rows. The c9960d1 commit replaced
 *   the broken dynamic fetch with a hardcoded BC_HIGH_COACH literal — which
 *   blocked Belmont Hill (and any future partner school) from displaying
 *   correct staff data.
 *
 *   This config restores correctness for Belmont Hill while staying in
 *   Sprint 017 scope (no migration, no RLS change, no SECURITY DEFINER).
 *   Sprint 018 carry-forward C-9 covers the proper structural fix:
 *   coach/counselor identity rows + student→staff name lookup RLS.
 *
 * Adding a new partner school:
 *   Add one entry to SCHOOL_STAFF keyed by the school's slug (must match
 *   `RECRUIT_SCHOOLS[].slug` in recruits-schools.js). Provide head_coach
 *   (singular) and counselors (array). user_id values must match the
 *   `auth.users.id` for those staff accounts.
 */

export const SCHOOL_STAFF = {
  'bc-high': {
    head_coach: {
      user_id: '9177ba55-eb83-4bce-b4cd-01ce3078d4a3',
      name: 'Paul Zukauskas',
      title: 'Head Coach, Boston College High School',
      email: 'pzukauskas@bchigh.edu',
    },
    counselors: [
      { user_id: '92dbdc93-18b6-4361-8925-2d0e1fbd68ad', name: 'Devon Balfour',     email: 'dbalfour@bchigh.edu' },
      { user_id: 'b80f1b4c-c5c3-4285-a88a-0cc39e650e02', name: "Caitlin O'Connell", email: 'coconnell@bchigh.edu' },
      { user_id: 'e0c99343-e525-411a-b6a8-8691bdc31da7', name: 'Kyle Swords',       email: 'kswords@bchigh.edu' },
    ],
  },
  'belmont-hill': {
    head_coach: {
      user_id: '4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb',
      name: 'Frank Roche',
      title: 'Head Coach, Belmont Hill School',
      email: 'roche@belmonthill.org',
    },
    counselors: [
      { user_id: '4a48c09f-5f5c-411b-9d00-8aa7213e4eef', name: 'June Schmunk', email: 'schmunk@belmonthill.org' },
    ],
  },
};

/**
 * findStaffByUserId — reverse lookup for the existing-link branch.
 *
 * When a student already has an hs_coach_students or hs_counselor_students
 * row, the row contains only the linked staff user_id. The component needs
 * to display the staff name, but at that point in the load sequence the
 * student's schoolSlug may not yet have resolved (timing dependent on
 * useSchoolIdentity's async query). This helper resolves the staff record
 * directly from the user_id by scanning SCHOOL_STAFF. O(N schools); trivial.
 */
export function findStaffByUserId(userId) {
  if (!userId) return null;
  for (const staff of Object.values(SCHOOL_STAFF)) {
    if (staff.head_coach?.user_id === userId) return staff.head_coach;
    const counselor = staff.counselors?.find(c => c.user_id === userId);
    if (counselor) return counselor;
  }
  return null;
}
