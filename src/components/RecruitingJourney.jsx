/**
 * RecruitingJourney — collapsible 15-step recruiting journey tracker.
 * UX Spec: UX_SPEC_SHORTLIST.md — Recruiting Journey Section
 *
 * Props:
 *   steps: array of { step_id, label, completed, completed_at }
 *   onToggleStep: (stepId, completed) => Promise<void>
 *   updating: number|null — step_id currently being updated (spinner)
 */
import { useState } from 'react';

const connectorLine = {
  position: 'absolute',
  left: 15,
  top: 0,
  bottom: 0,
  width: 2,
  backgroundColor: '#E8E8E8',
};

const checkboxBase = {
  width: 28,
  height: 28,
  minWidth: 28,
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  fontWeight: 700,
  transition: 'background-color 150ms, transform 150ms',
  flexShrink: 0,
};

const progressBarTrack = {
  height: 8,
  backgroundColor: '#E8E8E8',
  borderRadius: 4,
  overflow: 'hidden',
  width: '100%',
  marginTop: 8,
};

export default function RecruitingJourney({ steps, onToggleStep, updating }) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = (steps || []).filter(s => s.completed).length;
  const totalCount = (steps || []).length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div data-testid="recruiting-journey-section">
      {/* Collapsed header — always visible */}
      <button
        data-testid="journey-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 0',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', width: 16 }}>
          {expanded ? '\u25B8' : '\u25BE'}
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>
          Recruiting Journey Progress
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B' }}>
          ({completedCount} of {totalCount} steps completed)
        </span>
      </button>

      {/* Progress bar */}
      <div style={progressBarTrack}>
        <div
          data-testid="journey-progress-bar"
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #8B3A3A, #6B2C2C)',
            borderRadius: 4,
            transition: 'width 300ms ease-in-out',
          }}
        />
      </div>

      {/* Expanded step list */}
      {expanded && (
        <div
          data-testid="journey-step-list"
          style={{ position: 'relative', paddingLeft: 16, marginTop: 12 }}
        >
          {/* Vertical connector line */}
          <div style={connectorLine} aria-hidden="true" />

          {(steps || []).map((step, idx) => {
            const isUpdating = updating === step.step_id;
            return (
              <div
                key={step.step_id}
                data-testid={`journey-step-${step.step_id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '6px 0 6px 16px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Checkbox */}
                <button
                  data-testid={`step-checkbox-${step.step_id}`}
                  aria-label={`Step ${step.step_id}: ${step.label}, ${step.completed ? 'completed' : 'not completed'}`}
                  aria-checked={step.completed}
                  role="checkbox"
                  disabled={isUpdating}
                  onClick={() => onToggleStep(step.step_id, !step.completed)}
                  style={{
                    ...checkboxBase,
                    backgroundColor: step.completed ? '#8B3A3A' : '#FFFFFF',
                    color: step.completed ? '#FFFFFF' : 'transparent',
                    border: step.completed ? 'none' : '2px solid #D4D4D4',
                    opacity: isUpdating ? 0.5 : 1,
                    transform: isUpdating ? 'scale(0.9)' : 'scale(1)',
                  }}
                >
                  {isUpdating ? '\u23F3' : step.completed ? '\u2713' : ''}
                </button>

                {/* Label + date */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#2C2C2C',
                    textDecoration: step.completed ? 'none' : 'none',
                  }}>
                    Step {step.step_id}: {step.label}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#6B6B6B', marginTop: 2 }}>
                    {step.completed && step.completed_at
                      ? `Completed: ${new Date(step.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : 'Not yet completed'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
