import { Search } from 'lucide-react';
import { useStore } from '../store/useStore';

const SKILL_OPTIONS = ['React', 'Node.js', 'Python', 'TypeScript', 'Tailwind', 'AWS', 'Figma'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const MATCH_SCORES = [
  { label: 'All Match Scores', value: '0' },
  { label: 'High (> 70%)', value: '70' },
  { label: 'Medium (40-70%)', value: '40' },
];
// New Date Options
const DATE_POSTED_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last week', value: '7d' },
  { label: 'Last month', value: '30d' },
];

export default function JobFilters() {
  const { filters, setFilters, fetchJobs } = useStore();

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const updateFilter = (key, value) => {
    setFilters({ [key]: value });
  };

  const toggleSkill = (skill) => {
    const currentSkills = filters.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    updateFilter('skills', newSkills);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search jobs by title, company, or keywords..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Match Score */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Match Score</label>
            <select
              className="w-full p-2 border rounded-lg bg-white text-sm"
              value={filters.minMatchScore}
              onChange={(e) => updateFilter('minMatchScore', Number(e.target.value))}
            >
              {MATCH_SCORES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date Posted (NEW) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Date Posted</label>
            <select
              className="w-full p-2 border rounded-lg bg-white text-sm"
              value={filters.datePosted}
              onChange={(e) => updateFilter('datePosted', e.target.value)}
            >
              {DATE_POSTED_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Job Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Job Type</label>
            <select
              className="w-full p-2 border rounded-lg bg-white text-sm"
              value={filters.jobType}
              onChange={(e) => updateFilter('jobType', e.target.value)}
            >
              <option value="">Any Job Type</option>
              {JOB_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Work Mode */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Work Mode</label>
            <select
              className="w-full p-2 border rounded-lg bg-white text-sm"
              value={filters.workMode}
              onChange={(e) => updateFilter('workMode', e.target.value)}
            >
              <option value="">Any Work Mode</option>
              {WORK_MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

           {/* Location */}
           <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
            <input
              type="text"
              placeholder="City..."
              className="w-full p-2 border rounded-lg text-sm"
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
            />
          </div>
        </div>

        {/* Skills Tags */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Popular Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.skills?.includes(skill)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
          >
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  );
}