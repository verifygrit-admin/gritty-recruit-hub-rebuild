/**
 * Pure status label computation for GRIT FIT multi-label badges.
 * Takes a scored school object (augmented with schoolRigor + athleteAcad)
 * and profile-level scoring context. Returns string[].
 */
import { TIER_ORDER } from './constants.js';

const BELOW_ACAD_THRESHOLD = 0.20;

const LABEL_PRIORITY = [
  'currently_recommended',
  'out_of_academic_reach',
  'out_of_athletic_reach',
  'below_academic_fit',
  'below_athletic_fit',
  'outside_geographic_reach',
];

/**
 * Compute all applicable GRIT FIT status labels for a single scored school.
 * @param {Object} scoredSchool - from runGritFitScoring().scored[], with schoolRigor + athleteAcad
 * @param {string|null} topTier - from runGritFitScoring()
 * @param {number} recruitReach - from runGritFitScoring()
 * @returns {string[]} Ordered array of status keys. May be empty (Sprint 004 CW-1) — caller renders no pill.
 */
export function computeGritFitStatuses(scoredSchool, topTier, recruitReach) {
  const labels = [];

  const {
    eligible,
    matchRank,
    dist,
    schoolRigor,
    athleteAcad,
    type: schoolTier,
  } = scoredSchool;

  // Currently Recommended
  if (eligible && matchRank != null && matchRank <= 50) {
    labels.push('currently_recommended');
  }

  // Out of Academic Reach — school too demanding
  if (schoolRigor > 0 && athleteAcad > 0 && athleteAcad < schoolRigor) {
    labels.push('out_of_academic_reach');
  }

  // Below Academic Fit — student overqualified
  if (
    schoolRigor > 0 &&
    athleteAcad > 0 &&
    (athleteAcad - schoolRigor) > BELOW_ACAD_THRESHOLD
  ) {
    labels.push('below_academic_fit');
  }

  // Out of Athletic Reach — school tier more elite than student
  if (topTier === null) {
    labels.push('out_of_athletic_reach');
  } else {
    const schoolIdx = TIER_ORDER.indexOf(schoolTier);
    const topIdx = TIER_ORDER.indexOf(topTier);
    if (schoolIdx !== -1 && topIdx !== -1 && schoolIdx < topIdx) {
      labels.push('out_of_athletic_reach');
    }
  }

  // Below Athletic Fit — school tier below student
  if (topTier !== null) {
    const schoolIdx = TIER_ORDER.indexOf(schoolTier);
    const topIdx = TIER_ORDER.indexOf(topTier);
    if (schoolIdx !== -1 && topIdx !== -1 && schoolIdx > topIdx) {
      labels.push('below_athletic_fit');
    }
  }

  // Outside Geographic Reach
  if (dist != null && recruitReach != null && dist > recruitReach) {
    labels.push('outside_geographic_reach');
  }

  // Sprint 004 CW-1: 'not_evaluated' removed from UI taxonomy (DEC accepted-inert-artifact).
  // When no label applies, return empty array (no pill rendered). Diagnostic debug only —
  // DevTools default-hides debug; toggle Verbose to inspect.
  if (labels.length === 0) {
    // eslint-disable-next-line no-console
    console.debug('[computeGritFitStatuses] No applicable GRIT FIT labels for scoredSchool', {
      unitid: scoredSchool?.unitid,
      schoolTier,
      eligible,
      matchRank,
      dist,
      schoolRigor,
      athleteAcad,
      topTier,
      recruitReach,
    });
  }

  // Sort by priority order
  labels.sort((a, b) => LABEL_PRIORITY.indexOf(a) - LABEL_PRIORITY.indexOf(b));

  return labels;
}
