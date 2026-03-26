import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import GritFitPage from './pages/GritFitPage.jsx';
import ShortlistPage from './pages/ShortlistPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth screens — no Layout wrapper */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* App screens — Layout wrapper */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/profile" element={<Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>} />
          <Route path="/gritfit" element={<Layout><ProtectedRoute><GritFitPage /></ProtectedRoute></Layout>} />
          <Route path="/shortlist" element={<Layout><ProtectedRoute><ShortlistPage /></ProtectedRoute></Layout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
