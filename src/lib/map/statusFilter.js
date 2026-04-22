/**
 * statusFilter — Sprint 004 Wave 3b G6 — filters the map's school dataset
 * against the 6-value GRIT FIT Status multi-select.
 *
 * The Status filter replaces the legacy Conference dropdown on the My Grit
 * Fit Map filter bar. Each school is classified via computeGritFitStatuses()
 * (src/lib/gritFitStatus.js) and then tested for membership in the operator-
 * selected status set.
 *
 * Empty-label behavior (operator ruling A-2):
 *   When computeGritFitStatuses() returns an empty array (no classifications
 *   apply — e.g. a school whose scoring context is incomplete), the school
 *   PASSES the filter. Rationale: the Status multi-select is an inclusive
 *   filter (remove categories the user does not want); hiding un-classified
 *   schools would silently drop the 662-school map layer when the student's
 *   profile lacks enough signal to classify. Users who want to hide them can
 *   still combine with the Recruiting List filter. Pairs with CW-1 which
 *   removed 'not_evaluated' from the UI taxonomy.
 *
 * Status keys (from src/lib/statusLabels.js STATUS_ORDER):
 *   currently_recommended, out_of_academic_reach, out_of_athletic_reach,
 *   below_academic_fit, below_athletic_fit, outside_geographic_reach
 */

import { computeGritFitStatuses } from '../gritFitStatus.js';
import { STATUS_ORDER } from '../statusLabels.js';

/**
 * @param {Array} schools - scored-or-raw school objects passed to the map
 * @param {string[]} selectedStatuses - status keys currently toggled on
 * @param {string|null} topTier - scoring result topTier
 * @param {number|null} recruitReach - scoring result recruitReach
 * @returns {Array} filtered schools
 */
export function filterByStatus(schools, selectedStatuses, topTier, recruitReach) {
  if (!Array.isArray(schools)) return [];

  // If nothing is selected, nothing passes.
  if (!Array.isArray(selectedStatuses) || selectedStatuses.length === 0) {
    return [];
  }

  // If all 6 statuses are selected, skip the predicate entirely — every
  // school passes including the empty-label case (ruling A-2).
  if (selectedStatuses.length >= STATUS_ORDER.length) {
    const every = STATUS_ORDER.every(k => selectedStatuses.includes(k));
    if (every) return schools;
  }

  const selectedSet = new Set(selectedStatuses);

  return schools.filter(school => {
    const labels = computeGritFitStatuses(school, topTier, recruitReach);
    // Empty labels — pass by default (ruling A-2).
    if (!labels || labels.length === 0) return true;
    return labels.some(lbl => selectedSet.has(lbl));
  });
}
