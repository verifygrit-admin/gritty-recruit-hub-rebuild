/**
 * @vitest-environment jsdom
 *
 * sprint-007-hf4.test.jsx — Sprint 007 hotfix HF-4
 *
 * Locks the Verbal + Written Offer badge wiring across all four target
 * surfaces, plus the offerStatus.js helpers and OfferBadge component.
 *
 * Coverage:
 *   - hasVerbalOffer / hasWrittenOffer null-safe at JSONB edge cases
 *   - OfferBadge renders correct label and variant marker for each variant
 *   - buildOfferBadgeHtml emits the same label+variant in inline-HTML form
 *   - Recruiting Scoreboard renders Verbal Offer for the known-positive
 *     case (Jesse Bargar / St Lawrence — step_id=14 complete)
 *   - Shortlist slide-out renders three chips (Verbal Offer, Written
 *     Offer, Commitment) and Verbal is active when step 14 complete
 *   - SchoolDetailsCard accepts and renders the new offer-badge props
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import {
  hasVerbalOffer,
  hasWrittenOffer,
  STEP_ID_VERBAL_OFFER,
  STEP_ID_WRITTEN_OFFER,
} from '../../src/lib/offerStatus.js';
import OfferBadge, { buildOfferBadgeHtml } from '../../src/components/OfferBadge.jsx';
import RecruitingScoreboard from '../../src/components/RecruitingScoreboard.jsx';
import ShortlistSlideOut from '../../src/components/ShortlistSlideOut.jsx';
import SchoolDetailsCard from '../../src/components/SchoolDetailsCard.jsx';

afterEach(cleanup);

// ── Step IDs ──────────────────────────────────────────────────────────────

describe('Sprint 007 HF-4 — step ID constants', () => {
  it('STEP_ID_VERBAL_OFFER is 14', () => {
    expect(STEP_ID_VERBAL_OFFER).toBe(14);
  });
  it('STEP_ID_WRITTEN_OFFER is 15', () => {
    expect(STEP_ID_WRITTEN_OFFER).toBe(15);
  });
});

// ── offerStatus helpers ──────────────────────────────────────────────────

describe('Sprint 007 HF-4 — offerStatus helpers', () => {
  function withStep(stepId, completed) {
    return {
      recruiting_journey_steps: [
        { step_id: stepId, completed },
      ],
    };
  }

  it('hasVerbalOffer returns true only when step 14 completed === true', () => {
    expect(hasVerbalOffer(withStep(14, true))).toBe(true);
    expect(hasVerbalOffer(withStep(14, false))).toBe(false);
    expect(hasVerbalOffer(withStep(14, 'true'))).toBe(false); // strict-true only
    expect(hasVerbalOffer(withStep(14, 1))).toBe(false);      // strict-true only
    expect(hasVerbalOffer(withStep(13, true))).toBe(false);   // wrong step
    expect(hasVerbalOffer(withStep(15, true))).toBe(false);   // wrong step
  });

  it('hasWrittenOffer returns true only when step 15 completed === true', () => {
    expect(hasWrittenOffer(withStep(15, true))).toBe(true);
    expect(hasWrittenOffer(withStep(15, false))).toBe(false);
    expect(hasWrittenOffer(withStep(14, true))).toBe(false);
  });

  it('both helpers are null-safe at JSONB edge cases', () => {
    expect(hasVerbalOffer(null)).toBe(false);
    expect(hasVerbalOffer(undefined)).toBe(false);
    expect(hasVerbalOffer({})).toBe(false);
    expect(hasVerbalOffer({ recruiting_journey_steps: null })).toBe(false);
    expect(hasVerbalOffer({ recruiting_journey_steps: 'not an array' })).toBe(false);
    expect(hasVerbalOffer({ recruiting_journey_steps: [{ step_id: 14 }] })).toBe(false); // missing completed
    expect(hasWrittenOffer(null)).toBe(false);
    expect(hasWrittenOffer({})).toBe(false);
    expect(hasWrittenOffer({ recruiting_journey_steps: [] })).toBe(false);
  });

  it('helpers return true independently when both steps are complete', () => {
    const item = {
      recruiting_journey_steps: [
        { step_id: 14, completed: true },
        { step_id: 15, completed: true },
      ],
    };
    expect(hasVerbalOffer(item)).toBe(true);
    expect(hasWrittenOffer(item)).toBe(true);
  });
});

// ── OfferBadge component + HTML builder ───────────────────────────────────

describe('Sprint 007 HF-4 — OfferBadge component', () => {
  it('renders Verbal Offer label for variant="verbal"', () => {
    const { getByTestId } = render(<OfferBadge variant="verbal" />);
    const badge = getByTestId('offer-badge');
    expect(badge.textContent).toBe('Verbal Offer');
    expect(badge.getAttribute('data-variant')).toBe('verbal');
  });

  it('renders Written Offer label for variant="written"', () => {
    const { getByTestId } = render(<OfferBadge variant="written" />);
    const badge = getByTestId('offer-badge');
    expect(badge.textContent).toBe('Written Offer');
    expect(badge.getAttribute('data-variant')).toBe('written');
  });

  it('renders nothing for unknown variants', () => {
    const { container } = render(<OfferBadge variant="bogus" />);
    expect(container.querySelector('[data-testid="offer-badge"]')).toBeNull();
  });

  it('uses StatusPill-grammar shape (rounded 12px, weight 600, body font)', () => {
    const { getByTestId } = render(<OfferBadge variant="verbal" />);
    const badge = getByTestId('offer-badge');
    expect(badge.style.borderRadius).toBe('12px');
    expect(badge.style.fontWeight).toBe('600');
    expect(badge.style.fontFamily).toContain('--font-body');
  });
});

describe('Sprint 007 HF-4 — buildOfferBadgeHtml inline string', () => {
  it('emits a span with the verbal label + data-variant attribute', () => {
    const html = buildOfferBadgeHtml('verbal');
    expect(html).toContain('Verbal Offer');
    expect(html).toContain('data-variant="verbal"');
    expect(html).toContain('data-testid="offer-badge"');
  });

  it('emits a span with the written label + data-variant attribute', () => {
    const html = buildOfferBadgeHtml('written');
    expect(html).toContain('Written Offer');
    expect(html).toContain('data-variant="written"');
  });

  it('returns empty string for unknown variants', () => {
    expect(buildOfferBadgeHtml('bogus')).toBe('');
    expect(buildOfferBadgeHtml(undefined)).toBe('');
    expect(buildOfferBadgeHtml(null)).toBe('');
  });
});

// ── Recruiting Scoreboard — Jesse Bargar / St Lawrence known-positive ────

describe('Sprint 007 HF-4 — Recruiting Scoreboard offer badges', () => {
  function makeStepsWithVerbal(stepCount = 15, verbalComplete = false, writtenComplete = false) {
    return Array.from({ length: stepCount }, (_, i) => {
      const id = i + 1;
      let completed = false;
      if (id === STEP_ID_VERBAL_OFFER && verbalComplete) completed = true;
      if (id === STEP_ID_WRITTEN_OFFER && writtenComplete) completed = true;
      // Mark step 4 (AC Contact) true — one of the seven Scoreboard-tracked
      // steps — so Quality > 0 and the row survives the HF-2 filter.
      if (id === 4) completed = true;
      return { step_id: id, completed };
    });
  }

  const PROFILE = {
    name: 'Jesse Bargar',
    grad_year: 2027,
    position: 'WR',
    height: 72,
    weight: 180,
    speed_40: 4.7,
    expected_starter: false,
    captain: false,
    all_conference: false,
    all_state: false,
  };

  it('renders the Verbal Offer badge under the school name for the St Lawrence known-positive', () => {
    const items = [
      {
        id: 12,
        unitid: 195216,
        school_name: 'St Lawrence University',
        conference: 'Liberty',
        div: 'D3',
        recruiting_journey_steps: makeStepsWithVerbal(15, /* verbal */ true, /* written */ false),
      },
    ];
    const { getByTestId, queryAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={PROFILE} />,
    );
    const badgeRow = getByTestId('scoreboard-offer-badges');
    expect(badgeRow).toBeTruthy();
    const badges = queryAllByTestId('offer-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute('data-variant')).toBe('verbal');
    expect(badges[0].textContent).toBe('Verbal Offer');
  });

  it('renders both badges side-by-side when both steps are complete', () => {
    const items = [
      {
        id: 1,
        unitid: 195216,
        school_name: 'St Lawrence University',
        conference: 'Liberty',
        div: 'D3',
        recruiting_journey_steps: makeStepsWithVerbal(15, true, true),
      },
    ];
    const { queryAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={PROFILE} />,
    );
    const badges = queryAllByTestId('offer-badge');
    expect(badges).toHaveLength(2);
    expect(badges.map((b) => b.getAttribute('data-variant'))).toEqual(['verbal', 'written']);
  });

  it('does NOT render badges when neither step is complete', () => {
    const items = [
      {
        id: 1,
        unitid: 195216,
        school_name: 'St Lawrence University',
        conference: 'Liberty',
        div: 'D3',
        recruiting_journey_steps: makeStepsWithVerbal(15, false, false),
      },
    ];
    const { queryByTestId, queryAllByTestId } = render(
      <RecruitingScoreboard items={items} studentProfile={PROFILE} />,
    );
    expect(queryByTestId('scoreboard-offer-badges')).toBeNull();
    expect(queryAllByTestId('offer-badge')).toHaveLength(0);
  });
});

// ── Shortlist slide-out chip rewiring ────────────────────────────────────

describe('Sprint 007 HF-4 — Shortlist slide-out offer chips', () => {
  function makeItem(verbalComplete = false, writtenComplete = false) {
    return {
      id: 1,
      unitid: 195216,
      school_name: 'St Lawrence University',
      conference: 'Liberty',
      div: 'D3',
      grit_fit_status: 'currently_recommended',
      grit_fit_labels: ['currently_recommended'],
      recruiting_journey_steps: [
        { step_id: STEP_ID_VERBAL_OFFER,  completed: verbalComplete },
        { step_id: STEP_ID_WRITTEN_OFFER, completed: writtenComplete },
      ],
      // No offer_status column — phantom in schema. Slide-out should ignore it
      // for verbal/written and read JSONB instead.
    };
  }

  it('renders three chips: Verbal Offer, Written Offer, Commitment — labels in that order', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen onClose={() => {}} item={makeItem(false, false)} />,
    );
    expect(getByTestId('sso-offer-verbal_offer').textContent).toBe('Verbal Offer');
    expect(getByTestId('sso-offer-committable_offer').textContent).toBe('Written Offer');
    expect(getByTestId('sso-offer-commitment').textContent).toBe('Commitment');
  });

  it('Verbal Offer chip is active when step 14 is complete', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen onClose={() => {}} item={makeItem(true, false)} />,
    );
    expect(getByTestId('sso-offer-verbal_offer').getAttribute('data-active')).toBe('true');
    expect(getByTestId('sso-offer-committable_offer').getAttribute('data-active')).toBe('false');
  });

  it('Written Offer chip is active when step 15 is complete', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen onClose={() => {}} item={makeItem(false, true)} />,
    );
    expect(getByTestId('sso-offer-verbal_offer').getAttribute('data-active')).toBe('false');
    expect(getByTestId('sso-offer-committable_offer').getAttribute('data-active')).toBe('true');
  });

  it('Commitment chip remains permanently inactive (placeholder per HF-4 carry-forward)', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen onClose={() => {}} item={makeItem(true, true)} />,
    );
    expect(getByTestId('sso-offer-commitment').getAttribute('data-active')).toBe('false');
  });
});

// ── SchoolDetailsCard accepts the new badge props ────────────────────────

describe('Sprint 007 HF-4 — SchoolDetailsCard offer badges', () => {
  const SCHOOL = {
    unitid: 195216,
    school_name: 'St Lawrence University',
    conference: 'Liberty',
    type: 'D3',
  };

  it('renders no badge slot when neither prop is true', () => {
    const { queryByTestId } = render(<SchoolDetailsCard school={SCHOOL} />);
    expect(queryByTestId('sdc-offer-badges')).toBeNull();
  });

  it('renders only the Verbal badge when verbalOffer is true', () => {
    const { getByTestId, queryAllByTestId } = render(
      <SchoolDetailsCard school={SCHOOL} verbalOffer />,
    );
    expect(getByTestId('sdc-offer-badges')).toBeTruthy();
    const badges = queryAllByTestId('offer-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute('data-variant')).toBe('verbal');
  });

  it('renders both badges when both props are true', () => {
    const { queryAllByTestId } = render(
      <SchoolDetailsCard school={SCHOOL} verbalOffer writtenOffer />,
    );
    const badges = queryAllByTestId('offer-badge');
    expect(badges).toHaveLength(2);
    expect(badges.map((b) => b.getAttribute('data-variant'))).toEqual(['verbal', 'written']);
  });
});
