/**
 * Profile fixture factory for Item 5 unit tests.
 *
 * Base values match a hypothetical G6-tier WR from Massachusetts:
 * - position, height, weight derived from ATH_STANDARDS['G6']['WR']
 * - speed_40 set to 4.55 (G6 WR median)
 * - gpa 3.5 (above all ACAD_CLUSTER_FLOOR thresholds)
 * - grad_year set to 2027 (Junior as of 2026)
 *
 * Usage:
 *   makeProfileStub()                           — base profile
 *   makeProfileStub({ speed_40: 0 })            — no 40 time
 *   makeProfileStub({ gpa: 1.9, grad_year: 2026 }) — low GPA senior
 */
export function makeProfileStub(overrides = {}) {
  return {
    position: 'WR',
    height: 73,
    weight: 185,
    speed_40: 4.55,
    gpa: 3.5,
    sat: 1100,
    hs_lat: 42.3601,
    hs_lng: -71.0589,
    state: 'MA',
    agi: null,
    dependents: null,
    grad_year: 2027,
    expected_starter: false,
    captain: false,
    all_conference: false,
    all_state: false,
    ...overrides,
  };
}
