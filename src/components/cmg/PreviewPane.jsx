import { useMemo } from 'react';
import { substituteToSegments } from '../../lib/cmg/substitute.js';

/**
 * PreviewPane — right pane of MessageBuilder. Renders the substituted
 * preview body + subject + signature, with channel-aware visibility,
 * interactive recipient tabs, and Copy / Email-to-Self / Reset action
 * buttons (disabled — Phase 7 wires them).
 *
 * Sprint 025 Phase 6 — full implementation.
 *   - Body / subject / signature rendered as segmented spans
 *     (autofilled = sand-tinted, unfilled = burnt-orange dotted,
 *      plain text = inline).
 *   - Recipient tabs are interactive — clicking a tab calls
 *     onActiveRecipientChange(key); the body re-renders against that
 *     recipient's form slice (formByRecipient[activeRecipient]).
 *   - Subject is null-aware: scenarios #5/#9/#10/#11 show a muted
 *     "(no subject — preserves thread)" placeholder.
 *   - RC callout is unconditional for kind === 'coach_message'.
 *
 * Spec references: SPEC_FOR_CODE Step 3 (preview), Step 7 (actions),
 * DESIGN_NOTES D3.4 (preview), D3.7 (RC callout unconditional).
 */

/**
 * Render a Segment[] array into a React children list. Each segment becomes
 * either a plain string (kind === 'text') or a styled <span> for autofilled
 * and unfilled tokens. A stable key is required because adjacent text
 * segments are already merged by substituteToSegments — index keys are safe.
 */
function renderSegmentsToReact(segments, keyPrefix) {
  return segments.map((seg, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (seg.kind === 'autofilled') {
      return (
        <span
          key={key}
          className="cmg-token-placeholder cmg-token-placeholder--autofilled"
          data-token-kind="autofilled"
        >
          {seg.value}
        </span>
      );
    }
    if (seg.kind === 'unfilled') {
      return (
        <span
          key={key}
          className="cmg-token-placeholder"
          data-token-kind="unfilled"
        >
          {seg.value}
        </span>
      );
    }
    // kind === 'text' — plain string node; React handles whitespace + newlines
    // correctly inside the surrounding <pre> (white-space: pre-wrap).
    return <span key={key}>{seg.value}</span>;
  });
}

/**
 * Human-friendly label for a recipient tab key.
 */
function recipientLabel(key) {
  switch (key) {
    case 'position_coach':
      return 'Position Coach';
    case 'recruiting_area_coach':
      return 'Recruiting Area Coach';
    case 'head_coach':
      return 'Head Coach';
    default:
      return key;
  }
}

export default function PreviewPane({
  scenario,
  profile,
  channel,
  selectedSchool,
  form,
  formByRecipient,
  activeRecipient,
  onActiveRecipientChange,
}) {
  // Substitution context — recipient slice flips with activeRecipient so the
  // body re-substitutes [Last Name] (and any other recipient-sourced token)
  // against the currently-selected coach.
  const ctx = useMemo(
    () => ({
      profile: profile ?? {},
      form: { ...(form ?? {}), school_name: selectedSchool?.school_name ?? '' },
      recipient: formByRecipient?.[activeRecipient] ?? {},
      selectedSchool: selectedSchool ?? null,
    }),
    [profile, form, selectedSchool, formByRecipient, activeRecipient],
  );

  // Compute segment arrays. Memoized so re-renders that don't touch ctx /
  // scenario / channel skip the tokenizer.
  const subjectSegments = useMemo(() => {
    if (!scenario) return null;
    if (scenario.email_subject_template === null) return null;
    return substituteToSegments(scenario.email_subject_template, ctx);
  }, [scenario, ctx]);

  const bodySegments = useMemo(() => {
    if (!scenario) return [];
    return substituteToSegments(scenario.body_template, ctx);
  }, [scenario, ctx]);

  const signatureSegments = useMemo(() => {
    if (!scenario) return [];
    const template =
      channel === 'twitter'
        ? scenario.twitter_signature_template
        : scenario.email_signature_template;
    return substituteToSegments(template, ctx);
  }, [scenario, ctx, channel]);

  if (!scenario) return null;

  // Recipient tabs — exclude broadcast (Scenario 1 — no per-coach view) and
  // recruiting_coordinator (RC is a static callout, not a tab). head_coach
  // gets its own tab when present (Scenario 6 routes to it).
  const tabRecipients =
    scenario.kind === 'coach_message'
      ? scenario.applies_to_recipients.filter(
          (r) => r !== 'broadcast' && r !== 'recruiting_coordinator',
        )
      : [];

  const showSubjectRow = channel === 'email';
  const subjectIsNull = scenario.email_subject_template === null;

  return (
    <div
      className="cmg-preview-pane"
      data-testid="cmg-preview-pane"
      data-channel={channel}
      data-scenario-id={scenario.id}
    >
      <header className="cmg-preview-header">
        <span className="cmg-preview-format-badge" data-format={channel}>
          {channel === 'twitter' ? 'Twitter DM' : 'Email'}
        </span>
      </header>

      {tabRecipients.length > 0 && (
        <div
          className="cmg-preview-recipient-tabs"
          role="tablist"
          aria-label="Recipient"
        >
          {tabRecipients.map((r) => {
            const isActive = activeRecipient === r;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cmg-preview-recipient-tab${isActive ? ' is-active' : ''}`}
                onClick={() => onActiveRecipientChange?.(r)}
                data-recipient={r}
              >
                {recipientLabel(r)}
              </button>
            );
          })}
        </div>
      )}

      {showSubjectRow && (
        <section className="cmg-preview-subject" aria-label="Email subject">
          <span className="cmg-preview-label">Subject:</span>{' '}
          {subjectIsNull ? (
            <em
              className="cmg-preview-subject-empty"
              data-testid="cmg-preview-subject-empty"
            >
              (no subject — preserves thread)
            </em>
          ) : (
            <span data-testid="cmg-preview-subject">
              {renderSegmentsToReact(subjectSegments, 'subj')}
            </span>
          )}
        </section>
      )}

      <article className="cmg-preview-body" aria-label="Message body">
        <pre className="cmg-preview-pre" data-testid="cmg-preview-body">
          {renderSegmentsToReact(bodySegments, 'body')}
        </pre>
        <pre
          className="cmg-preview-pre cmg-preview-signature"
          data-testid="cmg-preview-signature"
        >
          {renderSegmentsToReact(signatureSegments, 'sig')}
        </pre>
      </article>

      {scenario.kind === 'coach_message' && (
        <aside
          className="cmg-preview-rc-callout"
          role="note"
          data-testid="cmg-preview-rc-callout"
        >
          If you can't find the Recruiting Area Coach, send to the Recruiting
          Coordinator.
        </aside>
      )}

      <footer className="cmg-preview-actions">
        <button type="button" className="cmg-preview-action" disabled>
          📋 Copy Message
        </button>
        <button type="button" className="cmg-preview-action" disabled>
          ✉ Email to Myself
        </button>
        <button
          type="button"
          className="cmg-preview-action cmg-preview-action--reset"
          disabled
        >
          ↻ Reset Form
        </button>
      </footer>
    </div>
  );
}
