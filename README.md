# 🚀 AI-Powered Job Matcher & Tracker

A smart job tracking application that helps users find relevant jobs, tracks applications intelligently, and uses **Google Gemini AI** to score job descriptions against resumes.

**Live Demo:** [https://job-matcher-193n0fycy-vishal-bishts-projects-490932ff.vercel.app](https://job-matcher-193n0fycy-vishal-bishts-projects-490932ff.vercel.app)

---

## 🏗️ Architecture Diagram

The application follows a decoupled client-server architecture:

```mermaid
graph TD
    User[User] -->|Browser| Frontend[React + Vite Frontend]
    Frontend -->|HTTP API| Backend[Node.js + Fastify Backend]
    Backend -->|Search| JSearch[JSearch RapidAPI]
    Backend -->|AI Analysis| Gemini[Google Gemini AI]
    Backend -->|Cache/Store| Redis[Upstash Redis]
    Backend -->|Uploads| Parser[PDF Parser]

Data Flow:

User Interaction: User uploads a resume (PDF) and sets filters on the Frontend.

Job Fetching: Backend fetches live job data from JSearch (RapidAPI).

Resume Parsing: pdf-parse extracts raw text from the uploaded PDF.

AI Scoring: The backend sends the Resume Text + Job Description to Google Gemini.

Matching: Gemini returns a JSON object with a Match Score (0-100%) and missing skills.

Storage: Parsed resumes and session data are cached in Upstash Redis.

🧠 AI Matching Logic
Our matching system moves beyond simple keyword matching. We use a Generative AI approach powered by Google Gemini.

How it works:
Extraction: When a file is uploaded, we strip formatting and extract pure text using pdf-parse.

Prompt Engineering: We construct a structured prompt for the LLM:

"Analyze the match between this resume and job posting. Return JSON with score, matched skills, and missing skills."

Scoring Criteria: The AI evaluates:

Hard Skills: Direct match of technologies (e.g., React, Node.js).

Experience Level: Analyzing years of experience vs. requirements.

Context: Semantic understanding (e.g., knowing that "Frontend" implies "HTML/CSS").

Efficiency: To prevent API rate limits, we only re-score when the resume changes or new jobs are fetched.

💡 Critical Thinking: Smart Popup Flow
The Challenge: Job seekers often click "Apply," get redirected to LinkedIn/Indeed, and forget to log the application in their tracker. This leads to incomplete data.

Our Solution: Intent-Based Tracking

Trigger: When a user clicks the "Apply" button, we open the external link in a new tab.

Detection: When the user returns to our tab (window focus event), a modal automatically triggers.

The Question: "Did you apply to [Company]?"

"Yes, Applied": Instantly logs the application with a timestamp.

"No, just browsing": Discards the event.

"Applied Earlier": Logs it without overwriting the original "Applied Date."

Why this is better: It captures the user's status at the exact moment of intent, removing the friction of manually opening a form to log an application.

📈 Scalability
If this application were to scale to 10,000 concurrent users, the following changes would be made:

Caching Strategy (Redis):

Currently, we fetch jobs per request. Scaling would require caching JSearch results for 1 hour (TTL) based on query hash to drastically reduce API costs.

Asynchronous Scoring (BullMQ):

AI scoring is slow (1-2 seconds). We would move scoring to a background job queue. The frontend would display a "Calculating..." skeleton state and update via WebSockets when scores are ready.

Database Migration:

We would migrate from ephemeral storage to PostgreSQL to permanently store user application history, analytics, and user profiles.

⚠️ Tradeoffs & Limitations
Synchronous Parsing: PDF parsing happens on the main thread. Large files (>10MB) could briefly block the event loop.

Improvement: Offload parsing to a Node.js Worker Thread.

API Rate Limits: The JSearch free tier has a limit.

Mitigation: I implemented a "Mock Data" fallback that kicks in automatically if the API quota is exceeded, ensuring the demo always works.

Auth: Currently uses a simplified "Name-based" login for the assignment demo.

Improvement: Integrate OAuth (Google/GitHub) for secure authentication.

🛠️ Setup Instructions
Prerequisites
Node.js v18+

Google Gemini API Key

RapidAPI Key (JSearch)

Upstash Redis URL

1. Clone the Repository
Bash
git clone [https://github.com/Vishal33bisht/job-matcher.git](https://github.com/Vishal33bisht/job-matcher.git)
cd job-matcher
2. Backend Setup
Bash
cd backend
npm install

# Create a .env file with the following:
# PORT=3001
# GEMINI_API_KEY=your_gemini_key
# RAPIDAPI_KEY=your_rapidapi_key
# UPSTASH_REDIS_URL=your_redis_url
# UPSTASH_REDIS_TOKEN=your_redis_token

npm run dev
3. Frontend Setup
Bash
cd ../frotend
npm install

# Create a .env file (optional for local dev):
# VITE_API_URL=http://localhost:3001/api

npm run dev
The application will be available at http://localhost:5173.
