import { randomUUID } from 'crypto';

const VALID_STATUSES = new Set(['applied', 'interview', 'offer', 'rejected']);

function parseApplications(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function applicationRoutes(fastify) {
  fastify.post('/', async (request, reply) => {
    const { userId, jobId, jobTitle, company, status = 'applied' } = request.body;

    if (!userId || !jobId || !jobTitle || !company) {
      return reply.status(400).send({ error: 'User id, job id, job title, and company are required' });
    }

    if (!VALID_STATUSES.has(status)) {
      return reply.status(400).send({ error: 'Invalid application status' });
    }

    const application = {
      id: randomUUID(),
      userId,
      jobId,
      jobTitle,
      company,
      status,
      appliedAt: new Date().toISOString(),
      timeline: [{
        status: 'applied',
        date: new Date().toISOString(),
        note: 'Application submitted'
      }]
    };

    const existingData = await fastify.redis.get(`applications:${userId}`);
    const applications = parseApplications(existingData);

    const exists = applications.find(app => app.jobId === jobId);
    if (exists) {
      return reply.status(400).send({ error: 'Already applied to this job' });
    }

    applications.push(application);
    await fastify.redis.set(`applications:${userId}`, JSON.stringify(applications));

    return application;
  });

  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { status } = request.query;

    const data = await fastify.redis.get(`applications:${userId}`);
    let applications = parseApplications(data);

    if (status && status !== 'all') {
      applications = applications.filter(app => app.status === status);
    }

    return { applications };
  });

  fastify.patch('/:userId/:applicationId', async (request, reply) => {
    const { userId, applicationId } = request.params;
    const { status, note } = request.body;

    if (!VALID_STATUSES.has(status)) {
      return reply.status(400).send({ error: 'Invalid application status' });
    }

    const data = await fastify.redis.get(`applications:${userId}`);
    const applications = parseApplications(data);

    const appIndex = applications.findIndex(app => app.id === applicationId);

    if (appIndex === -1) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    applications[appIndex].status = status;
    applications[appIndex].updatedAt = new Date().toISOString();
    applications[appIndex].timeline = Array.isArray(applications[appIndex].timeline)
      ? applications[appIndex].timeline
      : [];
    applications[appIndex].timeline.push({
      status,
      date: new Date().toISOString(),
      note: note || `Status updated to ${status}`
    });

    await fastify.redis.set(`applications:${userId}`, JSON.stringify(applications));

    return applications[appIndex];
  });

  fastify.delete('/:userId/:applicationId', async (request, reply) => {
    const { userId, applicationId } = request.params;

    const data = await fastify.redis.get(`applications:${userId}`);
    const applications = parseApplications(data);
    const nextApplications = applications.filter(app => app.id !== applicationId);

    if (nextApplications.length === applications.length) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    await fastify.redis.set(`applications:${userId}`, JSON.stringify(nextApplications));

    return { message: 'Application deleted' };
  });
}
