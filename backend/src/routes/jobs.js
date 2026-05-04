import { fetchJobs } from '../services/jobService.js';
import { calculateMatchScore } from '../services/aiService.js';

function parseStoredJson(data, fallback) {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;

  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function getResumeText(resume) {
  return resume?.text || resume?.rawText || '';
}

function getResumeSkills(resume) {
  return resume?.parsed?.skills || resume?.skills || [];
}

function buildResumeJobQuery(resume) {
  const resumeText = getResumeText(resume).toLowerCase();
  const skillsText = getResumeSkills(resume).join(' ').toLowerCase();
  const searchText = `${resumeText} ${skillsText}`;

  const roleSignals = [
    {
      terms: ['troubleshoot', 'debugging', 'technical support', 'help desk', 'service desk', 'ticket', 'it support', 'customer support', 'hardware', 'windows', 'active directory', 'incident'],
      query: 'technical support specialist help desk troubleshooting',
    },
    {
      terms: ['network', 'router', 'switch', 'firewall', 'vpn', 'ccna', 'lan', 'wan'],
      query: 'network support engineer technician',
    },
    {
      terms: ['linux', 'system administrator', 'server', 'vmware', 'shell', 'powershell'],
      query: 'systems administrator technical support',
    },
    {
      terms: ['data analyst', 'excel', 'power bi', 'tableau', 'analytics', 'dashboard'],
      query: 'data analyst',
    },
    {
      terms: ['react', 'node.js', 'javascript', 'typescript', 'frontend', 'backend', 'full stack'],
      query: 'software developer',
    },
  ];

  const bestSignal = roleSignals
    .map((signal) => ({
      query: signal.query,
      score: signal.terms.filter((term) => searchText.includes(term)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return bestSignal?.score > 0 ? bestSignal.query : 'technical support specialist';
}

export default async function jobRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    const { userId, ...filters } = request.query;
    
    try {
      const hasExplicitQuery = Boolean(String(filters.query || '').trim());
      let resume = null;
      let resumeText = '';

      if (userId) {
        const resumeData = await fastify.redis.get(`resume:${userId}`);
        resume = parseStoredJson(resumeData, null);
        resumeText = getResumeText(resume);
      }

      const jobFilters = {
        ...filters,
        query: hasExplicitQuery ? filters.query : (resume ? buildResumeJobQuery(resume) : filters.query),
        skipQueryFilter: !hasExplicitQuery,
      };

      let jobs = await fetchJobs(jobFilters);

      if (resumeText) {
        const jobsWithScores = await Promise.all(
          jobs.map(async (job) => {
            const matchData = await calculateMatchScore(resumeText, job);
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

      const minMatchScore = Number.parseInt(filters.minMatchScore, 10);
      if (Number.isFinite(minMatchScore) && minMatchScore > 0) {
        jobs = jobs.filter(job => Number(job.matchScore || 0) >= minMatchScore);
      }
      
      return { jobs, total: jobs.length };
    } catch (error) {
      console.error('Error in jobs route:', error);
      reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const jobs = await fetchJobs({});
    const job = jobs.find(j => j.id === id);
    
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    
    return job;
  });

  fastify.get('/best-matches/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    try {
      const resumeData = await fastify.redis.get(`resume:${userId}`);
      if (!resumeData) {
        return { bestMatches: [] };
      }
      
      const resume = parseStoredJson(resumeData, null);
      const resumeText = getResumeText(resume);
      const jobs = await fetchJobs({
        query: buildResumeJobQuery(resume),
        skipQueryFilter: true,
      });
      
      const scoredJobs = await Promise.all(
        jobs.slice(0, 20).map(async (job) => {
          const matchData = await calculateMatchScore(resumeText, job);
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
