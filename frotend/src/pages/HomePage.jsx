import { useEffect } from 'react';
import { Search, MapPin, Briefcase, Clock, Sparkles, TrendingUp, Loader2, Building, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import ResumeStatus from '../components/ResumeStatus';

export default function HomePage() {
  const { 
    jobs, 
    loading, 
    fetchJobs, 
    fetchBestMatches, 
    hasResume, 
    filters, 
    setFilters, 
    bestMatches, 
    applyToJob 
  } = useStore();

  useEffect(() => {
    fetchJobs();
    if (hasResume) {
      fetchBestMatches();
    }
  }, [hasResume]);

  const getMatchColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4 -mt-6 -mx-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-12 h-12" />
              Find Your Dream Job
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              AI-powered job matching to connect you with opportunities that fit your skills perfectly
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Job title, keywords, or company"
                  value={filters.query}
                  onChange={(e) => setFilters({ query: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="relative md:w-64">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Location"
                  value={filters.location}
                  onChange={(e) => setFilters({ location: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <button 
                onClick={() => fetchJobs()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search Jobs
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {[
                { label: 'Remote', value: 'remote', key: 'workMode' },
                { label: 'Full-time', value: 'full-time', key: 'jobType' },
                { label: 'Part-time', value: 'part-time', key: 'jobType' },
                { label: 'Contract', value: 'contract', key: 'jobType' }
              ].map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setFilters({ [filter.key]: filters[filter.key] === filter.value ? '' : filter.value })}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    filters[filter.key] === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Resume Status */}
        {hasResume && <ResumeStatus />}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                <p className="text-sm text-gray-500">Active Jobs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{jobs.filter(j => formatDate(j.postedDate) === 'Today').length}</p>
                <p className="text-sm text-gray-500">New Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {hasResume && jobs.length > 0 ? Math.round(jobs.reduce((acc, j) => acc + (j.matchScore || 0), 0) / jobs.length) : '-'}%
                </p>
                <p className="text-sm text-gray-500">Avg Match</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">24h</p>
                <p className="text-sm text-gray-500">Avg Response</p>
              </div>
            </div>
          </div>
        </div>

        {/* Best Matches Section */}
        {hasResume && bestMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Best Matches For You</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bestMatches.slice(0, 3).map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-purple-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getMatchColor(job.matchScore)}`}>
                      {job.matchScore}% Match
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                    <p className="text-gray-600 font-medium mb-4">{job.company}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Briefcase className="w-4 h-4" />
                        {job.jobType} • {job.workMode}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                          💰 {job.salary}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills?.slice(0, 4).map((skill) => (
                        <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => applyToJob(job)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform group-hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Jobs Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {filters.query || filters.location ? 'Search Results' : 'All Jobs'}
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 mb-2">No jobs found</p>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-gray-100 overflow-hidden group">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Building className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(job.postedDate)}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-gray-600 mb-3">{job.company}</p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Briefcase className="w-4 h-4" />
                        {job.jobType}
                      </div>
                      {job.salary && (
                        <div className="text-green-600 font-semibold">
                          {job.salary}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills?.slice(0, 3).map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                      {job.workMode && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {job.workMode}
                        </span>
                      )}
                    </div>

                    {job.matchScore !== undefined && (
                      <div className={`px-3 py-2 rounded-lg mb-3 border-2 ${getMatchColor(job.matchScore)}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Match Score</span>
                          <span className="text-lg font-bold">{job.matchScore}%</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => applyToJob(job)}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transform group-hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}