/**
 * RecruitCard — Sprint 011 D6
 *
 * Public-facing player card on /athletes. Distinct from the frozen
 * styleguide exemplar (PlayerCardReference) — this is the production card.
 * Receives a pre-resolved profile object containing only whitelisted PII
 * fields (the data hook constructs the shape; this component does not call
 * Supabase directly).
 *
 * Whitelist enforced at the destructure boundary as defense in depth on top
 * of the hook's SELECT clause and the public-recruits RLS policy. A profile
 * passed in with extra PII fields (email, phone, parent_guardian_email,
 * agi, dependents, hs_lat, hs_lng, sat) does not surface those values
 * because they are never read out of the destructure.
 *
 * Hover state replicates the prototype (line 421-425 of
 * docs/specs/.coach-scheduler-sprints/index.html): border shifts to
 * gf-accent-deep, translateY(-2px), shadow elevates. Transition timing
 * 0.18s on each property to match the prototype.
 *
 * Token-only styling. Zero hardcoded brand hex literals.
 */

import { normalizeTwitter } from '../../lib/recruits/utils.js';

// expected_starter intentionally omitted from the live /athletes surface
// (Sprint 012 Phase 2 hotfix). The field stays in the data-hook whitelist
// and destructure boundary — fetched but not surfaced — so a future sprint
// can re-enable without data-layer work. PlayerCardReference (frozen
// styleguide exemplar) still surfaces the chip for design reference.
const ACCOLADE_SLOTS = [
  { key: 'captain', label: 'Captain' },
  { key: 'all_conference', label: 'All-Conference' },
  { key: 'all_state', label: 'All-State' },
];

function getInitials(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function formatInterestSummary(schoolsShortlisted, recruitingProgressPct) {
  if (!schoolsShortlisted || schoolsShortlisted <= 0) {
    return { isZeroState: true, primary: 'Not yet active', secondary: null };
  }
  const noun = schoolsShortlisted === 1 ? 'school' : 'schools';
  const pct =
    recruitingProgressPct == null
      ? null
      : `Recruiting Progress ${recruitingProgressPct}%`;
  return {
    isZeroState: false,
    primary: `${schoolsShortlisted} ${noun}`,
    secondary: pct,
  };
}

export default function RecruitCard({ profile } = {}) {
  if (!profile) return null;

  // Destructure only whitelisted fields. Excluded fields on the input object
  // are intentionally never read.
  const {
    name,
    high_school,
    grad_year,
    position,
    height,
    weight,
    speed_40,
    gpa,
    twitter,
    hudl_url,
    avatarUrl,
    expected_starter,
    captain,
    all_conference,
    all_state,
    schoolsShortlisted,
    recruitingProgressPct,
  } = profile;

  const positionLine = [
    position,
    height,
    weight != null ? `${weight} lbs` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const initials = getInitials(name);
  const twitterHandle = normalizeTwitter(twitter);
  const interest = formatInterestSummary(schoolsShortlisted, recruitingProgressPct);
  const accoladeFlags = { expected_starter, captain, all_conference, all_state };
  const visibleAccolades = ACCOLADE_SLOTS.filter(
    (slot) => accoladeFlags[slot.key] === true
  );

  return (
    <div
      data-testid="rc-card"
      className="recruit-card"
      style={{
        position: 'relative',
        background: 'var(--gf-light-bg-elev)',
        border: '1px solid var(--gf-light-border)',
        borderRadius: 'var(--gf-radius)',
        padding: 'var(--gf-space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gf-space-md)',
        boxShadow: 'var(--gf-shadow-card)',
        fontFamily: 'var(--gf-body)',
        color: 'var(--gf-light-text)',
        transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
      }}
    >
      <style>{`
        .recruit-card:hover {
          border-color: var(--gf-accent-deep);
          transform: translateY(-2px);
          box-shadow: var(--gf-shadow-elev);
        }
        .recruit-card-link:hover {
          color: var(--gf-accent-deep);
        }
      `}</style>

      {grad_year && (
        <span
          data-testid="rc-tag"
          style={{
            fontFamily: 'var(--gf-body)',
            position: 'absolute',
            top: 'var(--gf-space-md)',
            right: 'var(--gf-space-md)',
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--gf-radius-pill)',
            background: 'var(--gf-accent-soft)',
            color: 'var(--gf-bg-deep)',
            border: '1px solid var(--gf-accent-deep)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Class {grad_year}
        </span>
      )}

      <div
        data-testid="rc-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gf-space-md)',
        }}
      >
        <div
          data-testid="rc-photo"
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--gf-bg-elev) 0%, var(--gf-bg-deep) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gf-accent)',
            fontFamily: 'var(--gf-display)',
            fontSize: '1.4rem',
            fontWeight: 600,
            flexShrink: 0,
            border: '2px solid var(--gf-light-border)',
            overflow: 'hidden',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || ''}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            data-testid="rc-name"
            style={{
              fontFamily: 'var(--gf-display)',
              fontWeight: 600,
              fontSize: '1.15rem',
              color: 'var(--gf-light-text)',
              marginBottom: 2,
            }}
          >
            {name}
          </div>
          <div
            data-testid="rc-position"
            style={{
              fontFamily: 'var(--gf-body)',
              fontSize: '0.85rem',
              color: 'var(--gf-light-text-muted)',
              fontWeight: 500,
            }}
          >
            {positionLine}
          </div>
          {high_school && (
            <div
              data-testid="rc-school"
              style={{
                fontFamily: 'var(--gf-body)',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--gf-accent-deep)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gf-accent-deep)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {high_school}
            </div>
          )}
        </div>
      </div>

      {visibleAccolades.length > 0 && (
        <div
          data-testid="rc-accolades"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--gf-space-xs)',
          }}
        >
          {visibleAccolades.map((slot) => (
            <span
              key={slot.key}
              data-testid="rc-chip"
              style={{
                fontFamily: 'var(--gf-body)',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--gf-radius-pill)',
                background: 'var(--gf-accent-soft)',
                color: 'var(--gf-bg-deep)',
                border: '1px solid var(--gf-accent-deep)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {slot.label}
            </span>
          ))}
        </div>
      )}

      <div
        data-testid="rc-interest"
        style={{
          fontFamily: 'var(--gf-body)',
          fontSize: '0.85rem',
          color: interest.isZeroState
            ? 'var(--gf-text-dim)'
            : 'var(--gf-light-text)',
          background: 'var(--gf-light-bg)',
          borderRadius: 'var(--gf-radius-sm)',
          padding: '0.6rem 0.75rem',
          borderLeft: '3px solid var(--gf-accent-deep)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--gf-body)',
            fontWeight: 600,
            color: 'var(--gf-light-text-muted)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'block',
            marginBottom: 2,
          }}
        >
          Active Interest
        </span>
        {interest.isZeroState ? (
          <span
            style={{
              fontFamily: 'var(--gf-body)',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: 'var(--gf-text-dim)',
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            {interest.primary}
          </span>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--gf-body)', fontWeight: 600 }}>
              {interest.primary}
            </span>
            {interest.secondary && (
              <>
                <span style={{ fontFamily: 'var(--gf-body)' }}> · </span>
                <span style={{ fontFamily: 'var(--gf-body)' }}>
                  {interest.secondary}
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div
        data-testid="rc-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--gf-space-sm) var(--gf-space-md)',
          fontSize: '0.85rem',
          paddingTop: 'var(--gf-space-sm)',
          borderTop: '1px dashed var(--gf-light-border)',
        }}
      >
        <div data-testid="rc-stat" style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'var(--gf-body)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--gf-light-text-muted)',
              marginBottom: 2,
            }}
          >
            GPA
          </span>
          <span
            style={{
              fontFamily: 'var(--gf-body)',
              fontWeight: 500,
              color: 'var(--gf-light-text)',
            }}
          >
            {gpa != null ? Number(gpa).toFixed(2) : '—'}
          </span>
        </div>
        <div data-testid="rc-stat" style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'var(--gf-body)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--gf-light-text-muted)',
              marginBottom: 2,
            }}
          >
            40 yd
          </span>
          <span
            style={{
              fontFamily: 'var(--gf-body)',
              fontWeight: 500,
              color: 'var(--gf-light-text)',
            }}
          >
            {speed_40 != null ? `${Number(speed_40).toFixed(2)}s` : '—'}
          </span>
        </div>
      </div>

      {(hudl_url || twitterHandle) && (
        <div
          data-testid="rc-links"
          style={{
            display: 'flex',
            gap: 'var(--gf-space-md)',
            fontSize: '0.85rem',
            marginTop: 'auto',
            paddingTop: 'var(--gf-space-sm)',
            borderTop: '1px solid var(--gf-light-border)',
          }}
        >
          {hudl_url && (
            <a
              href={hudl_url}
              target="_blank"
              rel="noopener noreferrer"
              className="recruit-card-link"
              style={{
                fontFamily: 'var(--gf-body)',
                color: 'var(--gf-light-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
            >
              Hudl Film →
            </a>
          )}
          {twitterHandle && (
            <a
              href={`https://x.com/${twitterHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="recruit-card-link"
              style={{
                fontFamily: 'var(--gf-body)',
                color: 'var(--gf-light-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
            >
              X / Twitter
            </a>
          )}
        </div>
      )}
    </div>
  );
}
