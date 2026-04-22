/**
 * @vitest-environment jsdom
 *
 * s1a-prereaddocs-collapse.test.jsx — Sprint 004 Wave 3a (S1a)
 *
 * Verifies the Pre-Read Docs Library (src/components/PreReadLibrary.jsx) wraps
 * its header with the SC-1 <CollapsibleTitleStrip>, defaults to expanded,
 * toggles body visibility on click, and uses the S1b copy constant
 * PRE_READ_DOCS_EXPLAINER from src/lib/copy/shortlistCopy.js (not hardcoded).
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import PreReadLibrary from '../../src/components/PreReadLibrary.jsx';
import { PRE_READ_DOCS_EXPLAINER } from '../../src/lib/copy/shortlistCopy.js';

afterEach(() => {
  cleanup();
});

function renderLibrary(overrides = {}) {
  const props = {
    userId: 'user-1',
    libraryDocs: [],
    onUpload: async () => {},
    onDelete: async () => {},
    uploadingSlot: null,
    deletingSlot: null,
    ...overrides,
  };
  return render(<PreReadLibrary {...props} />);
}

describe('S1a — Pre-Read Docs Library collapsibility', () => {
  it('(a) renders the CollapsibleTitleStrip with the expected title', () => {
    const { getByTestId } = renderLibrary();
    const strip = getByTestId('collapsible-title-strip');
    expect(strip).toBeTruthy();
    const title = getByTestId('collapsible-title-strip-title');
    expect(title.textContent).toBe('Pre-Read Docs Library');
  });

  it('(b) body shows the S1b explainer copy (Feb 1 Junior Year substring)', () => {
    const { getByTestId } = renderLibrary();
    const explainer = getByTestId('pre-read-library-explainer');
    expect(explainer.textContent).toContain('February 1st of your Junior Year');
  });

  it('(c) body is hidden when collapsed', () => {
    const { getByTestId, queryByTestId } = renderLibrary();
    // Starts expanded — body present
    expect(queryByTestId('pre-read-library-body')).toBeTruthy();
    // Collapse
    fireEvent.click(getByTestId('collapsible-title-strip'));
    expect(queryByTestId('pre-read-library-body')).toBeNull();
    expect(queryByTestId('pre-read-library-explainer')).toBeNull();
  });

  it('(d) clicking the strip toggles collapsed state', () => {
    const { getByTestId, queryByTestId } = renderLibrary();
    const strip = getByTestId('collapsible-title-strip');
    // Expanded initially
    expect(strip.getAttribute('aria-expanded')).toBe('true');
    // Click → collapse
    fireEvent.click(strip);
    expect(strip.getAttribute('aria-expanded')).toBe('false');
    expect(queryByTestId('pre-read-library-body')).toBeNull();
    // Click → expand again
    fireEvent.click(strip);
    expect(strip.getAttribute('aria-expanded')).toBe('true');
    expect(queryByTestId('pre-read-library-body')).toBeTruthy();
  });

  it('(e) defaults to expanded on first render', () => {
    const { getByTestId } = renderLibrary();
    const strip = getByTestId('collapsible-title-strip');
    expect(strip.getAttribute('aria-expanded')).toBe('true');
    expect(strip.getAttribute('data-collapsed')).toBe('false');
    expect(getByTestId('pre-read-library-body')).toBeTruthy();
  });

  it('(f) uses the imported shortlistCopy constant (not a re-hardcoded string)', () => {
    const { getByTestId } = renderLibrary();
    const explainer = getByTestId('pre-read-library-explainer');
    // Exact match against the imported constant — proves the component reads
    // from src/lib/copy/shortlistCopy.js rather than inlining a literal.
    expect(explainer.textContent).toBe(PRE_READ_DOCS_EXPLAINER);
  });
});
