/**
 * cmg-substitute.test.js — Sprint 025 Phase 5A
 *
 * Covers the token substitution engine in src/lib/cmg/substitute.js:
 *   - substitute(): profile resolution, unfilled-token preservation, derived
 *     [Abbrev Grad Year], and token variant tolerance ([School Namel] /
 *     [School Name] both resolve from ctx.form.school_name).
 *   - substituteToSegments(): emits autofilled / unfilled / text correctly
 *     for a mixed template.
 *   - getRequiredFieldsFilled(): true when all required fields filled, false
 *     otherwise (with ctx.recipient fallback for last_name).
 */

import { describe, it, expect } from 'vitest';
import {
  substitute,
  substituteToSegments,
  getRequiredFieldsFilled,
} from '../../src/lib/cmg/substitute.js';
import { CMG_SCENARIOS } from '../../src/data/cmgScenarios.ts';

const profile = {
  name: 'Ayden Watkins',
  grad_year: 2027,
  position: 'WR',
  high_school: 'BC High',
  state: 'MA',
  gpa: '3.8',
  hudl_url: 'https://hudl.com/ayden',
  twitter: 'https://x.com/ayden',
};

describe('substitute — plain text', () => {
  it('resolves a profile token and a derived [Abbrev Grad Year]', () => {
    const result = substitute('I am [Position] [Abbrev Grad Year].', { profile, form: {} });
    expect(result).toBe("I am WR '27.");
  });

  it('leaves an unfilled token intact in the output', () => {
    const result = substitute('Hi Coach [Last Name],', { profile, form: {}, recipient: {} });
    expect(result).toBe('Hi Coach [Last Name],');
  });

  it('resolves both [School Name] and the [School Namel] typo variant from form.school_name', () => {
    const ctx = { profile, form: { school_name: 'Alabama' } };
    expect(substitute('[School Name] / [School Namel]', ctx)).toBe('Alabama / Alabama');
  });
});

describe('substituteToSegments — segmented output', () => {
  it('emits autofilled / unfilled / text segments for a mixed template', () => {
    const ctx = {
      profile,
      form: { school_name: 'Alabama' },
      recipient: {}, // last_name unfilled
    };
    const segs = substituteToSegments('Hi Coach [Last Name], from [Position] at [School Name].', ctx);
    // Expect: "Hi Coach " (text), "[Last Name]" (unfilled), ", from " (text),
    //         "WR" (autofilled), " at " (text), "Alabama" (text — form-filled
    //         merges with surrounding text), "." (text — merged into "Alabama").
    expect(segs).toEqual([
      { kind: 'text', value: 'Hi Coach ' },
      { kind: 'unfilled', value: '[Last Name]' },
      { kind: 'text', value: ', from ' },
      { kind: 'autofilled', value: 'WR' },
      { kind: 'text', value: ' at Alabama.' },
    ]);
  });
});

describe('getRequiredFieldsFilled — phase-advance gate', () => {
  const scenario = {
    required_form_fields: ['school_name', 'last_name'],
  };

  it('returns true when every required field has a value (form OR recipient)', () => {
    const ctx = {
      form: { school_name: 'Alabama' },
      recipient: { last_name: 'Saban' },
    };
    expect(getRequiredFieldsFilled(scenario, ctx)).toBe(true);
  });

  it('returns false when a required field is missing or empty', () => {
    const ctx = {
      form: { school_name: 'Alabama' },
      recipient: { last_name: '' },
    };
    expect(getRequiredFieldsFilled(scenario, ctx)).toBe(false);
  });

  it('returns true for an empty required_form_fields list', () => {
    expect(getRequiredFieldsFilled({ required_form_fields: [] }, { form: {} })).toBe(true);
  });
});

describe('substitute — Scenario 1 end-to-end', () => {
  it('Scenario 1 substitution renders all three required fields filled', () => {
    const scenario1 = CMG_SCENARIOS.find((s) => s.id === 1);
    expect(scenario1).toBeDefined();

    const ctx = {
      profile: {
        ...profile,
        grad_year: 2027,
        position: 'LB',
      },
      form: {
        camp_name: 'Boston College Elite Camp',
        position_coach_handle: 'CoachJones',
        head_coach_handle: 'CoachSmith',
      },
    };

    const rendered = substitute(scenario1.body_template, ctx);

    // All three form fields substituted into their token slots.
    expect(rendered).toContain('Boston College Elite Camp');
    expect(rendered).toContain('@CoachJones');
    expect(rendered).toContain('@CoachSmith');
    // Profile token [Position] resolved from profile.position.
    expect(rendered).toContain('LB');

    // The only remaining bracketed sequence should be the static instructional
    // placeholder [Attach Twitter Video Highlights from Camp]. Its source
    // field (attach_video_note) is intentionally unfilled in v1 — accepted.
    const bracketed = rendered.match(/\[[^\]]+\]/g) ?? [];
    expect(bracketed).toEqual(['[Attach Twitter Video Highlights from Camp]']);
  });
});
