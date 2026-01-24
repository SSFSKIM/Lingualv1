import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import {
  LandingPage,
  AuthPage,
  GeneralPage,
  AssessmentPage,
  CategoriesPage,
  ChatPage,
  ProfilePage,
} from './pages';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/general" element={<GeneralPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  // Use /app as base path in production (when built with base: '/app/')
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <LanguageProvider>
          <AnimatedRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
