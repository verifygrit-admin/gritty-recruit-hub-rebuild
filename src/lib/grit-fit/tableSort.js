/**
 * tableSort.js — Sprint 004 G7a
 *
 * Pure sort helpers for the mobile-only sort controls on GRIT FIT Table View.
 * Desktop keeps its existing click-a-header sort; mobile users instead pick
 * from a fixed set of keys via a segmented control. This module owns the
 * mapping from a mobile-sort-key string to a comparator + direction over the
 * scored-school shape.
 *
 * Scored-school fields read here (populated by runGritFitScoring):
 *   matchRank (number, ascending = best first)
 *   dist      (number, miles, ascending = closest first)
 *   adltv     (number, dollars, descending = highest value first)
 *   netCost   (number, dollars, ascending = lowest cost first)
 *
 * null / undefined values always go last regardless of direction, per spec.
 */

export const MOBILE_SORT_KEYS = ['rank', 'distance', 'adltv', 'annualCost'];

// Map a mobile-sort key to (field on school, direction).
// direction: 'asc' = ascending (smaller first), 'desc' = descending (larger first).
const SORT_CONFIG = {
  rank:       { field: 'matchRank', direction: 'asc'  },
  distance:   { field: 'dist',      direction: 'asc'  },
  adltv:      { field: 'adltv',     direction: 'desc' },
  annualCost: { field: 'netCost',   direction: 'asc'  },
};

/**
 * Sort a list of scored schools by a mobile-sort key.
 *
 * Contract:
 *   - Returns a new array (input is never mutated).
 *   - null / undefined values on the sort field go last in both directions.
 *   - Unknown sort keys fall back to 'rank'.
 *
 * @param {Array<object>} schools  scored school records
 * @param {string}        key      one of MOBILE_SORT_KEYS
 * @returns {Array<object>}        new sorted array
 */
export function sortSchoolsByMobileKey(schools, key) {
  if (!Array.isArray(schools)) return [];
  const cfg = SORT_CONFIG[key] || SORT_CONFIG.rank;
  const { field, direction } = cfg;

  const copy = [...schools];
  copy.sort((a, b) => {
    const aRaw = a?.[field];
    const bRaw = b?.[field];
    const aNil = aRaw == null;
    const bNil = bRaw == null;

    // Nulls always last, regardless of direction.
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;

    const aNum = +aRaw;
    const bNum = +bRaw;
    if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
    if (Number.isNaN(aNum)) return 1;
    if (Number.isNaN(bNum)) return -1;

    return direction === 'asc' ? aNum - bNum : bNum - aNum;
  });
  return copy;
}
