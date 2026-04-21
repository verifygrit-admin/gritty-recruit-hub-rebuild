// Sprint 001 D2 — HS Coach / Counselor school association aggregation.
// Pure: no Supabase client, no network. Called by admin-read-users EF.

function buildProgramLookup(programs) {
  const map = new Map();
  for (const p of programs || []) {
    if (p && typeof p.id !== 'undefined') map.set(p.id, p.school_name ?? null);
  }
  return map;
}

function pickCoachRow(rows) {
  // Prefer is_head_coach=true; else earliest linked_at.
  const head = rows.find((r) => r.is_head_coach === true);
  if (head) return head;
  return [...rows].sort((a, b) => {
    const ta = new Date(a.linked_at ?? 0).getTime();
    const tb = new Date(b.linked_at ?? 0).getTime();
    return ta - tb;
  })[0];
}

function pickCounselorRow(rows) {
  // No is_head_coach concept — earliest linked_at wins.
  return [...rows].sort((a, b) => {
    const ta = new Date(a.linked_at ?? 0).getTime();
    const tb = new Date(b.linked_at ?? 0).getTime();
    return ta - tb;
  })[0];
}

export function aggregateHsCoachAssociations(coachRows, programs) {
  const lookup = buildProgramLookup(programs);
  const byUser = new Map();
  for (const r of coachRows || []) {
    if (!r || !r.coach_user_id) continue;
    const list = byUser.get(r.coach_user_id) || [];
    list.push(r);
    byUser.set(r.coach_user_id, list);
  }
  const result = {};
  for (const [userId, list] of byUser) {
    const pick = pickCoachRow(list);
    result[userId] = {
      schoolName: lookup.has(pick.hs_program_id) ? lookup.get(pick.hs_program_id) : null,
      isHeadCoach: pick.is_head_coach === true,
    };
  }
  return result;
}

export function aggregateHsCounselorAssociations(counselorRows, programs) {
  const lookup = buildProgramLookup(programs);
  const byUser = new Map();
  for (const r of counselorRows || []) {
    if (!r || !r.counselor_user_id) continue;
    const list = byUser.get(r.counselor_user_id) || [];
    list.push(r);
    byUser.set(r.counselor_user_id, list);
  }
  const result = {};
  for (const [userId, list] of byUser) {
    const pick = pickCounselorRow(list);
    result[userId] = {
      schoolName: lookup.has(pick.hs_program_id) ? lookup.get(pick.hs_program_id) : null,
      isHeadCoach: null,
    };
  }
  return result;
}
