import { Sparkles } from 'lucide-react';
import JobCard from './JobCard';
import { useStore } from '../store/useStore';

export default function BestMatches() {
  const { bestMatches, hasResume } = useStore();

  if (!hasResume || bestMatches.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Best Matches for You</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {bestMatches.slice(0, 8).map((job) => (
          <JobCard key={job.id} job={job} showMatchDetails />
        ))}
      </div>
    </div>
  );
}