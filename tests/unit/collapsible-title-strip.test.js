/**
 * collapsible-title-strip.test.js — Sprint 004 SC-1
 *
 * CollapsibleTitleStrip is a pure presentational component. Vitest runs in
 * node env without jsdom (see journey-stepper.test.js for the same note), so
 * we test by invoking the component as a function and walking the returned
 * React element tree. Playwright is the rendering-layer backstop in Wave 3
 * once this is wired into G1/G4a/S1a.
 *
 * Coverage:
 *   a) Renders the title string
 *   b) aria-expanded=true when isCollapsed=false
 *   c) aria-expanded=false when isCollapsed=true
 *   d) onToggle fires once on click
 *   e) onToggle fires on Enter
 *   f) onToggle fires on Space
 *   g) desktop and mobile variants both render without throwing
 *   h) chevron reflects state (via data-collapsed + rotation transform)
 */

import { describe, it, expect, vi } from 'vitest';
import CollapsibleTitleStrip from '../../src/components/CollapsibleTitleStrip.jsx';

// Walk a React element tree and collect every node whose props match the
// supplied predicate. Handles arrays, primitive children, and functional
// components that returned a single root element.
function findAll(node, predicate, acc = []) {
  if (node == null || typeof node === 'boolean') return acc;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, acc);
    return acc;
  }
  if (typeof node !== 'object' || !node.props) return acc;
  if (predicate(node)) acc.push(node);
  const children = node.props.children;
  if (children !== undefined) findAll(children, predicate, acc);
  return acc;
}

function findOne(node, predicate) {
  const hits = findAll(node, predicate);
  return hits[0] || null;
}

// Collect every primitive text node in the tree.
function collectText(node, acc = []) {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const c of node) collectText(c, acc);
    return acc;
  }
  if (typeof node === 'object' && node.props && node.props.children !== undefined) {
    collectText(node.props.children, acc);
  }
  return acc;
}

function render(props) {
  return CollapsibleTitleStrip(props);
}

describe('CollapsibleTitleStrip', () => {
  const baseProps = {
    title: 'Athletic Fit',
    isCollapsed: false,
    onToggle: () => {},
  };

  it('a) renders the title string', () => {
    const tree = render(baseProps);
    const titleNode = findOne(
      tree,
      (n) => n.props && n.props['data-testid'] === 'collapsible-title-strip-title',
    );
    expect(titleNode).toBeTruthy();
    expect(collectText(titleNode).join('')).toBe('Athletic Fit');
  });

  it('b) aria-expanded=true when isCollapsed=false', () => {
    const tree = render({ ...baseProps, isCollapsed: false });
    expect(tree.props['aria-expanded']).toBe(true);
  });

  it('c) aria-expanded=false when isCollapsed=true', () => {
    const tree = render({ ...baseProps, isCollapsed: true });
    expect(tree.props['aria-expanded']).toBe(false);
  });

  it('d) onToggle fires exactly once on click', () => {
    const onToggle = vi.fn();
    const tree = render({ ...baseProps, onToggle });
    // Simulate click — React's onClick receives a synthetic event; our
    // component ignores the event arg and just calls onToggle().
    tree.props.onClick({ type: 'click' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('e) onToggle fires on Enter keydown', () => {
    const onToggle = vi.fn();
    const tree = render({ ...baseProps, onToggle });
    const preventDefault = vi.fn();
    tree.props.onKeyDown({ key: 'Enter', preventDefault });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('f) onToggle fires on Space keydown', () => {
    const onToggle = vi.fn();
    const tree = render({ ...baseProps, onToggle });
    const preventDefault = vi.fn();
    tree.props.onKeyDown({ key: ' ', preventDefault });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('f.1) ignores other keys (sanity — no spurious onToggle)', () => {
    const onToggle = vi.fn();
    const tree = render({ ...baseProps, onToggle });
    tree.props.onKeyDown({ key: 'Tab', preventDefault: () => {} });
    tree.props.onKeyDown({ key: 'a', preventDefault: () => {} });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('g) renders for variant="desktop" without throwing', () => {
    const tree = render({ ...baseProps, variant: 'desktop' });
    expect(tree).toBeTruthy();
    expect(tree.props['data-variant']).toBe('desktop');
    // Desktop type-size sanity — larger than mobile (~18px target).
    expect(tree.props.style.fontSize).toBe('1.125rem');
  });

  it('g) renders for variant="mobile" without throwing', () => {
    const tree = render({ ...baseProps, variant: 'mobile' });
    expect(tree).toBeTruthy();
    expect(tree.props['data-variant']).toBe('mobile');
    // Mobile type-size sanity — tighter than desktop (~16px target).
    expect(tree.props.style.fontSize).toBe('1rem');
  });

  it('h) chevron reflects state via data-collapsed and transform', () => {
    const expanded = render({ ...baseProps, isCollapsed: false });
    expect(expanded.props['data-collapsed']).toBe('false');
    const expandedChevron = findOne(
      expanded,
      (n) => n.props && n.props['data-testid'] === 'collapsible-title-strip-chevron',
    );
    expect(expandedChevron).toBeTruthy();
    expect(expandedChevron.props.style.transform).toBe('rotate(0deg)');

    const collapsed = render({ ...baseProps, isCollapsed: true });
    expect(collapsed.props['data-collapsed']).toBe('true');
    const collapsedChevron = findOne(
      collapsed,
      (n) => n.props && n.props['data-testid'] === 'collapsible-title-strip-chevron',
    );
    expect(collapsedChevron).toBeTruthy();
    expect(collapsedChevron.props.style.transform).toBe('rotate(-90deg)');
  });

  it('renders with brand-maroon background and brand-gold text', () => {
    // Color tokens sourced from src/index.css:
    //   --brand-maroon: #8B3A3A
    //   --brand-gold:   #D4AF37
    const tree = render(baseProps);
    expect(tree.props.style.backgroundColor).toBe('#8B3A3A');
    expect(tree.props.style.color).toBe('#D4AF37');
  });

  it('is keyboard-focusable (tabIndex=0, role="button")', () => {
    const tree = render(baseProps);
    expect(tree.props.role).toBe('button');
    expect(tree.props.tabIndex).toBe(0);
  });

  it('wires aria-controls when provided', () => {
    const tree = render({ ...baseProps, ariaControls: 'fit-score-region' });
    expect(tree.props['aria-controls']).toBe('fit-score-region');
  });

  it('sets id when provided', () => {
    const tree = render({ ...baseProps, id: 'fit-strip' });
    expect(tree.props.id).toBe('fit-strip');
  });
});
