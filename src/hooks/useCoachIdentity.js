import { useAuth } from './useAuth.jsx';
import { useSchoolIdentity } from './useSchoolIdentity.js';
import { findStaffByUserId } from '../data/school-staff.js';

/**
 * useCoachIdentity — Sprint 026 Phase 1a (Coach UI).
 *
 * Returns the read-only identity panel for the coach: name, email, school
 * (display name). Composes `useSchoolIdentity()` (for the school display
 * name) and `findStaffByUserId(session.user.id)` (for the head-coach or
 * counselor record from `school-staff.js`). Per the Sprint 023 pattern,
 * coaches/counselors do NOT have a `public.profiles` row — name lookup
 * goes through SCHOOL_STAFF, not `profiles`.
 *
 * Returns:
 *   name    — display name from SCHOOL_STAFF; null if unresolved.
 *   email   — email from SCHOOL_STAFF (falls back to session.user.email).
 *   school  — short school display name from useSchoolIdentity (e.g. "BC HIGH");
 *             null if unresolved.
 *   loading — true while either upstream hook is still loading.
 */
export function useCoachIdentity() {
  const { session, loading: authLoading } = useAuth();
  const { schoolName, loading: schoolLoading } = useSchoolIdentity();

  const userId = session?.user?.id || null;
  const staff = userId ? findStaffByUserId(userId) : null;

  return {
    name: staff?.name || null,
    email: staff?.email || session?.user?.email || null,
    school: schoolName || null,
    loading: authLoading || schoolLoading,
  };
}
