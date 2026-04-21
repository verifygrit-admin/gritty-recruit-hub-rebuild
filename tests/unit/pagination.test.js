/**
 * pagination.test.js — Sprint 001 D4 (Global Admin Pagination) — RED phase
 *
 * Owner: Sprint 001
 * Suite: TC-S001-D4-001 through TC-S001-D4-010
 *
 * Covers the pure-logic helpers backing the row limiter + pagination controls
 * the admin table editor will render on every tab.
 *
 *   TC-S001-D4-001: DEFAULT_PAGE_SIZE is 25
 *   TC-S001-D4-002: PAGE_SIZE_OPTIONS exports [25, 50, 100]
 *   TC-S001-D4-003: paginateRows returns the correct slice for page 1
 *   TC-S001-D4-004: paginateRows returns the correct slice for an interior page
 *   TC-S001-D4-005: paginateRows returns the correct (partial) final page
 *   TC-S001-D4-006: paginateRows returns empty array when rows is empty
 *   TC-S001-D4-007: paginateRows clamps currentPage to the last available page
 *   TC-S001-D4-008: paginateRows treats currentPage < 1 as page 1
 *   TC-S001-D4-009: getTotalPages returns 1 for empty row sets
 *   TC-S001-D4-010: getTotalPages returns ceil(rowCount / pageSize) for non-empty sets
 *
 * Implementation deferred: src/lib/pagination.js does not exist yet. These tests
 * fail on import until that module is authored.
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  paginateRows,
  getTotalPages,
} from '../../src/lib/pagination.js';

// ── Fixture helper ────────────────────────────────────────────────────────────

function makeRows(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

// ── TC-S001-D4-001 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-001: DEFAULT_PAGE_SIZE is 25', () => {
  it('exports 25 as the default page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });
});

// ── TC-S001-D4-002 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-002: PAGE_SIZE_OPTIONS exports [25, 50, 100]', () => {
  it('exports the three spec-required page sizes in ascending order', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100]);
  });
});

// ── TC-S001-D4-003 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-003: paginateRows returns the first page slice', () => {
  it('returns rows 1-25 for page 1 with page size 25', () => {
    const rows = makeRows(100);
    const slice = paginateRows(rows, 25, 1);
    expect(slice).toHaveLength(25);
    expect(slice[0].id).toBe(1);
    expect(slice[24].id).toBe(25);
  });
});

// ── TC-S001-D4-004 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-004: paginateRows returns an interior page slice', () => {
  it('returns rows 26-50 for page 2 with page size 25', () => {
    const rows = makeRows(100);
    const slice = paginateRows(rows, 25, 2);
    expect(slice).toHaveLength(25);
    expect(slice[0].id).toBe(26);
    expect(slice[24].id).toBe(50);
  });
});

// ── TC-S001-D4-005 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-005: paginateRows returns partial final page', () => {
  it('returns remaining 10 rows for page 4 when total is 85 with page size 25', () => {
    const rows = makeRows(85);
    const slice = paginateRows(rows, 25, 4);
    expect(slice).toHaveLength(10);
    expect(slice[0].id).toBe(76);
    expect(slice[9].id).toBe(85);
  });
});

// ── TC-S001-D4-006 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-006: paginateRows returns empty array for empty rows', () => {
  it('returns [] when rows is empty', () => {
    expect(paginateRows([], 25, 1)).toEqual([]);
  });
});

// ── TC-S001-D4-007 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-007: paginateRows clamps currentPage past the last page', () => {
  it('returns the last available page when currentPage exceeds total pages', () => {
    const rows = makeRows(30);
    const slice = paginateRows(rows, 25, 99);
    expect(slice).toHaveLength(5);
    expect(slice[0].id).toBe(26);
    expect(slice[4].id).toBe(30);
  });
});

// ── TC-S001-D4-008 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-008: paginateRows treats currentPage < 1 as page 1', () => {
  it('returns page 1 when currentPage is 0', () => {
    const rows = makeRows(30);
    const slice = paginateRows(rows, 25, 0);
    expect(slice[0].id).toBe(1);
  });

  it('returns page 1 when currentPage is negative', () => {
    const rows = makeRows(30);
    const slice = paginateRows(rows, 25, -5);
    expect(slice[0].id).toBe(1);
  });
});

// ── TC-S001-D4-009 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-009: getTotalPages returns 1 for empty row sets', () => {
  it('returns 1 for rowCount 0 at page size 25 (always show one page in the indicator)', () => {
    expect(getTotalPages(0, 25)).toBe(1);
  });
});

// ── TC-S001-D4-010 ────────────────────────────────────────────────────────────

describe('TC-S001-D4-010: getTotalPages returns ceil(rowCount / pageSize)', () => {
  it('returns 1 when rowCount fits in one page exactly', () => {
    expect(getTotalPages(25, 25)).toBe(1);
  });

  it('returns 2 when rowCount overflows one page by a single row', () => {
    expect(getTotalPages(26, 25)).toBe(2);
  });

  it('returns 4 for 100 rows at page size 25', () => {
    expect(getTotalPages(100, 25)).toBe(4);
  });

  it('returns 2 for 100 rows at page size 50', () => {
    expect(getTotalPages(100, 50)).toBe(2);
  });

  it('returns 1 for 100 rows at page size 100', () => {
    expect(getTotalPages(100, 100)).toBe(1);
  });
});
