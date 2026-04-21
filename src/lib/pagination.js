// Sprint 001 Deliverable 4 — Global Admin pagination helpers.
// Pure, no React, no Supabase. Consumed by AdminTableEditor + its tests.

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function getTotalPages(rowCount, pageSize) {
  if (!rowCount || rowCount <= 0) return 1;
  return Math.ceil(rowCount / pageSize);
}

export function paginateRows(rows, pageSize, currentPage) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const totalPages = getTotalPages(rows.length, pageSize);
  let page = Number.isFinite(currentPage) ? Math.floor(currentPage) : 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
