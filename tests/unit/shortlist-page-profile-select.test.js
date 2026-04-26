/**
 * shortlist-page-profile-select.test.js — Sprint 007 hotfix
 *
 * Guards the studentProfile SELECT in ShortlistPage.jsx against a Sprint 007
 * regression: the SELECT was originally added in R4 for token resolution
 * (name/grad_year/position/high_school) and was reused by the B.1 Recruiting
 * Scoreboard without widening to include the seven Grit Fit Engine inputs.
 * That produced em-dashes for Athletic Fit / Compound Profile and a
 * misleading "Add your position, height, and weight" banner for every
 * student whose DB row was actually complete.
 *
 * This test is a static-source assertion — it reads the file content and
 * confirms both the SELECT column list and the studentProfile state object
 * carry all eleven fields. A render-level test would require supabase +
 * session mocking out of proportion to the contract being protected.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHORTLIST_PAGE_PATH = resolve(__dirname, '../../src/pages/ShortlistPage.jsx');

const REQUIRED_PROFILE_FIELDS = [
  // R4 token resolution
  'name',
  'grad_year',
  'position',
  'high_school',
  // Grit Fit Engine measurables
  'height',
  'weight',
  'speed_40',
  // Grit Fit Engine boost flags
  'expected_starter',
  'captain',
  'all_conference',
  'all_state',
];

describe('ShortlistPage studentProfile fetch — Grit Fit Engine inputs', () => {
  const source = readFileSync(SHORTLIST_PAGE_PATH, 'utf8');

  it('SELECT statement includes all eleven profile fields', () => {
    const selectMatch = source.match(/\.from\('profiles'\)\s*\.select\('([^']+)'\)/);
    expect(selectMatch, 'profiles SELECT statement not found in ShortlistPage.jsx').toBeTruthy();

    const selectedColumns = selectMatch[1]
      .split(',')
      .map((c) => c.trim());

    for (const field of REQUIRED_PROFILE_FIELDS) {
      expect(selectedColumns, `SELECT must include "${field}"`).toContain(field);
    }
  });

  it('studentProfile state object carries all eleven fields', () => {
    for (const field of REQUIRED_PROFILE_FIELDS) {
      const pattern = new RegExp(`${field}\\s*:\\s*profileRow\\.${field}`);
      expect(
        source,
        `setStudentProfile must assign ${field}: profileRow.${field}`,
      ).toMatch(pattern);
    }
  });
});
