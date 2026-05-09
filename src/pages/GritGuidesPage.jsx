/**
 * Grit Guides Page — surfaces published Grit Guides per audience.
 *
 *   Student (default): explainer + their own guide cards (or mailto request).
 *   hs_coach:          explainer + roster-aggregated guides + roster-wide request form.
 *   hs_guidance_counselor: same as coach with counselor-framed explainer.
 *
 * Identity: user_id is the sole key for roster lookup. Email-keyed lookup
 * for guide config — student email is matched lowercased.
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import {
  GRIT_GUIDES,
  findGuidesByEmail,
  filterGuidesByEmails,
} from '../data/grit-guides.js';
import {
  studentExplainer,
  coachExplainer,
  counselorExplainer,
  buildMailtoHref,
} from '../lib/copy/gritGuidesCopy.js';

const COACH_ROLES = ['hs_coach', 'hs_guidance_counselor'];

function formatPublishedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function GritGuidesPage() {
  const { session, userType, loading: authLoading } = useAuth();

  if (authLoading) return <div style={{ padding: 32 }}>Loading…</div>;
  if (!session) return <div style={{ padding: 32 }}>Please sign in to view Grit Guides.</div>;

  if (COACH_ROLES.includes(userType)) {
    return <StaffView session={session} userType={userType} />;
  }
  return <StudentView session={session} />;
}

function StudentView({ session }) {
  const email = session.user.email || '';
  const entry = useMemo(() => findGuidesByEmail(email), [email]);

  // Sort guides DESC by publishedAt — newest first.
  const guides = useMemo(() => {
    if (!entry) return [];
    return [...entry.guides].sort((a, b) =>
      (b.publishedAt || '').localeCompare(a.publishedAt || '')
    );
  }, [entry]);

  const [studentName, setStudentName] = useState('');
  const [studentSchool, setStudentSchool] = useState('');

  useEffect(() => {
    if (entry) {
      setStudentName(entry.studentName);
      // schoolSlug is not the display name; resolve from profiles for the mailto.
    }
    supabase.from('profiles')
      .select('name, high_school')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (!entry && data.name) setStudentName(data.name);
        if (data.high_school) setStudentSchool(data.high_school);
      });
  }, [session.user.id, entry]);

  return (
    <div style={pageStyle}>
      <h1 style={h1Style}>My Grit Guides</h1>
      <p style={explainerStyle}>{studentExplainer}</p>

      {guides.length > 0 ? (
        <div style={cardListStyle}>
          {guides.map(g => (
            <GuideCard key={g.url} title={g.title} url={g.url} publishedAt={g.publishedAt} />
          ))}
        </div>
      ) : (
        <RequestButton
          href={buildMailtoHref({
            kind: 'studentRequest',
            tokens: {
              studentName: studentName || session.user.email,
              studentEmail: session.user.email,
              studentSchool: studentSchool || '',
            },
          })}
          label="Request a Grit Guide"
        />
      )}
    </div>
  );
}

function StaffView({ session, userType }) {
  const isCoach = userType === 'hs_coach';
  const explainer = isCoach ? coachExplainer : counselorExplainer;
  const linkTable = isCoach ? 'hs_coach_students' : 'hs_counselor_students';
  const linkColumn = isCoach ? 'coach_user_id' : 'counselor_user_id';
  const roleLabel = isCoach ? 'Coach' : 'Counselor';

  // roster: [{ user_id, name, email, high_school }]
  const [roster, setRoster] = useState([]);
  const [requesterName, setRequesterName] = useState('');
  const [selectedStudentUserId, setSelectedStudentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = session.user.id;
      // Step 1 — link table
      const { data: links, error: linkErr } = await supabase
        .from(linkTable)
        .select('student_user_id')
        .eq(linkColumn, userId);
      if (cancelled) return;
      if (linkErr) {
        setError('Failed to load roster.');
        setLoading(false);
        return;
      }
      const studentIds = (links || []).map(l => l.student_user_id);
      if (studentIds.length === 0) {
        setRoster([]);
        setLoading(false);
        return;
      }
      // Step 2 — profiles fetch (mirrors CoachDashboardPage.jsx:93-102)
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, name, email, high_school')
        .in('user_id', studentIds);
      if (cancelled) return;
      if (profErr) {
        setError('Failed to load student profiles.');
        setLoading(false);
        return;
      }
      // Step 3 — also fetch our own name for the mailto requester field
      const { data: self } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .single();
      if (cancelled) return;
      setRequesterName((self && self.name) || session.user.email);

      const list = (profiles || []).filter(p => p.email);
      // Sort by name for the dropdown.
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setRoster(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session.user.id, linkTable, linkColumn]);

  // Aggregate published guides across the roster.
  const aggregated = useMemo(() => {
    const emails = roster.map(p => (p.email || '').toLowerCase()).filter(Boolean);
    return filterGuidesByEmails(emails);
  }, [roster]);

  // Resolve the selected dropdown student into mailto tokens.
  const selectedStudent = useMemo(
    () => roster.find(p => p.user_id === selectedStudentUserId) || null,
    [roster, selectedStudentUserId]
  );

  const requestHref = selectedStudent
    ? buildMailtoHref({
        kind: 'staffRequest',
        tokens: {
          studentName: selectedStudent.name || selectedStudent.email,
          studentEmail: selectedStudent.email,
          studentSchool: selectedStudent.high_school || '',
          requesterName,
          requesterRole: roleLabel,
          requesterEmail: session.user.email,
        },
      })
    : null;

  if (loading) return <div style={pageStyle}>Loading roster…</div>;
  if (error) return <div style={pageStyle}>{error}</div>;

  return (
    <div style={pageStyle}>
      <h1 style={h1Style}>Grit Guides</h1>
      <p style={explainerStyle}>{explainer}</p>

      <h2 style={h2Style}>Published guides ({aggregated.length})</h2>
      {aggregated.length === 0 ? (
        <p style={emptyStyle}>No guides have been published for your roster yet.</p>
      ) : (
        <div style={cardListStyle}>
          {aggregated.map(({ entry, guide }) => (
            <GuideCard
              key={`${entry.studentEmail}__${guide.url}`}
              studentName={entry.studentName}
              title={guide.title}
              url={guide.url}
              publishedAt={guide.publishedAt}
            />
          ))}
        </div>
      )}

      <h2 style={h2Style}>Request a Grit Guide</h2>
      <div style={requestRowStyle}>
        <select
          value={selectedStudentUserId}
          onChange={e => setSelectedStudentUserId(e.target.value)}
          style={selectStyle}
          aria-label="Select student"
        >
          <option value="">Select a student…</option>
          {roster.map(p => (
            <option key={p.user_id} value={p.user_id}>{p.name || p.email}</option>
          ))}
        </select>
        <RequestButton href={requestHref} label="Send request" disabled={!requestHref} />
      </div>
    </div>
  );
}

function GuideCard({ studentName, title, url, publishedAt }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={cardStyle}
    >
      {studentName && <div style={cardStudentStyle}>{studentName}</div>}
      <div style={cardTitleStyle}>{title}</div>
      <div style={cardMetaStyle}>Published {formatPublishedDate(publishedAt)}</div>
    </a>
  );
}

function RequestButton({ href, label, disabled }) {
  if (disabled || !href) {
    return (
      <button disabled style={{ ...buttonStyle, opacity: 0.5, cursor: 'not-allowed' }}>
        {label}
      </button>
    );
  }
  return <a href={href} style={buttonStyle}>{label}</a>;
}

const pageStyle      = { padding: 32, maxWidth: 960, margin: '0 auto' };
const h1Style        = { fontFamily: 'var(--font-heading)', marginBottom: 16 };
const h2Style        = { fontFamily: 'var(--font-heading)', marginTop: 32, marginBottom: 12 };
const explainerStyle = { fontSize: '0.95rem', lineHeight: 1.55, marginBottom: 24, color: 'var(--brand-text)' };
const emptyStyle     = { fontStyle: 'italic', color: 'rgba(0,0,0,0.6)' };
const cardListStyle  = { display: 'grid', gap: 12 };
const cardStyle      = {
  display: 'block',
  padding: 16,
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  textDecoration: 'none',
  color: 'var(--brand-text)',
};
const cardStudentStyle = { fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, color: 'var(--brand-maroon)' };
const cardTitleStyle   = { fontWeight: 600, fontSize: '1.05rem', marginBottom: 4 };
const cardMetaStyle    = { fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' };
const requestRowStyle  = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' };
const selectStyle      = { padding: '8px 12px', fontSize: '0.9rem', minWidth: 240 };
const buttonStyle      = {
  display: 'inline-block',
  padding: '8px 16px',
  fontSize: '0.9rem',
  fontWeight: 600,
  backgroundColor: 'var(--brand-maroon)',
  color: '#FFFFFF',
  textDecoration: 'none',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
};
