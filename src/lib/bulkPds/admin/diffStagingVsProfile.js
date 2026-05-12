/**
 * diffStagingVsProfile.js — Sprint 026 Phase 1b (Admin UI).
 *
 * Pure utility. Given a staging row and a profile row, returns a map of
 * { [fieldName]: { staging, profile, changed } } for the 8 fields the
 * Bulk PDS approval flow writes through to `public.profiles`.
 *
 * Rules:
 *   - `height` is text (e.g. "6-2"); compared as string.
 *   - All other fields are numeric; values are coerced via Number() before
 *     comparison so legacy "180" string values do not produce false
 *     diffs against numeric 180.
 *   - null ↔ value is always flagged changed.
 *   - null/undefined on both sides → unchanged.
 *   - Output always contains entries for all 8 fields even when input objects
 *     are missing them.
 *
 * Used by:
 *   AdminBulkPdsCompareRow.jsx — highlights changed cells in the side-by-side
 *   A (staging) / B (profile) layout.
 */

export const BULK_PDS_DIFF_FIELDS = [
  'height',
  'weight',
  'speed_40',
  'time_5_10_5',
  'time_l_drill',
  'bench_press',
  'squat',
  'clean',
];

const NUMERIC_FIELDS = new Set([
  'weight',
  'speed_40',
  'time_5_10_5',
  'time_l_drill',
  'bench_press',
  'squat',
  'clean',
]);

function isNullish(v) {
  return v === null || v === undefined;
}

function valuesEqual(field, a, b) {
  if (isNullish(a) && isNullish(b)) return true;
  if (isNullish(a) || isNullish(b)) return false;
  if (NUMERIC_FIELDS.has(field)) {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return String(a) === String(b);
    return na === nb;
  }
  return String(a) === String(b);
}

export function diffStagingVsProfile(staging = {}, profile = {}) {
  const out = {};
  for (const field of BULK_PDS_DIFF_FIELDS) {
    const sv = staging?.[field] ?? null;
    const pv = profile?.[field] ?? null;
    out[field] = {
      staging: sv,
      profile: pv,
      changed: !valuesEqual(field, sv, pv),
    };
  }
  return out;
}

export default diffStagingVsProfile;
