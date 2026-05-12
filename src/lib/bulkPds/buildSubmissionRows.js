/**
 * buildSubmissionRows — Sprint 026 Phase 1a (Coach UI).
 *
 * Pure function. Maps the in-memory card list to the row[] payload accepted
 * by `public.bulk_pds_submissions` (migration 0048). One DB row per card.
 * All cards in a single submit share the same batch_id.
 *
 * Snapshot fields are copied verbatim from the student profile read at page
 * load — they are immutable at the time of submission per §1.1 spec.
 *
 * Numeric coercion: an empty-string measurable stays null (not 0). A text
 * measurable like height ("6-2") passes through as text. Validation is
 * upstream in `validateBulkPdsCards.js` — this function does NOT validate.
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

function coerceNumeric(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceText(value) {
  if (value === '' || value === null || value === undefined) return null;
  return String(value);
}

/**
 * @param {Object} params
 * @param {string} params.batch_id         — uuid shared across all rows in batch
 * @param {string} params.coach_user_id    — current coach auth.uid()
 * @param {Array<{ student: Object, fields: Object }>} params.cards
 *   Each card carries the student snapshot and the 8 measurable inputs.
 * @returns {Array<Object>} rows ready for `supabase.from('bulk_pds_submissions').insert(...)`
 */
export function buildSubmissionRows({ batch_id, coach_user_id, cards }) {
  if (!batch_id) throw new Error('buildSubmissionRows: batch_id required');
  if (!coach_user_id) throw new Error('buildSubmissionRows: coach_user_id required');
  if (!Array.isArray(cards)) throw new Error('buildSubmissionRows: cards must be an array');

  return cards.map(({ student, fields }) => ({
    batch_id,
    coach_user_id,
    student_user_id: student.user_id,

    // Snapshot identity fields (immutable record of state at submission time).
    student_name_snapshot:            student.name ?? null,
    student_email_snapshot:           student.email ?? null,
    student_grad_year_snapshot:       student.grad_year ?? null,
    student_high_school_snapshot:    student.high_school ?? null,
    student_avatar_storage_path_snap: student.avatar_storage_path ?? null,

    // Performance fields — height is text, the rest are numeric.
    height:       coerceText(fields.height),
    weight:       coerceNumeric(fields.weight),
    speed_40:     coerceNumeric(fields.speed_40),
    time_5_10_5:  coerceNumeric(fields.time_5_10_5),
    time_l_drill: coerceNumeric(fields.time_l_drill),
    bench_press:  coerceNumeric(fields.bench_press),
    squat:        coerceNumeric(fields.squat),
    clean:        coerceNumeric(fields.clean),
  }));
}

export const __NUMERIC_FIELDS = NUMERIC_FIELDS;
