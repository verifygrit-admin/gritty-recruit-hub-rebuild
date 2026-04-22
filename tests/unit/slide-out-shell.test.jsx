/**
 * @vitest-environment jsdom
 *
 * slide-out-shell.test.jsx — Sprint 004 SC-3
 *
 * Tests for the reusable content-agnostic SlideOutShell component.
 * Covers: visibility gating, backdrop/close/Escape handlers, body scroll
 * lock, ariaLabel wiring, focus transition, and side='left' smoke.
 *
 * Note: adds jsdom as an environment override (this test only). Vitest's
 * default env is still 'node' for every other unit test.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import SlideOutShell from '../../src/components/SlideOutShell.jsx';

afterEach(() => {
  cleanup();
  // Reset any residual body state between tests.
  document.body.style.overflow = '';
  document.body.classList.remove('slide-out-shell-scroll-lock');
});

describe('SlideOutShell', () => {
  it('does not render a dialog when isOpen=false', () => {
    const { queryByRole } = render(
      <SlideOutShell isOpen={false} onClose={() => {}}>
        <p>Hidden content</p>
      </SlideOutShell>
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders a dialog when isOpen=true', () => {
    const { queryByRole } = render(
      <SlideOutShell isOpen={true} onClose={() => {}}>
        <p>Visible content</p>
      </SlideOutShell>
    );
    expect(queryByRole('dialog')).not.toBeNull();
  });

  it('renders children inside the dialog', () => {
    const { getByRole, getByText } = render(
      <SlideOutShell isOpen={true} onClose={() => {}}>
        <p data-testid="child-content">Hello slide-out</p>
      </SlideOutShell>
    );
    const dialog = getByRole('dialog');
    const child = getByText('Hello slide-out');
    expect(dialog.contains(child)).toBe(true);
  });

  it('close button click fires onClose exactly once', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SlideOutShell isOpen={true} onClose={onClose}>
        <p>content</p>
      </SlideOutShell>
    );
    fireEvent.click(getByTestId('slide-out-shell-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click fires onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SlideOutShell isOpen={true} onClose={onClose}>
        <p>content</p>
      </SlideOutShell>
    );
    fireEvent.click(getByTestId('slide-out-shell-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key fires onClose when open', () => {
    const onClose = vi.fn();
    render(
      <SlideOutShell isOpen={true} onClose={onClose}>
        <p>content</p>
      </SlideOutShell>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key does NOT fire onClose when isOpen=false', () => {
    const onClose = vi.fn();
    render(
      <SlideOutShell isOpen={false} onClose={onClose}>
        <p>content</p>
      </SlideOutShell>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when isOpen toggles true, and unlocks when false', () => {
    const { rerender } = render(
      <SlideOutShell isOpen={false} onClose={() => {}}>
        <p>content</p>
      </SlideOutShell>
    );
    expect(document.body.classList.contains('slide-out-shell-scroll-lock')).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');

    rerender(
      <SlideOutShell isOpen={true} onClose={() => {}}>
        <p>content</p>
      </SlideOutShell>
    );
    expect(document.body.classList.contains('slide-out-shell-scroll-lock')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <SlideOutShell isOpen={false} onClose={() => {}}>
        <p>content</p>
      </SlideOutShell>
    );
    expect(document.body.classList.contains('slide-out-shell-scroll-lock')).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('ariaLabel prop is reflected on the dialog', () => {
    const { getByRole } = render(
      <SlideOutShell isOpen={true} onClose={() => {}} ariaLabel="School Details">
        <p>content</p>
      </SlideOutShell>
    );
    expect(getByRole('dialog').getAttribute('aria-label')).toBe('School Details');
  });

  it("side='left' renders without throwing (smoke)", () => {
    const { getByRole } = render(
      <SlideOutShell isOpen={true} onClose={() => {}} side="left">
        <p>content</p>
      </SlideOutShell>
    );
    // Still a dialog; layout differs but contract holds.
    expect(getByRole('dialog')).not.toBeNull();
  });

  it('moves focus into the panel when isOpen transitions to true', async () => {
    const { rerender, getByRole } = render(
      <SlideOutShell isOpen={false} onClose={() => {}}>
        <button>Inner</button>
      </SlideOutShell>
    );

    rerender(
      <SlideOutShell isOpen={true} onClose={() => {}}>
        <button>Inner</button>
      </SlideOutShell>
    );

    // Wait for the requestAnimationFrame focus move to run.
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        // Give React a microtask to flush too.
        setTimeout(resolve, 0);
      });
    });

    const dialog = getByRole('dialog');
    const active = document.activeElement;
    // Active element should be the panel itself or something inside it.
    expect(dialog === active || dialog.contains(active)).toBe(true);
  });
});
