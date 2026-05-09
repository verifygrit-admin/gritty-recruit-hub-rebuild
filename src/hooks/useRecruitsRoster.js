/**
 * useRecruitsRoster — Sprint 011 Phase 2 data layer
 *
 * Loads the BC High roster (or whichever active partner school the caller
 * passes) and shapes it into the ProfileWithAggregate[] consumed by
 * RecruitCard. Two parallel Supabase reads, then a client-side join +
 * aggregation. No server-side RPC, no service role.
 *
 * Column boundary: PROFILES_WHITELIST_SELECT names exactly the 17 fields
 * the hook is allowed to read (16 user-facing whitelist + user_id). The
 * row-level public-recruits RLS policy (migration 0038) gates the rows;
 * this constant is what gates the columns. A regression that pulls SELECT *
 * or names an excluded column will fail the unit test before merge — see
 * tests/unit/use-recruits-roster.test.js.
 *
 * Hook contract:
 *   useRecruitsRoster({ filter }) → {
 *     profiles: ProfileWithAggregate[],
 *     loading: boolean,
 *     error: Error | null,
 *     retry: () => void,
 *   }
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { computeRecruitingProgress } from '../lib/recruits/utils.js';

// Defense-in-depth column boundary. Each entry is a whitelist column.
// Verified by tests/unit/use-recruits-roster.test.js — adding or removing
// a column requires updating that test.
export const PROFILES_WHITELIST_SELECT = [
  'user_id',
  'name',
  'high_school',
  'grad_year',
  'state',
  'position',
  'height',
  'weight',
  'speed_40',
  'gpa',
  'twitter',
  'hudl_url',
  'avatar_storage_path',
  'expected_starter',
  'captain',
  'all_conference',
  'all_state',
].join(', ');

// Pure: merge a profile row + its shortlist rows + resolved avatar URL into
// the ProfileWithAggregate shape RecruitCard consumes. Drops avatar_storage_path
// (replaced by resolved avatarUrl) and rejects any non-whitelist field on the
// input profile.
const KEEP_FIELDS = [
  'user_id',
  'name',
  'high_school',
  'grad_year',
  'state',
  'position',
  'height',
  'weight',
  'speed_40',
  'gpa',
  'twitter',
  'hudl_url',
  'expected_starter',
  'captain',
  'all_conference',
  'all_state',
];

export function composeProfileWithAggregate(profile, shortlistRows, avatarUrl) {
  const out = {};
  for (const k of KEEP_FIELDS) {
    out[k] = profile != null ? profile[k] : undefined;
  }
  out.avatarUrl = avatarUrl != null ? avatarUrl : null;
  const { schoolsShortlisted, recruitingProgressPct } =
    computeRecruitingProgress(shortlistRows);
  out.schoolsShortlisted = schoolsShortlisted;
  out.recruitingProgressPct = recruitingProgressPct;
  return out;
}

function resolveAvatarUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
  return (data && data.publicUrl) || null;
}

export default function useRecruitsRoster({ filter }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!filter) {
      setProfiles([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // grad_year >= 2026: active recruiting class cutoff. Mirrors the
        // RLS predicate in 0045 — the policy is the security boundary, this
        // is the payload-shape optimization. Both must move together when
        // the class advances. See migration 0045 header for the annual-bump
        // note and dynamic-predicate follow-up candidate.
        const { data: profileRows, error: profileErr } = await supabase
          .from('profiles')
          .select(PROFILES_WHITELIST_SELECT)
          .eq('high_school', filter)
          .gte('grad_year', 2026);

        if (profileErr) throw profileErr;
        const rows = profileRows || [];

        let shortlistRows = [];
        if (rows.length > 0) {
          const userIds = rows.map((r) => r.user_id);
          const { data: slRows, error: slErr } = await supabase
            .from('short_list_items')
            .select('user_id, recruiting_journey_steps')
            .in('user_id', userIds);
          if (slErr) throw slErr;
          shortlistRows = slRows || [];
        }

        const byUser = new Map();
        for (const r of shortlistRows) {
          if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
          byUser.get(r.user_id).push(r);
        }

        const merged = rows.map((p) =>
          composeProfileWithAggregate(
            p,
            byUser.get(p.user_id) || [],
            resolveAvatarUrl(p.avatar_storage_path)
          )
        );

        if (!cancelled) {
          setProfiles(merged);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, tick]);

  return { profiles, loading, error, retry };
}
