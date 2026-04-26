/**
 * @vitest-environment jsdom
 *
 * recruiting-scoreboard.test.jsx — Sprint 007 B.1
 *
 * Unit coverage for the read-only Recruiting Scoreboard component:
 *   - Pure helper logic (boolean extraction, Quality / Profile math, threshold)
 *   - Edge case: missing measurables renders "Grit Fit not yet computed"
 *   - Render: collapsible toggle, header structure, boundary marker placement
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

import RecruitingScoreboard, {
  PROFILE_THRESHOLD,
  qualityOfferScore,
  offerProfile,
  extractScoreboardBooleans,
} from '../../src/components/RecruitingScoreboard.jsx';

afterEach(cleanup);

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeSteps({ s4, s7, s8, s9, s11, s12, s13 } = {}) {
  // Post-0037 step ordering. Only labels relevant to the Scoreboard mapped here.
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
  height: 71,        // 5'11" — calcAthleticFit accepts inches as a number
  weight: 175,
  speed_40: 4.7,
  expected_starter: false,
  captain: false,
  all_conference: false,
  all_state: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────

describe('Sprint 007 B.1 — pure helpers', () => {
  it('extractScoreboardBooleans pulls 7 booleans by step_id (post-0037)', () => {
    const item = { recruiting_journey_steps: makeSteps({ s11: true, s4: true, s7: true, s9: true, s8: true }) };
    const bools = extractScoreboardBooleans(item);
    expect(bools.length).toBe(7);
    // Order: HC (11), AC (4), Jr Day (7), FB Camp (9), Tour/Visit (8), Adm (12), FA (13)
    expect(bools).toEqual([true, true, true, true, true, false, false]);
  });

  it('returns falses when journey steps are missing or malformed', () => {
    expect(extractScoreboardBooleans(null)).toEqual([false, false, false, false, false, false, false]);
    expect(extractScoreboardBooleans({})).toEqual([false, false, false, false, false, false, false]);
    expect(extractScoreboardBooleans({ recruiting_journey_steps: [] })).toEqual([false, false, false, false, false, false, false]);
  });

  it('qualityOfferScore = (Yes count / 7) × 100', () => {
    expect(qualityOfferScore([false, false, false, false, false, false, false])).toBe(0);
    expect(qualityOfferScore([true,  false, false, false, false, false, false])).toBeCloseTo(14.2857, 3);
    expect(qualityOfferScore([true,  true,  true,  true,  true,  true,  true ])).toBe(100);
  });

  it('offerProfile is multiplicative (Quality × Athletic Fit / 100)', () => {
    expect(offerProfile(100, 84.5)).toBeCloseTo(84.5, 2);
    expect(offerProfile(50,  50  )).toBeCloseTo(25,   2);
    expect(offerProfile(0,   84.5)).toBe(0);
  });

  it('PROFILE_THRESHOLD locks at 35 for v1', () => {
    expect(PROFILE_THRESHOLD).toBe(35);
  });
});

// ── Render: collapsible + measurables-missing path ──────────────────────

describe('Sprint 007 B.1 — render', () => {
  it('renders the burgundy header with the right tap-target height (≥ 44px)', () => {
    const { getByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} />,
    );
    const toggle = getByTestId('recruiting-scoreboard-toggle');
    expect(toggle.tagName).toBe('BUTTON');
    expect(parseInt(toggle.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it('toggle hides and re-shows the body', () => {
    const { getByTestId, queryByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} />,
    );
    expect(getByTestId('recruiting-scoreboard-body')).toBeTruthy();
    fireEvent.click(getByTestId('recruiting-scoreboard-toggle'));
    expect(queryByTestId('recruiting-scoreboard-body')).toBeNull();
    fireEvent.click(getByTestId('recruiting-scoreboard-toggle'));
    expect(queryByTestId('recruiting-scoreboard-body')).toBeTruthy();
  });

  it('renders the seven column headers in the prototype order', () => {
    const { getByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} />,
    );
    const expected = [
      'hc_contact', 'ac_contact', 'jr_day_invite', 'fb_camp_invite',
      'tour_visit', 'admissions_preread', 'finaid_preread',
    ];
    for (const key of expected) {
      expect(getByTestId(`scoreboard-col-${key}`)).toBeTruthy();
    }
  });

  it('renders the no-measurables banner when profile is missing required fields (Edge case 3)', () => {
    const { getByTestId } = render(
      <RecruitingScoreboard
        items={[{ id: 1, unitid: 1, school_name: 'X', div: 'D3', recruiting_journey_steps: makeSteps() }]}
        studentProfile={{ name: 'X', grad_year: 2027 /* no position/height/weight */ }}
      />,
    );
    expect(getByTestId('scoreboard-no-measurables')).toBeTruthy();
  });

  it('does NOT render the no-measurables banner when measurables are present', () => {
    const { queryByTestId } = render(
      <RecruitingScoreboard
        items={[{ id: 1, unitid: 1, school_name: 'X', div: 'D3', recruiting_journey_steps: makeSteps() }]}
        studentProfile={D3_PROFILE}
      />,
    );
    expect(queryByTestId('scoreboard-no-measurables')).toBeNull();
  });

  it('boundary marker inserts at the first row whose Profile drops below 35%', () => {
    const items = [
      // High Profile — D3 student × all 7 yes = ~84.5
      { id: 1, unitid: 130697, school_name: 'Wesleyan', div: 'D3', conference: 'NESCAC', recruiting_journey_steps: makeSteps({ s4: true, s7: true, s8: true, s9: true, s11: true, s12: true, s13: true }) },
      // Mid Profile — D3 × 5/7 ≈ 60.4
      { id: 2, unitid: 212577, school_name: 'F&M',      div: 'D3', conference: 'Centennial', recruiting_journey_steps: makeSteps({ s4: true, s7: true, s8: true, s9: true, s11: true }) },
      // Below threshold — D3 × 1/7 ≈ 12.1
      { id: 3, unitid: 191630, school_name: 'Hobart',   div: 'D3', conference: 'Liberty', recruiting_journey_steps: makeSteps({ s4: true }) },
    ];
    const { getByTestId, getAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={D3_PROFILE} />,
    );
    const marker = getByTestId('scoreboard-boundary-marker');
    expect(marker).toBeTruthy();
    expect(marker.textContent).toContain(`Active prospects (Offer Profile ≥ ${PROFILE_THRESHOLD}%) above`);
    expect(getAllByTestId('scoreboard-row').length).toBe(3);
  });

  it('renders empty-state row when items is empty and measurables are present', () => {
    const { getByTestId, queryAllByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} />,
    );
    expect(getByTestId('recruiting-scoreboard-body')).toBeTruthy();
    expect(queryAllByTestId('scoreboard-row').length).toBe(0);
  });

  it('persists collapse state via onCollapseChange callback', () => {
    const cb = vi.fn();
    const { getByTestId } = render(
      <RecruitingScoreboard items={[]} studentProfile={D3_PROFILE} onCollapseChange={cb} />,
    );
    fireEvent.click(getByTestId('recruiting-scoreboard-toggle'));
    expect(cb).toHaveBeenCalledWith(true);
    fireEvent.click(getByTestId('recruiting-scoreboard-toggle'));
    expect(cb).toHaveBeenCalledWith(false);
  });
});

