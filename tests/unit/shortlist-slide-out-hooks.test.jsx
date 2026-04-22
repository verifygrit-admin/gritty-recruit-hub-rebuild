/**
 * @vitest-environment jsdom
 *
 * shortlist-slide-out-hooks.test.jsx — Sprint 004 Phase 1 F3.
 *
 * Regression guard for the "Rendered more hooks than during the previous
 * render" crash in ShortlistSlideOut. Root cause: a useMemo was placed AFTER
 * the `if (!isOpen || !item) return` early-return, so the hooks count
 * changed between open <-> closed renders. Fix: all hooks moved above the
 * early return.
 *
 * Also exercises the generic <ErrorBoundary> — asserts that a throwing
 * child triggers the fallback UI with a Retry button.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

// useIsNarrowViewport is mocked so we don't need real layout.
vi.mock('../../src/hooks/useIsNarrowViewport.js', () => ({
  default: () => false,
}));

import ShortlistSlideOut from '../../src/components/ShortlistSlideOut.jsx';
import ErrorBoundary from '../../src/components/ErrorBoundary.jsx';

afterEach(() => {
  cleanup();
});

const GOOD_ITEM = {
  id: 1,
  unitid: 999,
  school_name: 'Hooks Regression U',
  conference: 'Big Sky',
  div: 'FCS',
  dist: 100,
  added_at: '2026-03-15T12:00:00Z',
  q_link: 'https://example.edu/q',
  coach_link: 'https://example.edu/staff',
  grit_fit_labels: ['currently_recommended'],
  recruiting_journey_steps: [
    { step_id: 1, label: 'Added', completed: true },
    { step_id: 2, label: 'Next',  completed: false },
  ],
  coa: 30000,
  net_cost: 20000,
  droi: 3.5,
  break_even: 6.5,
};

describe('F3 — ShortlistSlideOut hooks order regression', () => {
  it('does not crash when the slide-out is rendered closed (isOpen=false, no item)', () => {
    expect(() =>
      render(<ShortlistSlideOut isOpen={false} onClose={() => {}} item={null} />)
    ).not.toThrow();
  });

  it('does not crash when the slide-out is rendered open with a valid item', () => {
    expect(() =>
      render(<ShortlistSlideOut isOpen={true} onClose={() => {}} item={GOOD_ITEM} />)
    ).not.toThrow();
  });

  it('opens and renders the school name after transitioning from closed -> open', () => {
    const { getByTestId, rerender } = render(
      <ShortlistSlideOut isOpen={false} onClose={() => {}} item={null} />
    );
    // Transition to open — this was the trigger for the hook-count mismatch.
    rerender(<ShortlistSlideOut isOpen={true} onClose={() => {}} item={GOOD_ITEM} />);
    expect(getByTestId('sso-school-name').textContent).toBe('Hooks Regression U');
  });

  it('re-renders cleanly going open -> closed -> open (hooks order stable)', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={GOOD_ITEM} />
    );
    expect(getByTestId('sso-school-name').textContent).toBe('Hooks Regression U');

    rerender(<ShortlistSlideOut isOpen={false} onClose={() => {}} item={null} />);
    // Closed render: no header rendered.
    expect(queryByTestId('sso-school-name')).toBeNull();

    rerender(<ShortlistSlideOut isOpen={true} onClose={() => {}} item={GOOD_ITEM} />);
    // Back to open; should NOT throw and should re-render the header.
    expect(getByTestId('sso-school-name').textContent).toBe('Hooks Regression U');
  });
});

describe('F3 — ErrorBoundary', () => {
  function Thrower() {
    throw new Error('boom');
  }

  it('catches a child throw and renders the default fallback UI', () => {
    // Silence React's error-in-test noise.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getByTestId } = render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    expect(getByTestId('error-boundary-retry')).toBeTruthy();
    errSpy.mockRestore();
  });

  it('retry button resets error state (re-mounts children)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function Toggler() {
      if (shouldThrow) throw new Error('boom');
      return <div data-testid="recovered">OK</div>;
    }
    const { getByTestId, queryByTestId } = render(
      <ErrorBoundary>
        <Toggler />
      </ErrorBoundary>
    );
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(getByTestId('error-boundary-retry'));
    expect(queryByTestId('error-boundary-fallback')).toBeNull();
    expect(getByTestId('recovered')).toBeTruthy();
    errSpy.mockRestore();
  });

  it('passes through children when no error is thrown', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <div data-testid="ok-child">fine</div>
      </ErrorBoundary>
    );
    expect(getByTestId('ok-child').textContent).toBe('fine');
  });
});
