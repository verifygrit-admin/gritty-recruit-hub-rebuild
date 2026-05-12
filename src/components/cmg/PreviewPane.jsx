import { useMemo } from 'react';
import { substitute } from '../../lib/cmg/substitute.js';

/**
 * PreviewPane — right pane of MessageBuilder. Renders the substituted
 * preview body + subject + signature, with channel toggle visibility,
 * recipient tabs, and Copy / Email-to-Self / Reset action buttons.
 *
 * Sprint 025 Phase 4 — scaffold renders raw substituted text. Phase 6
 * wires the segmented renderer (unfilled / autofilled / plain spans),
 * recipient tab behavior, and unconditional Recruiting Coordinator
 * callout. Phase 7 wires the action buttons.
 */
export default function PreviewPane({
  scenario,
  profile,
  channel,
  selectedSchool,
  form,
  formByRecipient,
  activeRecipient,
}) {
  const ctx = useMemo(
    () => ({
      profile: profile ?? {},
      form: { ...(form ?? {}), school_name: selectedSchool?.school_name ?? '' },
      recipient: formByRecipient?.[activeRecipient] ?? {},
      selectedSchool: selectedSchool ?? null,
    }),
    [profile, form, selectedSchool, formByRecipient, activeRecipient],
  );

  if (!scenario) return null;

  const subject =
    scenario.email_subject_template !== null
      ? substitute(scenario.email_subject_template, ctx)
      : null;
  const body = substitute(scenario.body_template, ctx);
  const signature = substitute(
    channel === 'twitter' ? scenario.twitter_signature_template : scenario.email_signature_template,
    ctx,
  );

  const showSubject = channel === 'email' && subject !== null;

  return (
    <div className="cmg-preview-pane" data-testid="cmg-preview-pane" data-channel={channel}>
      <header className="cmg-preview-header">
        <span className="cmg-preview-format-badge" data-format={channel}>
          {channel === 'twitter' ? 'Twitter DM' : 'Email'}
        </span>
      </header>

      {scenario.kind === 'coach_message' && (
        <div className="cmg-preview-recipient-tabs" role="tablist" aria-label="Recipient">
          {scenario.applies_to_recipients
            .filter(r => r !== 'broadcast' && r !== 'recruiting_coordinator' && r !== 'head_coach')
            .map(r => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={activeRecipient === r}
                className={`cmg-preview-recipient-tab ${activeRecipient === r ? 'is-active' : ''}`}
                disabled
              >
                {r === 'position_coach' ? 'Position Coach' : 'Recruiting Area Coach'}
              </button>
            ))}
          {scenario.applies_to_recipients.includes('head_coach') && (
            <button
              type="button"
              role="tab"
              aria-selected={false}
              className="cmg-preview-recipient-tab"
              disabled
            >
              Head Coach
            </button>
          )}
        </div>
      )}

      {scenario.kind === 'coach_message' && (
        <aside className="cmg-preview-rc-callout" role="note">
          Can't find either coach? Address the message to the team's{' '}
          <strong>Recruiting Coordinator</strong> as a fallback.
        </aside>
      )}

      {showSubject && (
        <section className="cmg-preview-subject" aria-label="Email subject">
          <span className="cmg-preview-label">Subject:</span> {subject}
        </section>
      )}

      <article className="cmg-preview-body" aria-label="Message body">
        <pre className="cmg-preview-pre">{body}</pre>
        <pre className="cmg-preview-pre cmg-preview-signature">{signature}</pre>
      </article>

      <footer className="cmg-preview-actions">
        <button type="button" className="cmg-preview-action" disabled>
          📋 Copy Message
        </button>
        <button type="button" className="cmg-preview-action" disabled>
          ✉ Email to Myself
        </button>
        <button type="button" className="cmg-preview-action cmg-preview-action--reset" disabled>
          ↻ Reset Form
        </button>
      </footer>
    </div>
  );
}
