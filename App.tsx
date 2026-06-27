
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppStore } from './store';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const QuizEditor = lazy(() => import('./pages/QuizEditor'));
const QuizSession = lazy(() => import('./pages/QuizSession'));
const SubmissionReview = lazy(() => import('./pages/SubmissionReview'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-[#08b8fb] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const RedirectHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cloudConfig } = useAppStore();

  useEffect(() => {
    if (location.pathname === '/' && cloudConfig.id) {
      let params = new URLSearchParams(window.location.search);
      let mode = params.get('mode');

      if (!mode && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        mode = hashParams.get('mode');
      }

      if (mode === 'student' || mode === 'view') {
        navigate(`/view`);
      } else if (mode === 'teacher' && cloudConfig.submissionId) {
        navigate(`/review`);
      } else {
        navigate(`/edit`);
      }
    }
  }, [cloudConfig, navigate, location]);

  return null;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RedirectHandler />
      <Routes>
        <Route path="/edit" element={<QuizEditor />} />
        <Route path="/view" element={<QuizSession />} />
        <Route path="/review" element={<SubmissionReview />} />
        <Route path="/" element={<div className="p-10 text-center text-slate-400">Please provide an ID and Token in the URL.</div>} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Layout>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </Layout>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
