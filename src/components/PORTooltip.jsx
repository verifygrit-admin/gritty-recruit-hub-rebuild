// PORTooltip.jsx — Point-of-Reference tooltip for admin table rows.
// Spec: POR_TOOLTIP_COMPONENT_SPEC.md Revision 1 (APPROVED 2026-04-11)
// Four confirmed tab contexts: student-athletes, college-coaches,
// institutions, recruiting-events.
// Five held contexts accepted as future tabContext values — render nothing.
// All field names are PROVISIONAL pending WT-B schema confirmation.

import { useRef, useLayoutEffect, useState } from 'react';

const TOOLTIP_WIDTH = 260;
const POS_OFFSET = 8;

// --- Positioning logic (spec §5.1) ---
// Default: right of row, vertically centered.
// Viewport fallback: right→left, bottom→top, both→top-left.
function computePosition(triggerRect, tooltipHeight) {
  if (!triggerRect) return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerY = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;

  const clipsRight = triggerRect.right + POS_OFFSET + TOOLTIP_WIDTH > vw;
  const clipsBottom = centerY + tooltipHeight > vh;

  let x, y;
  if (clipsRight && clipsBottom) {
    x = triggerRect.left;
    y = triggerRect.top - tooltipHeight - POS_OFFSET;
  } else if (clipsRight) {
    x = triggerRect.left - TOOLTIP_WIDTH - POS_OFFSET;
    y = centerY;
  } else if (clipsBottom) {
    x = triggerRect.right + POS_OFFSET;
    y = triggerRect.top - tooltipHeight + POS_OFFSET;
  } else {
    x = triggerRect.right + POS_OFFSET;
    y = centerY;
  }
  if (x < 0) x = POS_OFFSET;
  if (y < 0) y = POS_OFFSET;
  return { x, y };
}

// --- Confidence badge: show ONLY on Low (spec §2) ---
function ConfidenceBadge({ score }) {
  if (score == null || score >= 0.4) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: '0.75rem',
      fontWeight: 700,
      color: '#FFC107',
    }}>
      Low Confidence
    </span>
  );
}

// --- Degradation helpers (spec §8) ---
function Val({ v, fallback }) {
  if (v === null || v === undefined) {
    return <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>{fallback || 'Not Available'}</span>;
  }
  return <>{String(v)}</>;
}

function Score({ v }) {
  if (v === null || v === undefined) {
    return <span style={{ color: '#9E9E9E' }}>Not Yet Calculated</span>;
  }
  return <>{typeof v === 'number' ? v.toFixed(2) : String(v)}</>;
}

function Timestamp({ v }) {
  if (!v) return <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>Not Available</span>;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>Not Available</span>;
  return <>{d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'}</>;
}

function LabelRow({ label, children }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      fontSize: '0.75rem',
      lineHeight: 1.4,
    }}>
      <span style={{ color: '#6B6B6B', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#2C2C2C', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// --- Tab content renderers (spec §1.1–§1.4) ---

function StudentAthleteContent({ data }) {
  return (
    <>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8B3A3A', marginBottom: 8 }}>
        <Score v={data.primaryScore} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="GPA Fit"><Val v={data.gpaFit} /></LabelRow>
        <LabelRow label="Athletic Rating"><Val v={data.athleticRating} /></LabelRow>
        <LabelRow label="Recruiting Stage"><Val v={data.recruitingStage} /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666', marginBottom: 4 }}>
        <Timestamp v={data.lastUpdated} />
      </div>
      <ConfidenceBadge score={data.confidenceScore} />
    </>
  );
}

function CollegeCoachContent({ data }) {
  return (
    <>
      <div style={{ fontSize: '0.85rem', color: '#2C2C2C', marginBottom: 8 }}>
        <Val v={data.divisionBreakdown} fallback="No division data" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="Active Programs"><Val v={data.activePrograms} /></LabelRow>
        <LabelRow label="Success Rate"><Val v={data.successRate} /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666', marginBottom: 4 }}>
        <Timestamp v={data.lastUpdated} />
      </div>
      <ConfidenceBadge score={data.confidenceScore} />
    </>
  );
}

function InstitutionContent({ data }) {
  return (
    <>
      <div style={{ fontSize: '0.85rem', color: '#2C2C2C', fontWeight: 600, marginBottom: 8 }}>
        <Val v={data.institutionType} fallback="Unknown Type" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="State"><Val v={data.state} /></LabelRow>
        <LabelRow label="Active Coaches"><Val v={data.activeCoachCount} /></LabelRow>
        <LabelRow label="Athlete Interest"><Val v={data.athleteInterestCount} /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666' }}>
        <Timestamp v={data.lastUpdated} />
      </div>
    </>
  );
}

function RecruitingEventContent({ data }) {
  return (
    <>
      <div style={{ fontSize: '0.85rem', color: '#2C2C2C', fontWeight: 600, marginBottom: 8 }}>
        <Val v={data.eventType} fallback="Unknown Event Type" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="Date"><Val v={data.eventDate} /></LabelRow>
        <LabelRow label="Location"><Val v={data.location} /></LabelRow>
        <LabelRow label="Registered"><Val v={data.registeredCount} /></LabelRow>
        <LabelRow label="Institution"><Val v={data.associatedInstitution} /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666' }}>
        <Timestamp v={data.lastUpdated} />
      </div>
    </>
  );
}

// --- §1.5.1 Counselors (WT-B schema: users + profiles + hs_counselor_schools + hs_counselor_students) ---
// Service role EF required — Dexter flagged broad SELECT on hs_counselor_schools.
function CounselorContent({ data }) {
  return (
    <>
      <div style={{ fontSize: '0.85rem', color: '#2C2C2C', fontWeight: 600, marginBottom: 8 }}>
        <Val v={data.associatedSchools} fallback="No schools assigned" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="Students Supervised"><Val v={data.studentCount} /></LabelRow>
        <LabelRow label="Last Login"><Val v={data.lastLogin} fallback="Never logged in" /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666' }}>
        <Timestamp v={data.lastUpdated} />
      </div>
    </>
  );
}

// --- §1.5.2 HS Coaches (WT-B schema: users + profiles + hs_coach_schools + hs_coach_students) ---
// Service role EF required — Dexter flagged broad SELECT on hs_coach_schools.
function HSCoachContent({ data }) {
  const headCoachLabel =
    data.isHeadCoach === true ? 'Head Coach'
    : data.isHeadCoach === false ? 'Assistant Coach'
    : null;
  return (
    <>
      <div style={{ fontSize: '0.85rem', color: '#2C2C2C', fontWeight: 600, marginBottom: 8 }}>
        <Val v={data.associatedSchools} fallback="No schools assigned" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="Role"><Val v={headCoachLabel} /></LabelRow>
        <LabelRow label="Students Coached"><Val v={data.studentCount} /></LabelRow>
        <LabelRow label="Last Login"><Val v={data.lastLogin} fallback="Never logged in" /></LabelRow>
      </div>
      <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#666' }}>
        <Timestamp v={data.lastUpdated} />
      </div>
    </>
  );
}

// --- §1.5.3 Parents (WT-B schema: users + profiles, parent row only) ---
// STRUCTURAL GAP: no parent-child link table exists. Tooltip limited to parent's own
// account info. No student data is accessible for parent POR tooltips.
function ParentContent({ data }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <LabelRow label="Account Status"><Val v={data.accountStatus} /></LabelRow>
        <LabelRow label="Last Login"><Val v={data.lastLogin} fallback="Never logged in" /></LabelRow>
      </div>
      <div
        style={{
          fontSize: '0.6875rem',
          fontStyle: 'italic',
          color: '#9E9E9E',
          backgroundColor: '#FAFAFA',
          border: '1px solid #E8E8E8',
          borderRadius: 4,
          padding: '6px 8px',
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        No student data available — parent account information only.
        To view student information, switch to the Student Athletes tab.
      </div>
    </>
  );
}

// Content map — confirmed contexts + four §1.5 held contexts (Counselors, HS Coaches,
// Parents, Recruiting Events). Audit Log held pending Scout re-gate on §1.5.5.
const CONTENT_RENDERERS = {
  'student-athletes': StudentAthleteContent,
  'college-coaches': CollegeCoachContent,
  'institutions': InstitutionContent,
  'recruiting-events': RecruitingEventContent,
  'guidance-counselors': CounselorContent,
  'hs-coaches': HSCoachContent,
  'parents': ParentContent,
};

// --- Shared card styles ---
const CARD_BASE = {
  position: 'fixed',
  zIndex: 1000,
  borderRadius: 4,
  padding: '12px 14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  fontFamily: 'inherit',
};

// --- Main component ---
export default function PORTooltip({ tabContext, data, triggerRect, onMouseEnter, onMouseLeave }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (ref.current && triggerRect) {
      setPos(computePosition(triggerRect, ref.current.offsetHeight));
    }
  }, [triggerRect, tabContext, data]);

  const Renderer = CONTENT_RENDERERS[tabContext];
  // Held tab contexts (counselors, hs-coaches, parents, audit-log, recruiting-activity)
  // have no renderer — return null, do not render anything.
  if (!Renderer) return null;

  // Loading state (spec §8)
  if (!data) {
    return (
      <div
        ref={ref}
        role="tooltip"
        aria-live="polite"
        id="por-tooltip"
        data-testid="por-tooltip"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          ...CARD_BASE,
          left: pos.x,
          top: pos.y,
          width: TOOLTIP_WIDTH,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8E8',
          fontSize: '0.75rem',
          color: '#6B6B6B',
          textAlign: 'center',
        }}
      >
        Loading...
      </div>
    );
  }

  // Error state (spec §8)
  if (data.error) {
    return (
      <div
        ref={ref}
        role="tooltip"
        aria-live="assertive"
        id="por-tooltip"
        data-testid="por-tooltip"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          ...CARD_BASE,
          left: pos.x,
          top: pos.y,
          width: TOOLTIP_WIDTH,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E74C3C',
        }}
      >
        <span style={{ color: '#E74C3C', fontSize: '0.75rem' }}>Error — Try refresh</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="tooltip"
      aria-live="polite"
      id="por-tooltip"
      data-testid="por-tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...CARD_BASE,
        left: pos.x,
        top: pos.y,
        width: TOOLTIP_WIDTH,
        backgroundColor: '#FFFFFF',
        border: '1px solid #8B3A3A',
      }}
    >
      {/* Header — spec §3.1 layout */}
      <div style={{
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: '#8B3A3A',
        marginBottom: 8,
        borderBottom: '1px solid #E8E8E8',
        paddingBottom: 6,
      }}>
        POR — {data.title || 'Unknown'}
      </div>
      <Renderer data={data} />
    </div>
  );
}
