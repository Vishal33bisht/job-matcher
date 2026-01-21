import { useEffect } from 'react';
import JobFilters from '../components/JobFilters';
import BestMatches from '../components/BestMatches';
import JobCard from '../components/JobCard';
import { useStore } from '../store/useStore';
import { Loader2 } from 'lucide-react';
import ResumeStatus from '../components/ResumeStatus';


export default function HomePage() {
  const { jobs, loading, fetchJobs, fetchBestMatches, hasResume } = useStore();

  useEffect(() => {
    fetchJobs();
    if (hasResume) {
      fetchBestMatches();
    }
  }, [hasResume]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Your Next Role</h1>
      <ResumeStatus />
      <JobFilters />
      
      <BestMatches />
      
      <h2 className="text-xl font-bold text-gray-900 mb-4">All Jobs</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No jobs found. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}ApplicationsPage.jsx