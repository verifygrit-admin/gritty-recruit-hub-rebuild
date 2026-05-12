/**
 * @vitest-environment jsdom
 *
 * cmg-gallery-helper-text.test.js — Sprint 025 hotfix
 *
 * Pins down the gallery's restored section subtitles and per-scenario helper
 * text from the prototype. Section subtitles and `.scenario-situation` strings
 * were dropped during the initial React scaffolding pass; this regression
 * test ensures they remain rendered.
 *
 * Source of truth for verbatim wording:
 *   prototypes/cmg/coach-message-generator.html (lines 930, 950, 938..1023)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import ScenarioGallery from '../../src/components/cmg/ScenarioGallery.jsx';
import {
  SECTION_SUBTITLE_PUBLIC_POSTS,
  SECTION_SUBTITLE_COACH_MESSAGES,
} from '../../src/data/cmgScenarios.ts';

afterEach(() => {
  cleanup();
});

function renderGallery() {
  return render(
    React.createElement(ScenarioGallery, {
      activeScenarioId: null,
      onSelect: () => {},
    }),
  );
}

describe('ScenarioGallery — section subtitles', () => {
  it('renders the Public Posts section subtitle verbatim from prototype', () => {
    const { container } = renderGallery();
    const el = container.querySelector(
      '#public-posts-section .cmg-gallery-section-subtitle',
    );
    expect(el).not.toBeNull();
    expect(el.textContent).toBe(SECTION_SUBTITLE_PUBLIC_POSTS);
    expect(el.textContent).toBe(
      'Broadcast posts on X/Twitter — visible to coaches and the public.',
    );
  });

  it('renders the Coach Messages section subtitle verbatim from prototype', () => {
    const { container } = renderGallery();
    const el = container.querySelector(
      '#coach-messages-section .cmg-gallery-section-subtitle',
    );
    expect(el).not.toBeNull();
    expect(el.textContent).toBe(SECTION_SUBTITLE_COACH_MESSAGES);
    expect(el.textContent).toBe(
      'Direct messages to coaches — email or Twitter DM.',
    );
  });
});

describe('ScenarioGallery — per-scenario helper text', () => {
  it('renders helper_text under each card title and pins Scenario 1 + 2 strings verbatim', () => {
    const { container } = renderGallery();

    // Scenario 1 — Public post
    const card1 = container.querySelector(
      '[data-testid="cmg-scenario-card-1"] .cmg-scenario-card-helper',
    );
    expect(card1).not.toBeNull();
    expect(card1.textContent).toBe(
      'I attended a camp and want to share my highlights with the coaches I worked with.',
    );

    // Scenario 2 — Coach message (Camp Follow-Up)
    const card2 = container.querySelector(
      '[data-testid="cmg-scenario-card-2"] .cmg-scenario-card-helper',
    );
    expect(card2).not.toBeNull();
    expect(card2.textContent).toBe(
      'I just attended a camp and want to follow up with a coach I met.',
    );

    // All 11 scenarios have helper text — gallery should render 11 helpers
    const allHelpers = container.querySelectorAll('.cmg-scenario-card-helper');
    expect(allHelpers).toHaveLength(11);
  });
});
