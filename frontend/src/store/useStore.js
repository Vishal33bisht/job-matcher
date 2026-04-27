import { create } from 'zustand';
import api from '../services/api';

function normalizeResumeResponse(payload) {
  return payload?.resume || payload?.data || payload;
}

function buildQueryParams(filters, userId) {
  const params = new URLSearchParams();

  if (userId) params.set('userId', userId);

  Object.entries(filters).forEach(([key, value]) => {
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

export const useStore = create((set, get) => ({
  userId: localStorage.getItem('job_matcher_userid') || localStorage.getItem('userId') || null,
  userName: localStorage.getItem('job_matcher_username') || null,

  hasResume: false,
  resumeData: null,
  showResumeModal: false,

  jobs: [],
  bestMatches: [],
  loading: false,
  filters: {
    query: '',
    location: '',
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
    set({ userId: id, userName: name || get().userName });
  },

  checkResume: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      const response = await api.get(`/resume/${userId}`);
      set({ hasResume: true, resumeData: normalizeResumeResponse(response.data), showResumeModal: false });
    } catch {
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

    set({ hasResume: true, resumeData: normalizeResumeResponse(response.data), showResumeModal: false });
    get().fetchJobs();
    get().fetchBestMatches();
  },

  fetchJobs: async () => {
    const { userId, filters } = get();
    set({ loading: true });

    try {
      const params = buildQueryParams(filters, userId);
      const response = await api.get(`/jobs?${params}`);
      set({ jobs: response.data.jobs, loading: false });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      set({ loading: false });
    }
  },

  fetchBestMatches: async () => {
    const { userId } = get();
    if (!userId) {
      set({ bestMatches: [] });
      return;
    }

    try {
      const response = await api.get(`/jobs/best-matches/${userId}`);
      set({ bestMatches: response.data.bestMatches });
    } catch (error) {
      console.error('Failed to fetch best matches:', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchJobs();
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
