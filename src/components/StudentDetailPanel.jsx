/**
 * StudentDetailPanel — right-edge slide-out overlay (Panel 1).
 * Shows CoachStudentCard content for one student at a time.
 * Schools within the card are sorted by recruiting journey completion % descending.
 *
 * Props:
 *   student: profile object
 *   shortlistItems: array of short_list_items for this student
 *   counselorEmail: string|null — linked counselor's email (for Panel 2 mailto)
 *   onClose: () => void
 *   onSchoolClick: (item) => void — opens Panel 2
 */
import { useEffect } from 'react';
import CoachStudentCard from './CoachStudentCard.jsx';

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  justifyContent: 'flex-end',
};

const BACKDROP_STYLE = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
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
  justifyContent: 'flex-end',
  padding: '12px 16px 0',
  backgroundColor: '#FFFFFF',
};

export default function StudentDetailPanel({
  student,
  shortlistItems,
  counselorEmail,
  onClose,
  onSchoolClick,
}) {
  // Lock body scroll while panel is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!onClose) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!student) return null;

  return (
    <div data-testid="student-detail-panel-overlay" style={OVERLAY_STYLE}>
      <div style={BACKDROP_STYLE} aria-hidden="true" />

      <div
        data-testid="student-detail-panel"
        style={PANEL_BASE}
        className="student-detail-panel"
      >
        {/* Close button */}
        <div style={CLOSE_BTN}>
          <button
            data-testid="panel-close-btn"
            onClick={onClose}
            aria-label="Close student detail panel"
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
          <CoachStudentCard
            student={student}
            shortlistItems={shortlistItems}
            expanded={true}
            onToggleExpand={onClose}
            onSchoolClick={onSchoolClick}
          />
        </div>
      </div>

      {/* Responsive: full-width on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .student-detail-panel {
            width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}
