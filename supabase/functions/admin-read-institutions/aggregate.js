// supabase/functions/admin-read-institutions/aggregate.js
// Session 001-D3 — POR Tooltip (Athletes Interested) backend aggregation
//
// Pure helper: join short_list_items to profiles and produce a map keyed by
// unitid with the athletes-interested payload the EF merges into each row.
//
// Written as .js so it can be imported by:
//   - Vitest (tests/unit/institutions-athletes-aggregate.test.js)
//   - Deno Edge Function runtime (supabase/functions/admin-read-institutions/index.ts)
//
// No schema access. Caller fetches short_list_items + profiles and passes rows.

/**
 * @typedef {Object} ShortListItemRow
 * @property {string} user_id
 * @property {number} unitid
 *
 * @typedef {Object} ProfileRow
 * @property {string} user_id
 * @property {string|null} name
 *
 * @typedef {Object} AthletesInterestedEntry
 * @property {string[]} athletesInterested
 * @property {number} athleteInterestCount
 */

/**
 * Aggregate short_list_items into a { [unitid]: { athletesInterested, athleteInterestCount } } map.
 *
 * Rules (Sprint 001 D3):
 *   - Join is soft on user_id (no FK in schema).
 *   - Missing profile row → excluded (does not crash, does not create empty unitid).
 *   - null / empty / whitespace-only name → excluded.
 *   - Names sorted alphabetically (ascending, default JS string compare).
 *   - No cap on server side; frontend handles "+ N more" display.
 *
 * @param {ShortListItemRow[]} shortListItems
 * @param {ProfileRow[]} profiles
 * @returns {Record<number, AthletesInterestedEntry>}
 */
export function aggregateAthletesByUnitid(shortListItems, profiles) {
  const result = {};

  if (!Array.isArray(shortListItems) || shortListItems.length === 0) {
    return result;
  }

  // Build user_id → display name lookup, skipping null/empty/whitespace names.
  const nameByUserId = new Map();
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      if (!p || !p.user_id) continue;
      const raw = p.name;
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      nameByUserId.set(p.user_id, trimmed);
    }
  }

  // Walk short_list_items, dropping any row whose user_id has no usable profile.
  for (const item of shortListItems) {
    if (!item || item.unitid == null || !item.user_id) continue;
    const name = nameByUserId.get(item.user_id);
    if (!name) continue;

    const entry = result[item.unitid] ?? {
      athletesInterested: [],
      athleteInterestCount: 0,
    };
    entry.athletesInterested.push(name);
    result[item.unitid] = entry;
  }

  // Sort each list alphabetically and set count.
  for (const unitid of Object.keys(result)) {
    const entry = result[unitid];
    entry.athletesInterested.sort();
    entry.athleteInterestCount = entry.athletesInterested.length;
  }

  return result;
}
