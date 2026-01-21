import { MapPin, Building, Clock, Briefcase, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function JobCard({ job, showMatchDetails = false }) {
  const { applyToJob } = useStore();

  const getScoreBadgeColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
          <div className="flex items-center gap-2 text-gray-600">
            <Building className="w-4 h-4" />
            <span>{job.company}</span>
          </div>
        </div>
        
        {job.matchScore !== undefined && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreBadgeColor(job.matchScore)}`}>
            {job.matchScore}% Match
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {job.location}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="w-4 h-4" />
          {job.jobType}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {formatDate(job.postedDate)}
        </span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
          {job.workMode}
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {job.skills?.slice(0, 5).map((skill) => (
          <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {skill}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {job.description}
      </p>

      {/* Match Details */}
      {showMatchDetails && job.matchedSkills?.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 mb-2">
            <strong>Matched Skills:</strong> {job.matchedSkills.join(', ')}
          </p>
          {job.matchSummary && (
            <p className="text-sm text-green-700">{job.matchSummary}</p>
          )}
        </div>
      )}

      {/* Apply Button */}
      <button
        onClick={() => applyToJob(job)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Apply Now
      </button>
    </div>
  );
}