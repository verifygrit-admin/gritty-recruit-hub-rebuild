/**
 * @vitest-environment jsdom
 *
 * cmg-preview-signature.test.jsx — Sprint 025 hotfix (2026-05-12)
 *
 * Operator-reported bug: switching to the Twitter channel still rendered the
 * email-style multi-line signature block (Class of [Grad Year], [Position],
 * etc.). Root cause: every scenario's twitter_signature_template held a
 * three-line email-shaped value. Fix: TWITTER_SIGNATURE → '' (empty string)
 * in src/data/cmgScenarios.ts; PreviewPane suppresses the signature <pre>
 * when the substituted signature is empty/whitespace-only.
 *
 * Coverage:
 *   1. Email channel renders email_signature_template lines for Scenario 2.
 *   2. Twitter channel does NOT render email_signature_template lines for
 *      Scenario 2 (no "Class of …", no Twitter link in signature region).
 *   3. Empty twitter_signature_template suppresses the signature <pre>
 *      element entirely (no empty box).
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import PreviewPane from '../../src/components/cmg/PreviewPane.jsx';
import { ToastProvider } from '../../src/components/Toast.jsx';
import { CMG_SCENARIOS } from '../../src/data/cmgScenarios.ts';

afterEach(() => {
  cleanup();
});

const profile = {
  name: 'Ayden Watkins',
  grad_year: 2027,
  position: 'WR',
  high_school: 'BC High',
  state: 'MA',
  gpa: '3.8',
  hudl_url: 'https://hudl.com/ayden',
  twitter: 'https://x.com/ayden',
  email: 'ayden@example.com',
};

const selectedSchool = { unitid: 100654, school_name: 'Alabama' };

const formByRecipient = {
  position_coach: { last_name: 'Saban' },
  recruiting_area_coach: { last_name: 'Riley' },
};

const scenario2 = CMG_SCENARIOS.find((s) => s.id === 2);

function renderPane(channel) {
  return render(
    <ToastProvider>
      <PreviewPane
        scenario={scenario2}
        profile={profile}
        channel={channel}
        selectedSchool={selectedSchool}
        form={{
          camp_name: 'Elite Camp',
          camp_location: 'Tuscaloosa',
          junior_day_question_text: '',
          camp_question_text: '',
        }}
        formByRecipient={formByRecipient}
        activeRecipient="position_coach"
        onActiveRecipientChange={() => {}}
        onLogAppend={() => {}}
        onReset={() => {}}
        userId={null}
      />
    </ToastProvider>,
  );
}

describe('PreviewPane — channel-aware signature rendering', () => {
  it('email channel renders the email signature block (Class of …, Twitter profile link)', () => {
    const { getByTestId, queryByTestId } = renderPane('email');
    const sig = queryByTestId('cmg-preview-signature');
    expect(sig).not.toBeNull();
    const sigText = sig.textContent;
    // Email signature is four lines — name, "Class of ..., Position", HS, Twitter link.
    expect(sigText).toContain('Ayden Watkins');
    expect(sigText).toContain('Class of 2027');
    expect(sigText).toContain('WR');
    expect(sigText).toContain('BC High');
    expect(sigText).toContain('https://x.com/ayden');
    // Body is rendered.
    expect(getByTestId('cmg-preview-body')).toBeTruthy();
  });

  it('twitter channel does NOT render the email signature block', () => {
    const { queryByTestId } = renderPane('twitter');
    // The signature <pre> is suppressed entirely when the twitter signature
    // template is empty.
    const sig = queryByTestId('cmg-preview-signature');
    expect(sig).toBeNull();

    // Body still renders, and any incidental occurrences of "Class of …" in
    // the body are fine — what we're guarding against is the four-line
    // email signature appearing in the signature region.
    const pane = queryByTestId('cmg-preview-pane');
    expect(pane).not.toBeNull();
    // The pane's full textContent must not contain the email-style four-line
    // signature sequence "Class of 2027, WR" (which only exists in the
    // signature template, not in the body).
    expect(pane.textContent).not.toContain('Class of 2027, WR');
  });

  it('empty twitter_signature_template suppresses the signature <pre> element', () => {
    // Sanity check on the data layer — every scenario's twitter signature is empty.
    for (const s of CMG_SCENARIOS) {
      expect(s.twitter_signature_template).toBe('');
    }
    // Render and assert the <pre data-testid="cmg-preview-signature"> is absent.
    const { container, queryByTestId } = renderPane('twitter');
    expect(queryByTestId('cmg-preview-signature')).toBeNull();
    // Also defensive — no <pre> element carrying the signature class.
    const sigPre = container.querySelector('pre.cmg-preview-signature');
    expect(sigPre).toBeNull();
  });
});
