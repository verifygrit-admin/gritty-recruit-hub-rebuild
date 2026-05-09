/**
 * RecruitingJourney — collapsible 15-step recruiting journey tracker
 * with three-phase grouping: Outreach (1-3), Relating (4-10), Commitment (11-15).
 * UX Spec: UX_SPEC_SHORTLIST.md — Recruiting Journey Section
 * Phase Grouping Spec: Quill UX Spec Draft 1.0 (2026-03-30)
 *
 * Props:
 *   steps: array of { step_id, label, completed, completed_at }
 *   onToggleStep: (stepId, completed) => Promise<void>
 *   updating: number|null — step_id currently being updated (spinner)
 */
import { useState } from 'react';

/** Phase configuration — single source of truth for phase grouping in the UI. */
export const JOURNEY_PHASES = [
  { name: 'Outreach',   color: '#C97B2A', minStep: 1,  maxStep: 3,  count: 3 },
  { name: 'Relating',   color: '#2A6B5C', minStep: 4,  maxStep: 10, count: 7 },
  { name: 'Commitment', color: '#8B3A3A', minStep: 11, maxStep: 15, count: 5 },
];

/** Returns the phase object for a given step_id, or null if out of range. */
export function getPhaseForStep(stepId) {
  return JOURNEY_PHASES.find(p => stepId >= p.minStep && stepId <= p.maxStep) || null;
}

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

function StepRow({ step, updating, readOnly, onToggleStep }) {
  const isUpdating = updating === step.step_id;
  return (
    <div
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
      {readOnly ? (
        <div
          data-testid={`step-checkbox-${step.step_id}`}
          aria-label={`Step ${step.step_id}: ${step.label}, ${step.completed ? 'completed' : 'not completed'}`}
          role="img"
          style={{
            ...checkboxBase,
            backgroundColor: step.completed ? 'var(--brand-maroon)' : '#FFFFFF',
            color: step.completed ? '#FFFFFF' : 'transparent',
            border: step.completed ? 'none' : '2px solid #D4D4D4',
            cursor: 'default',
          }}
        >
          {step.completed ? '\u2713' : ''}
        </div>
      ) : (
        <button
          data-testid={`step-checkbox-${step.step_id}`}
          aria-label={`Step ${step.step_id}: ${step.label}, ${step.completed ? 'completed' : 'not completed'}`}
          aria-checked={step.completed}
          role="checkbox"
          disabled={isUpdating}
          onClick={() => onToggleStep(step.step_id, !step.completed)}
          style={{
            ...checkboxBase,
            backgroundColor: step.completed ? 'var(--brand-maroon)' : '#FFFFFF',
            color: step.completed ? '#FFFFFF' : 'transparent',
            border: step.completed ? 'none' : '2px solid #D4D4D4',
            opacity: isUpdating ? 0.5 : 1,
            transform: isUpdating ? 'scale(0.9)' : 'scale(1)',
          }}
        >
          {isUpdating ? '\u23F3' : step.completed ? '\u2713' : ''}
        </button>
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>
          Step {step.step_id}: {step.label}
        </span>
        <div style={{ fontSize: '0.75rem', color: '#6B6B6B', marginTop: 2 }}>
          {step.completed
            ? step.completed_at
              ? `Completed: ${new Date(step.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Completed'
            : 'Not yet completed'}
        </div>
      </div>
    </div>
  );
}

export default function RecruitingJourney({ steps, onToggleStep, updating, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);

  const safeSteps = steps || [];
  const completedCount = safeSteps.filter(s => s.completed).length;
  const totalCount = safeSteps.length;
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

      {/* Global progress bar — Option A: global bar only, no per-phase bars */}
      <div style={progressBarTrack}>
        <div
          data-testid="journey-progress-bar"
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--brand-maroon), var(--brand-maroon-darker))',
            borderRadius: 4,
            transition: 'width 300ms ease-in-out',
          }}
        />
      </div>

      {/* Expanded step list — grouped by phase */}
      {expanded && (
        <div
          data-testid="journey-step-list"
          style={{ marginTop: 12 }}
        >
          {JOURNEY_PHASES.map((phase, phaseIdx) => {
            const phaseSteps = safeSteps.filter(
              s => s.step_id >= phase.minStep && s.step_id <= phase.maxStep
            );
            const phaseCompleted = phaseSteps.filter(s => s.completed).length;
            const isLastPhase = phaseIdx === JOURNEY_PHASES.length - 1;

            return (
              <div
                key={phase.name}
                data-testid={`journey-phase-${phase.name.toLowerCase()}`}
                style={{
                  borderLeft: `3px solid ${phase.color}`,
                  paddingLeft: 16,
                  marginTop: phaseIdx > 0 ? 8 : 0,
                  paddingBottom: 4,
                  borderBottom: isLastPhase ? 'none' : '1px solid #E8E8E8',
                  marginBottom: isLastPhase ? 0 : 4,
                }}
              >
                {/* Phase header */}
                <div
                  data-testid={`phase-header-${phase.name.toLowerCase()}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: phase.color,
                    letterSpacing: 0.5,
                  }}>
                    {phase.name}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: phase.color,
                  }}>
                    {phaseCompleted} of {phase.count} completed
                  </span>
                </div>

                {/* Steps within this phase */}
                <div style={{ position: 'relative' }}>
                  {phaseSteps.map(step => (
                    <StepRow
                      key={step.step_id}
                      step={step}
                      updating={updating}
                      readOnly={readOnly}
                      onToggleStep={onToggleStep}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
