import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Briefcase } from 'lucide-react';

export default function LoginPage() {
  const [name, setName] = useState('');
  const setUserId = useStore((state) => state.setUserId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Generate a consistent ID based on name or random
    const mockId = `user_${name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;
    setUserId(mockId, name);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Briefcase className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Welcome to JobTracker AI
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Enter your name to start matching with jobs
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Alex Johnson"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}