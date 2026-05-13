// diffPayload — Sprint 027.
// Pure function. Given an original row, an edited row, and an UPDATE
// whitelist, return only the changed fields restricted to the whitelist.
// Unknown keys in edited (not in whitelist) are silently dropped — the EF
// enforces the whitelist as the security boundary; this is a UX helper.
//
// Equality: strict ===, with one tweak — '' is treated as equal to null/
// undefined for text inputs (so an empty input doesn't register as a diff
// against a NULL original).
//
// For nested-diff entities (hs_coaches, counselors), the caller invokes
// diffPayload twice with the two whitelists and assembles the nested shape.

function isEmpty(v) {
  return v === null || v === undefined || v === '';
}

function fieldsEqual(a, b) {
  if (isEmpty(a) && isEmpty(b)) return true;
  // Coerce numeric strings so "42" === 42 doesn't register as a diff
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '') {
    const nb = Number(b);
    if (!Number.isNaN(nb)) return a === nb;
  }
  if (typeof b === 'number' && typeof a === 'string' && a.trim() !== '') {
    const na = Number(a);
    if (!Number.isNaN(na)) return b === na;
  }
  return a === b;
}

export function diffPayload(original, edited, whitelist) {
  if (!original || typeof original !== 'object') {
    throw new Error('diffPayload: original must be an object');
  }
  if (!edited || typeof edited !== 'object') {
    throw new Error('diffPayload: edited must be an object');
  }
  if (!Array.isArray(whitelist)) {
    throw new Error('diffPayload: whitelist must be an array');
  }

  const diff = {};
  for (const key of whitelist) {
    if (Object.prototype.hasOwnProperty.call(edited, key)) {
      const before = original[key];
      const after = edited[key];
      if (!fieldsEqual(before, after)) {
        // Normalize empty string → null for cleaner DB writes
        diff[key] = after === '' ? null : after;
      }
    }
  }
  return diff;
}
