/**
 * recruits-schools.js — Sprint 011 D2/D3/D4 school config seed
 *
 * Single source of truth for which schools surface on /athletes. D3's
 * partner-schools indicator reads the active subset; D4's school toggle
 * (Phase 2) iterates the full array. Adding a new school is a one-line
 * append — no UI redesign required.
 *
 * Fields:
 *   slug         URL-safe identifier (reserved for future per-school routes)
 *   label        Display name on the toggle pill and indicator
 *   filter       Exact value of profiles.high_school for SQL filtering
 *                (null when the school is not yet onboarded — toggle disables)
 *   active       true = roster fetched; false = pill rendered disabled
 *   comingMonth  Human-readable arrival window for inactive schools
 */

export const RECRUIT_SCHOOLS = [
  {
    slug: 'bc-high',
    label: 'BC High',
    filter: 'Boston College High School',
    active: true,
  },
  {
    slug: 'belmont-hill',
    label: 'Belmont Hill',
    filter: 'Belmont Hill School',
    active: true,
  },
];
