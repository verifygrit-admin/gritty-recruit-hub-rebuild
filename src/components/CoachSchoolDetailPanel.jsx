/**
 * CoachSchoolDetailPanel — nested right-edge slide-out (Panel 2).
 * Read-only view of a single school's recruiting progress for a student,
 * mirroring the student's ShortlistCard but with no mutation controls.
 *
 * Props:
 *   item: short_list_items row (includes recruiting_journey_steps JSONB)
 *   student: profile object for the student
 *   counselorEmail: string|null — linked counselor's email (used when viewer is a coach)
 *   coachEmail: string|null — linked coach's email (used when viewer is a counselor)
 *   viewerRole: 'hs_coach' | 'hs_guidance_counselor' | string — determines which second mailto button to show
 *   onClose: () => void
 */
import { useEffect } from 'react';
import RecruitingJourney from './RecruitingJourney.jsx';
import { DOCUMENT_TYPES } from '../lib/documentTypes.js';

// ── Offer badge placeholders ─────────────────────────────────────────────────
const OFFER_BADGES = [
  { key: 'verbal_offer',      label: 'Verbal Offer',      color: '#D4A017' },
  { key: 'committable_offer', label: 'Committable Offer',  color: '#8B3A3A' },
  { key: 'commitment',        label: 'Commitment',         color: '#2E7D32' },
];

// ── GRIT FIT status config ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  currently_recommended:   { label: 'Currently Recommended',   bg: '#4CAF50' },
  below_academic_fit:      { label: 'Below Academic Fit',       bg: '#FF9800' },
  out_of_academic_reach:   { label: 'Academic Stretch',          bg: '#FF9800' },
  out_of_athletic_reach:   { label: 'Athletic Stretch',          bg: '#FF9800' },
  below_athletic_fit:      { label: 'Highly Recruitable',        bg: '#D4A017' },
  outside_geographic_reach:{ label: 'Outside Geographic Reach', bg: '#9C27B0' },
  not_evaluated:           { label: 'Not Evaluated',            bg: '#6B6B6B' },
};

const BADGE_ORDER = [
  'currently_recommended',
  'out_of_academic_reach',
  'below_academic_fit',
  'out_of_athletic_reach',
  'below_athletic_fit',
  'outside_geographic_reach',
  'not_evaluated',
];

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  justifyContent: 'flex-end',
};

const BACKDROP_STYLE = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.25)',
};

const PANEL_BASE = {
  position: 'relative',
  width: 'min(50vw, 560px)',
  height: '100%',
  backgroundColor: '#FFFFFF',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
  overflowY: 'auto',
  transition: 'transform 250ms ease-out',
};

const CLOSE_BTN = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  justifyContent: 'flex-start',
  padding: '12px 16px 0',
  backgroundColor: '#FFFFFF',
};

function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(Number(v)).toLocaleString();
}

function Metric({ label, value }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontSize: '0.6875rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#2C2C2C' }}>
        {value}
      </div>
    </div>
  );
}

export default function CoachSchoolDetailPanel({ item, student, counselorEmail, coachEmail, viewerRole, onClose }) {
  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!onClose) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!item || !student) return null;

  const steps = item.recruiting_journey_steps || [];
  const completedCount = steps.filter(s => s.completed).length;

  // GRIT FIT badges
  const rawStatuses = Array.isArray(item.grit_fit_labels) && item.grit_fit_labels.length > 0
    ? item.grit_fit_labels
    : [item.grit_fit_status || 'not_evaluated'];
  const activeStatuses = BADGE_ORDER
    .filter(key => rawStatuses.includes(key))
    .map(key => STATUS_CONFIG[key]);

  const metaParts = [
    item.conference,
    item.div,
    item.dist != null ? `${Math.round(Number(item.dist))} miles` : null,
  ].filter(Boolean);

  const addedDate = item.added_at
    ? new Date(item.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // Document status — which types have been shared to this school
  // We check recruiting_journey_steps for document-related steps as a proxy,
  // but the real signal is the document_shares table which we don't have here.
  // For now, we show all doc types with a "status unknown" approach and mailto for all.

  const studentFirstName = student.name ? student.name.split(' ')[0] : 'Student';

  return (
    <div data-testid="school-detail-panel-overlay" style={OVERLAY_STYLE}>
      <div style={BACKDROP_STYLE} aria-hidden="true" />

      <div
        data-testid="school-detail-panel"
        style={PANEL_BASE}
        className="school-detail-panel"
      >
        {/* Close button */}
        <div style={CLOSE_BTN}>
          <button
            data-testid="school-panel-close-btn"
            onClick={onClose}
            aria-label="Close school detail panel"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid #E8E8E8',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              fontSize: '1.125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Panel content */}
        <div style={{ padding: '0 20px 24px' }}>
          {/* School Header */}
          <h3
            data-testid="school-detail-name"
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 4px' }}
          >
            {item.school_name || `UNITID ${item.unitid}`}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 4px' }}>
            {metaParts.join(' | ')}
          </p>
          {addedDate && (
            <p style={{ fontSize: '0.75rem', color: '#6B6B6B', margin: '0 0 12px' }}>
              Added {addedDate}
            </p>
          )}

          {/* Student context line */}
          <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 16px', fontStyle: 'italic' }}>
            Viewing {student.name || 'student'}'s progress with this school
          </p>

          {/* ── Match Rank Callout ── */}
          {item.match_rank != null && (
            <div
              data-testid="match-rank-callout"
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '12px 20px',
                backgroundColor: '#F5EFE0',
                borderRadius: 8,
                marginBottom: 16,
                border: '1px solid #D4AF37',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Match Rank
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8B3A3A' }}>
                #{item.match_rank}
              </span>
            </div>
          )}

          {/* ── Action Buttons (MUST 5: moved up, styled) ── */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}>
            {item.q_link && (
              <a
                data-testid="school-q-link"
                href={item.q_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#6B1A1A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {'\uD83D\uDCCB Recruiting Questionnaire'}
              </a>
            )}
            {item.coach_link && (
              <a
                data-testid="school-coach-link"
                href={item.coach_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#6B1A1A',
                  border: '2px solid #6B1A1A',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {'\uD83D\uDC65 Coaching Staff'}
              </a>
            )}
          </div>

          {/* ── Offer Badge Placeholders ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {OFFER_BADGES.map(badge => {
              const active = item[badge.key]; // future: boolean field on short_list_items
              return (
                <span
                  key={badge.key}
                  data-testid={`offer-badge-${badge.key}`}
                  style={{
                    border: active ? 'none' : '2px dashed #D4D4D4',
                    backgroundColor: active ? badge.color : 'transparent',
                    color: active ? '#FFF' : '#BDBDBD',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  {badge.label}
                </span>
              );
            })}
          </div>

          {/* ── GRIT FIT Status Badges ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {activeStatuses.map((s, idx) => (
              <span
                key={idx}
                data-testid={idx === 0 ? 'grit-fit-badge' : `grit-fit-badge-${idx}`}
                style={{
                  display: 'inline-block',
                  backgroundColor: s.bg,
                  color: '#FFFFFF',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 16,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>

          {/* ── Key Metrics (read-only) ── */}
          <div
            data-testid="school-metrics-row"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              marginBottom: 16,
              padding: '12px 16px',
              backgroundColor: '#F5EFE0',
              borderRadius: 8,
              border: '1px solid #F0F0F0',
            }}
          >
            {item.coa != null && <Metric label="COA" value={formatMoney(item.coa)} />}
            {item.net_cost != null && <Metric label="Annual Net Cost" value={formatMoney(item.net_cost)} />}
            {item.droi != null && <Metric label="DROI" value={`${Number(item.droi).toFixed(1)}x`} />}
            <Metric label="Fastest Payback" value={item.break_even != null ? `${Number(item.break_even).toFixed(1)} yr` : 'N/A'} />
          </div>

          {/* ── Recruiting Journey (read-only) ── */}
          <RecruitingJourney
            steps={steps}
            onToggleStep={null}
            updating={null}
            readOnly
          />

          {/* ── Documents Status (read-only with mailto) ── */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#2C2C2C',
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Pre-Read Documents
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DOCUMENT_TYPES.map(dt => {
                const slotKey = `${dt.type}_${dt.slot_number}`;
                // Coach view: show doc type with status indicator
                // Since we don't have document_library/shares data in this panel,
                // we show all as "status pending" with mailto action.
                // Future: pass libraryDocs + shares for accurate status.
                return (
                  <div
                    key={slotKey}
                    data-testid={`doc-status-${slotKey}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      backgroundColor: '#FAFAFA',
                      borderRadius: 4,
                      border: '1px solid #F0F0F0',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#2C2C2C',
                      fontWeight: 500,
                      flex: '1 1 140px',
                    }}>
                      {dt.libraryLabel}
                    </span>

                    {/* Not Submitted badge — hardcoded per Quill spec (DEC-GLOBAL-057 session).
                        Do not conditionalize without a separate Quill spec.
                        Future: swap to dynamic state when document_shares data is wired. */}
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      backgroundColor: '#9E9E9E',
                      padding: '2px 8px',
                      borderRadius: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      flexShrink: 0,
                    }}>
                      Not Submitted
                    </span>

                    {/* Mailto actions for missing docs — role-aware */}
                    {(() => {
                      const isCounselorViewer = viewerRole === 'hs_guidance_counselor';
                      // Coach sees: Email Student + Email Counselor
                      // Counselor sees: Email Student + Email Coach
                      const secondEmail = isCounselorViewer ? coachEmail : counselorEmail;
                      const secondLabel = isCounselorViewer ? 'Email Coach' : 'Email Counselor';
                      const secondColor = isCounselorViewer ? '#2E7D32' : '#1976D2';
                      const secondTestId = isCounselorViewer
                        ? `mailto-coach-${slotKey}`
                        : `mailto-counselor-${slotKey}`;
                      const secondBody = encodeURIComponent(isCounselorViewer
                        ? `Hi Coach,\n\nI'm following up regarding ${student.name || 'a student'}'s missing ${dt.libraryLabel} for ${item.school_name}. Could you help ensure this gets uploaded?\n\nThank you,\nYour Counselor`
                        : `Hi,\n\nI'm following up regarding ${student.name || 'a student'}'s missing ${dt.libraryLabel} for ${item.school_name}. Could you help ensure this gets uploaded?\n\nThank you.`);

                      return (
                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                          {student.email && (
                            <a
                              href={`mailto:${student.email}?subject=${encodeURIComponent(`Missing Document: ${dt.libraryLabel}`)}&body=${encodeURIComponent(`Hi ${studentFirstName},\n\nI noticed your ${dt.libraryLabel} hasn't been uploaded yet for ${item.school_name}. Please upload it at your earliest convenience.\n\nBest,\n${isCounselorViewer ? 'Your Counselor' : 'Coach'}`)}`}
                              data-testid={`mailto-student-${slotKey}`}
                              style={{
                                fontSize: '0.75rem',
                                color: '#8B3A3A',
                                fontWeight: 600,
                                textDecoration: 'none',
                                padding: '3px 8px',
                                border: '1px solid #8B3A3A',
                                borderRadius: 4,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '80px',
                                height: '24px',
                              }}
                            >
                              Email Student
                            </a>
                          )}
                          {secondEmail && (
                            <a
                              href={`mailto:${secondEmail}?subject=${encodeURIComponent(`Student Document Follow-Up: ${student.name || 'Student'} — ${dt.libraryLabel}`)}&body=${secondBody}`}
                              data-testid={secondTestId}
                              style={{
                                fontSize: '0.75rem',
                                color: secondColor,
                                fontWeight: 600,
                                textDecoration: 'none',
                                padding: '3px 8px',
                                border: `1px solid ${secondColor}`,
                                borderRadius: 4,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '80px',
                                height: '24px',
                              }}
                            >
                              {secondLabel}
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action links moved to top — see MUST 5 above match rank */}
        </div>
      </div>

      {/* Responsive: full-width on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .school-detail-panel {
            width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}
