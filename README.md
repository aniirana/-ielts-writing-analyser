# IELTS Writing Analyser
AI-powered IELTS Writing band score analyzer using **Claude (Anthropic)**, **React**, **Node.js**, and **Supabase**.

---

## Project Structure
```
ielts-analyzer/
├── frontend/               ← React + Vite app
│   ├── src/
│   │   ├── App.jsx         ← ALL frontend code (single file)
│   │   ├── main.jsx        ← React entry point
│   │   └── index.css       ← Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example        ← Copy to .env and fill in
│
├── backend/                ← Node.js + Express API
│   ├── server.js           ← ALL backend code (single file)
│   ├── package.json
│   └── .env.example        ← Copy to .env and fill in
│
├── database/
│   └── schema.sql          ← Run this in Supabase SQL Editor
│
└── README.md
```

---

## Setup Guide (Step by Step)

### Step 1 — Get your API keys

**Anthropic API Key:**
1. Go to https://console.anthropic.com
2. Click "API Keys" → "Create Key"
3. Copy the key (starts with `sk-ant-...`)

**Supabase:**
1. Go to https://supabase.com → "New Project"
2. Choose a name, password, and region
3. Once created, go to **Settings → API**
4. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

---

### Step 2 — Set up the database

1. In Supabase → click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `database/schema.sql` from this project
4. Paste the entire contents and click **Run**
5. You should see "Success" — your tables are ready

Also enable Email Auth:
- Supabase → **Authentication → Providers → Email** → Enable it

---

### Step 3 — Set up the backend

```bash
# Open a terminal and navigate to the backend folder
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Now open `backend/.env` and fill in:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=5000
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
# You should see: ✅ IELTS Analyzer backend running on http://localhost:5000
```

---

### Step 4 — Set up the frontend

```bash
# Open a NEW terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Now open `frontend/.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
# Open http://localhost:5173 in your browser
```

---

### Step 5 — Test it

1. Open http://localhost:5173
2. Click "Sign up" and create an account
3. Check your email and confirm if required
4. Sign in and paste an IELTS essay
5. Click "Analyze with Claude AI"

---

## Deployment

### Deploy Frontend → Vercel (free)
1. Push your project to GitHub
2. Go to https://vercel.com → "New Project" → import your repo
3. Set the **Root Directory** to `frontend`
4. Add environment variables (same as your `.env`)
5. Deploy — you'll get a URL like `https://yourapp.vercel.app`

### Deploy Backend → Render (free)
1. Go to https://render.com → "New Web Service"
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `node server.js`
6. Add environment variables (same as your `.env`)
7. Set `FRONTEND_URL` to your Vercel URL
8. Deploy — you'll get a URL like `https://yourapp.onrender.com`

### Final step after deployment
Update `frontend/.env` (or Vercel env vars):
```
VITE_API_URL=https://yourapp.onrender.com
```
Redeploy frontend on Vercel.

---

## Features
- ✅ Claude AI scoring across all 4 IELTS criteria
- ✅ Task 1 and Task 2 support
- ✅ PDF and image upload (OCR via Claude vision)
- ✅ User authentication (sign up / sign in / reset password)
- ✅ Essay history stored in Supabase
- ✅ Progress stats and trend chart
- ✅ Improved opening paragraph suggestion
- ✅ Band tips and descriptor guide
- ✅ Fully free hosting (Vercel + Render + Supabase free tiers)
