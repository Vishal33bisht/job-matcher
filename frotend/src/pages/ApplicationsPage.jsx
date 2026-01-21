import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Calendar, Building, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' }
];

const STATUS_COLORS = {
  applied: 'bg-blue-100 text-blue-800',
  interview: 'bg-yellow-100 text-yellow-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

export default function ApplicationsPage() {
  const { applications, fetchApplications, updateApplicationStatus } = useStore();
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApps = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Applications</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATUS_OPTIONS.slice(1).map(status => (
          <div key={status.value} className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-2xl font-bold text-gray-900">
              {applications.filter(a => a.status === status.value).length}
            </p>
            <p className="text-gray-600">{status.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {STATUS_OPTIONS.map(status => (
          <button
            key={status.value}
            onClick={() => setFilter(status.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No applications found.
          </div>
        ) : (
          filteredApps.map(app => (
            <div key={app.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{app.jobTitle}</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="w-4 h-4" />
                      <span>{app.company}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[app.status]}`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{formatDate(app.appliedAt)}</span>
                  </div>
                  {expandedId === app.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Timeline */}
              {expandedId === app.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Update Status:</p>
                    <div className="flex gap-2">
                      {['interview', 'offer', 'rejected'].map(status => (
                        <button
                          key={status}
                          onClick={() => updateApplicationStatus(app.id, status)}
                          className={`px-3 py-1 rounded text-sm ${STATUS_COLORS[status]}`}
                        >
                          Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-l-2 border-gray-200 pl-4 space-y-4">
                    {app.timeline?.map((event, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] w-3 h-3 bg-blue-500 rounded-full" />
                        <p className="text-sm font-medium text-gray-900">
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                        {event.note && <p className="text-sm text-gray-600 mt-1">{event.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}