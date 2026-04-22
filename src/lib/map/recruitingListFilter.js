/**
 * recruitingListFilter — Sprint 003 D3 — filters the 662-school dataset
 * against the "Recruiting List" dropdown on the My Grit Fit Map.
 *
 * Options:
 *   'all'       → returns all schools unchanged
 *   'gritfit'   → returns only schools whose unitid is in the Grit Fit set
 *   'shortlist' → returns only schools whose unitid is on the shortlist
 */

export const RECRUITING_LIST_OPTIONS = [
  { value: 'all', label: 'All Schools' },
  { value: 'gritfit', label: 'My Grit Fit (Recommended)' },
  { value: 'shortlist', label: 'My Short List' },
];

export const RECRUITING_LIST_DEFAULT = 'all';

export function applyRecruitingListFilter(schools, option, gritFitUnitIds, shortlistUnitIds) {
  if (!Array.isArray(schools)) return [];
  if (option === 'gritfit') {
    if (!gritFitUnitIds) return [];
    return schools.filter(s => gritFitUnitIds.has(s.unitid));
  }
  if (option === 'shortlist') {
    if (!shortlistUnitIds) return [];
    return schools.filter(s => shortlistUnitIds.has(s.unitid));
  }
  return schools;
}
