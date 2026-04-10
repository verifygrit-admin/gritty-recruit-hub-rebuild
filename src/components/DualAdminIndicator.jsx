// DualAdminIndicator — Section D, Component 5
// Stateless display of which admin account is currently active.
// Pure informational — does NOT provide a switch control. To change accounts,
// the admin must log out and log back in.
//
// Expected admin identities: chris@grittyfb.com, verifygrit@gmail.com
// This component renders whichever email the parent provides.
export default function DualAdminIndicator({ adminEmail }) {
  if (!adminEmail) return null;

  return (
    <div
      data-testid="dual-admin-indicator"
      aria-label={`Signed in as admin: ${adminEmail}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        backgroundColor: '#F5F5F5',
        border: '1px solid #D4D4D4',
        borderRadius: 999,
        fontSize: '0.8125rem',
        color: '#2C2C2C',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#2E7D32',
          display: 'inline-block',
        }}
      />
      <span style={{ color: '#6B6B6B' }}>Admin:</span>
      <span data-testid="dual-admin-email" style={{ fontWeight: 700, color: '#8B3A3A' }}>
        {adminEmail}
      </span>
    </div>
  );
}
