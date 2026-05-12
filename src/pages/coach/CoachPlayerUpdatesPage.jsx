/**
 * CoachPlayerUpdatesPage — Sprint 026 Phase 1a (Coach UI).
 *
 * Bulk Player Data Submission (Bulk PDS) coach-facing page. Route:
 * `/coach/player-updates`. The user-facing label in nav is "PLAYER UPDATES";
 * internal module names retain `bulk_pds` per acceptance G2.
 *
 * Composition:
 *   - BulkPdsBackground   — fixed bg image + school-token overlay (Q5)
 *   - BulkPdsHeader       — title + how-to copy
 *   - CoachIdentityBox    — RO panel (name/email/school from school-staff.js)
 *   - StudentDropdownPicker — picker + Add Player button (hs_coach_students)
 *   - PlayerUpdateCardList — dynamic card grid
 *     - PlayerUpdateCard   — 5 RO identity + 8 write fields per student
 *       - MeasurableField  — shared input with unit suffix
 *   - SubmitBatchButton   — disabled until ≥1 card; submits batch
 *
 * Data flow on submit:
 *   1. crypto.randomUUID() → batch_id
 *   2. buildSubmissionRows({ batch_id, coach_user_id, cards, studentSnapshots }) → row[]
 *   3. submitBulkPdsBatch({ batch_id, rows }) — insert + non-blocking notify EF call
 *   4. On success: toast + clear card list + reset dropdown
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useCoachLinkedStudents } from '../../hooks/useCoachLinkedStudents.js';
import { useCoachIdentity } from '../../hooks/useCoachIdentity.js';
import { buildSubmissionRows } from '../../lib/bulkPds/buildSubmissionRows.js';
import { validateBulkPdsCards } from '../../lib/bulkPds/validateBulkPdsCards.js';
import { submitBulkPdsBatch } from '../../lib/bulkPds/submitBulkPdsBatch.js';
import BulkPdsBackground from '../../components/bulk-pds/BulkPdsBackground.jsx';
import BulkPdsHeader from '../../components/bulk-pds/BulkPdsHeader.jsx';
import CoachIdentityBox from '../../components/bulk-pds/CoachIdentityBox.jsx';
import StudentDropdownPicker from '../../components/bulk-pds/StudentDropdownPicker.jsx';
import PlayerUpdateCardList from '../../components/bulk-pds/PlayerUpdateCardList.jsx';
import SubmitBatchButton from '../../components/bulk-pds/SubmitBatchButton.jsx';

const ALLOWED_ROLES = ['hs_coach', 'hs_guidance_counselor'];

const EMPTY_CARD = {
  height: '',
  weight: '',
  speed_40: '',
  time_5_10_5: '',
  time_l_drill: '',
  bench_press: '',
  squat: '',
  clean: '',
};

const pageStyle = {
  position: 'relative',
  minHeight: '100%',
  width: '100%',
  // Sit above the global Layout overlay so the school-token wash on the
  // Bulk PDS page reads as the dominant background.
  zIndex: 1,
};

const contentStyle = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

export default function CoachPlayerUpdatesPage() {
  const { session, userType, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { students, loading: studentsLoading } = useCoachLinkedStudents();
  const identity = useCoachIdentity();

  // Card list state. `cards` is an array of { student, fields } objects keyed
  // by student.user_id. Order = insertion order from the dropdown.
  const [cards, setCards] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const studentLookup = useMemo(() => {
    const map = new Map();
    for (const s of students) map.set(s.user_id, s);
    return map;
  }, [students]);

  const addedIds = useMemo(() => new Set(cards.map(c => c.student.user_id)), [cards]);

  const availableStudents = useMemo(
    () => students.filter(s => !addedIds.has(s.user_id)),
    [students, addedIds],
  );

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!ALLOWED_ROLES.includes(userType)) {
    return (
      <div style={{ padding: 32, color: '#2C2C2C' }} data-testid="bulk-pds-coach-page-denied">
        <h2>Access denied</h2>
        <p>This page is for coaches and counselors.</p>
      </div>
    );
  }

  const handleAdd = (studentId) => {
    const student = studentLookup.get(studentId);
    if (!student) return;
    setCards(prev => [...prev, { student, fields: { ...EMPTY_CARD } }]);
  };

  const handleRemove = (studentId) => {
    setCards(prev => prev.filter(c => c.student.user_id !== studentId));
    setErrors(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const handleFieldChange = (studentId, fieldName, value) => {
    setCards(prev => prev.map(c => (
      c.student.user_id === studentId
        ? { ...c, fields: { ...c.fields, [fieldName]: value } }
        : c
    )));
  };

  const handleSubmit = async () => {
    if (cards.length === 0 || submitting) return;
    const validation = validateBulkPdsCards(cards);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showToast({ message: 'Fix the highlighted fields and try again.', variant: 'error' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const batch_id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const rows = buildSubmissionRows({
      batch_id,
      coach_user_id: session.user.id,
      cards,
    });
    const result = await submitBulkPdsBatch({ batch_id, rows });
    setSubmitting(false);
    if (!result.ok) {
      showToast({ message: `Submit failed: ${result.error?.message || 'unknown error'}`, variant: 'error' });
      return;
    }
    setCards([]);
    showToast({ message: `Submitted ${rows.length} player update${rows.length === 1 ? '' : 's'}.`, variant: 'success' });
  };

  return (
    <div style={pageStyle} data-testid="bulk-pds-coach-page">
      <BulkPdsBackground />
      <div style={contentStyle}>
        <BulkPdsHeader />
        <CoachIdentityBox identity={identity} />
        <StudentDropdownPicker
          students={availableStudents}
          onAdd={handleAdd}
          loading={studentsLoading}
        />
        <PlayerUpdateCardList
          cards={cards}
          errors={errors}
          onFieldChange={handleFieldChange}
          onRemove={handleRemove}
        />
        <SubmitBatchButton
          disabled={cards.length === 0}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
      {/* Post-submit toast — bulk-pds-coach-submit-toast is mirrored onto the
          Toast component via the global slot; we also expose a sentinel here
          for Playwright to anchor against the page tree. */}
      <span
        data-testid="bulk-pds-coach-submit-toast"
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      />
    </div>
  );
}
