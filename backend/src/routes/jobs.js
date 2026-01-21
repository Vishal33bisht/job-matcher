import { fetchJobs } from '../services/jobService.js';
import { calculateMatchScore } from '../services/aiService.js';

export default async function jobRoutes(fastify) {
  // Get all jobs with filters
  fastify.get('/', async (request, reply) => {
    const { userId, ...filters } = request.query;
    
    try {
      let jobs = await fetchJobs(filters);
      
      // Get user's resume for matching
      if (userId) {
        const resumeData = await fastify.redis.get(`resume:${userId}`);
        
        if (resumeData) {
          const resume = typeof resumeData === 'string' ? JSON.parse(resumeData) : resumeData;
          
          // Calculate match scores for all jobs
          const jobsWithScores = await Promise.all(
            jobs.map(async (job) => {
              const matchData = await calculateMatchScore(resume.text, job);
              return {
                ...job,
                matchScore: matchData.score,
                matchedSkills: matchData.matchedSkills,
                missingSkills: matchData.missingSkills,
                matchSummary: matchData.summary
              };
            })
          );
          
          jobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
        }
      }
      
      // Apply match score filter
      if (filters.minMatchScore) {
        jobs = jobs.filter(job => job.matchScore >= parseInt(filters.minMatchScore));
      }
      
      return { jobs, total: jobs.length };
    } catch (error) {
      console.error('Error in jobs route:', error);
      reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // Get single job
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const jobs = await fetchJobs({});
    const job = jobs.find(j => j.id === id);
    
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    
    return job;
  });

  // Get best matches
  fastify.get('/best-matches/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    try {
      const resumeData = await fastify.redis.get(`resume:${userId}`);
      if (!resumeData) {
        return { bestMatches: [] };
      }
      
      const jobs = await fetchJobs({});
      const resume = typeof resumeData === 'string' ? JSON.parse(resumeData) : resumeData;
      
      const scoredJobs = await Promise.all(
        jobs.slice(0, 20).map(async (job) => {
          const matchData = await calculateMatchScore(resume.text, job);
          return { ...job, ...matchData, matchScore: matchData.score };
        })
      );
      
      const bestMatches = scoredJobs
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8);
      
      return { bestMatches };
    } catch (error) {
      console.error('Error getting best matches:', error);
      reply.status(500).send({ error: 'Failed to get best matches' });
    }
  });
}