-- ============================================================
--  IELTS Analyzer — Supabase Database Schema
--  HOW TO USE:
--    1. Go to https://supabase.com → your project
--    2. Click "SQL Editor" in the left sidebar
--    3. Paste this entire file and click "Run"
-- ============================================================


-- ── Enable UUID extension ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================export PATH="/usr/local/bin:$PATH"
curl http://localhost:5000/api/health
--  TABLE: profiles
--  Stores extra user info beyond Supabase auth
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  full_name     TEXT,
  target_band   NUMERIC(2,1) DEFAULT 7.0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
--  TABLE: analyses
--  Stores every essay analysis result
-- ============================================================
CREATE TABLE IF NOT EXISTS analyses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Input
  essay_text        TEXT NOT NULL,
  prompt_text       TEXT,
  task_type         TEXT NOT NULL CHECK (task_type IN ('1', '2')),
  target_band       NUMERIC(2,1),

  -- Scores
  overall_band      NUMERIC(2,1) NOT NULL,
  task_achievement  NUMERIC(2,1),
  coherence_cohesion NUMERIC(2,1),
  lexical_resource  NUMERIC(2,1),
  grammatical_range NUMERIC(2,1),

  -- Full Claude response stored as JSON
  feedback_json     JSONB,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user history queries
CREATE INDEX IF NOT EXISTS analyses_user_id_idx
  ON analyses (user_id, created_at DESC);

-- Index for band score filtering
CREATE INDEX IF NOT EXISTS analyses_band_idx
  ON analyses (user_id, overall_band);


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
--  Users can only see and modify their own data
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- analyses
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (used by backend server.js)
-- The SUPABASE_SERVICE_KEY bypasses RLS automatically — no extra policy needed.


-- ============================================================
--  VIEWS
-- ============================================================

-- User stats view (used by /api/stats endpoint)
CREATE OR REPLACE VIEW user_stats AS
SELECT
  user_id,
  COUNT(*)                          AS total_analyses,
  ROUND(AVG(overall_band)::NUMERIC, 1) AS avg_band,
  MAX(overall_band)                 AS best_band,
  MIN(overall_band)                 AS lowest_band,
  COUNT(*) FILTER (WHERE task_type = '1') AS task1_count,
  COUNT(*) FILTER (WHERE task_type = '2') AS task2_count
FROM analyses
GROUP BY user_id;


-- ============================================================
--  SAMPLE DATA (optional — remove before production)
-- ============================================================

-- Uncomment below to insert test data after creating a test user:
/*
INSERT INTO analyses (
  user_id, essay_text, prompt_text, task_type, target_band,
  overall_band, task_achievement, coherence_cohesion,
  lexical_resource, grammatical_range, feedback_json
) VALUES (
  '<your-test-user-uuid>',
  'Some people think that the best way to increase road safety is to increase the minimum legal age for driving cars or riding motorbikes. To what extent do you agree or disagree?',
  'Road safety essay',
  '2',
  7.0,
  6.5,
  6.5,
  6.5,
  6.5,
  6.5,
  '{"summary": "Sample test entry"}'
);
*/
