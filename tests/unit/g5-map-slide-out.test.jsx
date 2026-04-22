/**
 * @vitest-environment jsdom
 *
 * g5-map-slide-out.test.jsx — Sprint 004 Wave 3 G5
 *
 * Covers <GritFitMapWithSlideOut> — the wrapper that replaces the legacy
 * Leaflet popup (from GritFitMapView.jsx buildPopupHtml) with an SC-3
 * SlideOutShell containing an SC-4 SchoolDetailsCard.
 *
 * Leaflet cannot instantiate cleanly in jsdom (requires real DOM measurement
 * APIs that jsdom stubs poorly), so GritFitMapView is mocked at the module
 * boundary via vi.mock. The mock captures the onSchoolMarkerClick prop passed
 * by the wrapper and exposes it for direct invocation — this is what lets us
 * assert the wrapper's slide-out opens in response to a "marker click" without
 * booting real Leaflet.
 *
 * Assertions:
 *   a) Wrapper renders the (mocked) GritFitMapView
 *   b) Slide-out is closed initially (no dialog rendered)
 *   c) Invoking the captured onSchoolMarkerClick opens the slide-out and
 *      renders the school name
 *   d) SchoolDetailsCard receives the correct school (testid-based lookup)
 *   e) statusKey derived from computeGritFitStatuses — 'currently_recommended'
 *      fixture yields the matching StatusPill label
 *   f) 'outside_geographic_reach' fixture yields its matching label
 *   g) Empty-status fixture renders NO StatusPill (A-2 regression guard)
 *   h) Close button click closes the slide-out
 *   i) Backdrop click closes the slide-out
 *   j) Escape key closes the slide-out
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';

// Module-scoped capture for the onSchoolMarkerClick callback the wrapper
// passes into the (mocked) GritFitMapView. Reset between tests.
let capturedOnMarkerClick = null;

vi.mock('../../src/components/GritFitMapView.jsx', () => ({
  default: (props) => {
    capturedOnMarkerClick = props.onSchoolMarkerClick || null;
    return (
      <div data-testid="mock-gritfit-map-view">
        mock-map (schools: {props.schools ? props.schools.length : 0})
      </div>
    );
  },
}));

// Import AFTER the mock is registered.
import GritFitMapWithSlideOut from '../../src/components/GritFitMapWithSlideOut.jsx';

// ── Fixtures ─────────────────────────────────────────────────────────────
// TIER_ORDER = ['Power 4', 'G6', 'FCS', 'D2', 'D3'].

// Fixture 1 — 'currently_recommended' only. eligible + matchRank <= 50.
// schoolRigor=0 suppresses both academic labels. topTier === schoolTier and
// both indices valid (no athletic-reach hit). dist <= recruitReach.
const recommendedSchool = {
  unitid: 1001,
  school_name: 'Recommended U',
  type: 'FCS',
  conference: 'Ivy League',
  city: 'Boston',
  state: 'MA',
  eligible: true,
  matchRank: 5,
  dist: 50,
  schoolRigor: 0,
  athleteAcad: 0,
};

// Fixture 2 — 'outside_geographic_reach' only. ineligible (no recommended),
// schoolRigor=0 (no academic), schoolTier==topTier (no athletic), dist >
// recruitReach.
const geoSchool = {
  unitid: 1002,
  school_name: 'Faraway U',
  type: 'FCS',
  conference: 'Patriot',
  city: 'Seattle',
  state: 'WA',
  eligible: false,
  matchRank: 999,
  dist: 5000,
  schoolRigor: 0,
  athleteAcad: 0,
};

// Fixture 3 — no applicable labels. Everything lined up so every gate is
// skipped. A-2 regression: empty array -> null statusKey -> no pill.
const neutralSchool = {
  unitid: 1003,
  school_name: 'Neutral U',
  type: 'FCS',
  conference: 'Big Sky',
  city: 'Missoula',
  state: 'MT',
  eligible: false,
  matchRank: 999,
  dist: 100,
  schoolRigor: 0,
  athleteAcad: 0,
};

// topTier is shared across the non-neutral cases. recruitReach=500 lets us
// push geoSchool (dist=5000) out of range while keeping the others in range.
const topTier = 'FCS';
const recruitReach = 500;

// ── Hooks ────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedOnMarkerClick = null;
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  document.body.classList.remove('slide-out-shell-scroll-lock');
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('GritFitMapWithSlideOut (Sprint 004 G5)', () => {
  it('renders the (mocked) GritFitMapView', () => {
    const { getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    expect(getByTestId('mock-gritfit-map-view')).toBeTruthy();
  });

  it('slide-out is closed initially (no dialog rendered)', () => {
    const { queryByRole } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('invoking onSchoolMarkerClick opens the slide-out and renders the school name', () => {
    const { queryByRole, getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    expect(capturedOnMarkerClick).toBeTypeOf('function');

    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });

    const dialog = queryByRole('dialog');
    expect(dialog).not.toBeNull();
    const nameNode = getByTestId('sdc-school-name');
    expect(nameNode.textContent).toBe('Recommended U');
  });

  it('SchoolDetailsCard receives the correct school (testid reflects unitid)', () => {
    const { getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });
    // SchoolDetailsCard emits data-testid={`school-details-card-${unitid}`}
    expect(getByTestId(`school-details-card-${recommendedSchool.unitid}`)).toBeTruthy();
  });

  it("statusKey derived from computeGritFitStatuses — 'currently_recommended' fixture yields 'Currently Recommended' pill", () => {
    const { getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });
    const pill = getByTestId('status-pill');
    expect(pill.getAttribute('data-status')).toBe('currently_recommended');
    expect(pill.textContent).toBe('Currently Recommended');
  });

  it("statusKey derived from computeGritFitStatuses — 'outside_geographic_reach' fixture yields 'Outside Geographic Reach' pill", () => {
    const { getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[geoSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(geoSchool);
    });
    const pill = getByTestId('status-pill');
    expect(pill.getAttribute('data-status')).toBe('outside_geographic_reach');
    expect(pill.textContent).toBe('Outside Geographic Reach');
  });

  it('empty-status school yields NO StatusPill (A-2 regression guard)', () => {
    // Silence the diagnostic console.warn emitted by computeGritFitStatuses
    // when no label applies — the empty-label path is intentional here.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { queryByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[neutralSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(neutralSchool);
    });
    // Card is rendered but no pill.
    expect(queryByTestId(`school-details-card-${neutralSchool.unitid}`)).toBeTruthy();
    expect(queryByTestId('status-pill')).toBeNull();
    // Additionally: the pill wrapper slot is gated by statusKey being truthy,
    // so the sdc-status-slot should also be absent.
    expect(queryByTestId('sdc-status-slot')).toBeNull();

    warnSpy.mockRestore();
  });

  it('close button click closes the slide-out', () => {
    const { queryByRole, getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });
    expect(queryByRole('dialog')).not.toBeNull();

    fireEvent.click(getByTestId('slide-out-shell-close'));
    expect(queryByRole('dialog')).toBeNull();
  });

  it('backdrop click closes the slide-out', () => {
    const { queryByRole, getByTestId } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });
    expect(queryByRole('dialog')).not.toBeNull();

    fireEvent.click(getByTestId('slide-out-shell-backdrop'));
    expect(queryByRole('dialog')).toBeNull();
  });

  it('Escape key closes the slide-out', () => {
    const { queryByRole } = render(
      <GritFitMapWithSlideOut
        schools={[recommendedSchool]}
        topTier={topTier}
        recruitReach={recruitReach}
      />
    );
    act(() => {
      capturedOnMarkerClick(recommendedSchool);
    });
    expect(queryByRole('dialog')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByRole('dialog')).toBeNull();
  });
});
