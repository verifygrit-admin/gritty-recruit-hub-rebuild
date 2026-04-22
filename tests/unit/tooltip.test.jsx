/**
 * @vitest-environment jsdom
 *
 * tooltip.test.jsx — Sprint 004 SC-5 (Generic Tooltip primitive)
 *
 * Covers the accessibility + interaction contract of src/components/Tooltip.jsx.
 * Uses @testing-library/react's fireEvent (matches slide-out-shell.test.jsx
 * pattern — @testing-library/user-event is not installed in this repo).
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import Tooltip, {
  computeNextState,
  resolvePlacementStyle,
} from '../../src/components/Tooltip.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Tooltip — render + visibility', () => {
  // (a) Renders trigger; tooltip not visible by default
  it('renders trigger children; tooltip content hidden by default', () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    expect(getByText('trigger')).toBeTruthy();
    expect(queryByRole('tooltip')).toBeNull();
  });

  // (b) mouseenter reveals (after 150ms delay)
  it('tooltip appears on mouseenter after 150ms delay', () => {
    vi.useFakeTimers();
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text" showOn="hover"><button>trigger</button></Tooltip>
    );
    const trigger = getByTestId('tooltip-trigger');
    fireEvent.mouseEnter(trigger);
    // Not yet — still inside delay window
    expect(queryByRole('tooltip')).toBeNull();
    advance(160);
    expect(queryByRole('tooltip')).not.toBeNull();
  });

  // (c) mouseleave hides
  it('tooltip disappears on mouseleave', () => {
    vi.useFakeTimers();
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text" showOn="hover"><button>trigger</button></Tooltip>
    );
    const trigger = getByTestId('tooltip-trigger');
    fireEvent.mouseEnter(trigger);
    advance(160);
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.mouseLeave(trigger);
    expect(queryByRole('tooltip')).toBeNull();
  });

  // (d) focus reveals
  it('tooltip appears on keyboard focus', () => {
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    fireEvent.focus(getByTestId('tooltip-trigger'));
    expect(queryByRole('tooltip')).not.toBeNull();
  });

  // (e) blur hides
  it('tooltip disappears on blur', () => {
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    const trigger = getByTestId('tooltip-trigger');
    fireEvent.focus(trigger);
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.blur(trigger);
    expect(queryByRole('tooltip')).toBeNull();
  });

  // (f) tap mode: click reveals
  it('tooltip appears on click when showOn="tap"', () => {
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text" showOn="tap"><button>trigger</button></Tooltip>
    );
    fireEvent.click(getByTestId('tooltip-trigger'));
    expect(queryByRole('tooltip')).not.toBeNull();
  });

  // (g) tap outside dismisses
  it('tap outside dismisses tooltip in tap mode', () => {
    const { getByTestId, queryByRole } = render(
      <div>
        <Tooltip content="help text" showOn="tap"><button>trigger</button></Tooltip>
        <span data-testid="outside">outside</span>
      </div>
    );
    fireEvent.click(getByTestId('tooltip-trigger'));
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.mouseDown(getByTestId('outside'));
    expect(queryByRole('tooltip')).toBeNull();
  });

  // Bonus: Escape dismisses
  it('Escape key dismisses an open tooltip', () => {
    const { getByTestId, queryByRole } = render(
      <Tooltip content="help text" showOn="tap"><button>trigger</button></Tooltip>
    );
    fireEvent.click(getByTestId('tooltip-trigger'));
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('tooltip')).toBeNull();
  });
});

describe('Tooltip — accessibility wiring', () => {
  // (h) aria-describedby wired from trigger to tooltip
  it('aria-describedby on trigger matches tooltip id when visible', () => {
    const { getByTestId, getByRole } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    const trigger = getByTestId('tooltip-trigger');
    fireEvent.focus(trigger);
    const tooltip = getByRole('tooltip');
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toBe(tooltip.id);
  });

  it('aria-describedby is absent when tooltip is hidden', () => {
    const { getByTestId } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    expect(getByTestId('tooltip-trigger').getAttribute('aria-describedby')).toBeNull();
  });

  // (i) role="tooltip" on content node
  it('tooltip content element has role="tooltip"', () => {
    const { getByTestId, getByRole } = render(
      <Tooltip content="help text"><button>trigger</button></Tooltip>
    );
    fireEvent.focus(getByTestId('tooltip-trigger'));
    expect(getByRole('tooltip')).toBeTruthy();
  });

  it('ariaLabel prop is applied to tooltip content when provided', () => {
    const { getByTestId, getByRole } = render(
      <Tooltip content={<svg />} ariaLabel="Star rating">
        <button>trigger</button>
      </Tooltip>
    );
    fireEvent.focus(getByTestId('tooltip-trigger'));
    expect(getByRole('tooltip').getAttribute('aria-label')).toBe('Star rating');
  });
});

describe('Tooltip — placement smoke', () => {
  // (j) all four placements render without throwing
  it.each(['top', 'bottom', 'left', 'right'])(
    'renders with placement=%s without throwing',
    (placement) => {
      const { getByTestId, getByRole } = render(
        <Tooltip content="help" placement={placement}>
          <button>trigger</button>
        </Tooltip>
      );
      fireEvent.focus(getByTestId('tooltip-trigger'));
      expect(getByRole('tooltip')).toBeTruthy();
    }
  );
});

describe('Tooltip — exported helpers (pure logic)', () => {
  it('computeNextState encodes the visibility state machine', () => {
    expect(computeNextState({ visible: false, mode: 'hover' }, { type: 'mouseenter' }))
      .toEqual({ visible: true });
    expect(computeNextState({ visible: true, mode: 'hover' }, { type: 'mouseleave' }))
      .toEqual({ visible: false });
    expect(computeNextState({ visible: false, mode: 'tap' }, { type: 'mouseenter' }))
      .toEqual({ visible: false });
    expect(computeNextState({ visible: false, mode: 'tap' }, { type: 'click-trigger' }))
      .toEqual({ visible: true });
    expect(computeNextState({ visible: true, mode: 'tap' }, { type: 'click-trigger' }))
      .toEqual({ visible: false });
    expect(computeNextState({ visible: true, mode: 'both' }, { type: 'escape' }))
      .toEqual({ visible: false });
  });

  it('resolvePlacementStyle returns correct anchor CSS for each placement', () => {
    expect(resolvePlacementStyle('top').bottom).toBe('100%');
    expect(resolvePlacementStyle('bottom').top).toBe('100%');
    expect(resolvePlacementStyle('left').right).toBe('100%');
    expect(resolvePlacementStyle('right').left).toBe('100%');
    // Unknown falls back to top
    expect(resolvePlacementStyle('diagonal')).toEqual(resolvePlacementStyle('top'));
  });
});
