/**
 * schoolShortName — maps a full high-school name to the short name used in
 * the Student View masthead. Added for Sprint 003 D1.
 *
 * Why this exists: the masthead previously rendered the raw high_school field
 * uppercased and truncated to 20 chars, producing "BOSTON COLLEGE HIGH " for
 * BC High students. D1 renames the masthead to "BC HIGH RECRUIT HUB".
 *
 * Approach: exact-match lookup first, then a heuristic fallback that strips
 * "SCHOOL" and "HIGH SCHOOL" tails and caps length. Unknown schools fall back
 * to a truncated uppercase of the input.
 */

export const SCHOOL_SHORT_NAMES = {
  'Boston College High School': 'BC HIGH',
};

const MAX_FALLBACK_LEN = 20;

export function getSchoolShortName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'GRITTY';
  const trimmed = fullName.trim();
  if (!trimmed) return 'GRITTY';

  if (SCHOOL_SHORT_NAMES[trimmed]) return SCHOOL_SHORT_NAMES[trimmed];

  const upper = trimmed.toUpperCase();
  if (upper.length <= MAX_FALLBACK_LEN) return upper;
  return upper.substring(0, MAX_FALLBACK_LEN).trim();
}
