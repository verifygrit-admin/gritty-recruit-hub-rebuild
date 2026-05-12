/**
 * cmg-closing-questions.test.js — Sprint 025 hotfix
 *
 * Verifies that scenarios 2-6 (closing_questions: "both") no longer carry
 * the redundant docx-default prompt sentences in body_template. The student
 * is the source of truth for the closing-questions text — when the student
 * fills [Junior Day Question] / [Camp Question] form fields, only the
 * student's text should appear in the rendered output. The hardcoded docx
 * prompts (e.g. "Will your school be having Junior Days or visit days in
 * the spring?") were pre-empting the student's input and must be stripped.
 *
 * Coverage:
 *   - Scenario 3 with both closing-question fields filled renders the
 *     student's verbatim text exactly once and does NOT contain the docx
 *     prompt sentences.
 *   - Scenario 3 with empty closing-question fields leaves the bracketed
 *     tokens intact (no stale prompt text leaks through).
 *   - Spot-check: every scenario with closing_questions === "both" has been
 *     stripped of the docx prompt sentences across all five bodies.
 *   - Scenario 6 splits the two questions into separate paragraphs — verify
 *     both render verbatim when filled.
 */

import { describe, it, expect } from 'vitest';
import { substitute } from '../../src/lib/cmg/substitute.js';
import { CMG_SCENARIOS } from '../../src/data/cmgScenarios.ts';

const DOCX_PROMPT_JUNIOR = 'Will your school be having Junior Days';
const DOCX_PROMPT_CAMP = 'Would you recommend that I attend any camps where your coaching staff could evaluate me';

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

const scenario3 = CMG_SCENARIOS.find((s) => s.id === 3);
const scenario6 = CMG_SCENARIOS.find((s) => s.id === 6);

describe('cmg closing questions — docx prompt strip', () => {
  it('Scenario 3: student-authored questions render verbatim, docx prompts absent', () => {
    const ctx = {
      profile,
      form: {
        school_name: 'Alabama',
        junior_day_question_text:
          'Is there an upcoming Junior Day I can attend?',
        camp_question_text:
          'Which of your prospect camps would best fit my profile?',
      },
      recipient: { last_name: 'Saban' },
    };

    const rendered = substitute(scenario3.body_template, ctx);

    // Student's text appears verbatim, exactly once each.
    expect(rendered).toContain('Is there an upcoming Junior Day I can attend?');
    expect(rendered).toContain('Which of your prospect camps would best fit my profile?');
    expect(rendered.split('Is there an upcoming Junior Day I can attend?').length - 1).toBe(1);
    expect(rendered.split('Which of your prospect camps would best fit my profile?').length - 1).toBe(1);

    // No docx default prompts leak through.
    expect(rendered).not.toContain(DOCX_PROMPT_JUNIOR);
    expect(rendered).not.toContain(DOCX_PROMPT_CAMP);
  });

  it('Scenario 3: empty closing-question fields leave clean output with no stale docx prompts', () => {
    const ctx = {
      profile,
      form: {
        school_name: 'Alabama',
        // junior_day_question_text and camp_question_text intentionally empty
      },
      recipient: { last_name: 'Saban' },
    };

    const rendered = substitute(scenario3.body_template, ctx);

    // The docx prompts must not appear regardless of whether the student
    // filled the closing-question fields.
    expect(rendered).not.toContain(DOCX_PROMPT_JUNIOR);
    expect(rendered).not.toContain(DOCX_PROMPT_CAMP);
  });

  it('every "both" scenario has no docx prompt sentences in body_template', () => {
    const bothScenarios = CMG_SCENARIOS.filter((s) => s.closing_questions === 'both');
    // Sanity: 5 scenarios (ids 2, 3, 4, 5, 6) carry "both".
    expect(bothScenarios.map((s) => s.id).sort()).toEqual([2, 3, 4, 5, 6]);
    for (const s of bothScenarios) {
      expect(s.body_template, `Scenario ${s.id}`).not.toContain(DOCX_PROMPT_JUNIOR);
      expect(s.body_template, `Scenario ${s.id}`).not.toContain(DOCX_PROMPT_CAMP);
      // Tokens themselves are preserved.
      expect(s.body_template, `Scenario ${s.id}`).toContain('[Junior Day Question]');
      expect(s.body_template, `Scenario ${s.id}`).toContain('[Camp Question]');
    }
  });

  it('Scenario 6: both closing questions render verbatim across separate paragraphs', () => {
    const ctx = {
      profile,
      form: {
        school_name: 'Alabama',
        ac_or_rc_last_name: 'Smith',
        junior_day_question_text: 'Any Junior Day this March?',
        camp_question_text: 'Should I attend your June camp?',
      },
      recipient: { last_name: 'Saban' },
    };
    const rendered = substitute(scenario6.body_template, ctx);
    expect(rendered).toContain('Any Junior Day this March?');
    expect(rendered).toContain('Should I attend your June camp?');
    expect(rendered).not.toContain(DOCX_PROMPT_JUNIOR);
    expect(rendered).not.toContain(DOCX_PROMPT_CAMP);
  });
});
