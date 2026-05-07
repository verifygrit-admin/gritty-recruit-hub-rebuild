import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { RECRUIT_SCHOOLS } from '../data/recruits-schools.js';
import { getSchoolShortName } from '../lib/schoolShortName.js';

/**
 * useSchoolIdentity — Sprint 017 D5 (Phase 3a)
 *
 * Single source of truth for the signed-in user's school identity. Replaces
 * the inline resolution effect previously in Layout.jsx (lines 72-94 of the
 * pre-Sprint-017 file), which hardcoded a 'BC HIGH' fallback for coaches and
 * counselors and produced incorrect masthead/theme output for any non-BC-High
 * partner school.
 *
 * Resolution priority:
 *   (1) No session → all-null. Anon path. Body class is removed by consumer.
 *   (2) Student (default role) → profiles.high_school.
 *   (3) hs_coach → hs_coach_schools (2-step: junction → hs_programs.school_name).
 *   (4) hs_guidance_counselor → hs_counselor_schools (analogous 2-step).
 *   (5) Unresolvable (role unknown, junction empty, school not in
 *       RECRUIT_SCHOOLS) → all-null. No 'BC HIGH' fallback.
 *
 * Multi-program edge case: a coach linked to multiple hs_programs returns the
 * first row only. TODO carry-forward for any future multi-program support.
 *
 * Returns:
 *   schoolName     — short display name (e.g. 'BC HIGH'); null if unresolvable.
 *   schoolSlug     — RECRUIT_SCHOOLS slug ('bc-high' | 'belmont-hill' | ...);
 *                    null if unresolvable or school not yet onboarded.
 *   schoolFullName — raw school_name (e.g. 'Boston College High School');
 *                    null if unresolvable.
 *   loading        — true while auth or resolution query is in flight.
 */
export function useSchoolIdentity() {
  const { session, userType, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    schoolFullName: null,
    schoolSlug: null,
    schoolName: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    if (!session) {
      if (authLoading) return;
      setState({ schoolFullName: null, schoolSlug: null, schoolName: null, loading: false });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    const resolve = async () => {
      let schoolFullName = null;

      if (userType === 'hs_coach') {
        const { data: links } = await supabase
          .from('hs_coach_schools')
          .select('hs_program_id')
          .eq('coach_user_id', session.user.id)
          .limit(1);
        const programId = links?.[0]?.hs_program_id ?? null;
        if (programId) {
          const { data: program } = await supabase
            .from('hs_programs')
            .select('school_name')
            .eq('id', programId)
            .single();
          schoolFullName = program?.school_name ?? null;
        }
      } else if (userType === 'hs_guidance_counselor') {
        const { data: links } = await supabase
          .from('hs_counselor_schools')
          .select('hs_program_id')
          .eq('counselor_user_id', session.user.id)
          .limit(1);
        const programId = links?.[0]?.hs_program_id ?? null;
        if (programId) {
          const { data: program } = await supabase
            .from('hs_programs')
            .select('school_name')
            .eq('id', programId)
            .single();
          schoolFullName = program?.school_name ?? null;
        }
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('high_school')
          .eq('user_id', session.user.id)
          .single();
        schoolFullName = data?.high_school ?? null;
      }

      if (cancelled) return;

      const match = schoolFullName
        ? RECRUIT_SCHOOLS.find(s => s.filter === schoolFullName)
        : null;
      setState({
        schoolFullName,
        schoolSlug: match?.slug ?? null,
        schoolName: schoolFullName ? getSchoolShortName(schoolFullName) : null,
        loading: false,
      });
    };

    resolve();
    return () => { cancelled = true; };
  }, [session?.user?.id, userType, authLoading]);

  return state;
}
