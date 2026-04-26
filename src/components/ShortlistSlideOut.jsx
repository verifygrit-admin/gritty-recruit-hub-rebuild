/**
 * ShortlistSlideOut — Sprint 004 Wave 4 S3 (terminal UI deliverable).
 *
 * Renders the slide-out detail panel that opens when a student clicks a row
 * in the Shortlist (ShortlistPage -> ShortlistRow). Composes content
 * directly inside SlideOutShell (SC-3) per operator ruling A-3 — does NOT
 * reuse SC-4 SchoolDetailsCard.
 *
 * Nine-section layout (top to bottom):
 *   1. Close X              — owned by SlideOutShell, not re-implemented here
 *   2. School header        — name (maroon), conference | division | miles, added date
 *   3. Context line         — italic "Viewing {First} {Last}'s progress with this school"
 *   4. Primary actions      — Recruiting Questionnaire + Coaching Staff buttons
 *   5. Offer status chips   — Verbal Offer / Committable Offer / Commitment (3 chips)
 *   6. Status pills         — StatusPill (SC-2) per key in grit_fit_labels
 *   7. Financial metrics    — COA / Annual Net Cost / DROI / Fastest Payback
 *   8. Journey progress     — "X of 15 steps completed" + progress bar (collapsible)
 *   9. Pre-Read Documents   — per-doc row with submission pill + Email buttons
 *
 * Props:
 *   isOpen (boolean, required)
 *   onClose (() => void, required)
 *   item (short_list_items row, required when isOpen) — includes unitid,
 *         school_name, conference, div, dist, added_at, grit_fit_labels,
 *         recruiting_journey_steps, q_link, coach_link, offer_status (may be absent),
 *         droi, net_cost, coa, break_even
 *   userFirstName (string)
 *   userLastName (string)
 *   contacts — Sprint 007 R5 + R4 extended shape:
 *     {
 *       hs_head_coach_email:         string|null,  // DEPRECATED post-Sprint 007 R5; Email Coach now targets college head coach via college_head_coach_email.
 *       hs_guidance_counselor_email: string|null,
 *       hs_guidance_counselor_name:  string|null,  // R4 — for {counselorName} token
 *       college_head_coach_email:    string|null,  // R5 — selected per-school via college_coaches.is_head_coach=true
 *       college_head_coach_name:     string|null,  // R4 — for {coachName} token; null when no head-coach record on file
 *     }
 *   studentProfile ({ name, grad_year, position, high_school }) — used for R4 token resolution
 *   files (array of file_uploads rows filtered to this item's unitid)
 */

import { useMemo, useState } from 'react';
import SlideOutShell from './SlideOutShell.jsx';
import StatusPill from './StatusPill.jsx';
import CollapsibleTitleStrip from './CollapsibleTitleStrip.jsx';
import useIsNarrowViewport from '../hooks/useIsNarrowViewport.js';
import { buildMailtoHref, resolveTemplateTokens } from '../lib/copy/shortlistMailtoCopy.js';
import { hasVerbalOffer, hasWrittenOffer } from '../lib/offerStatus.js';

const MAROON = '#8B3A3A';
const MUTED = '#6B6B6B';

// The expected Pre-Read doc types for the Shortlist slide-out. Key =
// file_uploads.document_type enum (migration 0010); label = display name.
const PRE_READ_DOC_TYPES = Object.freeze([
  { key: 'transcript', label: 'Transcript' },
  { key: 'senior_course_list', label: 'Senior Course List' },
  { key: 'writing_example', label: 'Writing Example' },
  { key: 'student_resume', label: 'Student Resume' },
  { key: 'school_profile_pdf', label: 'School Profile PDF' },
  { key: 'sat_act_scores', label: 'SAT/ACT Scores' },
  { key: 'financial_aid_info', label: 'Financial Aid Info' },
]);

// Sprint 007 hotfix HF-4 — chip set rewired to read recruiting_journey_steps
// JSONB instead of the phantom item.offer_status column (which never
// existed in the schema). The committable_offer chip is renamed in label
// only — its slot is preserved so the visual order stays stable.
//
// HF-4 carry-forward — Commitment state has no source of truth in current
// schema. Chip renders as placeholder. Decide step 16 / separate column /
// derived state in future sprint.
const OFFER_CHIP_LABELS = Object.freeze([
  { key: 'verbal_offer',      label: 'Verbal Offer' },
  { key: 'committable_offer', label: 'Written Offer' },
  { key: 'commitment',        label: 'Commitment' },
]);

// ── Formatting helpers ────────────────────────────────────────────────────

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatRatio(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n.toFixed(1)}x`;
}

function formatYears(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n.toFixed(1)} yrs`;
}

function formatAddedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Offer-status extraction ──────────────────────────────────────────────
// item.offer_status may not yet exist in short_list_items (no DDL change in
// this wave). Accept either array-of-keys OR object-with-boolean-flags. If
// neither shape is present, all three chips render inactive.

function isOfferActive(offerStatus, key) {
  if (!offerStatus) return false;
  if (Array.isArray(offerStatus)) return offerStatus.includes(key);
  if (typeof offerStatus === 'object') return Boolean(offerStatus[key]);
  return false;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ShortlistSlideOut({
  isOpen,
  onClose,
  item,
  userFirstName = '',
  userLastName = '',
  contacts = {
    hs_head_coach_email: null,
    hs_guidance_counselor_email: null,
    hs_guidance_counselor_name: null,
    college_head_coach_email: null,
    college_head_coach_name: null,
  },
  studentProfile = null,
  files = [],
  onToggleStep = null,
  updatingStepId = null,
}) {
  // ── ALL hooks MUST be declared unconditionally at the top, before ANY
  // early return. Sprint 004 Phase 1 F3 — previously the useMemo below was
  // placed AFTER the `if (!isOpen || !item) return` early-return, producing
  // a "Rendered more hooks than during the previous render" crash whenever
  // the slide-out transitioned from closed -> open or vice versa.
  const isNarrow = useIsNarrowViewport(400);
  const [journeyCollapsed, setJourneyCollapsed] = useState(false);

  // Determine which docs have a submission on file. file_uploads.document_type
  // is the join key; one submission per doc_type is enough to mark SUBMITTED.
  const submittedByDocType = useMemo(() => {
    const map = {};
    for (const f of files || []) {
      if (f && f.document_type) map[f.document_type] = true;
    }
    return map;
  }, [files]);

  // Defensive: rendering a slide-out with no item is a no-op. MUST come AFTER
  // all hook declarations above (F3).
  if (!isOpen || !item) {
    return (
      <SlideOutShell
        isOpen={false}
        onClose={onClose}
        ariaLabel="Shortlist school details"
      >
        <div />
      </SlideOutShell>
    );
  }

  // NOTE(A-8): recruiting_journey_steps has a known schema-level bug where
  // steps 2–15 may default to completed:true on seed rows (schema.test.js:139).
  // The Wave 4 A-8 diagnostic confirmed this is present in production: 107 of
  // 108 rows have step 2 completed=true. This may inflate "X of 15" slightly
  // on affected rows. Separate remediation — S3 renders progress as-computed.
  const steps = Array.isArray(item.recruiting_journey_steps) ? item.recruiting_journey_steps : [];
  const completedCount = steps.reduce((n, s) => (s && s.completed ? n + 1 : n), 0);
  const totalSteps = steps.length || 15;
  const progressPct = Math.max(0, Math.min(100, (completedCount / totalSteps) * 100));

  // Filter status labels: drop 'not_evaluated' defensively per CW-1 /
  // operator ruling A-2. StatusPill itself also refuses to render it.
  const labels = Array.isArray(item.grit_fit_labels)
    ? item.grit_fit_labels.filter((k) => k && k !== 'not_evaluated')
    : [];

  const subline = [item.conference, item.div, item.dist != null ? `${item.dist} miles` : null]
    .filter(Boolean)
    .join(' | ')
    .toUpperCase();

  const schoolName = item.school_name || 'School';

  // Viewport-dependent email button visual label (A-10 rule).
  const coachLabel = isNarrow ? 'Email Coach' : 'Email (Head) Coach';
  const counselorLabel = isNarrow ? 'Email Counselor' : 'Email Counselor';
  // aria-label is stable regardless of viewport.
  const coachAriaLabel = 'Email Head Coach';
  const counselorAriaLabel = 'Email Guidance Counselor';

  return (
    <SlideOutShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Shortlist school details"
    >
      <div
        data-testid="shortlist-slide-out"
        data-unitid={item.unitid}
        data-narrow={isNarrow ? 'true' : 'false'}
        style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Section 2 — School header */}
        <header data-testid="sso-header" style={{ marginTop: 4 }}>
          <h2
            data-testid="sso-school-name"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: MAROON,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {schoolName}
          </h2>
          {subline && (
            <div
              data-testid="sso-subline"
              style={{
                fontSize: '0.875rem',
                color: MUTED,
                marginTop: 6,
                letterSpacing: '0.04em',
              }}
            >
              {subline}
            </div>
          )}
          {item.added_at && (
            <div
              data-testid="sso-added-at"
              style={{ fontSize: '0.8125rem', color: '#8A8A8A', marginTop: 4 }}
            >
              Added {formatAddedDate(item.added_at)}
            </div>
          )}
        </header>

        {/* Section 3 — Context line */}
        <p
          data-testid="sso-context-line"
          style={{ fontStyle: 'italic', fontSize: '0.9375rem', color: '#2C2C2C', margin: 0 }}
        >
          Viewing {userFirstName} {userLastName}&apos;s progress with this school
        </p>

        {/* Section 4 — Primary actions */}
        <div
          data-testid="sso-primary-actions"
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          <PrimaryLinkButton
            testid="sso-btn-questionnaire"
            href={item.q_link}
            filled
            label="Recruiting Questionnaire"
          />
          <PrimaryLinkButton
            testid="sso-btn-coaching-staff"
            href={item.coach_link}
            label="Coaching Staff"
          />
        </div>

        {/* Section 5 — Offer status chips */}
        <div
          data-testid="sso-offer-chips"
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
        >
          {OFFER_CHIP_LABELS.map((chip) => {
            // HF-4 — verbal_offer reads step 14, committable_offer slot
            // (relabelled "Written Offer") reads step 15. Commitment chip
            // has no source of truth in current schema and renders as a
            // permanently-inactive placeholder until a future sprint
            // decides where Commitment state lives.
            let active;
            if (chip.key === 'verbal_offer') active = hasVerbalOffer(item);
            else if (chip.key === 'committable_offer') active = hasWrittenOffer(item);
            else active = isOfferActive(item.offer_status, chip.key);
            return <OfferChip key={chip.key} label={chip.label} active={active} testid={`sso-offer-${chip.key}`} />;
          })}
        </div>

        {/* Section 6 — Status pills (GRIT FIT) */}
        <div
          data-testid="sso-status-pills"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          {labels.map((key) => (
            <StatusPill key={key} status={key} size="md" />
          ))}
        </div>

        {/* Section 7 — Financial metrics strip */}
        <div
          data-testid="sso-financial-strip"
          style={{
            display: 'grid',
            gridTemplateColumns: isNarrow ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 12,
            padding: 14,
            backgroundColor: '#F5EADF',
            borderRadius: 6,
          }}
        >
          <MetricCell testid="sso-metric-coa" label="COA" value={formatCurrency(item.coa)} />
          <MetricCell testid="sso-metric-net-cost" label="Annual Net Cost" value={formatCurrency(item.net_cost)} />
          <MetricCell testid="sso-metric-droi" label="DROI" value={formatRatio(item.droi)} />
          <MetricCell
            testid="sso-metric-payback"
            label="Fastest Payback"
            value={formatYears(item.fastest_payback ?? item.break_even)}
          />
        </div>

        {/* Section 8 — Journey progress (collapsible) */}
        <div data-testid="sso-journey-section">
          <CollapsibleTitleStrip
            title="Recruiting Journey Progress"
            isCollapsed={journeyCollapsed}
            onToggle={() => setJourneyCollapsed((v) => !v)}
            id="sso-journey-strip"
            ariaControls="sso-journey-body"
          />
          {!journeyCollapsed && (
            <div
              id="sso-journey-body"
              data-testid="sso-journey-body"
              style={{ padding: '12px 4px' }}
            >
              <div
                data-testid="sso-journey-count"
                style={{ fontSize: '0.9375rem', color: '#2C2C2C', marginBottom: 8 }}
              >
                {completedCount} of {totalSteps} steps completed
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalSteps}
                aria-valuenow={completedCount}
                data-testid="sso-journey-progress"
                style={{
                  width: '100%',
                  height: 10,
                  backgroundColor: '#E6D7C3',
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <div
                  data-testid="sso-journey-progress-fill"
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    backgroundColor: MAROON,
                    transition: 'width 200ms ease-out',
                  }}
                />
              </div>

              {/* Sprint 005 D6 — 15-step Recruiting Journey task list rendered
                  under the progress bar. Read-only display of completion state
                  from short_list_items.recruiting_journey_steps (existing JSONB
                  column from migration 0009; no new tables / no schema change).
                  Mobile slide-out scroll behavior is provided by the parent
                  SlideOutShell panel (overflowY: auto). The list itself caps at
                  a max-height of 320px and gets its own internal scroll on
                  narrow viewports so the task list never crowds out the
                  Pre-Read Documents section beneath it. */}
              <ul
                data-testid="sso-journey-tasklist"
                aria-label="Recruiting journey tasks"
                style={{
                  listStyle: 'none',
                  margin: '14px 0 0',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: isNarrow ? 280 : 360,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  border: '1px solid #E6D7C3',
                  borderRadius: 4,
                  backgroundColor: '#FAF5EE',
                }}
              >
                {steps.map((step) => {
                  const isComplete = Boolean(step && step.completed);
                  const stepId = step && step.step_id != null ? step.step_id : '?';
                  const label = (step && step.label) || `Step ${stepId}`;
                  const isInteractive = typeof onToggleStep === 'function' && item && item.id != null;
                  const isUpdating = updatingStepId != null && updatingStepId === stepId;
                  const handleToggle = () => {
                    if (!isInteractive || isUpdating) return;
                    onToggleStep(item.id, stepId, !isComplete);
                  };
                  const handleKeyDown = (e) => {
                    if (!isInteractive || isUpdating) return;
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      onToggleStep(item.id, stepId, !isComplete);
                    }
                  };
                  return (
                    <li
                      key={stepId}
                      data-testid={`sso-journey-step-${stepId}`}
                      data-complete={isComplete ? 'true' : 'false'}
                      role={isInteractive ? 'button' : undefined}
                      tabIndex={isInteractive ? 0 : undefined}
                      aria-checked={isComplete}
                      aria-disabled={isUpdating ? true : undefined}
                      onClick={isInteractive ? handleToggle : undefined}
                      onKeyDown={isInteractive ? handleKeyDown : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 8px',
                        minHeight: 44,
                        fontSize: '0.875rem',
                        color: isComplete ? '#2C2C2C' : '#5C5C5C',
                        cursor: isInteractive ? (isUpdating ? 'not-allowed' : 'pointer') : 'default',
                        opacity: isUpdating ? 0.6 : 1,
                        pointerEvents: isUpdating ? 'none' : 'auto',
                        userSelect: 'none',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        data-testid={`sso-journey-step-icon-${stepId}`}
                        style={{
                          flex: '0 0 auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          backgroundColor: isComplete ? '#8B3A3A' : '#FFFFFF',
                          color: isComplete ? '#FFFFFF' : 'transparent',
                          border: isComplete ? '2px solid #8B3A3A' : '2px solid #B89B7A',
                          boxSizing: 'border-box',
                          lineHeight: 1,
                          transition: 'background-color 150ms, border-color 150ms',
                        }}
                      >
                        {isComplete ? '✓' : ''}
                      </span>
                      <span
                        data-testid={`sso-journey-step-label-${stepId}`}
                        style={{
                          flex: '1 1 auto',
                          textDecoration: isComplete ? 'line-through' : 'none',
                          textDecorationColor: '#9A9A9A',
                        }}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Section 9 — Pre-Read Documents */}
        <div data-testid="sso-docs-section">
          <h3
            data-testid="sso-docs-header"
            style={{
              fontSize: '1.0625rem',
              fontWeight: 700,
              color: MAROON,
              margin: '0 0 10px',
            }}
          >
            Pre-Read Documents
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRE_READ_DOC_TYPES.map((doc) => {
              const submitted = Boolean(submittedByDocType[doc.key]);
              // Sprint 007 B.2 — token resolution moves to a single helper
              // (resolveTemplateTokens) that builds the {tokens} bag with
              // R4 fallbacks (Coach / Hello / Junior / etc.). The helper
              // pulls profile fields off studentProfile prop; userFirst/Last
              // remain the canonical name source — fall back to studentProfile
              // only if the explicit props are not provided.
              const profileForTokens = {
                name:
                  (userFirstName || userLastName)
                    ? `${userFirstName || ''} ${userLastName || ''}`.trim()
                    : studentProfile?.name,
                grad_year:   studentProfile?.grad_year,
                position:    studentProfile?.position,
                high_school: studentProfile?.high_school,
              };
              const tokens = resolveTemplateTokens({
                profile: profileForTokens,
                schoolName,
                documentType: doc.label,
                documentSubmitted: submitted,
                coachName: contacts?.college_head_coach_name ?? null,
                counselorName: contacts?.hs_guidance_counselor_name ?? null,
              });

              // Sprint 007 R5 — Email Coach button targets the COLLEGE head
              // coach for this school. Three states:
              //   1. email present                 -> enabled mailto
              //   2. record exists, email missing  -> disabled, specific tooltip
              //   3. no record at all              -> disabled, specific tooltip
              // Disambiguation: college_coaches.name is NOT NULL on the table,
              // so a null name in contacts means no row was returned. A
              // non-null name + null email means the row exists without an
              // email.
              const coachEmail = contacts?.college_head_coach_email ?? null;
              const coachRecordExists = Boolean(contacts?.college_head_coach_name);
              const coachHref = buildMailtoHref({
                recipient: 'coach',
                email: coachEmail,
                documentTypeKey: doc.key,
                tokens,
              });
              let coachDisabledTooltip;
              if (!coachEmail && !coachRecordExists) {
                coachDisabledTooltip = `No head coach on file for ${schoolName} — flag this to your HS coach or counselor.`;
              } else if (!coachEmail && coachRecordExists) {
                coachDisabledTooltip = `Head coach record on file for ${schoolName} has no email — flag this so we can update it.`;
              } else {
                coachDisabledTooltip = 'No coach email on file — add to your Student Profile';
              }

              const counselorHref = buildMailtoHref({
                recipient: 'counselor',
                email: contacts?.hs_guidance_counselor_email,
                documentTypeKey: doc.key,
                tokens,
              });

              return (
                <div
                  key={doc.key}
                  data-testid={`sso-doc-row-${doc.key}`}
                  data-doc-submitted={submitted ? 'true' : 'false'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    backgroundColor: '#FAF5EE',
                    borderRadius: 4,
                  }}
                >
                  <div
                    data-testid={`sso-doc-name-${doc.key}`}
                    style={{ flex: '1 1 140px', fontSize: '0.9375rem', color: '#2C2C2C', fontWeight: 600 }}
                  >
                    {doc.label}
                  </div>
                  <DocSubmissionPill
                    testid={`sso-doc-status-${doc.key}`}
                    submitted={submitted}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <MailtoButton
                      testid={`sso-doc-email-coach-${doc.key}`}
                      href={coachHref}
                      label={coachLabel}
                      ariaLabel={coachAriaLabel}
                      tooltipWhenDisabled={coachDisabledTooltip}
                    />
                    <MailtoButton
                      testid={`sso-doc-email-counselor-${doc.key}`}
                      href={counselorHref}
                      label={counselorLabel}
                      ariaLabel={counselorAriaLabel}
                      tooltipWhenDisabled="No counselor email on file — add to your Student Profile"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SlideOutShell>
  );
}

// ── Small presentational subcomponents ────────────────────────────────────

function PrimaryLinkButton({ testid, href, filled = false, label }) {
  const disabled = !href;
  const baseStyle = {
    padding: '10px 16px',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    display: 'inline-block',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    border: filled ? `1px solid ${MAROON}` : `1px solid ${MAROON}`,
    backgroundColor: filled ? MAROON : '#FFFFFF',
    color: filled ? '#FFFFFF' : MAROON,
  };
  if (disabled) {
    return (
      <button
        type="button"
        data-testid={testid}
        disabled
        title="Link not available"
        aria-disabled="true"
        style={baseStyle}
      >
        {label}
      </button>
    );
  }
  return (
    <a
      data-testid={testid}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={baseStyle}
    >
      {label}
    </a>
  );
}

function OfferChip({ label, active, testid }) {
  const style = active
    ? {
        backgroundColor: MAROON,
        color: '#FFFFFF',
        border: `1px solid ${MAROON}`,
      }
    : {
        backgroundColor: 'transparent',
        color: MUTED,
        border: `1px dashed ${MUTED}`,
      };
  return (
    <span
      data-testid={testid}
      data-active={active ? 'true' : 'false'}
      style={{
        padding: '6px 14px',
        borderRadius: 16,
        fontSize: '0.8125rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  );
}

function MetricCell({ testid, label, value }) {
  return (
    <div data-testid={testid} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div
        data-testid={`${testid}-value`}
        style={{ fontSize: '1rem', fontWeight: 700, color: '#2C2C2C', marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}

function DocSubmissionPill({ testid, submitted }) {
  const style = submitted
    ? { backgroundColor: '#4CAF50', color: '#FFFFFF' }
    : { backgroundColor: '#D4D4D4', color: '#2C2C2C' };
  return (
    <span
      data-testid={testid}
      data-submitted={submitted ? 'true' : 'false'}
      style={{
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: '0.6875rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.04em',
        ...style,
      }}
    >
      {submitted ? 'SUBMITTED' : 'NOT SUBMITTED'}
    </span>
  );
}

function MailtoButton({ testid, href, label, ariaLabel, tooltipWhenDisabled }) {
  const disabled = !href;
  const baseStyle = {
    padding: '6px 12px',
    borderRadius: 4,
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    border: `1px solid ${MAROON}`,
    backgroundColor: '#FFFFFF',
    color: MAROON,
  };
  if (disabled) {
    return (
      <button
        type="button"
        data-testid={testid}
        aria-label={ariaLabel}
        disabled
        aria-disabled="true"
        title={tooltipWhenDisabled}
        style={baseStyle}
      >
        {label}
      </button>
    );
  }
  return (
    <a
      data-testid={testid}
      href={href}
      aria-label={ariaLabel}
      style={baseStyle}
    >
      {label}
    </a>
  );
}
