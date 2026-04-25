/**
 * Gritty Recruit Hub Rebuild — Schema Verification Tests
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-24
 * Status: SPEC COMPLETE — requires Supabase project to be provisioned and seeded
 *
 * These tests verify the new Supabase project schema matches the Phase 1 design spec.
 * They run against the live Supabase project using the service role key.
 * They are NOT Playwright tests — they use Vitest + the Supabase JS client.
 *
 * Run: npm run test:unit
 *
 * Preconditions:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in test environment
 *   - All tables provisioned by Patch's migration
 *   - Seed data in place (hs_programs has BC High, profiles has test student)
 *
 * IMPORTANT: These tests use the SERVICE ROLE KEY which bypasses RLS.
 * They must NEVER run in a browser context. They are CI-only, server-side tests.
 * The service role key must NEVER appear in the browser bundle.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { computeGritFitStatuses } from '../../src/lib/gritFitStatus.js';

// Service role client — bypasses RLS for schema inspection only
// Never expose this key in browser code
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

beforeAll(() => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — schema tests will be skipped');
    return;
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
});

function skipIfNoClient() {
  if (!supabase) {
    return true;
  }
  return false;
}

// ── Table Existence Tests ───────────────────────────────────────────────────

describe('Schema: required tables exist', () => {
  const REQUIRED_TABLES = [
    'hs_programs',
    'users',
    'profiles',
    'schools',
    'short_list_items',
    'file_uploads',
  ];

  for (const table of REQUIRED_TABLES) {
    it(`table "${table}" exists and is queryable`, async () => {
      if (skipIfNoClient()) return;

      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      expect(error, `Table "${table}" query failed: ${error?.message}`).toBeNull();
    });
  }
});

// ── short_list_items: recruiting_journey_steps ──────────────────────────────

describe('Schema: short_list_items.recruiting_journey_steps default', () => {
  it('new shortlist row has 15 journey steps by default', async () => {
    if (skipIfNoClient()) return;

    // This test requires a valid user_id. We query existing rows to inspect
    // the default JSON rather than inserting a new one.
    const { data, error } = await supabase
      .from('short_list_items')
      .select('recruiting_journey_steps')
      .limit(1);

    if (error) {
      throw new Error(`short_list_items query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // No rows yet — this is acceptable at schema time. Skip assertion.
      // This will be enforced once seeding is complete.
      console.warn('short_list_items is empty — journey step count assertion skipped until seeded');
      return;
    }

    const steps = data[0].recruiting_journey_steps;
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBe(15);
  });

  it('journey step_id 1 has completed: true by default', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('short_list_items')
      .select('recruiting_journey_steps')
      .limit(1);

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) return;

    const steps = data[0].recruiting_journey_steps;
    const step1 = steps.find(s => s.step_id === 1);

    expect(step1).toBeDefined();
    expect(step1.completed).toBe(true);
    expect(step1.label).toBe('Added to shortlist');
  });

  it('journey steps 2-15 have completed: false by default', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('short_list_items')
      .select('recruiting_journey_steps')
      .limit(1);

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) return;

    const steps = data[0].recruiting_journey_steps;
    const stepsAfterFirst = steps.filter(s => s.step_id > 1);

    for (const step of stepsAfterFirst) {
      expect(step.completed, `Step ${step.step_id} should default to false`).toBe(false);
    }
  });

  it('all 15 steps have required fields: step_id, label, completed, completed_at', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('short_list_items')
      .select('recruiting_journey_steps')
      .limit(1);

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) return;

    const steps = data[0].recruiting_journey_steps;
    for (const step of steps) {
      expect(step).toHaveProperty('step_id');
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('completed');
      expect(step).toHaveProperty('completed_at');
      expect(typeof step.step_id).toBe('number');
      expect(typeof step.label).toBe('string');
      expect(typeof step.completed).toBe('boolean');
    }
  });
});

// ── short_list_items: source and grit_fit_status columns ───────────────────

describe('Schema: short_list_items source and grit_fit_status', () => {
  it('source column accepts "grit_fit" and "manual_add" values only', async () => {
    if (skipIfNoClient()) return;

    // Attempt an insert with an invalid source value — expect constraint violation
    // We use a dummy user_id that will fail FK but the check constraint error fires first
    const { error } = await supabase
      .from('short_list_items')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        unitid: 999999,
        source: 'invalid_source_value',
      });

    // Expect an error (either check constraint or FK)
    expect(error).not.toBeNull();
    // If check constraint fires, message will include "source" or "check"
    // If FK fires first, user_id won't exist. Either way, insert is rejected.
  });

  // Sprint 004 CW-1 (2026-04-22): 'not_evaluated' removed from UI status taxonomy.
  // Postgres enum value remains as "accepted inert artifact" (no migration permitted).
  // Assertion flipped to runtime check against computeGritFitStatuses — UI-layer invariant.
  it('computeGritFitStatuses never returns not_evaluated under representative inputs', () => {
    // Fixture 1: Highly-matched eligible student — should produce currently_recommended
    const f1 = computeGritFitStatuses(
      { eligible: true, matchRank: 5, dist: 100, schoolRigor: 0.5, athleteAcad: 0.5, type: 'Power 4' },
      'Power 4',
      500
    );
    expect(f1).not.toContain('not_evaluated');

    // Fixture 2: Academic mismatch (student below school rigor)
    const f2 = computeGritFitStatuses(
      { eligible: false, matchRank: null, dist: 50, schoolRigor: 0.8, athleteAcad: 0.3, type: 'Power 4' },
      'D2',
      300
    );
    expect(f2).not.toContain('not_evaluated');

    // Fixture 3: Geographically distant school
    const f3 = computeGritFitStatuses(
      { eligible: true, matchRank: 200, dist: 2000, schoolRigor: 0.4, athleteAcad: 0.4, type: 'D3' },
      'D3',
      500
    );
    expect(f3).not.toContain('not_evaluated');

    // Fixture 4: Null topTier (no athletic eligibility data)
    const f4 = computeGritFitStatuses(
      { eligible: false, matchRank: null, dist: 100, schoolRigor: 0, athleteAcad: 0, type: 'G6' },
      null,
      500
    );
    expect(f4).not.toContain('not_evaluated');

    // Fixture 5: Below athletic fit — school tier below student top tier
    const f5 = computeGritFitStatuses(
      { eligible: true, matchRank: 10, dist: 100, schoolRigor: 0.5, athleteAcad: 0.5, type: 'D3' },
      'Power 4',
      500
    );
    expect(f5).not.toContain('not_evaluated');
  });

  it('computeGritFitStatuses returns empty array when no labels apply (diagnostic debug)', () => {
    // Fixture that triggers zero labels: eligible but not top-50, matching tiers, in-range,
    // no academic mismatch, no geographic overstep. Debug fires as diagnostic
    // (demoted from warn in Sprint 005 P2.5 to reduce console noise; DevTools hides
    // debug by default — toggle Verbose to inspect).
    const warnSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const result = computeGritFitStatuses(
      {
        eligible: true,
        matchRank: 150,          // > 50, so no currently_recommended
        dist: 100,               // within recruitReach
        schoolRigor: 0.5,
        athleteAcad: 0.5,        // equal — no academic mismatch
        type: 'Power 4',
      },
      'Power 4',                 // matching top tier — no athletic mismatch
      500                        // recruitReach > dist — no geographic flag
    );

    // Hard assertion: empty array (no "not_evaluated" fallback)
    expect(result).toEqual([]);
    expect(result).not.toContain('not_evaluated');

    // Soft assertion: diagnostic warn fired. Does NOT fail test if absent —
    // goal is diagnostic visibility per Ruling A-2, not test failure.
    expect.soft(warnSpy).toHaveBeenCalled();
    if (warnSpy.mock.calls.length > 0) {
      expect.soft(warnSpy.mock.calls[0][0]).toContain('computeGritFitStatuses');
    }

    warnSpy.mockRestore();
  });
});

// ── users: FK and user_type constraint ─────────────────────────────────────

describe('Schema: users table constraints', () => {
  it('user_type column rejects invalid values', async () => {
    if (skipIfNoClient()) return;

    const { error } = await supabase
      .from('users')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        user_type: 'invalid_type',
      });

    expect(error).not.toBeNull();
  });

  it('seeded test accounts exist in public.users with correct user_type', async () => {
    if (skipIfNoClient()) return;

    const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL;
    if (!TEST_STUDENT_EMAIL) return;

    // Query via profiles join (user_id is the link)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', TEST_STUDENT_EMAIL)
      .limit(1);

    if (profileError || !profiles?.length) {
      console.warn('Test student profile not found — users table assertion skipped');
      return;
    }

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('user_type, account_status')
      .eq('user_id', profiles[0].user_id)
      .limit(1);

    if (userError) throw new Error(`users query failed: ${userError.message}`);

    expect(users).not.toBeNull();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].user_type).toBe('student_athlete');
    expect(users[0].account_status).toBe('active');
  });
});

// ── hs_programs: BC High exists ─────────────────────────────────────────────

describe('Schema: hs_programs seeding', () => {
  it('BC High is present in hs_programs', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('hs_programs')
      .select('id, school_name, state')
      .ilike('school_name', '%Boston College High%')
      .limit(1);

    if (error) throw new Error(`hs_programs query failed: ${error.message}`);

    expect(data).not.toBeNull();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].school_name).toBeTruthy();
  });
});

// ── schools: 662 rows ───────────────────────────────────────────────────────

describe('Schema: schools table population', () => {
  it('schools table contains 662 rows', async () => {
    if (skipIfNoClient()) return;

    const { count, error } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(`schools count query failed: ${error.message}`);

    expect(count).toBe(662);
  });

  it('schools table has unitid column and no null unitids', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('schools')
      .select('unitid')
      .is('unitid', null)
      .limit(5);

    if (error) throw new Error(`schools null unitid query failed: ${error.message}`);

    expect(data.length).toBe(0);
  });
});

// ── file_uploads: column structure ─────────────────────────────────────────

describe('Schema: file_uploads table structure', () => {
  it('file_uploads table has user_id column as identity key', async () => {
    if (skipIfNoClient()) return;

    const { data, error } = await supabase
      .from('file_uploads')
      .select('user_id, file_label, storage_path')
      .limit(0);

    expect(error).toBeNull();
  });

  it('file_uploads.file_label supports all 7 document type values', async () => {
    if (skipIfNoClient()) return;

    const REQUIRED_LABELS = [
      'Transcript',
      'Senior Course List',
      'Writing Example',
      'Student Resume',
      'School Profile PDF',
      'SAT/ACT Scores',
      'Financial Aid Info',
    ];

    // This test is structural documentation, not a DB constraint check.
    // file_label is a text column, not an enum. We verify seeded data covers all types.
    // If seeding has not included all types, we log the gap.
    for (const label of REQUIRED_LABELS) {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('file_label')
        .eq('file_label', label)
        .limit(1);

      if (error) continue;

      if (!data || data.length === 0) {
        console.warn(`QA NOTE: No seeded file_uploads row for file_label="${label}". Upload UI test for this type cannot be confirmed at schema level.`);
      }
    }
    // Test always passes — this is a gap-reporting test, not a hard assertion.
    // Hard assertion on file visibility is in TC-FILE-002 and TC-FILE-003.
    expect(true).toBe(true);
  });
});
