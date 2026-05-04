import pdfParse from 'pdf-parse';
import { parseResume } from '../services/aiService.js';

function buildResumeRecord(parsedData, resumeText, fileName) {
  return {
    ...parsedData,
    parsed: parsedData,
    text: resumeText,
    rawText: resumeText,
    uploadedAt: new Date().toISOString(),
    fileName,
  };
}

export default async function resumeRoutes(fastify) {
  fastify.post('/upload/:userId', async (request, reply) => {
    const { userId } = request.params;

    if (!userId) {
      return reply.code(400).send({ error: 'User id is required' });
    }

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

      if (!resumeText.trim()) {
        return reply.code(400).send({ error: 'Could not extract text from resume' });
      }

      const parsedData = await parseResume(resumeText);
      const resumeRecord = buildResumeRecord(parsedData, resumeText, data.filename);

      await fastify.redis.set(`resume:${userId}`, JSON.stringify(resumeRecord));

      return { success: true, resume: resumeRecord, data: parsedData };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to process resume' });
    }
  });

  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const data = await fastify.redis.get(`resume:${userId}`);

      if (!data) {
        return reply.code(404).send({ error: 'Resume not found' });
      }

      if (typeof data !== 'string') {
        return data;
      }

      try {
        return JSON.parse(data);
      } catch (error) {
        request.log.error({ err: error, userId }, 'Stored resume data is not valid JSON.');
        await fastify.redis.del(`resume:${userId}`);
        return reply.code(404).send({ error: 'Resume not found' });
      }
    } catch (error) {
      request.log.error({ err: error, userId }, 'Failed to load resume.');
      return reply.code(500).send({ error: 'Failed to load resume' });
    }
  });
}
