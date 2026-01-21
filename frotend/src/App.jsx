import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ApplicationsPage from './pages/ApplicationsPage';
import ResumeModal from './components/ResumeModal';
import ApplyConfirmModal from './components/ApplyConfirmModal';
import { useStore } from './store/useStore';

function App() {
  const { userId, showResumeModal, hasResume, checkResume } = useStore();

  useEffect(() => {
    checkResume();
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Routes>
      </Layout>
      
      {showResumeModal && <ResumeModal />}
      <ApplyConfirmModal />
    </BrowserRouter>
  );
}

export default App;