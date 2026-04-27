import { chatWithAssistant } from '../services/aiService.js';
import { fetchJobs } from '../services/jobService.js';

function parseStoredJson(data, fallback) {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;

  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

export default async function aiRoutes(fastify) {
  fastify.post('/chat', async (request, reply) => {
    const { userId, message } = request.body;

    if (!userId || !message?.trim()) {
      return reply.status(400).send({ error: 'User id and message are required' });
    }
    
    try {
      const jobs = await fetchJobs({});
      const applicationsData = await fastify.redis.get(`applications:${userId}`);
      const resumeData = await fastify.redis.get(`resume:${userId}`);
      
      const applications = parseStoredJson(applicationsData, []);
      const resume = parseStoredJson(resumeData, null);
      
      const resumeText = resume?.text || resume?.rawText || '';
      
      const response = await chatWithAssistant(message, {
        jobs,
        applications,
        resumeText
      });
      
      return response;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Chat failed' });
    }
  });
}
