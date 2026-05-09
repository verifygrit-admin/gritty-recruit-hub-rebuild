import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import HelmetAnim from '../components/HelmetAnim.jsx';
import Tutorial from '../components/Tutorial.jsx';
import JourneyStepper from '../components/home/JourneyStepper.jsx';

const helpItems = [
  {
    question: 'What is GRIT FIT?',
    answer: 'GRIT FIT is a proprietary algorithm that matches your athletic stats, academic profile, geographic preferences, and financial situation against 662 college football programs. It evaluates schools through four gates — Athletic Fit, Academic Fit, Geographic Fit, and Financial Fit — and returns up to 30 schools ranked by overall match quality.',
  },
  {
    question: 'How does the shortlist work?',
    answer: 'Your shortlist is a persistent list of schools you are actively recruiting with. Schools can be added from your GRIT FIT results or manually. Each school on your shortlist tracks a 15-step recruiting journey — from initial contact through verbal and written offers. Your shortlist persists across sessions and is visible to your coach.',
  },
  {
    question: 'See recruiting examples from other athletes',
    answer: 'Coming soon — case studies from real student-athletes who used GRIT FIT to find their college football fit.',
  },
];

export default function LandingPage() {
  const [openHelp, setOpenHelp] = useState(null);
  const { session, userType } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [profileComplete, setProfileComplete] = useState(false);
  const [showHelmet, setShowHelmet] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [coachStudents, setCoachStudents] = useState([]);
  const [coachLoading, setCoachLoading] = useState(true);

  const isCoach = userType === 'hs_coach' || userType === 'hs_guidance_counselor';
  const roleLabel = userType === 'hs_coach' ? 'Coach' : 'Counselor';

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('name, position, gpa').eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (data) {
          const first = (data.name || '').split(' ')[0];
          setFirstName(first || (isCoach ? roleLabel : 'Athlete'));
          setProfileComplete(!!(data.position && data.gpa));
        }
        // Show helmet animation on first visit per session
        const helmetShown = sessionStorage.getItem('helmetShown');
        if (!helmetShown) {
          setShowHelmet(true);
          sessionStorage.setItem('helmetShown', '1');
        }
      });
  }, [session]);

  const userName = firstName || 'Athlete';

  useEffect(() => {
    if (!session || !isCoach) {
      setCoachLoading(false);
      return;
    }
    const userId = session.user.id;
    const fetchStudents = async () => {
      setCoachLoading(true);
      let studentUserIds = [];

      if (userType === 'hs_coach') {
        const { data: links, error: linkErr } = await supabase
          .from('hs_coach_students')
          .select('student_user_id')
          .eq('coach_user_id', userId);
        if (!linkErr) {
          studentUserIds = (links || []).map(l => l.student_user_id);
        }
      } else if (userType === 'hs_guidance_counselor') {
        const { data: links, error: linkErr } = await supabase
          .from('hs_counselor_students')
          .select('student_user_id')
          .eq('counselor_user_id', userId);
        if (!linkErr) {
          studentUserIds = (links || []).map(l => l.student_user_id);
        }
      }

      if (studentUserIds.length === 0) {
        setCoachStudents([]);
        setCoachLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, parent_guardian_email')
        .in('user_id', studentUserIds);

      setCoachStudents(profiles || []);
      setCoachLoading(false);
    };
    fetchStudents();
  }, [session, isCoach, userType]);

  const studentEmails = coachStudents
    .map(s => s.email)
    .filter(Boolean);
  const parentEmails = coachStudents
    .map(s => s.parent_guardian_email)
    .filter(Boolean);
  const studentMailto = studentEmails.length > 0
    ? `mailto:?bcc=${encodeURIComponent(studentEmails.join(','))}&subject=${encodeURIComponent('Update from your ' + roleLabel)}`
    : null;
  const parentMailto = parentEmails.length > 0
    ? `mailto:?bcc=${encodeURIComponent(parentEmails.join(','))}&subject=${encodeURIComponent('Update from your student\'s ' + roleLabel)}`
    : null;

  if (isCoach && !coachLoading) {
    const coachFaqItems = [
      {
        question: 'How do students appear on my roster?',
        answer: 'Students are linked to your account by an administrator. Once linked, their profiles and shortlists are visible from your dashboard. Contact support if a student is missing.',
      },
      {
        question: 'What can I see on the full dashboard?',
        answer: 'The full dashboard shows each student\'s profile completeness, GRIT FIT results, shortlist progress, and GPA. You can click into any student to see their full recruiting timeline.',
      },
    ];

    return (
      <div>
        {/* Coach welcome banner */}
        <section style={{ marginBottom: 32, textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#2C2C2C',
            margin: '0 0 8px 0',
            fontFamily: 'var(--font-heading)',
          }}>
            Welcome back, {userName}!
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
            {coachStudents.length > 0
              ? `You have ${coachStudents.length} student${coachStudents.length === 1 ? '' : 's'} on your roster.`
              : 'No students are linked to your account yet.'}
          </p>
          <Link to="/coach" style={{
            display: 'inline-block',
            padding: '10px 24px',
            backgroundColor: '#8B3A3A',
            borderRadius: 4,
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}>
            Go to Dashboard
          </Link>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

        {/* 3-card grid */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {/* Email Students card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #D4AF37',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 12px 0' }}>
                Email Students
              </h3>
              <p style={{ color: '#6B6B6B', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 20 }}>
                Send a BCC message to all students on your roster.
              </p>
              {studentMailto ? (
                <a href={studentMailto} style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  border: '2px solid #D4AF37',
                  borderRadius: 4,
                  color: '#8B3A3A',
                  backgroundColor: 'transparent',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  Open Email
                </a>
              ) : (
                <span style={{ color: '#6B6B6B', fontSize: '0.875rem' }}>No student emails on file</span>
              )}
            </div>

            {/* Email Parents card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #D4AF37',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 12px 0' }}>
                Email Parents/Guardians
              </h3>
              <p style={{ color: '#6B6B6B', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 20 }}>
                Send a BCC message to all parents and guardians on your roster.
              </p>
              {parentMailto ? (
                <a href={parentMailto} style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  border: '2px solid #D4AF37',
                  borderRadius: 4,
                  color: '#8B3A3A',
                  backgroundColor: 'transparent',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  Open Email
                </a>
              ) : (
                <span style={{ color: '#6B6B6B', fontSize: '0.875rem' }}>No parent emails on file</span>
              )}
            </div>

            {/* Full Dashboard card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #8B3A3A',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 4px 12px rgba(139,58,58,0.15)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 12px 0' }}>
                Full Dashboard
              </h3>
              <p style={{ color: '#6B6B6B', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 20 }}>
                View all student profiles, shortlists, GRIT FIT results, and recruiting progress.
              </p>
              <Link to="/coach" style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: '#8B3A3A',
                borderRadius: 4,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                View Dashboard
              </Link>
            </div>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

        {/* Platform overview */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E8E8',
            borderRadius: 8,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 12px 0' }}>
              About GrittyFB
            </h3>
            <p style={{ color: '#6B6B6B', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
              GrittyFB helps student-athletes find their best-fit college football program. Our GRIT FIT algorithm evaluates 662 programs across Athletic Fit, Academic Fit, Geographic Fit, and Financial Fit. As a {roleLabel.toLowerCase()}, you can monitor each student's progress, track shortlist activity, and stay in contact with students and families — all in one place.
            </p>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

        {/* Coach FAQ */}
        <section id="needHelpSection" style={{
          backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 8,
          padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 16px 0' }}>
            {roleLabel} FAQ
          </h4>
          {coachFaqItems.map((item, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setOpenHelp(openHelp === i ? null : i)}
                style={{
                  background: 'none', border: 'none', color: '#6B6B6B', cursor: 'pointer',
                  fontSize: '0.9375rem', padding: '8px 0', textAlign: 'left', width: '100%',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#8B3A3A'; }}
                onMouseLeave={(e) => { e.target.style.color = '#6B6B6B'; }}
                aria-expanded={openHelp === i}
              >
                {openHelp === i ? '\u25BE' : '\u25B8'} {item.question}
              </button>
              {openHelp === i && (
                <div style={{
                  padding: '12px 16px', color: '#6B6B6B',
                  fontSize: '0.875rem', lineHeight: 1.6,
                  backgroundColor: '#FAFAFA', borderRadius: 4, margin: '4px 0',
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome section */}
      <section style={{ marginBottom: 32, textAlign: 'center' }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#2C2C2C',
          margin: '0 0 8px 0',
          fontFamily: "var(--font-heading)",
        }}>
          Welcome back, {userName}!
        </h2>

        {profileComplete ? (
          <>
            <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
              Your results are in! Check out your GRIT FIT matches and update your college football Short List.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/profile" data-testid="welcome-edit-profile" style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--brand-maroon)',
                borderRadius: 4,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}>
                Edit Profile
              </Link>
              <Link to="/gritfit" data-testid="welcome-view-results" style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--brand-gold-dark)',
                borderRadius: 4,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}>
                View My Results Now
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
              Almost there! Complete your profile to see your personalized matches.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/profile" data-testid="welcome-edit-profile" style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--brand-maroon)',
                borderRadius: 4,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}>
                Edit Profile
              </Link>
              <Link to="/profile" data-testid="welcome-get-started" style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--brand-gold-dark)',
                borderRadius: 4,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}>
                Get Started
              </Link>
            </div>
          </>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

      {/* Three-step user journey (Sprint 003 D2a) */}
      <JourneyStepper />

      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

      {/* Help section — collapsible with distinct shading */}
      <section id="needHelpSection" style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 8,
        padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <button
          id="tutHelpBtn"
          onClick={() => setShowTutorial(true)}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, marginBottom: openHelp !== null ? 16 : 0,
          }}
        >
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-maroon)', margin: 0 }}>
            Need Help?
          </h4>
          <span style={{
            padding: '10px 24px', backgroundColor: 'var(--brand-maroon)', color: '#FFFFFF',
            borderRadius: 6, fontSize: '0.9375rem', fontWeight: 700,
            border: '2px solid var(--brand-button-border)',
            boxShadow: '0 4px 12px rgba(212,175,55,0.35)',
          }}>
            Take the Tour
          </span>
        </button>
        {helpItems.map((item, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenHelp(openHelp === i ? null : i); }}
              style={{
                background: 'none', border: 'none', color: '#6B6B6B', cursor: 'pointer',
                fontSize: '0.9375rem', padding: '8px 0', textAlign: 'left', width: '100%',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#8B3A3A'; }}
              onMouseLeave={(e) => { e.target.style.color = '#6B6B6B'; }}
              aria-expanded={openHelp === i}
            >
              {openHelp === i ? '\u25BE' : '\u25B8'} {item.question}
            </button>
            {openHelp === i && (
              <div style={{
                padding: '8px 0 8px 20px', color: '#6B6B6B',
                fontSize: '0.875rem', lineHeight: 1.6,
                backgroundColor: '#FAFAFA', borderRadius: 4, margin: '4px 0',
                padding: '12px 16px',
              }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Helmet Animation */}
      {showHelmet && (
        <HelmetAnim targetId="tutHelpBtn" onDone={() => setShowHelmet(false)} />
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <Tutorial type="browse" onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
