import { useState, useEffect } from 'react';

/**
 * DeadlinePercentileTracker — Circular SVG deadline countdowns.
 *
 * Each recruiting milestone renders as a circle where the arc fill
 * represents remaining time out of a 365-day window.
 *
 * Color logic:
 *   Green  (#2E7D32) — >60 days remaining
 *   Amber  (#F9A825) — 15-60 days remaining
 *   Red    (#C62828) — <=14 days remaining
 *   Gray   (#9E9E9E) — deadline passed
 *
 * Props:
 *   deadlines — Array of { name: string, date: Date }
 */

const TRACK_COLOR = '#E0E0E0';
const GREEN = '#2E7D32';
const AMBER = '#F9A825';
const URGENT_RED = '#C62828';
const GRAY = '#9E9E9E';
const TEXT_MED = '#6B6B6B';
const CREAM = '#F5EFE0';
const BORDER = '#E8E8E8';

function getColor(days, isPast) {
  if (isPast) return GRAY;
  if (days > 60) return GREEN;
  if (days > 14) return AMBER;
  return URGENT_RED;
}

function daysUntil(target) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}

function DeadlineCircle({ deadline, size }) {
  const isDesktop = size !== 'mobile';
  const diameter = isDesktop ? 120 : 80;
  const strokeWidth = isDesktop ? 10 : 8;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const days = daysUntil(deadline.date);
  const isPast = days < 0;
  const color = getColor(days, isPast);

  // Percentile: days remaining / 365 = how much arc to fill
  const maxDays = 365;
  const remaining = isPast ? 0 : Math.min(days, maxDays);
  const pct = remaining / maxDays;
  const dashoffset = circumference * (1 - pct);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    }}>
      <div style={{ position: 'relative', width: diameter, height: diameter }}>
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={TRACK_COLOR}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: isDesktop ? '1.5rem' : '1.125rem',
            fontWeight: 700,
            color: color,
            lineHeight: 1,
          }}>
            {isPast ? 'Passed' : days}
          </span>
          {!isPast && (
            <span style={{
              fontSize: isDesktop ? '0.625rem' : '0.5rem',
              fontWeight: 600,
              color: TEXT_MED,
              marginTop: 2,
            }}>
              days
            </span>
          )}
        </div>
      </div>
      {/* Milestone name below */}
      <div style={{
        textAlign: 'center',
        fontSize: isDesktop ? '0.75rem' : '0.625rem',
        fontWeight: 600,
        color: TEXT_MED,
        maxWidth: diameter + 20,
        lineHeight: 1.3,
      }}>
        {deadline.name}
      </div>
    </div>
  );
}

export default function DeadlinePercentileTracker({ deadlines }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const size = isMobile ? 'mobile' : 'desktop';

  return (
    <div
      data-testid="deadline-tracker"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? 16 : 32,
        padding: isMobile ? '16px' : '20px 24px',
        backgroundColor: CREAM,
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        marginBottom: 24,
        overflowX: 'auto',
      }}
    >
      {deadlines.map(dl => (
        <DeadlineCircle key={dl.name} deadline={dl} size={size} />
      ))}
    </div>
  );
}
