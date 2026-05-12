import { useCallback, useMemo } from 'react';
import {
  substituteToSegments,
  renderSegmentsToPlainText,
} from '../../lib/cmg/substitute.js';
import { buildMailto, openMailto } from '../../lib/cmg/mailto.js';
import { useToast } from '../Toast.jsx';
import { supabase } from '../../lib/supabaseClient.js';

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
  onLogAppend,
  onReset,
  userId,
}) {
  const { showToast } = useToast();
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

  // Plain-text projections for Copy / Email-to-Self. Memoized so re-renders
  // not touching segments skip the join.
  const plainBody = useMemo(() => renderSegmentsToPlainText(bodySegments), [bodySegments]);
  const plainSignature = useMemo(
    () => renderSegmentsToPlainText(signatureSegments),
    [signatureSegments],
  );
  const plainSubject = useMemo(
    () => (subjectSegments ? renderSegmentsToPlainText(subjectSegments) : ''),
    [subjectSegments],
  );
  const plainText = useMemo(() => `${plainBody}\n\n${plainSignature}`, [plainBody, plainSignature]);

  // Per SPEC_FOR_CODE Step 7 — fire-and-forget log write. Failure is non-blocking;
  // we log to console and continue so the user's primary Copy/Email action is
  // never gated on a write to cmg_message_log.
  const appendLogRecord = useCallback(
    async (record) => {
      if (!userId) {
        onLogAppend?.(record);
        return;
      }
      try {
        const { error } = await supabase.rpc('append_cmg_message_log', {
          p_user_id: userId,
          p_record: record,
        });
        if (error) {
          console.error('cmg_message_log append failed:', error);
          return;
        }
        onLogAppend?.(record);
      } catch (e) {
        console.error('cmg_message_log append exception:', e);
      }
    },
    [userId, onLogAppend],
  );

  // Build the per-event log record from current selection / form state.
  const buildLogRecord = useCallback(() => {
    if (!scenario) return null;
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      scenario_id: scenario.id,
      scenario_title: scenario.title,
      unitid: selectedSchool?.unitid ?? null,
      school_name: selectedSchool?.school_name ?? null,
      channel,
      recipient: activeRecipient ?? null,
      recipient_last_name:
        formByRecipient?.[activeRecipient]?.last_name ?? null,
      body_rendered: plainBody,
      subject_rendered: plainSubject || null,
      signature_rendered: plainSignature,
      emailed_to_self: false,
      constructed_at: new Date().toISOString(),
    };
  }, [
    scenario,
    selectedSchool,
    channel,
    activeRecipient,
    formByRecipient,
    plainBody,
    plainSubject,
    plainSignature,
  ]);

  const handleCopy = useCallback(async () => {
    let ok = false;
    // Primary path — async Clipboard API.
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
        ok = true;
      }
    } catch (_e) {
      ok = false;
    }
    // Fallback — temporary <textarea> + execCommand('copy').
    if (!ok && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = plainText;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const cmdOk = document.execCommand('copy');
        document.body.removeChild(ta);
        ok = cmdOk;
      } catch (_e) {
        ok = false;
      }
    }
    if (!ok) {
      showToast({
        message: 'Copy failed — select and copy manually.',
        variant: 'error',
      });
      return;
    }
    showToast({ message: 'Copied to clipboard', variant: 'success' });
    const record = buildLogRecord();
    if (record) appendLogRecord(record);
  }, [plainText, showToast, buildLogRecord, appendLogRecord]);

  const handleEmailToSelf = useCallback(() => {
    if (!profile?.email) return;
    let url;
    let isLong = false;
    try {
      const built = buildMailto({
        email: profile.email,
        subject: plainSubject || null,
        body: plainBody,
        signature: plainSignature,
      });
      url = built.url;
      isLong = built.isLong;
    } catch (e) {
      showToast({
        message: 'Could not open mail — add an email to your profile.',
        variant: 'error',
      });
      console.error('buildMailto failed:', e);
      return;
    }
    if (isLong) {
      showToast({
        message:
          "Long message — if your mail client doesn't open, use Copy instead.",
        variant: 'success',
      });
    }
    openMailto(url);
    showToast({ message: 'Opened in mail app', variant: 'success' });
    const record = buildLogRecord();
    if (record) appendLogRecord({ ...record, emailed_to_self: true });
  }, [
    profile,
    plainSubject,
    plainBody,
    plainSignature,
    showToast,
    buildLogRecord,
    appendLogRecord,
  ]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

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
        <button
          type="button"
          className="cmg-preview-action"
          onClick={handleCopy}
          data-testid="cmg-copy-btn"
        >
          📋 Copy Message
        </button>
        {channel === 'email' && (
          <button
            type="button"
            className="cmg-preview-action"
            onClick={handleEmailToSelf}
            disabled={!profile?.email}
            title={
              !profile?.email
                ? 'Add an email to your profile to enable Email to Myself'
                : undefined
            }
            data-testid="cmg-email-btn"
          >
            ✉ Email to Myself
          </button>
        )}
        <button
          type="button"
          className="cmg-preview-action cmg-preview-action--reset"
          onClick={handleReset}
          data-testid="cmg-reset-btn"
        >
          ↻ Reset Form
        </button>
      </footer>
    </div>
  );
}
