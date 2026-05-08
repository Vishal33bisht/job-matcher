import { fetchJobs } from '../services/jobService.js';
import { calculateMatchScore } from '../services/aiService.js';
import { createHash } from 'node:crypto';

const DEFAULT_RESUME_JOB_QUERY = 'technical support specialist';
const MATCH_SCORE_CACHE_VERSION = 'v1';

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

function cleanResumeLine(line) {
  return String(line || '')
    .replace(/^[\s\-*\u2022]+/, '')
    .replace(/^(objective|summary|professional summary|career objective|experience|work experience|professional experience)\s*:?\s*/i, '')
    .replace(/^(seeking|looking for|to obtain|to secure|pursuing)\s+(an?\s+)?/i, '')
    .replace(/\s+(role|position|opportunity).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeJobTitle(line) {
  const cleaned = cleanResumeLine(line);
  if (!cleaned || cleaned.length < 3 || cleaned.length > 80) return false;
  if (cleaned.includes('@') || /^https?:\/\//i.test(cleaned)) return false;
  if (/^\d{4}\b/.test(cleaned) || /\b\d{4}\s*[-\u2013\u2014]\s*(\d{4}|present|current)\b/i.test(cleaned)) return false;
  if (/[.!?]$/.test(cleaned) || cleaned.split(/\s+/).length > 8) return false;

  return /\b(engineer|developer|analyst|specialist|administrator|manager|designer|support|technician|consultant|associate|architect|lead|intern|assistant|coordinator)\b/i.test(cleaned);
}

function extractJobTitleNearSections(resumeText) {
  const lines = String(resumeText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sectionPattern = /\b(objective|summary|professional summary|career objective|experience|work experience|professional experience)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    if (!sectionPattern.test(lines[index])) continue;

    const nearbyLines = lines.slice(index, index + 7);
    const titleLine = nearbyLines.find((line) => looksLikeJobTitle(line));
    if (titleLine) return cleanResumeLine(titleLine);
  }

  return lines.slice(0, 8).find((line) => looksLikeJobTitle(line)) || '';
}

function buildResumeJobQuery(resume) {
  const resumeText = getResumeText(resume);
  const titleFromResume = extractJobTitleNearSections(resumeText);
  if (titleFromResume) return titleFromResume;

  const parsedExperience = resume?.parsed?.experience || resume?.experience || [];
  const titleFromParsedExperience = parsedExperience
    .map((item) => (typeof item === 'string' ? item : item?.title || item?.role || item?.position || ''))
    .find((line) => looksLikeJobTitle(line));

  if (titleFromParsedExperience) return cleanResumeLine(titleFromParsedExperience);

  const skills = getResumeSkills(resume).slice(0, 3).join(' ');
  return skills ? `${DEFAULT_RESUME_JOB_QUERY} ${skills}` : DEFAULT_RESUME_JOB_QUERY;
}

function hashText(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function parseCachedMatchScore(data) {
  const parsed = parseStoredJson(data, null);
  return parsed && Number.isFinite(Number(parsed.score)) ? parsed : null;
}

async function getCachedMatchScore(fastify, resumeText, job) {
  const resumeHash = hashText(resumeText);
  const jobId = job.id || hashText(`${job.title}|${job.company}|${job.applyLink}`);
  const cacheKey = `match_score:${MATCH_SCORE_CACHE_VERSION}:${resumeHash}:${jobId}`;
  const cached = parseCachedMatchScore(await fastify.redis.get(cacheKey));

  if (cached) return cached;

  const matchData = await calculateMatchScore(resumeText, job);
  await fastify.redis.set(cacheKey, JSON.stringify(matchData));
  return matchData;
}

async function addMatchScores(fastify, jobs, resumeText) {
  const jobsWithScores = await Promise.all(
    jobs.map(async (job) => {
      const matchData = await getCachedMatchScore(fastify, resumeText, job);
      return {
        ...job,
        matchScore: matchData.score,
        matchedSkills: matchData.matchedSkills,
        missingSkills: matchData.missingSkills,
        matchSummary: matchData.summary
      };
    })
  );

  return jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);
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
        jobs = await addMatchScores(fastify, jobs, resumeText);
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
        location: request.query.location,
        skipQueryFilter: true,
      });
      
      const scoredJobs = await addMatchScores(fastify, jobs.slice(0, 20), resumeText);
      
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
