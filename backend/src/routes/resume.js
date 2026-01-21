import { parseResume } from '../services/aiService.js';

export default async function resumeRoutes(fastify) {
  // Upload resume
  fastify.post('/upload/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    try {
      const data = await request.file();
      const buffer = await data.toBuffer();
      
      let text = '';
      
      if (data.mimetype === 'application/pdf') {
        // Dynamic import for pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else if (data.mimetype === 'text/plain') {
        text = buffer.toString('utf-8');
      } else {
        return reply.status(400).send({ error: 'Only PDF and TXT files are supported' });
      }
      
      // Parse resume with AI
      const parsedData = await parseResume(text);
      
      const resumeRecord = {
        text,
        fileName: data.filename,
        uploadedAt: new Date().toISOString(),
        parsed: parsedData
      };
      
      await fastify.redis.set(`resume:${userId}`, JSON.stringify(resumeRecord));
      
      return { 
        message: 'Resume uploaded successfully',
        parsed: parsedData
      };
    } catch (error) {
      console.error('Resume upload error:', error);
      reply.status(500).send({ error: 'Failed to upload resume' });
    }
  });

  // Get resume
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    const resumeData = await fastify.redis.get(`resume:${userId}`);
    
    if (!resumeData) {
      return reply.status(404).send({ error: 'No resume found' });
    }
    
    const resume = typeof resumeData === 'string' ? JSON.parse(resumeData) : resumeData;
    return resume;
  });

  // Delete resume
  fastify.delete('/:userId', async (request, reply) => {
    const { userId } = request.params;
    await fastify.redis.del(`resume:${userId}`);
    return { message: 'Resume deleted successfully' };
  });
}