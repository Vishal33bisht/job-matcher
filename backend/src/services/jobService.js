import axios from 'axios';

const JSEARCH_API = 'https://jsearch.p.rapidapi.com';
const MAX_JOB_AGE_DAYS = 5;
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
        query: `${searchQuery} ${searchLocation}`.trim(),
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

  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

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
    'Active Directory', 'Windows', 'Networking', 'Hardware', 'Incident'
  ];
  
  const found = skillKeywords.filter(skill => 
    description?.toLowerCase().includes(skill.toLowerCase())
  );
  return found.slice(0, 8);
}

export function getMockJobs() {
  return [
    {
      id: 'support-1',
      title: 'Technical Support Specialist',
      company: 'HelpDesk Pro',
      location: 'Remote',
      description: 'Technical Support Specialist needed for troubleshooting customer issues, debugging product problems, managing tickets, documenting incidents, and escalating complex cases. Experience with Windows, networking basics, and customer support is preferred.',
      jobType: 'Full-time',
      workMode: 'Remote',
      postedDate: new Date().toISOString(),
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
      postedDate: new Date(Date.now() - 86400000).toISOString(),
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
      postedDate: new Date().toISOString(),
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
      postedDate: new Date(Date.now() - 86400000).toISOString(),
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
      postedDate: new Date(Date.now() - 172800000).toISOString(),
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
      postedDate: new Date(Date.now() - 259200000).toISOString(),
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
      postedDate: new Date(Date.now() - 345600000).toISOString(),
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
      postedDate: new Date(Date.now() - 432000000).toISOString(),
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
      postedDate: new Date(Date.now() - 518400000).toISOString(),
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
      postedDate: new Date(Date.now() - 604800000).toISOString(),
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
      postedDate: new Date(Date.now() - 691200000).toISOString(),
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
      postedDate: new Date(Date.now() - 777600000).toISOString(),
      applyLink: 'https://example.com/apply/10',
      logo: null,
      skills: ['Python', 'SQL', 'Apache Spark', 'AWS'],
      salary: '$115,000 - $155,000'
    }
  ];
}
