import { GoogleGenerativeAI } from '@google/generative-ai'; 

// Create OpenAI client only if API key exists
let genAI = null;

function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}
export async function calculateMatchScore(resumeText, job) {
  const client = getGeminiClient();
  
  if (!client) {
    return getMockMatchScore(resumeText, job);
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
    Analyze the match between this resume and job posting.
    
    RESUME:
    ${resumeText.substring(0, 2000)}
    
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
    
    // Clean up response (remove markdown if any)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI scoring error:', error);
    return getMockMatchScore(resumeText, job);
  }
}

function getMockMatchScore(resumeText, job) {
  const resumeLower = resumeText?.toLowerCase() || '';
  const matchedSkills = job.skills?.filter(skill => 
    resumeLower.includes(skill.toLowerCase())
  ) || [];
  
  const score = Math.min(95, Math.max(20, matchedSkills.length * 15 + Math.floor(Math.random() * 20)));
  
  return {
    score,
    matchedSkills,
    missingSkills: job.skills?.filter(s => !matchedSkills.includes(s)) || [],
    experienceMatch: score > 70 ? 'strong' : score > 40 ? 'moderate' : 'weak',
    summary: `Match based on ${matchedSkills.length} matching skills`
  };
}

export async function chatWithAssistant(message, context) {
  const { jobs = [], applications = [], resumeText = '' } = context;
  const client = getOpenAIClient();

  // If no API key, return mock response
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
  
  When users ask to find/filter jobs, respond with:
  {
    "type": "job_filter",
    "filters": { "query": "", "location": "", "workMode": "", "minScore": 0 },
    "message": "Your explanation"
  }
  
  For general questions, respond with:
  {
    "type": "text",
    "message": "Your response"
  }
  `;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch {
      return { type: 'text', message: content };
    }
  } catch (error) {
    console.error('Chat error:', error);
    return getMockChatResponse(message, jobs);
  }
}

function getMockChatResponse(message, jobs) {
  const msgLower = message.toLowerCase();
  
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
  const client = getOpenAIClient();
  
  if (!client) {
    return getMockParsedResume(text);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Extract key information from this resume. Return JSON:
        {
          "name": "",
          "email": "",
          "skills": [],
          "experience": [],
          "education": [],
          "summary": ""
        }
        
        Resume: ${text.substring(0, 3000)}`
      }],
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    return getMockParsedResume(text);
  }
}

function getMockParsedResume(text) {
  const skillKeywords = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
    'AWS', 'Docker', 'SQL', 'MongoDB', 'Vue.js', 'Angular', 'Git',
    'HTML', 'CSS', 'Figma', 'Machine Learning', 'Express', 'Next.js',
    'GraphQL', 'REST API', 'Kubernetes', 'PostgreSQL', 'Redis'
  ];
  
  const textLower = text.toLowerCase();
  const foundSkills = skillKeywords.filter(skill => 
    textLower.includes(skill.toLowerCase())
  );

  return {
    name: 'User',
    email: '',
    skills: foundSkills.length > 0 ? foundSkills : ['JavaScript', 'React'],
    experience: [],
    education: [],
    summary: 'Resume parsed successfully'
  };
}