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
import BrowseMapPage from './pages/BrowseMapPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

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

          {/* App screens — Layout wrapper */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/browse-map" element={<Layout><BrowseMapPage /></Layout>} />
          <Route path="/profile" element={<Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>} />
          <Route path="/gritfit" element={<Layout><ProtectedRoute><GritFitPage /></ProtectedRoute></Layout>} />
          <Route path="/shortlist" element={<Layout><ProtectedRoute><ShortlistPage /></ProtectedRoute></Layout>} />
          <Route path="/coach" element={<Layout><ProtectedRoute><CoachDashboardPage /></ProtectedRoute></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
