import { Link, useLocation } from 'react-router-dom';
import { Briefcase, FileText, MessageCircle } from 'lucide-react';
import AIChatSidebar from './AIChatSidebar';
import { useStore } from '../store/useStore';

export default function Layout({ children }) {
  const location = useLocation();
  const { chatOpen, toggleChat } = useStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">JobTracker AI</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Briefcase className="w-5 h-5" />
              Jobs
            </Link>
            <Link 
              to="/applications"
              className={`flex items-center gap-2 ${location.pathname === '/applications' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <FileText className="w-5 h-5" />
              Applications
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {chatOpen && <AIChatSidebar />}
    </div>
  );
}