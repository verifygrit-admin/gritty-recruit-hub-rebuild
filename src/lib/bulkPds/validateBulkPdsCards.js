/**
 * validateBulkPdsCards — Sprint 026 Phase 1a (Coach UI).
 *
 * Pure function. Returns a per-card error map keyed by student_user_id, with
 * a sub-map of fieldName → human-readable error string. An empty top-level
 * object means all cards are valid.
 *
 * Validation rules (per plan §7 / acceptance G5/G6):
 *   - Empty strings are valid (nullable fields).
 *   - Numeric fields reject NaN / non-numeric / negative numbers.
 *   - `height` is text — any non-empty string is allowed (e.g. "6-2").
 *   - No upper-bound sanity checks in v1 (admin verifies before profile write).
 */

const NUMERIC_FIELDS = [
  'weight',
  'speed_40',
  'time_5_10_5',
  'time_l_drill',
  'bench_press',
  'squat',
  'clean',
];

function isEmpty(value) {
  return value === '' || value === null || value === undefined;
}

function validateNumericField(raw) {
  if (isEmpty(raw)) return null;
  // Reject pure-whitespace and non-numeric strings.
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 'Must be a number';
  if (n < 0) return 'Must be zero or positive';
  return null;
}

/**
 * @param {Array<{ student: { user_id: string }, fields: Object }>} cards
 * @returns {Object} { [student_user_id]: { [fieldName]: errMsg } }
 */
export function validateBulkPdsCards(cards) {
  const result = {};
  if (!Array.isArray(cards)) return result;

  for (const card of cards) {
    const studentId = card?.student?.user_id;
    if (!studentId) continue;
    const fields = card.fields || {};
    const cardErrors = {};

    // Height — text field, no validation beyond presence rules. Any non-empty
    // string allowed including "6-2", "5'11", "72".

    for (const f of NUMERIC_FIELDS) {
      const err = validateNumericField(fields[f]);
      if (err) cardErrors[f] = err;
    }

    if (Object.keys(cardErrors).length > 0) {
      result[studentId] = cardErrors;
    }
  }

  return result;
}

export const __NUMERIC_FIELDS = NUMERIC_FIELDS;
