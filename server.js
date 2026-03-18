const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*" }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid token" });
  req.user = data.user;
  next();
}

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/analyze", requireAuth, async (req, res) => {
  const { essay, prompt, taskType, targetBand } = req.body;
  if (!essay || essay.trim().length < 50) {
    return res.status(400).json({ error: "Essay is too short (minimum 50 words)." });
  }
  try {
    const result = await analyzeWithGroq({ essay, prompt, taskType, targetBand });
    await supabase.from("analyses").insert({
      user_id: req.user.id,
      essay_text: essay,
      prompt_text: prompt || null,
      task_type: taskType,
      target_band: parseFloat(targetBand),
      overall_band: result.overall_band,
      task_achievement: result.task_achievement?.score,
      coherence_cohesion: result.coherence_cohesion?.score,
      lexical_resource: result.lexical_resource?.score,
      grammatical_range: result.grammatical_range?.score,
      feedback_json: result,
    });
    res.json(result);
  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

app.post("/api/analyze-file", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const { taskType = "2", targetBand = "7.0", prompt = "" } = req.body;
  let essay = "";
  try {
    if (req.file.mimetype === "application/pdf") {
      const parsed = await pdfParse(req.file.buffer);
      essay = parsed.text;
    } else {
      return res.status(400).json({ error: "Please paste the essay text directly." });
    }
    if (!essay || essay.trim().length < 50) {
      return res.status(400).json({ error: "Could not extract enough text from the file." });
    }
    const result = await analyzeWithGroq({ essay, prompt, taskType, targetBand });
    res.json({ ...result, extracted_text: essay });
  } catch (err) {
    console.error("File analyze error:", err.message);
    res.status(500).json({ error: "File analysis failed. Please try again." });
  }
});

app.get("/api/history", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, task_type, target_band, overall_band, prompt_text, essay_text, task_achievement, coherence_cohesion, lexical_resource, grammatical_range")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/history/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

app.delete("/api/history/:id", requireAuth, async (req, res) => {
  const { error } = await supabase
    .from("analyses")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/stats", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("analyses")
    .select("overall_band, task_type, created_at")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const total = data.length;
  const avgBand = total > 0 ? (data.reduce((s, r) => s + r.overall_band, 0) / total).toFixed(1) : 0;
  const best = total > 0 ? Math.max(...data.map((r) => r.overall_band)) : 0;
  const trend = data.slice(-5).map((r) => ({ date: r.created_at, band: r.overall_band }));
  res.json({ total, avgBand, best, trend });
});

async function analyzeWithGroq({ essay, prompt, taskType, targetBand }) {
  const systemPrompt = `You are a certified IELTS examiner with 15+ years of experience. Analyze IELTS Writing essays strictly according to official IELTS Band Descriptors.

Return ONLY valid JSON — no markdown, no text before or after the JSON object.

Required JSON structure:
{
  "overall_band": 6.5,
  "task_achievement": { "score": 6.5, "comment": "Specific observation in 2 sentences." },
  "coherence_cohesion": { "score": 7.0, "comment": "Specific observation about organization." },
  "lexical_resource": { "score": 6.5, "comment": "Specific observation about vocabulary." },
  "grammatical_range": { "score": 6.0, "comment": "Specific observation about grammar." },
  "word_count": 280,
  "band_descriptor": "Competent User",
  "strengths": ["Specific strength 1.", "Specific strength 2.", "Specific strength 3."],
  "weaknesses": ["Specific weakness 1.", "Specific weakness 2.", "Specific weakness 3."],
  "suggestions": ["Actionable suggestion 1.", "Actionable suggestion 2.", "Actionable suggestion 3."],
  "improved_opening": "A rewritten opening paragraph at the target band level.",
  "summary": "One sentence overall verdict."
}

Rules:
- All scores in 0.5 increments between 1.0 and 9.0
- overall_band = average of 4 criteria scores rounded to nearest 0.5
- Be accurate and specific — reference actual content from the essay`;

  const userMessage = `Task Type: IELTS Writing Task ${taskType}
${prompt ? `Question: ${prompt}` : ""}
Target Band: ${targetBand}
Word Count: ${essay.trim().split(/\s+/).length}

Essay:
${essay}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = completion.choices[0].message.content;
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

app.listen(PORT, () => {
  console.log(`✅ IELTS Analyzer backend running on http://localhost:${PORT}`);
});