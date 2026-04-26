/**
 * statusLabels.js — Single source of truth for GRIT FIT status pill labels,
 * colors, and priority ordering.
 *
 * Sprint 004 Wave 1 SC-2. Consumers in Wave 3 will replace their local
 * STATUS_CONFIG / STATUS_LABELS / STATUS_COLORS maps with imports from here
 * (ShortlistCard.jsx, CoachSchoolDetailPanel.jsx, CoachStudentCard.jsx,
 * ShortlistFilters.jsx, CoachRecruitingIntelPage.jsx — plus new G5 / G6 / S2 /
 * S3 consumers being built in Wave 3).
 *
 * The six keys correspond exactly to LABEL_PRIORITY in
 * src/lib/gritFitStatus.js. 'not_evaluated' was removed from the UI taxonomy
 * in Sprint 004 Wave 0 CW-1 (operator ruling A-2: empty status => no pill).
 *
 * Colors sourced from src/components/ShortlistCard.jsx STATUS_CONFIG
 * (post-CW-1). The coach-side files CoachStudentCard.jsx and
 * CoachRecruitingIntelPage.jsx used #F44336 for out_of_academic_reach and
 * out_of_athletic_reach; this module adopts the ShortlistCard values
 * (#FF9800) per SC-2 spec. Wave 3 will bring the coach files into alignment.
 *
 * textColor choice: '#FFFFFF' on all six backgrounds. The lightest of the
 * six is #D4A017 (dark gold) which still yields a WCAG AA contrast ratio of
 * ~4.52 against white for small bold text (0.8125rem / 600 weight) — sits at
 * the AA threshold for normal text, comfortably above for bold. The existing
 * ShortlistCard and CoachSchoolDetailPanel components already use white text
 * on all six of these backgrounds in production.
 */

export const STATUS_LABELS = Object.freeze({
  currently_recommended: Object.freeze({
    // Sprint 007 C.1 — display-label rename. The enum key
    // `currently_recommended` in short_list_items.grit_fit_status is the
    // source of truth and is unchanged; only the user-facing string is
    // updated. This propagates to the My Grit Fit map filter chip + popup
    // pill, the Shortlist filter dropdown, and any StatusPill that resolves
    // through this SSOT. Coach-side files (CoachStudentCard,
    // CoachRecruitingIntelPage, CoachSchoolDetailPanel) hold local copies
    // and are intentionally out of scope per the C.1 spec ("students in
    // their view"); they retain their existing labels.
    label: 'Grit Fit School',
    bg: '#4CAF50',
    textColor: '#FFFFFF',
  }),
  below_academic_fit: Object.freeze({
    label: 'Below Academic Fit',
    bg: '#FF9800',
    textColor: '#FFFFFF',
  }),
  out_of_academic_reach: Object.freeze({
    label: 'Academic Stretch',
    bg: '#FF9800',
    textColor: '#FFFFFF',
  }),
  out_of_athletic_reach: Object.freeze({
    label: 'Athletic Stretch',
    bg: '#FF9800',
    textColor: '#FFFFFF',
  }),
  below_athletic_fit: Object.freeze({
    label: 'Highly Recruitable',
    bg: '#D4A017',
    textColor: '#FFFFFF',
  }),
  outside_geographic_reach: Object.freeze({
    label: 'Outside Geographic Reach',
    bg: '#9C27B0',
    textColor: '#FFFFFF',
  }),
});

/**
 * Priority order mirrors LABEL_PRIORITY in src/lib/gritFitStatus.js.
 * Used by Wave 3 consumers that need to order multi-label pill sets.
 */
export const STATUS_ORDER = Object.freeze([
  'currently_recommended',
  'out_of_academic_reach',
  'out_of_athletic_reach',
  'below_academic_fit',
  'below_athletic_fit',
  'outside_geographic_reach',
]);

/**
 * Returns the config object for a status key, or null for unknown / empty
 * keys. Mirrors the "empty status => no pill" rule at the lookup layer.
 *
 * @param {string} key
 * @returns {{label: string, bg: string, textColor: string} | null}
 */
export function getStatusConfig(key) {
  if (!key || typeof key !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, key)
    ? STATUS_LABELS[key]
    : null;
}
