import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';

/**
 * useCoachLinkedStudents — Sprint 026 Phase 1a (Coach UI).
 *
 * Returns the students linked to the currently signed-in coach via
 * `public.hs_coach_students`. Two-step query (mirrors useSchoolIdentity
 * pattern):
 *   (1) SELECT student_user_id FROM hs_coach_students WHERE coach_user_id = auth.uid()
 *   (2) SELECT id, user_id, name, email, grad_year, high_school, avatar_storage_path
 *       FROM profiles WHERE user_id IN (...)
 *
 * Returns:
 *   students — array of { id, user_id, name, email, grad_year, high_school,
 *                         avatar_storage_path }. Empty array when not loaded yet
 *                         or when no links exist.
 *   loading  — true while either query is in flight.
 *   error    — Supabase error from either query, or null.
 */
export function useCoachLinkedStudents() {
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState({ students: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!session) {
      setState({ students: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const load = async () => {
      const { data: links, error: linksError } = await supabase
        .from('hs_coach_students')
        .select('student_user_id')
        .eq('coach_user_id', session.user.id);

      if (cancelled) return;
      if (linksError) {
        setState({ students: [], loading: false, error: linksError });
        return;
      }

      const ids = (links || []).map(l => l.student_user_id).filter(Boolean);
      if (ids.length === 0) {
        setState({ students: [], loading: false, error: null });
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, grad_year, high_school, avatar_storage_path')
        .in('user_id', ids);

      if (cancelled) return;
      if (profilesError) {
        setState({ students: [], loading: false, error: profilesError });
        return;
      }

      setState({ students: profiles || [], loading: false, error: null });
    };

    load();
    return () => { cancelled = true; };
  }, [session?.user?.id, authLoading]);

  return state;
}
