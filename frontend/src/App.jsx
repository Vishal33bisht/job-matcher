import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ApplicationsPage from './pages/ApplicationsPage';
import LoginPage from './pages/LoginPage';
import ResumeModal from './components/ResumeModal';
import ApplyConfirmModal from './components/ApplyConfirmModal';
import { useStore } from './store/useStore';

function App() {
  const { userId, showResumeModal, checkResume } = useStore();

  useEffect(() => {
    if (userId) {
      checkResume();
    }
  }, [userId, checkResume]);

  if (!userId) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      
      {showResumeModal && <ResumeModal />}
      <ApplyConfirmModal />
    </BrowserRouter>
  );
}

export default App;
