/**
 * overlayLogic — resolves the overlay state for a school pin on the merged
 * My Grit Fit Map. Sprint 003 D3.
 *
 * Inputs:
 *   - school: { unitid, ... }
 *   - gritFitUnitIds: Set<number> — unitids from the user's top30 Grit Fit matches
 *   - shortlistUnitIds: Set<number> — unitids on the user's shortlist
 *
 * Returns one of: 'none' | 'star' | 'check' | 'both'
 *   - 'star'  → school is a Grit Fit recommendation
 *   - 'check' → school is on the user's shortlist
 *   - 'both'  → school is both recommended and shortlisted
 *   - 'none'  → neither
 */

export function getOverlayState(school, gritFitUnitIds, shortlistUnitIds) {
  if (!school || school.unitid == null) return 'none';
  const gf = gritFitUnitIds && gritFitUnitIds.has(school.unitid);
  const sl = shortlistUnitIds && shortlistUnitIds.has(school.unitid);
  if (gf && sl) return 'both';
  if (gf) return 'star';
  if (sl) return 'check';
  return 'none';
}
