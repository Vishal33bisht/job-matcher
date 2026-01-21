import pdfParse from 'pdf-parse';
import { parseResume } from '../services/aiService.js';

export default async function resumeRoutes(fastify, options) {
 

  fastify.post('/upload/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    try {
      const buffer = await data.toBuffer();
      let resumeText = '';

      if (data.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        resumeText = pdfData.text;
      } else {
        resumeText = buffer.toString('utf-8');
      }

      const parsedData = await parseResume(resumeText);

      await fastify.redis.set(`resume:${userId}`, JSON.stringify({
        ...parsedData,
        rawText: resumeText,
        uploadedAt: new Date().toISOString(),
        fileName: data.filename
      }));

      return { success: true, data: parsedData };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to process resume' });
    }
  });

  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    const data = await fastify.redis.get(`resume:${userId}`);
    
    if (!data) {
      return reply.code(404).send({ error: 'Resume not found' });
    }
    return typeof data === 'string' ? JSON.parse(data) : data;
  });
}