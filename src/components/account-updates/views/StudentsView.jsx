// StudentsView — Sprint 027 stub.
// Thin view: exports column config + entity key. NO data fetching, NO state.
// AccountUpdatesShell consumes the export. Does NOT import CreateRowModal /
// DeleteConfirmModal (auth-linked entity, Q5 compile-time gate).
//
// PHASE 1 STUB — Phase 2 task 2.B1 fills the column config.

export const ENTITY_KEY = 'students';

export const columnConfig = null; // Phase 2 populates from COLUMN_WHITELISTS.md § 1

export default function StudentsView() {
  throw new Error('StudentsView: Phase 1 stub. Implement in Phase 2 task 2.B1.');
}
