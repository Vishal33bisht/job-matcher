import { chatWithAssistant } from '../services/aiService.js';
import { fetchJobs } from '../services/jobService.js';

export default async function aiRoutes(fastify) {
  // Chat with AI assistant
  fastify.post('/chat', async (request, reply) => {
    const { userId, message } = request.body;
    
    try {
      // Get context
      const jobs = await fetchJobs({});
      const applicationsData = await fastify.redis.get(`applications:${userId}`);
      const resumeData = await fastify.redis.get(`resume:${userId}`);
      
      const applications = applicationsData 
        ? (typeof applicationsData === 'string' ? JSON.parse(applicationsData) : applicationsData)
        : [];
      
      const resumeText = resumeData 
        ? (typeof resumeData === 'string' ? JSON.parse(resumeData) : resumeData).text
        : '';
      
      const response = await chatWithAssistant(message, {
        jobs,
        applications,
        resumeText
      });
      
      return response;
    } catch (error) {
      reply.status(500).send({ error: 'Chat failed' });
    }
  });
}