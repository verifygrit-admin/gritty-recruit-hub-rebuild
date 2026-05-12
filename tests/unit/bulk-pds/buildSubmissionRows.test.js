/**
 * buildSubmissionRows.test.js — Sprint 026 Phase 1a (Coach UI).
 *
 * Pure-function tests for the card→row mapper. Covers plan §4.1 cases:
 *   - 3 cards → 3 rows with same batch_id
 *   - snapshot identity fields copied verbatim
 *   - empty measurables stay null (not 0)
 *   - height is text; numeric fields coerce
 */

import { describe, it, expect } from 'vitest';
import { buildSubmissionRows } from '../../../src/lib/bulkPds/buildSubmissionRows.js';

const sampleStudent = (overrides = {}) => ({
  id: 1,
  user_id: 'student-uuid-1',
  name: 'Sample Player',
  email: 'sample@example.com',
  grad_year: 2027,
  high_school: 'Boston College High School',
  avatar_storage_path: 'avatars/sample.jpg',
  ...overrides,
});

const sampleFields = (overrides = {}) => ({
  height: '6-2',
  weight: '215',
  speed_40: '4.65',
  time_5_10_5: '4.40',
  time_l_drill: '7.10',
  bench_press: '275',
  squat: '405',
  clean: '275',
  ...overrides,
});

describe('buildSubmissionRows', () => {
  it('emits one row per card, all sharing the same batch_id', () => {
    const cards = [
      { student: sampleStudent({ user_id: 'a' }), fields: sampleFields() },
      { student: sampleStudent({ user_id: 'b' }), fields: sampleFields() },
      { student: sampleStudent({ user_id: 'c' }), fields: sampleFields() },
    ];
    const rows = buildSubmissionRows({
      batch_id: 'batch-1',
      coach_user_id: 'coach-1',
      cards,
    });
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.batch_id).toBe('batch-1');
      expect(r.coach_user_id).toBe('coach-1');
    }
    expect(rows.map(r => r.student_user_id)).toEqual(['a', 'b', 'c']);
  });

  it('copies snapshot identity fields verbatim from the student record', () => {
    const student = sampleStudent({ name: 'Test Name', grad_year: 2028 });
    const [row] = buildSubmissionRows({
      batch_id: 'b',
      coach_user_id: 'c',
      cards: [{ student, fields: sampleFields() }],
    });
    expect(row.student_name_snapshot).toBe('Test Name');
    expect(row.student_email_snapshot).toBe('sample@example.com');
    expect(row.student_grad_year_snapshot).toBe(2028);
    expect(row.student_high_school_snapshot).toBe('Boston College High School');
    expect(row.student_avatar_storage_path_snap).toBe('avatars/sample.jpg');
  });

  it('keeps null when an empty measurable is provided (does not coerce to 0)', () => {
    const [row] = buildSubmissionRows({
      batch_id: 'b',
      coach_user_id: 'c',
      cards: [{ student: sampleStudent(), fields: { ...sampleFields(), weight: '', squat: '' } }],
    });
    expect(row.weight).toBeNull();
    expect(row.squat).toBeNull();
    // The other numeric fields stay numeric.
    expect(row.bench_press).toBe(275);
  });

  it('coerces numeric strings to numbers, keeps height as text', () => {
    const [row] = buildSubmissionRows({
      batch_id: 'b',
      coach_user_id: 'c',
      cards: [{ student: sampleStudent(), fields: sampleFields() }],
    });
    expect(typeof row.height).toBe('string');
    expect(row.height).toBe('6-2');
    expect(row.weight).toBe(215);
    expect(row.speed_40).toBe(4.65);
  });

  it('throws when batch_id or coach_user_id is missing', () => {
    expect(() => buildSubmissionRows({ coach_user_id: 'c', cards: [] })).toThrow(/batch_id/);
    expect(() => buildSubmissionRows({ batch_id: 'b', cards: [] })).toThrow(/coach_user_id/);
  });
});
