import { GoogleGenerativeAI } from '@google/generative-ai'; 

let genAI = null;

function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function cleanJsonString(text) {
  return String(text || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export async function calculateMatchScore(resumeText, job) {
  const client = getGeminiClient();
  const safeResumeText = String(resumeText || '');
  
  if (!client) {
    return getMockMatchScore(safeResumeText, job);
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
    Analyze the match between this resume and job posting.
    
    RESUME:
    ${safeResumeText.substring(0, 2000)}
    
    JOB:
    Title: ${job.title}
    Company: ${job.company}
    Description: ${job.description?.substring(0, 1000)}
    Required Skills: ${job.skills?.join(', ')}
    
    Return JSON only (no markdown, no code blocks):
    {
      "score": <number 0-100>,
      "matchedSkills": ["skill1", "skill2"],
      "missingSkills": ["skill1", "skill2"],
      "experienceMatch": "strong/moderate/weak",
      "summary": "Brief explanation of match"
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = cleanJsonString(text);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI scoring error:', error);
    return getMockMatchScore(safeResumeText, job);
  }
}

function getMockMatchScore(resumeText, job) {
  const resumeLower = resumeText?.toLowerCase() || '';
  const jobText = `${job.title || ''} ${job.description || ''} ${(job.skills || []).join(' ')}`.toLowerCase();
  const matchedSkills = job.skills?.filter(skill => 
    resumeLower.includes(skill.toLowerCase())
  ) || [];
  const resumeTokens = new Set(
    resumeLower
      .split(/[^a-z0-9+#.]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
  );
  const sharedKeywordCount = [...resumeTokens].filter((token) => jobText.includes(token)).length;
  const titleMatch = String(job.title || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .filter((token) => token.length > 2)
    .some((token) => resumeTokens.has(token));
  const score = Math.min(98, 20 + matchedSkills.length * 15 + Math.min(sharedKeywordCount, 8) * 4 + (titleMatch ? 15 : 0));
  
  return {
    score,
    matchedSkills,
    missingSkills: job.skills?.filter(s => !matchedSkills.includes(s)) || [],
    experienceMatch: score > 75 ? 'strong' : score > 50 ? 'moderate' : 'weak',
    summary: matchedSkills.length > 0 
      ? `Match increased by ${matchedSkills.length} matching skills.` 
      : 'Base match score based on general profile alignment.'
  };
}

export async function chatWithAssistant(message, context) {
  const { jobs = [], applications = [], resumeText = '' } = context;
  const client = getGeminiClient(); 

  if (!client) {
    return getMockChatResponse(message, jobs);
  }

  const systemPrompt = `
  You are a helpful job search assistant. You help users:
  1. Find and filter jobs based on their queries
  2. Answer questions about the job tracker application
  3. Provide career advice and job recommendations
  
  Current context:
  - Total jobs available: ${jobs.length}
  - User applications: ${applications.length}
  - User has resume: ${resumeText ? 'Yes' : 'No'}
  
  Available jobs summary: ${JSON.stringify(jobs.slice(0, 10).map(j => ({
    title: j.title,
    company: j.company,
    location: j.location,
    workMode: j.workMode,
    matchScore: j.matchScore
  })))}
  
  When users ask to find/filter jobs, respond with this JSON format only:
  {
    "type": "job_filter",
    "filters": { "query": "", "location": "", "workMode": "", "minMatchScore": 0 },
    "message": "Your explanation"
  }
  
  For general questions, respond with this JSON format only:
  {
    "type": "text",
    "message": "Your response"
  }
  `;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `${systemPrompt}\n\nUSER QUERY: ${message}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonStr = cleanJsonString(text);
    
    try {
      return JSON.parse(jsonStr);
    } catch {
      return { type: 'text', message: text };
    }
  } catch (error) {
    console.error('Chat error:', error);
    return getMockChatResponse(message, jobs);
  }
}

function getMockChatResponse(message, jobs) {
  const msgLower = String(message || '').toLowerCase();
  
  if (msgLower.includes('remote')) {
    return {
      type: 'job_filter',
      filters: { workMode: 'remote' },
      message: `I found remote jobs for you. Filtering to show only remote positions.`
    };
  }
  
  if (msgLower.includes('react')) {
    return {
      type: 'job_filter',
      filters: { query: 'react' },
      message: `Showing React developer positions.`
    };
  }
  
  if (msgLower.includes('python')) {
    return {
      type: 'job_filter',
      filters: { query: 'python' },
      message: `Showing Python developer positions.`
    };
  }
  
  if (msgLower.includes('highest match') || msgLower.includes('best match')) {
    return {
      type: 'job_filter',
      filters: { minMatchScore: 70 },
      message: `Showing jobs with the highest match scores (70%+).`
    };
  }
  
  if (msgLower.includes('senior')) {
    return {
      type: 'job_filter',
      filters: { query: 'senior' },
      message: `Showing senior level positions.`
    };
  }
  
  if (msgLower.includes('how') && msgLower.includes('matching')) {
    return {
      type: 'text',
      message: `Job matching works by analyzing your resume against each job posting. We look at your skills, experience, and keywords to calculate a match percentage. Green (70%+) means excellent match, Yellow (40-70%) is good, and Gray (<40%) might need more relevant experience.`
    };
  }
  
  if (msgLower.includes('upload') && msgLower.includes('resume')) {
    return {
      type: 'text',
      message: `To upload your resume, you'll see a popup when you first visit the app. You can also replace it anytime by clicking the "Replace" button in the resume section at the top of the jobs page.`
    };
  }
  
  if (msgLower.includes('application')) {
    return {
      type: 'text',
      message: `You can see all your applications by clicking "Applications" in the top navigation. There you can track status, update progress, and see your application timeline.`
    };
  }
  
  return {
    type: 'text',
    message: `I can help you find jobs! Try asking me things like "Show me remote React jobs" or "Find senior roles". I can also answer questions about how the app works.`
  };
}

export async function parseResume(text) {
  const client = getGeminiClient(); 
  const resumeText = String(text || '');
  
  if (!client) {
    return getMockParsedResume(resumeText);
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Extract key information from this resume. Return JSON only (no markdown):
        {
          "name": "",
          "email": "",
          "skills": [],
          "targetRoles": [],
          "experience": [],
          "education": [],
          "summary": ""
        }
        
        Resume: ${resumeText.substring(0, 3000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    const jsonStr = cleanJsonString(textResponse);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Resume parsing error:', error);
    return getMockParsedResume(resumeText);
  }
}

function getMockParsedResume(text) {
  const skillKeywords = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
    'AWS', 'Docker', 'SQL', 'MongoDB', 'Vue.js', 'Angular', 'Git',
    'HTML', 'CSS', 'Figma', 'Machine Learning', 'Express', 'Next.js',
    'GraphQL', 'REST API', 'Kubernetes', 'PostgreSQL', 'Redis',
    'Content Creation', 'Content Strategy', 'Social Media', 'Copywriting',
    'Video Editing', 'Instagram', 'YouTube', 'Analytics', 'SEO',
    'Data Science', 'Data Analysis', 'Pandas', 'NumPy', 'Tableau',
    'Power BI', 'Statistics', 'ETL', 'Apache Spark', 'Technical Support',
    'Troubleshooting', 'Help Desk', 'Service Desk', 'Active Directory'
  ];
  const roleSignals = [
    { role: 'Content Creator', terms: ['content creator', 'content creation', 'social media', 'instagram', 'youtube', 'reels', 'copywriting', 'video editing'] },
    { role: 'Data Scientist', terms: ['data scientist', 'data science', 'machine learning', 'statistics', 'pandas', 'numpy'] },
    { role: 'Data Analyst', terms: ['data analyst', 'data analysis', 'tableau', 'power bi', 'analytics', 'sql'] },
    { role: 'Data Engineer', terms: ['data engineer', 'etl', 'spark', 'data pipeline', 'warehouse'] },
    { role: 'Technical Support Specialist', terms: ['technical support', 'it support', 'help desk', 'service desk', 'troubleshooting'] },
    { role: 'Frontend Developer', terms: ['frontend', 'react', 'vue', 'angular', 'html', 'css', 'javascript'] },
    { role: 'Backend Developer', terms: ['backend', 'node.js', 'express', 'django', 'api', 'mongodb', 'postgresql'] },
    { role: 'UX Designer', terms: ['ux', 'ui/ux', 'figma', 'wireframe', 'prototype'] },
    { role: 'Digital Marketing Specialist', terms: ['digital marketing', 'seo', 'sem', 'campaigns', 'email marketing'] }
  ];
  
  const textLower = String(text || '').toLowerCase();
  const foundSkills = skillKeywords.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );
  const targetRoles = roleSignals
    .map((role) => ({
      ...role,
      score: role.terms.filter((term) => textLower.includes(term)).length
    }))
    .filter((role) => role.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((role) => role.role);

  return {
    name: 'User',
    email: '',
    skills: foundSkills,
    targetRoles,
    experience: [],
    education: [],
    summary: 'Resume parsed successfully'
  };
}
