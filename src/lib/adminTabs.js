// Sprint 001 Deliverable 1 — Tab Remediation.
// Schools tab removed. Final order: Users, Institutions, Recruiting Events, Audit Log.
// Extracted from AdminPage.jsx so AdminPage, route guards, and tests share one source.
//
// Sprint 026 Phase 1b — Bulk PDS Approval tab inserted BEFORE the audit entry
// (per SPRINT_026_PLAN §3). Tab count goes from 4 to 5.

export const ADMIN_TABS = [
  { key: 'users',             label: 'Users',               path: '/admin/users' },
  { key: 'institutions',      label: 'Institutions',        path: '/admin/institutions' },
  { key: 'recruiting-events', label: 'Recruiting Events',   path: '/admin/recruiting-events' },
  { key: 'bulk-pds',          label: 'Bulk PDS Approval',   path: '/admin/bulk-pds' },
  { key: 'audit',             label: 'Audit Log',           path: '/admin/audit' },
];

export const DEFAULT_ADMIN_TAB = ADMIN_TABS[0].key;

export function deriveActiveTab(pathname) {
  if (typeof pathname !== 'string') return DEFAULT_ADMIN_TAB;
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const match = ADMIN_TABS.find((t) => t.key === segment);
  return match ? match.key : DEFAULT_ADMIN_TAB;
}
