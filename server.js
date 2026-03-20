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
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid token" });
  req.user = data.user;
  next();
}

async function groqCall(systemPrompt, userMessage, temperature = 0.3) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature,
    max_tokens: 2000,
  });
  return completion.choices[0].message.content;
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ============================================================
//  WRITING — 4-STEP AGENTIC PIPELINE
// ============================================================
async function step1_initialScore({ essay, prompt, taskType, targetBand }) {
  const system = `You are a certified IELTS examiner. Score this essay strictly according to official IELTS Band Descriptors.
Return ONLY valid JSON, no markdown, no extra text.
{
  "overall_band": 6.5,
  "task_achievement": { "score": 6.5, "comment": "2 sentence specific observation." },
  "coherence_cohesion": { "score": 7.0, "comment": "2 sentence specific observation." },
  "lexical_resource": { "score": 6.5, "comment": "2 sentence specific observation." },
  "grammatical_range": { "score": 6.0, "comment": "2 sentence specific observation." },
  "word_count": 280,
  "initial_strengths": ["strength 1", "strength 2", "strength 3"],
  "initial_weaknesses": ["weakness 1", "weakness 2", "weakness 3"]
}
Rules: scores in 0.5 increments 1.0-9.0, overall_band = average of 4 scores rounded to nearest 0.5`;
  const user = `Task Type: IELTS Writing Task ${taskType}\n${prompt ? `Question: ${prompt}` : ""}\nTarget Band: ${targetBand}\nWord Count: ${essay.trim().split(/\s+/).length}\nEssay:\n${essay}`;
  return parseJSON(await groqCall(system, user, 0.2));
}

async function step2_selfCorrect({ essay, taskType, initialScores }) {
  const system = `You are a senior IELTS examiner reviewing a junior examiner's scores.
Return ONLY valid JSON, no markdown.
{
  "overall_band": 6.5,
  "task_achievement": { "score": 6.5, "comment": "Revised observation." },
  "coherence_cohesion": { "score": 7.0, "comment": "Revised observation." },
  "lexical_resource": { "score": 6.5, "comment": "Revised observation." },
  "grammatical_range": { "score": 6.0, "comment": "Revised observation." },
  "word_count": ${initialScores.word_count || 0},
  "score_changed": true,
  "correction_note": "Brief explanation of what was corrected."
}`;
  const user = `Task ${taskType}\nEssay:\n${essay}\nScores to review: TA:${initialScores.task_achievement?.score} CC:${initialScores.coherence_cohesion?.score} LR:${initialScores.lexical_resource?.score} GR:${initialScores.grammatical_range?.score} Overall:${initialScores.overall_band}`;
  return parseJSON(await groqCall(system, user, 0.2));
}

async function step3_followUpQuestion({ essay, taskType, correctedScores }) {
  const system = `You are an IELTS tutor. Identify the single biggest weakness and ask one targeted follow-up question.
Return ONLY valid JSON, no markdown.
{
  "weakest_criterion": "grammatical_range",
  "follow_up_question": "One specific actionable question.",
  "why_this_matters": "One sentence explanation.",
  "example_improvement": "Specific example."
}`;
  const user = `Task ${taskType}\nEssay:\n${essay}\nScores: TA:${correctedScores.task_achievement?.score} CC:${correctedScores.coherence_cohesion?.score} LR:${correctedScores.lexical_resource?.score} GR:${correctedScores.grammatical_range?.score}`;
  return parseJSON(await groqCall(system, user, 0.4));
}

async function step4_essayRewrite({ essay, taskType, targetBand, correctedScores }) {
  const system = `You are an expert IELTS writing coach. Rewrite in 3 targeted steps to reach Band ${targetBand}.
Return ONLY valid JSON, no markdown.
{
  "step1_grammar": { "title": "Step 1: Grammar and Vocabulary", "changes_made": ["c1","c2","c3"], "rewritten_paragraph": "..." },
  "step2_structure": { "title": "Step 2: Coherence and Structure", "changes_made": ["c1","c2","c3"], "rewritten_paragraph": "..." },
  "step3_task": { "title": "Step 3: Task Achievement boost", "changes_made": ["c1","c2","c3"], "improved_conclusion": "..." },
  "strengths": ["s1","s2","s3"],
  "weaknesses": ["w1","w2","w3"],
  "suggestions": ["s1","s2","s3"],
  "band_descriptor": "Good User",
  "summary": "One sentence verdict."
}`;
  const user = `Task ${taskType}, Target Band ${targetBand}, Current Band ${correctedScores.overall_band}\nEssay:\n${essay}`;
  return parseJSON(await groqCall(system, user, 0.5));
}

async function runAgenticPipeline({ essay, prompt, taskType, targetBand }) {
  console.log("Writing Step 1: Initial scoring...");
  const initialScores = await step1_initialScore({ essay, prompt, taskType, targetBand });
  console.log("Writing Step 2: Self-correcting...");
  const correctedScores = await step2_selfCorrect({ essay, taskType, initialScores });
  console.log("Writing Step 3: Follow-up question...");
  const followUp = await step3_followUpQuestion({ essay, taskType, correctedScores });
  console.log("Writing Step 4: Essay rewrite...");
  const rewrite = await step4_essayRewrite({ essay, taskType, targetBand, correctedScores });
  return {
    overall_band: correctedScores.overall_band,
    task_achievement: correctedScores.task_achievement,
    coherence_cohesion: correctedScores.coherence_cohesion,
    lexical_resource: correctedScores.lexical_resource,
    grammatical_range: correctedScores.grammatical_range,
    word_count: correctedScores.word_count,
    band_descriptor: rewrite.band_descriptor,
    summary: rewrite.summary,
    score_changed: correctedScores.score_changed,
    correction_note: correctedScores.correction_note,
    follow_up: followUp,
    rewrite_steps: { step1: rewrite.step1_grammar, step2: rewrite.step2_structure, step3: rewrite.step3_task },
    strengths: rewrite.strengths,
    weaknesses: rewrite.weaknesses,
    suggestions: rewrite.suggestions,
    initial_scores: {
      overall_band: initialScores.overall_band,
      task_achievement: initialScores.task_achievement?.score,
      coherence_cohesion: initialScores.coherence_cohesion?.score,
      lexical_resource: initialScores.lexical_resource?.score,
      grammatical_range: initialScores.grammatical_range?.score,
    },
  };
}

// ============================================================
//  SPEAKING — TRANSCRIBE + SCORE
// ============================================================
app.post("/api/speaking/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No audio file uploaded." });
  try {
    console.log("Speaking: Transcribing audio with Whisper...");
    const transcription = await groq.audio.transcriptions.create({
      file: new File([req.file.buffer], "audio.webm", { type: req.file.mimetype }),
      model: "whisper-large-v3",
      language: "en",
    });
    res.json({ transcript: transcription.text });
  } catch (err) {
    console.error("Transcription error:", err.message);
    res.status(500).json({ error: "Transcription failed. Please try again." });
  }
});

app.post("/api/speaking/score", requireAuth, async (req, res) => {
  const { transcript, question, part } = req.body;
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: "Transcript is too short." });
  }
  try {
    console.log("Speaking: Scoring transcript...");
    const system = `You are a certified IELTS Speaking examiner. Score this spoken response strictly according to official IELTS Speaking Band Descriptors.
Return ONLY valid JSON, no markdown, no extra text.
{
  "overall_band": 6.5,
  "fluency_coherence": { "score": 6.5, "comment": "Specific 2-sentence observation about fluency and coherence." },
  "lexical_resource": { "score": 7.0, "comment": "Specific observation about vocabulary range." },
  "grammatical_range": { "score": 6.0, "comment": "Specific observation about grammar." },
  "pronunciation": { "score": 6.5, "comment": "Observation about pronunciation based on word choices and patterns." },
  "word_count": 120,
  "band_descriptor": "Competent User",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "model_answer_opening": "Show how a Band 8 candidate would open their response to this question.",
  "summary": "One sentence overall verdict."
}
Rules: scores in 0.5 increments, overall_band = average of 4 scores rounded to nearest 0.5`;

    const user = `IELTS Speaking Part ${part}
Question: ${question}
Transcript of student's spoken answer:
${transcript}

Score this response as a certified IELTS examiner.`;

    const raw = await groqCall(system, user, 0.3);
    const result = parseJSON(raw);

    await supabase.from("speaking_analyses").insert({
      user_id: req.user.id,
      question,
      part: parseInt(part),
      transcript,
      overall_band: result.overall_band,
      fluency_coherence: result.fluency_coherence?.score,
      lexical_resource: result.lexical_resource?.score,
      grammatical_range: result.grammatical_range?.score,
      pronunciation: result.pronunciation?.score,
      feedback_json: result,
    }).select();

    res.json(result);
  } catch (err) {
    console.error("Speaking score error:", err.message);
    res.status(500).json({ error: "Scoring failed. Please try again." });
  }
});

app.get("/api/speaking/question", requireAuth, async (req, res) => {
  const part = parseInt(req.query.part) || 1;
  try {
    const system = `You are an IELTS Speaking examiner. Generate one realistic IELTS Speaking question.
Return ONLY valid JSON, no markdown.
{
  "question": "The full question text.",
  "part": ${part},
  "topic": "Technology",
  "follow_ups": ["Follow-up 1?", "Follow-up 2?"],
  "tips": "One sentence tip for this question type.",
  "time_limit": 60
}`;
    const topics = ["Technology", "Education", "Environment", "Travel", "Food", "Work", "Family", "Health", "Culture", "Media"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const partInstructions = {
      1: `Generate a Part 1 question about ${topic}. Simple direct question about personal experience. Time: 30-45 seconds.`,
      2: `Generate a Part 2 long-turn question about ${topic}. Include a cue card with 4 bullet points. Student speaks for 1-2 minutes.`,
      3: `Generate a Part 3 discussion question about ${topic}. Abstract, opinion-based, requires extended answer. Time: 60-90 seconds.`,
    };
    const raw = await groqCall(system, partInstructions[part] || partInstructions[1], 0.8);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error("Question gen error:", err.message);
    res.status(500).json({ error: "Failed to generate question." });
  }
});

// ============================================================
//  LISTENING — GENERATE + SCORE
// ============================================================
app.get("/api/listening/generate", requireAuth, async (req, res) => {
  const difficulty = req.query.difficulty || "medium";
  try {
    console.log("Listening: Generating passage and questions...");
    const system = `You are an IELTS Listening test creator. Create a realistic IELTS-style listening passage with MCQ questions.
Return ONLY valid JSON, no markdown, no extra text.
{
  "title": "Short descriptive title",
  "passage": "A 150-200 word realistic listening passage as if spoken. Use natural conversational or lecture style.",
  "difficulty": "${difficulty}",
  "topic": "Topic name",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "A",
      "explanation": "Why A is correct based on the passage."
    },
    {
      "id": 2,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "B",
      "explanation": "Why B is correct."
    },
    {
      "id": 3,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "C",
      "explanation": "Why C is correct."
    },
    {
      "id": 4,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "A",
      "explanation": "Why A is correct."
    },
    {
      "id": 5,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct": "D",
      "explanation": "Why D is correct."
    }
  ]
}
Make questions genuinely require listening carefully — answers must come directly from the passage.`;

    const topics = ["university lecture about climate change", "conversation between two students about a project", "radio programme about technology", "tour guide describing a historical site", "job interview preparation advice", "doctor explaining healthy habits", "travel agent discussing holiday options"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const raw = await groqCall(system, `Create a ${difficulty} IELTS listening exercise about: ${topic}`, 0.7);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error("Listening gen error:", err.message);
    res.status(500).json({ error: "Failed to generate listening exercise." });
  }
});

app.post("/api/listening/score", requireAuth, async (req, res) => {
  const { answers, questions, passage } = req.body;
  if (!answers || !questions) return res.status(400).json({ error: "Missing answers or questions." });
  try {
    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    const total = questions.length;
    const percentage = (correct / total) * 100;
    const band = percentage >= 90 ? 9 : percentage >= 80 ? 8 : percentage >= 70 ? 7 :
      percentage >= 60 ? 6 : percentage >= 50 ? 5 : percentage >= 40 ? 4 : 3;

    const results = questions.map(q => ({
      id: q.id,
      question: q.question,
      student_answer: answers[q.id],
      correct_answer: q.correct,
      correct_option: q.options[q.correct],
      student_option: q.options[answers[q.id]] || "Not answered",
      is_correct: answers[q.id] === q.correct,
      explanation: q.explanation,
    }));

    await supabase.from("listening_analyses").insert({
      user_id: req.user.id,
      correct_count: correct,
      total_count: total,
      band_score: band,
      results_json: results,
    }).select();

    res.json({ correct, total, percentage: Math.round(percentage), band, results });
  } catch (err) {
    console.error("Listening score error:", err.message);
    res.status(500).json({ error: "Scoring failed." });
  }
});

// ============================================================
//  WRITING ROUTES
// ============================================================
app.get("/api/health", (_, res) => res.json({ status: "ok", mode: "agentic" }));

app.post("/api/analyze", requireAuth, async (req, res) => {
  const { essay, prompt, taskType, targetBand } = req.body;
  if (!essay || essay.trim().length < 50) return res.status(400).json({ error: "Essay too short." });
  try {
    const result = await runAgenticPipeline({ essay, prompt, taskType, targetBand });
    await supabase.from("analyses").insert({
      user_id: req.user.id, essay_text: essay, prompt_text: prompt || null,
      task_type: taskType, target_band: parseFloat(targetBand),
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

app.post("/api/followup-answer", requireAuth, async (req, res) => {
  const { essay, question, answer, taskType } = req.body;
  if (!answer || answer.trim().length < 10) return res.status(400).json({ error: "Please provide a more detailed answer." });
  try {
    const system = `You are an IELTS tutor. Return ONLY valid JSON, no markdown.
{ "feedback": "3-4 sentence feedback.", "applied_to_essay": "Concrete example applied to their essay.", "score_impact": "Expected score impact.", "next_focus": "Next area to focus on." }`;
    const raw = await groqCall(system, `Essay (Task ${taskType}):\n${essay}\nQuestion: ${question}\nAnswer: ${answer}`, 0.4);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: "Failed to process answer." });
  }
});

app.post("/api/analyze-file", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const { taskType = "2", targetBand = "7.0", prompt = "" } = req.body;
  try {
    let essay = "";
    if (req.file.mimetype === "application/pdf") {
      const parsed = await pdfParse(req.file.buffer);
      essay = parsed.text;
    } else {
      return res.status(400).json({ error: "Please paste essay text directly for images." });
    }
    if (!essay || essay.trim().length < 50) return res.status(400).json({ error: "Could not extract enough text." });
    const result = await runAgenticPipeline({ essay, prompt, taskType, targetBand });
    res.json({ ...result, extracted_text: essay });
  } catch (err) {
    res.status(500).json({ error: "File analysis failed." });
  }
});

app.get("/api/history", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("analyses")
    .select("id, created_at, task_type, target_band, overall_band, prompt_text, essay_text, task_achievement, coherence_cohesion, lexical_resource, grammatical_range")
    .eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/history/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("analyses").select("*")
    .eq("id", req.params.id).eq("user_id", req.user.id).single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

app.delete("/api/history/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("analyses").delete()
    .eq("id", req.params.id).eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/stats", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("analyses")
    .select("overall_band, task_type, created_at")
    .eq("user_id", req.user.id).order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const total = data.length;
  const avgBand = total > 0 ? (data.reduce((s, r) => s + r.overall_band, 0) / total).toFixed(1) : 0;
  const best = total > 0 ? Math.max(...data.map(r => r.overall_band)) : 0;
  const trend = data.slice(-5).map(r => ({ date: r.created_at, band: r.overall_band }));
  res.json({ total, avgBand, best, trend });
});

app.listen(PORT, () => {
  console.log(`✅ IELTS Analyzer backend running on http://localhost:${PORT}`);
  console.log(`🤖 Modules: Writing (Agentic 4-step) + Speaking (Whisper + LLaMA) + Listening (AI Generated)`);
});