import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import GritFitPage from './pages/GritFitPage.jsx';
import ShortlistPage from './pages/ShortlistPage.jsx';
import CoachDashboardPage from './pages/CoachDashboardPage.jsx';
import StaffProfilePage from './pages/StaffProfilePage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import StyleguidePage from './pages/StyleguidePage.jsx';
import AthletesPage from './pages/AthletesPage.jsx';
import CoachLoginPlaceholderPage from './pages/CoachLoginPlaceholderPage.jsx';
import GritGuidesPage from './pages/GritGuidesPage.jsx';
import CoachMessageGeneratorPage from './pages/CoachMessageGeneratorPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth screens — no Layout wrapper */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin screens — no Layout wrapper, AdminRoute guard on /admin */}
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* Sprint 010 — internal GrittyFB styleguide. Unlisted, no nav, no
              auth gate. Direct URL access only. Renders the token-only
              reference component on a dark surface. */}
          <Route path="/styleguide" element={<StyleguidePage />} />

          {/* Sprint 011 — public athletes roster. No auth, no Layout.
              Path pivoted from /recruits to /athletes; the /recruits/<slug>/
              namespace is reserved for the legacy password-gated proxy at
              api/recruits-auth.ts. See sprint-011-retro for context. */}
          <Route path="/athletes" element={<AthletesPage />} />
          <Route path="/coach-login-placeholder" element={<CoachLoginPlaceholderPage />} />

          {/* App screens — Layout wrapper */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/profile" element={<Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>} />
          <Route path="/gritfit" element={<Layout><ProtectedRoute><GritFitPage /></ProtectedRoute></Layout>} />
          <Route path="/shortlist" element={<Layout><ProtectedRoute><ShortlistPage /></ProtectedRoute></Layout>} />
          <Route path="/grit-guides" element={<Layout><ProtectedRoute><GritGuidesPage /></ProtectedRoute></Layout>} />
          <Route path="/coach-messages" element={<Layout><ProtectedRoute><CoachMessageGeneratorPage /></ProtectedRoute></Layout>} />
          <Route path="/coach" element={<Layout><ProtectedRoute><CoachDashboardPage /></ProtectedRoute></Layout>} />
          <Route path="/coach/profile" element={<Layout><ProtectedRoute><StaffProfilePage /></ProtectedRoute></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
