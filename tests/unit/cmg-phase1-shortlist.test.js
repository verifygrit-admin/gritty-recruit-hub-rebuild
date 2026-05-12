/**
 * @vitest-environment jsdom
 *
 * cmg-phase1-shortlist.test.js — Sprint 025 hotfix
 *
 * Regression test for the bug where a student's shortlist schools failed to
 * populate the CMG school dropdown. Root cause: CoachMessageGeneratorPage was
 * fetching `short_list_items` with a PostgREST embedded select
 * `schools(unitid, school_name, div, type)` — but no FK exists between
 * `short_list_items.unitid` and `schools.unitid`, so the embedded resource
 * came back null on every row and `.map(row => row.schools).filter(Boolean)`
 * flattened to `[]`. Fix reads denormalized fields directly off
 * `short_list_items` and the dropdown renders correctly.
 *
 * These tests pin down Phase1Channel's contract: when handed a non-empty
 * `shortlist` prop of school records, it MUST render one <option> per row
 * inside the school <select>, plus the two sentinel options.
 *
 * Note: this file is `.test.js` (matching the spec) so it uses
 * React.createElement instead of JSX syntax. Behavior is identical.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// Phase1Channel imports the live supabase client at module-eval time; mock it
// so the test does not require network or env vars. The mock returns an empty
// typeahead result if anything touches it — none of these tests exercise the
// typeahead path.
vi.mock('../../src/lib/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import { render, cleanup } from '@testing-library/react';
import React from 'react';
import Phase1Channel from '../../src/components/cmg/phases/Phase1Channel.jsx';

afterEach(() => {
  cleanup();
});

const THREE_SCHOOLS = [
  { unitid: 100654, school_name: 'Alabama A & M University', div: 'D1', type: 'public' },
  { unitid: 100663, school_name: 'University of Alabama at Birmingham', div: 'D1', type: 'public' },
  { unitid: 100706, school_name: 'University of Alabama in Huntsville', div: 'D2', type: 'public' },
];

// A coach_message scenario (email/dm channel pattern, NOT twitter-public) so
// the school <select> renders (typeahead is closed by default).
const COACH_MESSAGE_SCENARIO = {
  id: 4,
  title: 'Introducing Myself',
  channel_pattern: 'dm-first',
  kind: 'coach_message',
};

function makeProps(overrides) {
  return Object.assign(
    {
      scenario: COACH_MESSAGE_SCENARIO,
      channel: 'email',
      onChannelChange: () => {},
      school: null,
      onSchoolChange: () => {},
      shortlist: THREE_SCHOOLS,
    },
    overrides || {},
  );
}

function getSchoolSelect(container) {
  return container.querySelector('#cmg-p1-school-select');
}

describe('Phase1Channel — shortlist dropdown', () => {
  it('renders one <option> per shortlist row plus the two sentinels', () => {
    const { container } = render(React.createElement(Phase1Channel, makeProps()));
    const select = getSchoolSelect(container);
    expect(select).not.toBeNull();
    const options = select.querySelectorAll('option');
    // 1 leading placeholder + 3 shortlist + 1 trailing "Other" sentinel.
    expect(options).toHaveLength(5);
    expect(options[0].value).toBe('');
    expect(options[options.length - 1].value).toBe('__other__');
  });

  it('renders each shortlist school_name as visible option text', () => {
    const { container } = render(React.createElement(Phase1Channel, makeProps()));
    const select = getSchoolSelect(container);
    const texts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(texts.some((t) => t.includes('Alabama A & M University'))).toBe(true);
    expect(texts.some((t) => t.includes('University of Alabama at Birmingham'))).toBe(true);
    expect(texts.some((t) => t.includes('University of Alabama in Huntsville'))).toBe(true);
  });

  it('uses each row.unitid as the <option> value (string-cast)', () => {
    const { container } = render(React.createElement(Phase1Channel, makeProps()));
    const select = getSchoolSelect(container);
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values).toContain('100654');
    expect(values).toContain('100663');
    expect(values).toContain('100706');
  });

  it('falls back to just the two sentinels when shortlist is empty', () => {
    const { container } = render(
      React.createElement(Phase1Channel, makeProps({ shortlist: [] })),
    );
    const select = getSchoolSelect(container);
    const options = select.querySelectorAll('option');
    // Placeholder + "Other" sentinel only.
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('');
    expect(options[1].value).toBe('__other__');
  });
});
