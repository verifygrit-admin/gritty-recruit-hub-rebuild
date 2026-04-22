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
        border: '2px solid #8B3A3A',
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#8B3A3A',
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
          }}
        >
          {heading}
        </h3>
      </div>

      <p style={{ margin: 0, color: '#4A4A4A', fontSize: '1rem', lineHeight: 1.6 }}>
        {body}
      </p>

      <Link
        to={href}
        data-testid={`journey-card-cta-${stepNumber}`}
        style={{
          alignSelf: 'flex-start',
          marginTop: 8,
          padding: '10px 24px',
          backgroundColor: '#8B3A3A',
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
