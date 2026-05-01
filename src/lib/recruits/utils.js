/**
 * src/lib/recruits/utils.js — Sprint 011 Phase 2 pure utilities.
 *
 * Two functions consumed by the data hook (useRecruitsRoster) and the
 * RecruitCard component:
 *
 *   normalizeTwitter(raw)
 *     Free-text profiles.twitter is shipped as-is from Sprint 003+. May be
 *     a bare handle, an @-prefixed handle, or any of several URL forms.
 *     Returns the bare handle, or null when the input has no signal.
 *
 *   computeRecruitingProgress(rows)
 *     Aggregates a student's shortlist into the card-level summary
 *     "X schools · Recruiting Progress Y%" using the Phase 0 SQL formula.
 *     Returns { schoolsShortlisted, recruitingProgressPct }; the latter is
 *     null when the student has zero shortlist activity (zero-state trigger
 *     for the "Not yet active" placeholder per locked decision 8).
 */

// ── normalizeTwitter ────────────────────────────────────────────────────

export function normalizeTwitter(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  s = s.replace(/^@+/, '');
  s = s.replace(/^https?:\/\//i, '');
  s = s.replace(/^www\./i, '');
  s = s.replace(/^(x\.com|twitter\.com)\//i, '');
  s = s.split('?')[0];
  s = s.replace(/\/+$/, '');

  return s || null;
}

// ── computeRecruitingProgress ────────────────────────────────────────────

export function computeRecruitingProgress(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { schoolsShortlisted: 0, recruitingProgressPct: null };
  }

  let completed = 0;
  let total = 0;

  for (const row of rows) {
    const steps = row && row.recruiting_journey_steps;
    if (!Array.isArray(steps)) continue;
    total += steps.length;
    for (const step of steps) {
      if (step && step.completed === true) completed += 1;
    }
  }

  const recruitingProgressPct =
    total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  return { schoolsShortlisted: rows.length, recruitingProgressPct };
}
