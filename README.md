# PermitScope — Environmental Permit Analyzer

AI-powered tool that parses environmental permits and extracts every compliance obligation into a structured table with citations, deadlines, and priorities.

## Deploy to Vercel (3 steps)

### 1. Push to GitHub
Create a new GitHub repo and push this folder to it.

### 2. Import to Vercel
- Go to vercel.com → New Project
- Import your GitHub repo
- Vercel auto-detects Next.js — just click **Deploy**

### 3. (Optional) Set a default API key
In Vercel → Project Settings → Environment Variables, add:
```
ANTHROPIC_API_KEY = sk-ant-...
```
If set, users won't need to enter their own key.

## Local Development
```bash
npm install
npm run dev
# open http://localhost:3000
```

## How it works
- Frontend: Next.js React app
- API calls go to `/api/analyze` (a Next.js route handler)
- The route handler calls Anthropic server-side — no CORS issues
- Supports PDF, TXT, DOC, DOCX permits
- Exports results as CSV
