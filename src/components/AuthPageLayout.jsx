export default function AuthPageLayout({ children }) {
  return (
    <div
      data-testid="auth-page-layout"
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-testid="auth-card"
        style={{
          width: 400,
          maxWidth: '90vw',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8E8',
          borderRadius: 8,
          padding: 32,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
