import { create } from 'zustand';
import api from '../services/api';

function normalizeResumeResponse(payload, fallbackFile) {
  const resume = payload?.resume || payload;

  if (!resume) return resume;

  return {
    ...resume,
    fileName: resume.fileName || fallbackFile?.name,
    uploadedAt: resume.uploadedAt || new Date().toISOString(),
  };
}

function hasCachedResume(userId) {
  return Boolean(userId && localStorage.getItem(`job_matcher_resume_uploaded_${userId}`) === 'true');
}

function buildQueryParams(filters, userId, defaultLocation = '') {
  const params = new URLSearchParams();
  const effectiveFilters = {
    ...filters,
    location: filters.location || defaultLocation,
  };

  if (userId) params.set('userId', userId);

  Object.entries(effectiveFilters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
      return;
    }

    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  return params;
}

const initialUserId = localStorage.getItem('job_matcher_userid') || localStorage.getItem('userId') || null;
const initialDefaultLocation = localStorage.getItem('job_matcher_default_location') || '';
let fetchJobsRequestId = 0;

export const useStore = create((set, get) => ({
  userId: initialUserId,
  userName: localStorage.getItem('job_matcher_username') || null,
  defaultLocation: initialDefaultLocation,

  hasResume: false,
  resumeData: null,
  showResumeModal: Boolean(initialUserId && !hasCachedResume(initialUserId)),

  jobs: [],
  bestMatches: [],
  loading: false,
  filters: {
    query: '',
    location: initialDefaultLocation,
    jobType: '',
    workMode: '',
    datePosted: '',
    skills: [],
    minMatchScore: 0
  },

  applications: [],

  pendingJob: null,
  showApplyConfirm: false,

  chatMessages: [],
  chatOpen: false,

  setUserId: (id, name) => {
    localStorage.setItem('job_matcher_userid', id);
    localStorage.setItem('userId', id);
    if (name) localStorage.setItem('job_matcher_username', name);
    set({
      userId: id,
      userName: name || get().userName,
      showResumeModal: !hasCachedResume(id),
    });
  },

  checkResume: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      const response = await api.get(`/resume/${userId}`);
      const resume = normalizeResumeResponse(response.data);

      if (!resume || response.data?.hasResume === false) {
        localStorage.removeItem(`job_matcher_resume_uploaded_${userId}`);
        set({ hasResume: false, resumeData: null, showResumeModal: true });
        return;
      }

      localStorage.setItem(`job_matcher_resume_uploaded_${userId}`, 'true');
      set({ hasResume: true, resumeData: resume, showResumeModal: false });
    } catch {
      localStorage.removeItem(`job_matcher_resume_uploaded_${userId}`);
      set({ hasResume: false, showResumeModal: true });
    }
  },

  uploadResume: async (file) => {
    const { userId } = get();
    if (!userId) throw new Error('User id is required before uploading a resume');

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/resume/upload/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    localStorage.setItem(`job_matcher_resume_uploaded_${userId}`, 'true');
    set({ hasResume: true, resumeData: normalizeResumeResponse(response.data, file), showResumeModal: false });
    get().fetchJobs();
    get().fetchBestMatches();
  },

  fetchJobs: async () => {
    const { userId, filters, defaultLocation } = get();
    const requestId = fetchJobsRequestId + 1;
    fetchJobsRequestId = requestId;
    set({ loading: true });

    try {
      const params = buildQueryParams(filters, userId, defaultLocation);
      const response = await api.get(`/jobs?${params}`);
      if (requestId !== fetchJobsRequestId) return;
      set({ jobs: response.data.jobs, loading: false });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      if (requestId !== fetchJobsRequestId) return;
      set({ loading: false });
    }
  },

  fetchBestMatches: async () => {
    const { userId, filters, defaultLocation } = get();
    if (!userId) {
      set({ bestMatches: [] });
      return;
    }

    try {
      const params = buildQueryParams({ location: filters.location }, null, defaultLocation);
      const queryString = params.toString();
      const response = await api.get(`/jobs/best-matches/${userId}${queryString ? `?${queryString}` : ''}`);
      set({ bestMatches: response.data.bestMatches });
    } catch (error) {
      console.error('Failed to fetch best matches:', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchJobs();
  },

  setDefaultLocation: (location) => {
    const nextLocation = String(location || '').trim();

    if (nextLocation) {
      localStorage.setItem('job_matcher_default_location', nextLocation);
    } else {
      localStorage.removeItem('job_matcher_default_location');
    }

    set((state) => ({
      defaultLocation: nextLocation,
      filters: {
        ...state.filters,
        location: nextLocation ? state.filters.location || nextLocation : state.filters.location === state.defaultLocation ? '' : state.filters.location,
      },
    }));

    get().fetchJobs();
    get().fetchBestMatches();
  },

  applyToJob: (job) => {
    set({ pendingJob: job, showApplyConfirm: false });
    window.open(job.applyLink, '_blank', 'noopener,noreferrer');

    const handleFocus = () => {
      set({ showApplyConfirm: true });
      window.removeEventListener('focus', handleFocus);
    };
    window.addEventListener('focus', handleFocus);
  },

  confirmApplication: async (status) => {
    const { userId, pendingJob } = get();
    if (!userId || !pendingJob) return;

    try {
      if (status === 'applied' || status === 'applied_earlier') {
        await api.post('/applications', {
          userId,
          jobId: pendingJob.id,
          jobTitle: pendingJob.title,
          company: pendingJob.company,
          status: 'applied'
        });
        get().fetchApplications();
      }
    } catch (error) {
      console.error('Failed to save application:', error);
    } finally {
      set({ pendingJob: null, showApplyConfirm: false });
    }
  },

  fetchApplications: async () => {
    const { userId } = get();
    if (!userId) {
      set({ applications: [] });
      return;
    }

    try {
      const response = await api.get(`/applications/${userId}`);
      set({ applications: response.data.applications });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  },

  updateApplicationStatus: async (applicationId, status, note) => {
    const { userId } = get();
    if (!userId) return;

    await api.patch(`/applications/${userId}/${applicationId}`, { status, note });
    get().fetchApplications();
  },

  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),

  sendMessage: async (message) => {
    const { userId, chatMessages } = get();
    if (!userId || !message.trim()) return;

    set({ chatMessages: [...chatMessages, { role: 'user', content: message }] });

    try {
      const response = await api.post('/ai/chat', { userId, message });

      set((state) => ({
        chatMessages: [...state.chatMessages, { role: 'assistant', ...response.data }]
      }));

      if (response.data.type === 'job_filter') {
        const filters = { ...response.data.filters };
        if (filters.minScore !== undefined && filters.minMatchScore === undefined) {
          filters.minMatchScore = filters.minScore;
        }
        delete filters.minScore;
        get().setFilters(filters);
      }
    } catch {
      set((state) => ({
        chatMessages: [...state.chatMessages, {
          role: 'assistant',
          type: 'text',
          message: 'Sorry, something went wrong.'
        }]
      }));
    }
  }
}));
