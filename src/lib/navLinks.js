/**
 * navLinks — top-nav link arrays by user type.
 *
 * Sprint 003 D2b: Student View nav reordered to follow the user journey:
 *   HOME → MY PROFILE → MY GRIT FIT → MY SHORTLIST
 *
 * Extracted from Layout.jsx so the ordering and labels can be tested as
 * pure data. Consumers import STUDENT_NAV_LINKS / COACH_NAV_LINKS.
 */

export const STUDENT_NAV_LINKS = [
  { to: '/', label: 'HOME' },
  { to: '/profile', label: 'MY PROFILE' },
  { to: '/gritfit', label: 'MY GRIT FIT' },
  { to: '/shortlist', label: 'MY SHORTLIST' },
  { to: '/grit-guides', label: 'MY GRIT GUIDES' },
];

export const COACH_NAV_LINKS = [
  { to: '/', label: 'HOME' },
  { to: '/coach', label: 'DASHBOARD' },
  { to: '/coach/profile', label: 'MY PROFILE' },
  { to: '/grit-guides', label: 'GRIT GUIDES' },
];
