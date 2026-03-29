/**
 * CoachCalendarPage — Coming Soon placeholder for recruiting calendar.
 * Phase 2: recruiting_events table + event creation UI.
 */
export default function CoachCalendarPage() {
  return (
    <div data-testid="coach-calendar-page">
      <div style={{
        background: '#FFFFFF',
        border: '1px dashed #D4D4D4',
        borderRadius: 8,
        padding: 24,
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: '#F5EFE0',
          border: '1px solid #D4AF37',
          borderRadius: 12,
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#8B3A3A',
        }}>
          Coming Soon
        </span>

        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#2C2C2C',
          margin: '0 0 12px',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          Recruiting Calendar
        </h3>

        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', lineHeight: 1.6, margin: '0 0 16px' }}>
          Track upcoming recruiting events in one place:
        </p>
        <ul style={{ fontSize: '0.875rem', color: '#6B6B6B', lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 20 }}>
          <li>College recruiter visits to your school</li>
          <li>Junior Days, Official Visits, and Game Day Visits</li>
          <li>Prospect camps individual athletes are attending</li>
          <li>External recruiting events and deadlines</li>
        </ul>
        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', lineHeight: 1.6, margin: '0 0 20px' }}>
          Head coaches and counselors will receive notifications for upcoming events.
          Student-athletes will see their individual event schedule.
        </p>

        <a
          href="mailto:verifygrit@gmail.com?subject=Notify%20me%20when%20the%20Recruiting%20Calendar%20launches&body=I%27d%20like%20to%20be%20notified%20when%20the%20Recruiting%20Calendar%20feature%20is%20available."
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            border: '2px solid #8B3A3A',
            borderRadius: 4,
            color: '#8B3A3A',
            backgroundColor: 'transparent',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Notify me when this launches
        </a>
      </div>
    </div>
  );
}
