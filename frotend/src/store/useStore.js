import { create } from 'zustand';
import api from '../services/api';

export const useStore = create((set, get) => ({
  // User
  userId: localStorage.getItem('userId') || `user_${Date.now()}`,
  
  // Resume
  hasResume: false,
  resumeData: null,
  showResumeModal: false,
  
  // Jobs
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
  
  // Applications
  applications: [],
  
  // Apply confirmation
  pendingJob: null,
  showApplyConfirm: false,
  
  // AI Chat
  chatMessages: [],
  chatOpen: false,

  // Actions
  setUserId: (id) => {
    localStorage.setItem('userId', id);
    set({ userId: id });
  },

  checkResume: async () => {
    const { userId } = get();
    try {
      const response = await api.get(`/resume/${userId}`);
      set({ hasResume: true, resumeData: response.data, showResumeModal: false });
    } catch {
      set({ hasResume: false, showResumeModal: true });
    }
  },

  uploadResume: async (file) => {
    const { userId } = get();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/resume/upload/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    set({ hasResume: true, resumeData: response.data, showResumeModal: false });
    get().fetchJobs();
    get().fetchBestMatches();
  },

  fetchJobs: async () => {
    const { userId, filters } = get();
    set({ loading: true });
    
    try {
      const params = new URLSearchParams({ userId, ...filters });
      if (filters.skills?.length) {
        params.set('skills', filters.skills.join(','));
      }
      
      const response = await api.get(`/jobs?${params}`);
      set({ jobs: response.data.jobs, loading: false });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      set({ loading: false });
    }
  },

  fetchBestMatches: async () => {
    const { userId } = get();
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
    window.open(job.applyLink, '_blank');
    
    // Show confirmation when user returns
    const handleFocus = () => {
      set({ showApplyConfirm: true });
      window.removeEventListener('focus', handleFocus);
    };
    window.addEventListener('focus', handleFocus);
  },

  confirmApplication: async (status) => {
    const { userId, pendingJob } = get();
    
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
    
    set({ pendingJob: null, showApplyConfirm: false });
  },

  fetchApplications: async () => {
    const { userId } = get();
    try {
      const response = await api.get(`/applications/${userId}`);
      set({ applications: response.data.applications });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  },

  updateApplicationStatus: async (applicationId, status, note) => {
    const { userId } = get();
    await api.patch(`/applications/${userId}/${applicationId}`, { status, note });
    get().fetchApplications();
  },

  // Chat
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  
  sendMessage: async (message) => {
    const { userId, chatMessages } = get();
    
    set({ chatMessages: [...chatMessages, { role: 'user', content: message }] });
    
    try {
      const response = await api.post('/ai/chat', { userId, message });
      
      set((state) => ({
        chatMessages: [...state.chatMessages, { role: 'assistant', ...response.data }]
      }));
      
      // If AI returned filters, apply them
      if (response.data.type === 'job_filter') {
        get().setFilters(response.data.filters);
      }
    } catch (error) {
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