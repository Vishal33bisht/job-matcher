import { Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';

const SKILL_OPTIONS = [
  'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
  'AWS', 'Docker', 'SQL', 'MongoDB', 'Vue.js', 'Angular', 'Figma'
];

export default function JobFilters() {
  const { filters, setFilters } = useStore();

  const handleSkillToggle = (skill) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    setFilters({ skills: newSkills });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      location: '',
      jobType: '',
      workMode: '',
      datePosted: '',
      skills: [],
      minMatchScore: 0
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      {/* Search */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search job titles..."
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <input
          type="text"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters({ location: e.target.value })}
          className="w-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={filters.jobType}
          onChange={(e) => setFilters({ jobType: e.target.value })}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Job Type</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>

        <select
          value={filters.workMode}
          onChange={(e) => setFilters({ workMode: e.target.value })}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Work Mode</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>

        <select
          value={filters.datePosted}
          onChange={(e) => setFilters({ datePosted: e.target.value })}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Date Posted</option>
          <option value="today">Last 24 hours</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </select>

        <select
          value={filters.minMatchScore}
          onChange={(e) => setFilters({ minMatchScore: parseInt(e.target.value) })}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="0">Match Score</option>
          <option value="70">High (&gt;70%)</option>
          <option value="40">Medium (&gt;40%)</option>
        </select>

        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Skills */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Skills:</p>
        <div className="flex flex-wrap gap-2">
          {SKILL_OPTIONS.map((skill) => (
            <button
              key={skill}
              onClick={() => handleSkillToggle(skill)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filters.skills.includes(skill)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}