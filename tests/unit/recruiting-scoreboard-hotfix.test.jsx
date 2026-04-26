/**
 * @vitest-environment jsdom
 *
 * recruiting-scoreboard-hotfix.test.jsx — Sprint 007 hotfix
 *
 * Locks the eight UI/UX refinements from the Sprint 007 hotfix continuation:
 *   CHG-3: school name renders as a button with a click handler when
 *          onSchoolClick is provided
 *   CHG-6: boundary marker copy carries the new "Increase outreach to
 *          coaches..." string
 *   CHG-7: rows with Quality Offer Score == 0 are excluded from the
 *          rendered row set
 *   CHG-7: post-filter rank starts at 1 and increments without gaps
 *   CHG-7: shortlist with all-zero rows shows the "No recruiting activity"
 *          empty state, not the "No schools yet" copy
 *
 * Style/font/color refinements (CHG-1, CHG-2, CHG-4, CHG-5) are not asserted
 * here — they are visual changes verified via the existing screenshot suite
 * and the build smoke. Asserting computed style strings against jsdom would
 * be brittle for negligible regression value.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';

import RecruitingScoreboard, {
  PROFILE_THRESHOLD,
} from '../../src/components/RecruitingScoreboard.jsx';

afterEach(cleanup);

function makeSteps({ s4, s7, s8, s9, s11, s12, s13 } = {}) {
  return [
    { step_id: 1,  label: 'Added to shortlist',                completed: true },
    { step_id: 2,  label: 'Completed recruiting questionnaire', completed: false },
    { step_id: 3,  label: 'Completed admissions info form',     completed: false },
    { step_id: 4,  label: 'Assistant coach contacted student',  completed: !!s4 },
    { step_id: 5,  label: 'Contacted coach via email',          completed: false },
    { step_id: 6,  label: 'Contacted coach via social media',   completed: false },
    { step_id: 7,  label: 'Received junior day invite',         completed: !!s7 },
    { step_id: 8,  label: 'Tour / Visit Confirmed',             completed: !!s8 },
    { step_id: 9,  label: 'Received prospect camp invite',      completed: !!s9 },
    { step_id: 10, label: 'Coach contacted student via text',   completed: false },
    { step_id: 11, label: 'Head coach contacted student',       completed: !!s11 },
    { step_id: 12, label: 'Admissions Pre-Read Requested',      completed: !!s12 },
    { step_id: 13, label: 'Financial Aid Pre-Read Submitted',   completed: !!s13 },
    { step_id: 14, label: 'Received verbal offer',              completed: false },
    { step_id: 15, label: 'Received written offer',             completed: false },
  ];
}

const D3_PROFILE = {
  name: 'Ayden Watkins',
  grad_year: 2027,
  position: 'CB',
  height: 71,
  weight: 175,
  speed_40: 4.7,
  expected_starter: false,
  captain: false,
  all_conference: false,
  all_state: false,
};

describe('Sprint 007 hotfix CHG-3 — school name link', () => {
  it('renders the school name as a button with a click handler when onSchoolClick is supplied', () => {
    const onSchoolClick = vi.fn();
    const items = [
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', conference: 'NESCAC', recruiting_journey_steps: makeSteps({ s4: true }) },
    ];
    const { getByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} onSchoolClick={onSchoolClick} />,
    );
    const link = getByTestId('scoreboard-school-link');
    expect(link.tagName).toBe('BUTTON');
    expect(link.textContent).toBe('Wesleyan');
    fireEvent.click(link);
    expect(onSchoolClick).toHaveBeenCalledTimes(1);
    expect(onSchoolClick.mock.calls[0][0].unitid).toBe(130697);
  });

  it('falls back to plain span when no onSchoolClick is provided', () => {
    const items = [
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', conference: 'NESCAC', recruiting_journey_steps: makeSteps({ s4: true }) },
    ];
    const { queryByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    expect(queryByTestId('scoreboard-school-link')).toBeNull();
  });
});

describe('Sprint 007 hotfix CHG-6 — boundary marker copy', () => {
  it('renders the new "Increase outreach to coaches" copy in the boundary marker', () => {
    const items = [
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', recruiting_journey_steps: makeSteps({ s4: true, s7: true, s8: true, s9: true, s11: true, s12: true, s13: true }) },
      { id: 2, unitid: 191630, school_name: 'Hobart',   div: 'D3', recruiting_journey_steps: makeSteps({ s4: true }) },
    ];
    const { getByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    const marker = getByTestId('scoreboard-boundary-marker');
    expect(marker.textContent).toContain(`Active prospects (Offer Profile ≥ ${PROFILE_THRESHOLD}%) above`);
    expect(marker.textContent).toContain('Increase outreach to coaches');
    expect(marker.textContent).toContain('attend more recruiting events');
    expect(marker.textContent).toContain('make lower priority');
    // Regression guard: retired copy must not resurface.
    expect(marker.textContent).not.toContain('lower-priority outreach');
  });
});

describe('Sprint 007 hotfix CHG-7 — Quality = 0% filter', () => {
  it('excludes rows whose Quality Offer Score is 0 from the rendered scoreboard', () => {
    const items = [
      // 1 yes -> Quality > 0  -> rendered
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', recruiting_journey_steps: makeSteps({ s4: true }) },
      // 0 yes -> Quality == 0 -> filtered
      { id: 2, unitid: 191630, school_name: 'Hobart',   div: 'D3', recruiting_journey_steps: makeSteps() },
      // 2 yes -> Quality > 0  -> rendered
      { id: 3, unitid: 194824, school_name: 'RPI',      div: 'D3', recruiting_journey_steps: makeSteps({ s4: true, s11: true }) },
    ];
    const { getAllByTestId, queryAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    const rows = getAllByTestId('scoreboard-row');
    expect(rows.length).toBe(2);
    const renderedUnitids = rows.map((r) => r.getAttribute('data-unitid'));
    expect(renderedUnitids).not.toContain('191630');
    expect(renderedUnitids).toContain('130697');
    expect(renderedUnitids).toContain('194824');
    // Sanity: the empty-state cell is not rendered when at least one row survives.
    expect(queryAllByTestId('scoreboard-no-activity').length).toBe(0);
  });

  it('post-filter rank starts at 1 and increments without gaps', () => {
    const items = [
      { id: 1, unitid: 191630, school_name: 'Filtered A', div: 'D3', recruiting_journey_steps: makeSteps() }, // 0 -> filtered
      { id: 2, unitid: 130697, school_name: 'Wesleyan',   div: 'D3', recruiting_journey_steps: makeSteps({ s4: true, s7: true, s8: true, s9: true, s11: true, s12: true, s13: true }) }, // 100% -> rank 1
      { id: 3, unitid: 161253, school_name: 'Filtered B', div: 'FCS', recruiting_journey_steps: makeSteps() }, // 0 -> filtered
      { id: 4, unitid: 194824, school_name: 'RPI',        div: 'D3', recruiting_journey_steps: makeSteps({ s4: true, s11: true }) }, // mid -> rank 2
      { id: 5, unitid: 168148, school_name: 'Filtered C', div: 'D3', recruiting_journey_steps: makeSteps() }, // 0 -> filtered
    ];
    const { getAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    const rows = getAllByTestId('scoreboard-row');
    expect(rows.length).toBe(2);
    // Each row's first cell is the Rank cell. After filter + re-rank, the
    // displayed ranks must be 1, 2 — no gaps.
    const ranks = rows.map((r) => r.querySelector('td').textContent.trim());
    expect(ranks).toEqual(['1', '2']);
  });

  it('renders "No recruiting activity yet" empty state when shortlist exists but every row is filtered', () => {
    const items = [
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', recruiting_journey_steps: makeSteps() },
      { id: 2, unitid: 161253, school_name: 'Maine',    div: 'FCS', recruiting_journey_steps: makeSteps() },
    ];
    const { getByTestId, queryByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    const cell = getByTestId('scoreboard-no-activity');
    expect(cell.textContent).toContain('No recruiting activity yet');
    expect(cell.textContent).toContain('Mark journey steps complete');
    // The "no items at all" copy must not appear when the shortlist is non-empty.
    expect(queryByTestId('scoreboard-no-items')).toBeNull();
  });

  it('still renders the "No schools yet" copy when items is empty', () => {
    const { getByTestId, queryByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} />,
    );
    expect(queryByTestId('scoreboard-no-activity')).toBeNull();
    expect(getByTestId('scoreboard-no-items').textContent).toContain('No schools yet');
  });
});
