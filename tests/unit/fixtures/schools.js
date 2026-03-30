/**
 * School fixture factory for Item 5 unit tests.
 *
 * Fields match what runGritFitScoring destructures from the schools array.
 * Base school: a fictional G6 program in the northeast with moderate academic standards.
 * Adjust 'type' and acad_rigor to control gate pass/fail behavior.
 *
 * Usage:
 *   makeSchoolStub()                                — base G6 school near Boston
 *   makeSchoolStub({ type: 'Power 4' })             — Power 4 school
 *   makeSchoolStub({ acad_rigor_junior: 0.95 })     — high academic bar
 */
export function makeSchoolStub(overrides = {}) {
  return {
    unitid: 100001,
    institution_name: 'Test University',
    latitude: '42.36',
    longitude: '-71.05',
    type: 'G6',
    is_test_optional: false,
    acad_rigor_senior: 0.45,
    acad_rigor_junior: 0.45,
    acad_rigor_soph: 0.45,
    acad_rigor_freshman: 0.45,
    acad_rigor_test_opt_senior: 0.45,
    acad_rigor_test_opt_junior: 0.45,
    acad_rigor_test_opt_soph: 0.45,
    acad_rigor_test_opt_freshman: 0.45,
    coa_out_of_state: 45000,
    control: 'Private',
    school_type: 'Selective',
    ncaa_division: '1-FBS',
    conference: 'MAC',
    est_avg_merit: 8000,
    avg_merit_award: 8000,
    share_stu_any_aid: 0.72,
    share_stu_need_aid: 0.45,
    need_blind_school: false,
    dltv: 1200000,
    graduation_rate: 0.68,
    ...overrides,
  };
}
