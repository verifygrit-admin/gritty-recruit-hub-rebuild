/**
 * JourneyCard — single step in the Home three-step user journey (Sprint 003 D2a).
 * Prop-driven: heading, body, CTA label, CTA href.
 */
import { Link } from 'react-router-dom';

export default function JourneyCard({ heading, body, cta, href, stepNumber }) {
  return (
    <div
      data-testid={`journey-card-${stepNumber}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '2px solid var(--brand-maroon)',
        borderRadius: 8,
        padding: '24px 28px',
        boxShadow: '0 4px 12px rgba(139,58,58,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 640,
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
        // H3 mobile fix: prevent long unbreakable tokens from forcing the
        // card wider than its container (flex children don't shrink by
        // default when their intrinsic content exceeds the parent).
        boxSizing: 'border-box',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          // H3 mobile fix: allow the heading (flex child) to shrink below
          // its intrinsic content width so long words wrap inside the card.
          minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--brand-maroon)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: 'var(--font-body)',
            flexShrink: 0,
          }}
        >
          {stepNumber}
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#2C2C2C',
            fontFamily: 'var(--font-heading)',
            // H3 mobile fix: unblock flex shrinking + wrap long tokens.
            minWidth: 0,
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {heading}
        </h3>
      </div>

      <p
        style={{
          margin: 0,
          color: '#4A4A4A',
          fontSize: '1rem',
          lineHeight: 1.6,
          // H3 mobile fix: wrap long tokens (URLs, compound phrases) at
          // narrow viewports so body copy never exceeds the card width.
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {body}
      </p>

      <Link
        to={href}
        data-testid={`journey-card-cta-${stepNumber}`}
        style={{
          alignSelf: 'flex-start',
          marginTop: 8,
          padding: '10px 24px',
          backgroundColor: 'var(--brand-maroon)',
          color: '#FFFFFF',
          borderRadius: 4,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {cta}
      </Link>
    </div>
  );
}
