import axios from 'axios';

const JSEARCH_API = 'https://jsearch.p.rapidapi.com';
const MAX_JOB_AGE_DAYS = 5;
const DAY_MS = 86400000;
let warnedMissingRapidApiKey = false;

export async function fetchJobs(filters = {}) {
  const {
    query = 'software developer',
    location = '',
    jobType = '',
    datePosted = '',
    workMode = '',
    page = 1
  } = filters;
  const skipQueryFilter = Boolean(filters.skipQueryFilter);
  const searchQuery = String(query || '').trim() || 'software developer';
  const searchLocation = String(location || '').trim();

  if (!process.env.RAPIDAPI_KEY) {
    if (!warnedMissingRapidApiKey) {
      console.warn('RAPIDAPI_KEY missing; using mock jobs.');
      warnedMissingRapidApiKey = true;
    }
    return filterJobs(getMockJobs(), filters);
  }

  try {
    const response = await axios.get(`${JSEARCH_API}/search`, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      params: {
        query: searchQuery,
        location: searchLocation,
        page: page.toString(),
        num_pages: '1',
        date_posted: mapDatePosted(datePosted),
        remote_jobs_only: workMode?.toLowerCase() === 'remote' ? 'true' : 'false',
        employment_types: mapJobType(jobType)
      }
    });

    const jobs = response.data.data?.map(job => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: formatLocation(job),
      description: job.job_description,
      jobType: formatJobType(job.job_employment_type),
      workMode: job.job_is_remote ? 'Remote' : 'On-site',
      postedDate: normalizePostedDate(job),
      applyLink: job.job_apply_link,
      logo: job.employer_logo,
      skills: extractSkills(job.job_description),
      salary: formatSalary(job)
    })) || [];

    return filterJobs(jobs, { ...filters, skipQueryFilter });
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    return filterJobs(getMockJobs(), { ...filters, skipQueryFilter });
  }
}

function mapJobType(type) {
  const mapping = {
    'full-time': 'FULLTIME',
    'part-time': 'PARTTIME',
    'contract': 'CONTRACTOR',
    'internship': 'INTERN'
  };
  return mapping[type?.toLowerCase()] || '';
}

function mapDatePosted(value) {
  const mapping = {
    '24h': 'today',
    '5d': '3days',
    '7d': 'week',
    '30d': 'month',
  };
  return mapping[value] || value || '3days';
}

function normalizePostedDate(job) {
  if (job.job_posted_at_datetime_utc) return job.job_posted_at_datetime_utc;
  if (job.job_posted_at_timestamp) {
    return new Date(Number(job.job_posted_at_timestamp) * 1000).toISOString();
  }
  return null;
}

function getJobAgeDays(postedDate) {
  if (!postedDate) return Infinity;

  const date = new Date(postedDate);
  if (Number.isNaN(date.getTime())) return Infinity;

  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function formatLocation(job) {
  if (job.job_city && job.job_country) return `${job.job_city}, ${job.job_country}`;
  return job.job_city || job.job_country || 'Remote';
}

function formatSalary(job) {
  if (job.job_min_salary && job.job_max_salary) {
    return `$${job.job_min_salary} - $${job.job_max_salary}`;
  }
  if (job.job_min_salary) return `$${job.job_min_salary}+`;
  return 'Not specified';
}

function formatJobType(type) {
  const mapping = {
    FULLTIME: 'Full-time',
    PARTTIME: 'Part-time',
    CONTRACTOR: 'Contract',
    INTERN: 'Internship',
  };
  return mapping[type] || type || 'Not specified';
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string' && skills.trim()) {
    return skills.split(',').map(skill => skill.trim()).filter(Boolean);
  }
  return [];
}

function filterJobs(jobs, filters = {}) {
  const query = filters.skipQueryFilter ? '' : filters.query?.trim().toLowerCase();
  const location = filters.location?.trim().toLowerCase();
  const jobType = filters.jobType?.trim().toLowerCase();
  const workMode = filters.workMode?.trim().toLowerCase();
  const skills = normalizeSkills(filters.skills).map(skill => skill.toLowerCase());

  return jobs.filter((job) => {
    const searchableText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    const jobLocation = String(job.location || '').toLowerCase();
    const jobSkills = (job.skills || []).map(skill => skill.toLowerCase());
    const jobAgeDays = getJobAgeDays(job.postedDate);

    if (jobAgeDays < 0 || jobAgeDays > MAX_JOB_AGE_DAYS) return false;
    if (query && !matchesQuery(searchableText, query)) return false;
    if (location && !jobLocation.includes(location)) return false;
    if (jobType && String(job.jobType || '').toLowerCase() !== jobType) return false;
    if (workMode && String(job.workMode || '').toLowerCase() !== workMode) return false;
    if (skills.length && !skills.every(skill => jobSkills.includes(skill))) return false;

    return true;
  });
}

function matchesQuery(searchableText, query) {
  if (searchableText.includes(query)) return true;

  const tokens = [...new Set(query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2))];

  if (!tokens.length) return true;

  const matchedTokens = tokens.filter((token) => searchableText.includes(token));
  return matchedTokens.length >= Math.min(2, tokens.length);
}

function extractSkills(description) {
  const skillKeywords = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript',
    'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
    'Git', 'REST API', 'GraphQL', 'HTML', 'CSS', 'Vue.js', 'Angular',
    'Machine Learning', 'AI', 'Figma', 'UI/UX', 'Agile', 'Scrum',
    'Technical Support', 'Troubleshooting', 'Help Desk', 'Service Desk',
    'Active Directory', 'Windows', 'Networking', 'Hardware', 'Incident',
    'Content Creation', 'Content Strategy', 'Social Media', 'Copywriting',
    'Video Editing', 'Instagram', 'YouTube', 'Analytics', 'SEO',
    'Data Science', 'Data Analysis', 'Pandas', 'NumPy', 'Tableau',
    'Power BI', 'Statistics', 'ETL', 'Apache Spark'
  ];
  
  const found = skillKeywords.filter(skill => 
    description?.toLowerCase().includes(skill.toLowerCase())
  );
  return found.slice(0, 8);
}

export function getMockJobs() {
  const recentDate = (index) => new Date(Date.now() - (index % MAX_JOB_AGE_DAYS) * DAY_MS).toISOString();

  return [
    {
      id: 'creator-1',
      title: 'Content Creator',
      company: 'Delhi Digital Studio',
      location: 'Delhi, India',
      description: 'Content Creator needed to plan social media calendars, write short-form scripts, create reels, edit posts, and track engagement across Instagram, YouTube, and LinkedIn.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(0),
      applyLink: 'https://example.com/apply/creator-1',
      logo: null,
      skills: ['Content Creation', 'Social Media', 'Copywriting', 'Video Editing'],
      salary: '$45,000 - $65,000'
    },
    {
      id: 'creator-2',
      title: 'Social Media Content Specialist',
      company: 'BrandPulse India',
      location: 'Delhi, India',
      description: 'Create social content for campaigns, write captions, coordinate shoots, manage creator briefs, and report on audience growth and engagement metrics.',
      jobType: 'Full-time',
      workMode: 'On-site',
      postedDate: recentDate(1),
      applyLink: 'https://example.com/apply/creator-2',
      logo: null,
      skills: ['Social Media', 'Content Strategy', 'Copywriting', 'Analytics'],
      salary: '$42,000 - $62,000'
    },
    {
      id: 'creator-3',
      title: 'Video Content Creator',
      company: 'CreatorLab',
      location: 'New Delhi, India',
      description: 'Video Content Creator role focused on scripting, shooting, editing short-form videos, publishing content, and experimenting with trends for brand channels.',
      jobType: 'Contract',
      workMode: 'Remote',
      postedDate: recentDate(2),
      applyLink: 'https://example.com/apply/creator-3',
      logo: null,
      skills: ['Video Editing', 'Content Creation', 'YouTube', 'Instagram'],
      salary: '$40,000 - $60,000'
    },
    {
      id: 'data-science-1',
      title: 'Data Scientist',
      company: 'InsightWorks',
      location: 'Bengaluru, India',
      description: 'Data Scientist needed to build machine learning models, analyze product data, run experiments, and communicate insights using Python, Pandas, statistics, and SQL.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(3),
      applyLink: 'https://example.com/apply/data-science-1',
      logo: null,
      skills: ['Data Science', 'Python', 'Machine Learning', 'Statistics', 'SQL'],
      salary: '$80,000 - $120,000'
    },
    {
      id: 'data-analyst-1',
      title: 'Data Analyst',
      company: 'MetricHive',
      location: 'Remote',
      description: 'Data Analyst role focused on SQL reporting, dashboarding, data analysis, Tableau, Power BI, and translating business questions into clear insights.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(4),
      applyLink: 'https://example.com/apply/data-analyst-1',
      logo: null,
      skills: ['Data Analysis', 'SQL', 'Tableau', 'Power BI', 'Analytics'],
      salary: '$65,000 - $95,000'
    },
    {
      id: 'support-1',
      title: 'Technical Support Specialist',
      company: 'HelpDesk Pro',
      location: 'Remote',
      description: 'Technical Support Specialist needed for troubleshooting customer issues, debugging product problems, managing tickets, documenting incidents, and escalating complex cases. Experience with Windows, networking basics, and customer support is preferred.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(0),
      applyLink: 'https://example.com/apply/support-1',
      logo: null,
      skills: ['Technical Support', 'Troubleshooting', 'Windows', 'Networking'],
      salary: '$55,000 - $75,000'
    },
    {
      id: 'support-2',
      title: 'IT Support Analyst',
      company: 'ServiceWorks',
      location: 'Austin, TX',
      description: 'IT Support Analyst role focused on service desk tickets, hardware and software troubleshooting, incident resolution, Active Directory account support, and clear communication with internal users.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(1),
      applyLink: 'https://example.com/apply/support-2',
      logo: null,
      skills: ['IT Support', 'Service Desk', 'Active Directory', 'Troubleshooting'],
      salary: '$60,000 - $82,000'
    },
    {
      id: '1',
      title: 'Senior React Developer',
      company: 'TechCorp Inc',
      location: 'San Francisco, CA',
      description: 'We are looking for a Senior React Developer with experience in TypeScript, Node.js, and AWS. You will be working on cutting-edge web applications.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(0),
      applyLink: 'https://example.com/apply/1',
      logo: null,
      skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
      salary: '$120,000 - $160,000'
    },
    {
      id: '2',
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      location: 'New York, NY',
      description: 'Join our team as a Full Stack Engineer. Experience with Python, Django, React required. We build innovative fintech solutions.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(1),
      applyLink: 'https://example.com/apply/2',
      logo: null,
      skills: ['Python', 'Django', 'React', 'PostgreSQL'],
      salary: '$100,000 - $140,000'
    },
    {
      id: '3',
      title: 'UX Designer',
      company: 'DesignHub',
      location: 'Austin, TX',
      description: 'Looking for UX Designer with Figma expertise. UI/UX design experience required. Create beautiful user experiences.',
      jobType: 'Full-time',
      workMode: 'On-site',
      postedDate: recentDate(2),
      applyLink: 'https://example.com/apply/3',
      logo: null,
      skills: ['Figma', 'UI/UX', 'Adobe XD', 'Sketch'],
      salary: '$80,000 - $110,000'
    },
    {
      id: '4',
      title: 'Backend Developer',
      company: 'DataFlow Inc',
      location: 'Seattle, WA',
      description: 'Backend Developer needed with strong Node.js and MongoDB experience. Build scalable APIs and microservices.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(3),
      applyLink: 'https://example.com/apply/4',
      logo: null,
      skills: ['Node.js', 'MongoDB', 'Express', 'Docker'],
      salary: '$110,000 - $150,000'
    },
    {
      id: '5',
      title: 'Frontend Developer',
      company: 'WebSolutions',
      location: 'Chicago, IL',
      description: 'Frontend Developer with Vue.js experience. HTML, CSS, JavaScript required. Join our growing team.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(4),
      applyLink: 'https://example.com/apply/5',
      logo: null,
      skills: ['Vue.js', 'JavaScript', 'HTML', 'CSS'],
      salary: '$90,000 - $120,000'
    },
    {
      id: '6',
      title: 'DevOps Engineer',
      company: 'CloudTech',
      location: 'Denver, CO',
      description: 'DevOps Engineer with AWS and Kubernetes experience. CI/CD pipeline management and infrastructure as code.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(5),
      applyLink: 'https://example.com/apply/6',
      logo: null,
      skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform'],
      salary: '$130,000 - $170,000'
    },
    {
      id: '7',
      title: 'Python Developer',
      company: 'AI Solutions',
      location: 'Boston, MA',
      description: 'Python Developer for Machine Learning projects. Experience with TensorFlow and data processing required.',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      postedDate: recentDate(6),
      applyLink: 'https://example.com/apply/7',
      logo: null,
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
      salary: '$125,000 - $165,000'
    },
    {
      id: '8',
      title: 'Mobile Developer',
      company: 'AppWorks',
      location: 'Los Angeles, CA',
      description: 'React Native developer for iOS and Android apps. Experience with mobile development best practices.',
      jobType: 'Contract',
      workMode: 'Remote',
      postedDate: recentDate(7),
      applyLink: 'https://example.com/apply/8',
      logo: null,
      skills: ['React Native', 'JavaScript', 'iOS', 'Android'],
      salary: '$100,000 - $140,000'
    },
    {
      id: '9',
      title: 'Junior Web Developer',
      company: 'TechStart',
      location: 'Miami, FL',
      description: 'Entry level Web Developer position. HTML, CSS, JavaScript basics required. Great learning opportunity.',
      jobType: 'Internship',
      workMode: 'On-site',
      postedDate: recentDate(8),
      applyLink: 'https://example.com/apply/9',
      logo: null,
      skills: ['HTML', 'CSS', 'JavaScript', 'Git'],
      salary: '$50,000 - $70,000'
    },
    {
      id: '10',
      title: 'Data Engineer',
      company: 'BigData Corp',
      location: 'Portland, OR',
      description: 'Data Engineer with SQL and Python skills. Build data pipelines and ETL processes.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: recentDate(9),
      applyLink: 'https://example.com/apply/10',
      logo: null,
      skills: ['Python', 'SQL', 'Apache Spark', 'AWS'],
      salary: '$115,000 - $155,000'
    }
  ];
}
