import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  // TODO: wire AuthContext — get user profile, GRIT FIT status
  const profileComplete = false;
  const userName = 'Athlete';

  return (
    <div>
      {/* Welcome section */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#2C2C2C',
          margin: '0 0 8px 0',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}>
          Welcome back, {userName}!
        </h2>

        {profileComplete ? (
          <>
            <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
              Your GRIT FIT score: Calculated on —
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/profile" style={{
                display: 'inline-block',
                padding: '10px 24px',
                border: '2px solid #8B3A3A',
                borderRadius: 4,
                color: '#8B3A3A',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                Edit Profile
              </Link>
              <Link to="/gritfit" style={{
                color: '#D4AF37',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '12px 0',
              }}>
                View Results Now
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
              Almost there! Complete your profile to see your personalized matches.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/profile" style={{
                display: 'inline-block',
                padding: '10px 24px',
                border: '2px solid #8B3A3A',
                borderRadius: 4,
                color: '#8B3A3A',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                Edit Profile
              </Link>
              <Link to="/profile" style={{
                color: '#D4AF37',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '12px 0',
              }}>
                Get Started
              </Link>
            </div>
          </>
        )}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

      {/* Two-path section */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#2C2C2C',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Choose how to explore colleges:
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {/* Browse Map card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #D4AF37',
            borderRadius: 8,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#2C2C2C',
              margin: '0 0 12px 0',
            }}>
              Browse Map
            </h3>
            <p style={{ color: '#6B6B6B', fontSize: '1rem', lineHeight: 1.6, marginBottom: 20 }}>
              Explore all 662 college football programs on an interactive map. No filtering. See the full landscape at a glance.
            </p>
            <Link to="/gritfit" style={{
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
              Browse Map
            </Link>
          </div>

          {/* GRIT FIT card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #8B3A3A',
            borderRadius: 8,
            padding: 24,
            boxShadow: '0 4px 12px rgba(139,58,58,0.15)',
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#2C2C2C',
              margin: '0 0 12px 0',
            }}>
              GRIT FIT
            </h3>
            <p style={{ color: '#6B6B6B', fontSize: '1rem', lineHeight: 1.6, marginBottom: 20 }}>
              Your personalized match results. Up to 30 schools that fit your athletic stats, academic profile, and financial situation. Ranked by fit.
            </p>
            {profileComplete ? (
              <Link to="/gritfit" style={{
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
                View Results
              </Link>
            ) : (
              <Link to="/profile" style={{
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
                Complete Profile
              </Link>
            )}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #E8E8E8', margin: '32px 0' }} />

      {/* Help section */}
      <section>
        <h4 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#2C2C2C',
          marginBottom: 16,
        }}>
          Need help?
        </h4>
        {helpItems.map((item, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setOpenHelp(openHelp === i ? null : i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B6B6B',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '8px 0',
                textAlign: 'left',
                width: '100%',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#8B3A3A'; e.target.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.target.style.color = '#6B6B6B'; e.target.style.textDecoration = 'none'; }}
              aria-expanded={openHelp === i}
            >
              {openHelp === i ? '▾' : '▸'} {item.question}
            </button>
            {openHelp === i && (
              <div style={{
                padding: '8px 0 8px 20px',
                color: '#6B6B6B',
                fontSize: '0.875rem',
                lineHeight: 1.6,
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
