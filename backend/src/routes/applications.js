import { v4 as uuidv4 } from 'uuid';

export default async function applicationRoutes(fastify) {
  // Create application
  fastify.post('/', async (request, reply) => {
    const { userId, jobId, jobTitle, company, status = 'applied' } = request.body;
    
    const application = {
      id: uuidv4(),
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
    
    // Get existing applications
    const existingData = await fastify.redis.get(`applications:${userId}`);
    const applications = existingData 
      ? (typeof existingData === 'string' ? JSON.parse(existingData) : existingData)
      : [];
    
    // Check if already applied
    const exists = applications.find(app => app.jobId === jobId);
    if (exists) {
      return reply.status(400).send({ error: 'Already applied to this job' });
    }
    
    applications.push(application);
    await fastify.redis.set(`applications:${userId}`, JSON.stringify(applications));
    
    return application;
  });

  // Get all applications for user
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { status } = request.query;
    
    const data = await fastify.redis.get(`applications:${userId}`);
    let applications = data 
      ? (typeof data === 'string' ? JSON.parse(data) : data)
      : [];
    
    if (status && status !== 'all') {
      applications = applications.filter(app => app.status === status);
    }
    
    return { applications };
  });

  // Update application status
  fastify.patch('/:userId/:applicationId', async (request, reply) => {
    const { userId, applicationId } = request.params;
    const { status, note } = request.body;
    
    const data = await fastify.redis.get(`applications:${userId}`);
    const applications = data 
      ? (typeof data === 'string' ? JSON.parse(data) : data)
      : [];
    
    const appIndex = applications.findIndex(app => app.id === applicationId);
    
    if (appIndex === -1) {
      return reply.status(404).send({ error: 'Application not found' });
    }
    
    applications[appIndex].status = status;
    applications[appIndex].updatedAt = new Date().toISOString();
    applications[appIndex].timeline.push({
      status,
      date: new Date().toISOString(),
      note: note || `Status updated to ${status}`
    });
    
    await fastify.redis.set(`applications:${userId}`, JSON.stringify(applications));
    
    return applications[appIndex];
  });

  // Delete application
  fastify.delete('/:userId/:applicationId', async (request, reply) => {
    const { userId, applicationId } = request.params;
    
    const data = await fastify.redis.get(`applications:${userId}`);
    let applications = data 
      ? (typeof data === 'string' ? JSON.parse(data) : data)
      : [];
    
    applications = applications.filter(app => app.id !== applicationId);
    await fastify.redis.set(`applications:${userId}`, JSON.stringify(applications));
    
    return { message: 'Application deleted' };
  });
}