import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

function countWords(t) { return t.trim() ? t.trim().split(/\s+/).length : 0; }
function getBandColor(s) { return s >= 7.5 ? "#2d7a4f" : s >= 6.0 ? "#b8860b" : "#c84b31"; }
function getBandDescriptor(s) {
  if (s >= 9) return "Expert User"; if (s >= 8) return "Very Good User";
  if (s >= 7) return "Good User"; if (s >= 6) return "Competent User";
  if (s >= 5) return "Modest User"; return "Limited User";
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Auth Screen ──────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error; onAuth(data.session, data.user);
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (data.session) onAuth(data.session, data.user);
        else setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error; setMessage("Reset email sent. Check your inbox.");
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.authHeader}>
          <div style={s.authBadge}>Ani's Analyser · IELTS Prep</div>
          <h1 style={s.authTitle}>{mode === "login" ? "Welcome back" : mode === "signup" ? "Get started" : "Reset password"}</h1>
          <p style={s.authSub}>{mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your free account" : "We'll send a reset link"}</p>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "signup" && <div style={s.fieldGroup}><label style={s.label}>Full name</label><input style={s.input} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required /></div>}
          <div style={s.fieldGroup}><label style={s.label}>Email address</label><input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          {mode !== "reset" && <div style={s.fieldGroup}><label style={s.label}>Password</label><input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>}
          {error && <div style={s.errorBox}>{error}</div>}
          {message && <div style={s.successBox}>{message}</div>}
          <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : mode === "signup" ? "Create Account →" : "Send Reset Link →"}
          </button>
        </form>
        <div style={s.authFooter}>
          {mode === "login" && <><button style={s.linkBtn} onClick={() => setMode("signup")}>No account? Sign up</button><button style={s.linkBtn} onClick={() => setMode("reset")}>Forgot password?</button></>}
          {mode === "signup" && <button style={s.linkBtn} onClick={() => setMode("login")}>Already have an account? Sign in</button>}
          {mode === "reset" && <button style={s.linkBtn} onClick={() => setMode("login")}>Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}

// ── Agentic Loader ───────────────────────────────────────────
function AgenticLoader() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: "Step 1 — Initial scoring", desc: "AI examiner reads and scores your essay" },
    { label: "Step 2 — Self-correction", desc: "Senior examiner reviews and corrects scores" },
    { label: "Step 3 — Follow-up question", desc: "AI identifies your biggest weakness" },
    { label: "Step 4 — Essay rewrite", desc: "AI rewrites key sections to show improvements" },
  ];
  useEffect(() => {
    const timers = [0, 8000, 16000, 24000].map((t, i) => setTimeout(() => setStep(i), t));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
      <div style={s.loadingSpinner} />
      <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: "#1a1a2e", margin: "16px 0 8px" }}>Agentic AI analyzing your essay…</h3>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "2rem" }}>4 AI calls for maximum accuracy — takes ~30 seconds</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px", margin: "0 auto" }}>
        {steps.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: i <= step ? "rgba(45,122,79,0.08)" : "#f9f9f7", border: `0.5px solid ${i <= step ? "rgba(45,122,79,0.3)" : "#ddd"}`, transition: "all 0.5s ease" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: i < step ? "#2d7a4f" : i === step ? "#b8860b" : "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", fontWeight: 600, transition: "all 0.5s ease" }}>{i < step ? "✓" : i + 1}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: i <= step ? "#1a1a2e" : "#aaa" }}>{st.label}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{st.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Writing Tab ──────────────────────────────────────────────
function WritingTab({ token, onResult, onLoading, loading }) {
  const [taskType, setTaskType] = useState("2"); const [essay, setEssay] = useState("");
  const [prompt, setPrompt] = useState(""); const [targetBand, setTargetBand] = useState("7.0");
  const [inputMode, setInputMode] = useState("text"); const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const wc = countWords(essay); const minWc = taskType === "1" ? 150 : 250;

  async function handleAnalyze() {
    setError(""); onLoading(true);
    try {
      let result;
      if (inputMode === "text") {
        if (wc < 50) throw new Error("Please write at least 50 words.");
        result = await apiFetch("/api/analyze", { method: "POST", body: JSON.stringify({ essay, prompt, taskType, targetBand }) }, token);
      } else {
        if (!file) throw new Error("Please select a PDF file.");
        const formData = new FormData();
        formData.append("file", file); formData.append("taskType", taskType);
        formData.append("targetBand", targetBand); formData.append("prompt", prompt);
        const res = await fetch(`${API}/api/analyze-file`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "File analysis failed");
        result = data;
      }
      onResult({ ...result, essay, task_type: taskType, target_band: targetBand });
    } catch (err) { setError(err.message); } finally { onLoading(false); }
  }

  return (
    <div>
      <div style={s.card}>
        <p style={s.sectionLabel}>Task type</p>
        <div style={s.taskGrid}>
          {["1","2"].map(t => (
            <div key={t} style={{ ...s.taskOption, ...(taskType === t ? s.taskOptionActive : {}) }} onClick={() => setTaskType(t)}>
              <div style={s.taskTitle}>Task {t}</div>
              <div style={s.taskDesc}>{t === "1" ? "Describe graphs, charts, diagrams" : "Argumentative or discursive essay"}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={s.card}>
        <div style={s.metaRow}>
          <div><label style={s.label}>Question / prompt (optional)</label><input style={s.input} type="text" placeholder="Paste the IELTS question here…" value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
          <div><label style={s.label}>Target band score</label>
            <select style={s.input} value={targetBand} onChange={e => setTargetBand(e.target.value)}>
              {["5.0","5.5","6.0","6.5","7.0","7.5","8.0","8.5","9.0"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.inputModeTabs}>
          {["text","file"].map(m => <button key={m} style={{ ...s.modeTab, ...(inputMode === m ? s.modeTabActive : {}) }} onClick={() => { setInputMode(m); setError(""); }}>{m === "text" ? "📝 Type / Paste" : "📄 Upload PDF"}</button>)}
        </div>
        {inputMode === "text" ? (
          <><label style={s.label}>Your essay</label>
          <textarea style={s.textarea} placeholder="Type or paste your IELTS essay here…" value={essay} onChange={e => setEssay(e.target.value)} />
          <div style={s.wordCountRow}>
            <span style={{ color: wc > 0 && wc < minWc ? "#c84b31" : wc >= minWc ? "#2d7a4f" : "#888" }}>{wc} words {wc > 0 && wc < minWc ? `— ${minWc - wc} more needed` : wc >= minWc ? "✓ Minimum met" : ""}</span>
            <span style={{ color: "#aaa", fontSize: "12px" }}>Min: {minWc} for Task {taskType}</span>
          </div></>
        ) : (
          <div style={s.uploadArea}>
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ marginBottom: "8px" }} />
            {file && <p style={{ fontSize: "13px", color: "#2d7a4f" }}>✓ {file.name}</p>}
          </div>
        )}
      </div>
      <div style={{ background: "rgba(45,122,79,0.06)", border: "0.5px solid rgba(45,122,79,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "12px", display: "flex", gap: "12px" }}>
        <span style={{ fontSize: "20px" }}>🤖</span>
        <div><div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", marginBottom: "2px" }}>Agentic AI — 4 steps</div><div style={{ fontSize: "12px", color: "#666" }}>Score → Self-correct → Follow-up → 3-step rewrite (~30s)</div></div>
      </div>
      {error && <div style={s.errorBox}>{error}</div>}
      <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }} onClick={handleAnalyze} disabled={loading}>
        {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}><span style={s.spinner} /> Analyzing…</span> : "Analyze with Ani's Analyser →"}
      </button>
    </div>
  );
}

// ── Writing Results ──────────────────────────────────────────
function WritingResults({ result, token, onNewAnalysis }) {
  const [activeStep, setActiveStep] = useState(0);
  const [fuAnswer, setFuAnswer] = useState(""); const [fuFeedback, setFuFeedback] = useState(null);
  const [fuLoading, setFuLoading] = useState(false); const [fuError, setFuError] = useState("");

  async function submitFollowUp() {
    setFuLoading(true); setFuError("");
    try {
      const fb = await apiFetch("/api/followup-answer", { method: "POST", body: JSON.stringify({ essay: result.essay, question: result.follow_up?.follow_up_question, answer: fuAnswer, taskType: result.task_type }) }, token);
      setFuFeedback(fb);
    } catch (err) { setFuError(err.message); } finally { setFuLoading(false); }
  }

  if (!result) return (
    <div style={s.emptyState}><div style={s.emptyIcon}>📝</div><h3 style={s.emptyTitle}>No analysis yet</h3><p style={s.emptySub}>Submit your essay on the Writing tab.</p><button style={{ ...s.primaryBtn, maxWidth: "220px", margin: "16px auto 0" }} onClick={onNewAnalysis}>Start Analyzing →</button></div>
  );

  const criteria = [
    { key: "task_achievement", label: result.task_type === "1" ? "Task Achievement" : "Task Response" },
    { key: "coherence_cohesion", label: "Coherence & Cohesion" },
    { key: "lexical_resource", label: "Lexical Resource" },
    { key: "grammatical_range", label: "Grammatical Range" },
  ];

  return (
    <div>
      {result.score_changed && result.correction_note && (
        <div style={{ background: "rgba(184,134,11,0.08)", border: "0.5px solid rgba(184,134,11,0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#7a5c00" }}>
          <strong>🔍 Score corrected:</strong> {result.correction_note}
        </div>
      )}
      <div style={s.bandHeader}>
        <div style={s.bandLeft}>
          <div style={{ ...s.bandNumber, color: getBandColor(result.overall_band) }}>{result.overall_band}</div>
          <div style={s.bandLabel}>Overall Band</div>
          {result.initial_scores?.overall_band !== result.overall_band && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>Initial: {result.initial_scores?.overall_band}</div>}
        </div>
        <div style={s.bandRight}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>{getBandDescriptor(result.overall_band)}</h2>
          <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>{result.summary}</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={s.metaBadge}>Task {result.task_type || "2"}</span>
            <span style={s.metaBadge}>{result.word_count || "—"} words</span>
            {result.target_band && <span style={s.metaBadge}>Target: {result.target_band}</span>}
            <span style={{ ...s.metaBadge, background: "rgba(45,122,79,0.1)", color: "#2d7a4f" }}>🤖 Agentic</span>
          </div>
        </div>
      </div>

      <div style={s.criteriaGrid}>
        {criteria.map(({ key, label }) => {
          const score = result[key]?.score || 0; const color = getBandColor(score);
          return (
            <div key={key} style={s.criterionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={s.criterionLabel}>{label}</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color, lineHeight: 1 }}>{score}</span>
              </div>
              <div style={{ height: "3px", background: "#eee", borderRadius: "2px", marginBottom: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(score/9)*100}%`, background: color, borderRadius: "2px", transition: "width 0.8s" }} />
              </div>
              <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{result[key]?.comment}</p>
            </div>
          );
        })}
      </div>

      {result.follow_up && (
        <div style={{ ...s.card, border: "0.5px solid rgba(200,75,49,0.3)", background: "rgba(200,75,49,0.03)", marginBottom: "1rem" }}>
          <p style={{ ...s.sectionLabel, color: "#c84b31" }}>🎯 Targeted follow-up</p>
          <div style={{ background: "#fff", border: "0.5px solid #ddd", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" }}>{result.follow_up.follow_up_question}</p>
            <p style={{ fontSize: "12px", color: "#888" }}>Example: {result.follow_up.example_improvement}</p>
          </div>
          {!fuFeedback ? (
            <><textarea style={{ ...s.textarea, minHeight: "80px", marginBottom: "8px" }} placeholder="Type your answer…" value={fuAnswer} onChange={e => setFuAnswer(e.target.value)} />
            {fuError && <div style={{ ...s.errorBox, marginBottom: "8px" }}>{fuError}</div>}
            <button style={{ ...s.primaryBtn, opacity: fuLoading ? 0.6 : 1 }} onClick={submitFollowUp} disabled={fuLoading}>{fuLoading ? "Getting feedback…" : "Submit Answer →"}</button></>
          ) : (
            <div style={{ background: "rgba(45,122,79,0.06)", border: "0.5px solid rgba(45,122,79,0.2)", borderRadius: "8px", padding: "12px 14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#2d7a4f", marginBottom: "8px" }}>AI Tutor Feedback:</p>
              <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.7, marginBottom: "6px" }}>{fuFeedback.feedback}</p>
              <p style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}><strong>Applied:</strong> {fuFeedback.applied_to_essay}</p>
              <p style={{ fontSize: "12px", color: "#555" }}><strong>Score impact:</strong> {fuFeedback.score_impact}</p>
            </div>
          )}
        </div>
      )}

      {result.strengths?.length > 0 && (
        <div style={s.feedbackSection}><h3 style={s.feedbackHeading}>Strengths</h3>
          {result.strengths.map((st, i) => <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#2d7a4f", background: "rgba(45,122,79,0.05)" }}><span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#2d7a4f", display: "block", marginBottom: "4px" }}>Strength</span><p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{st}</p></div>)}
        </div>
      )}
      {result.weaknesses?.length > 0 && (
        <div style={s.feedbackSection}><h3 style={s.feedbackHeading}>Areas to Improve</h3>
          {result.weaknesses.map((w, i) => <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#c84b31", background: "rgba(200,75,49,0.05)" }}><span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#c84b31", display: "block", marginBottom: "4px" }}>To improve</span><p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{w}</p></div>)}
        </div>
      )}
      {result.suggestions?.length > 0 && (
        <div style={s.feedbackSection}><h3 style={s.feedbackHeading}>Suggestions</h3>
          {result.suggestions.map((sg, i) => <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#b8860b", background: "rgba(184,134,11,0.05)" }}><span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#b8860b", display: "block", marginBottom: "4px" }}>Suggestion</span><p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{sg}</p></div>)}
        </div>
      )}

      {result.rewrite_steps && (
        <div style={s.feedbackSection}>
          <h3 style={s.feedbackHeading}>3-Step Essay Improvement</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {[0,1,2].map(i => <button key={i} style={{ flex: 1, padding: "10px", border: "0.5px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, background: activeStep === i ? "#1a1a2e" : "#fff", color: activeStep === i ? "#fff" : "#666", borderColor: activeStep === i ? "#1a1a2e" : "#ddd" }} onClick={() => setActiveStep(i)}>Step {i+1}</button>)}
          </div>
          {[result.rewrite_steps.step1, result.rewrite_steps.step2, result.rewrite_steps.step3].map((step, i) => activeStep === i && step && (
            <div key={i} style={s.rewriteCard}>
              <h4 style={s.rewriteTitle}>{step.title}</h4>
              {(step.changes_made || []).map((c, j) => <div key={j} style={{ fontSize: "13px", color: "#555", padding: "4px 0", borderBottom: "0.5px solid #f0f0f0" }}>• {c}</div>)}
              <p style={s.rewriteLabel}>Rewritten:</p>
              <div style={s.rewriteText}>{step.rewritten_paragraph || step.improved_conclusion}</div>
            </div>
          ))}
        </div>
      )}
      <button style={{ ...s.primaryBtn, marginTop: "8px" }} onClick={onNewAnalysis}>Analyze Another Essay →</button>
    </div>
  );
}

// ── Speaking Tab ─────────────────────────────────────────────
function SpeakingTab({ token }) {
  const [part, setPart] = useState(1);
  const [question, setQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  async function getQuestion() {
    setLoadingQuestion(true); setError(""); setResult(null); setAudioBlob(null); setTranscript("");
    try {
      const data = await apiFetch(`/api/speaking/question?part=${part}`, {}, token);
      setQuestion(data);
    } catch (err) { setError(err.message); } finally { setLoadingQuestion(false); }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setRecording(true); setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (err) { setError("Microphone access denied. Please allow microphone access."); }
  }

  function stopRecording() {
    if (mediaRef.current) { mediaRef.current.stop(); setRecording(false); clearInterval(timerRef.current); }
  }

  async function transcribeAudio() {
    if (!audioBlob) return;
    setTranscribing(true); setError("");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      const res = await fetch(`${API}/api/speaking/transcribe`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.transcript);
    } catch (err) { setError(err.message); } finally { setTranscribing(false); }
  }

  async function scoreResponse() {
    if (!transcript || !question) return;
    setScoring(true); setError("");
    try {
      const data = await apiFetch("/api/speaking/score", { method: "POST", body: JSON.stringify({ transcript, question: question.question, part }) }, token);
      setResult(data);
    } catch (err) { setError(err.message); } finally { setScoring(false); }
  }

  const formatTime = t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,"0")}`;

  const speakingCriteria = [
    { key: "fluency_coherence", label: "Fluency & Coherence" },
    { key: "lexical_resource", label: "Lexical Resource" },
    { key: "grammatical_range", label: "Grammatical Range" },
    { key: "pronunciation", label: "Pronunciation" },
  ];

  return (
    <div>
      <div style={s.card}>
        <p style={s.sectionLabel}>Speaking part</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {[1,2,3].map(p => (
            <div key={p} style={{ ...s.taskOption, ...(part === p ? s.taskOptionActive : {}) }} onClick={() => { setPart(p); setQuestion(null); setResult(null); setAudioBlob(null); setTranscript(""); }}>
              <div style={s.taskTitle}>Part {p}</div>
              <div style={s.taskDesc}>{p === 1 ? "Personal questions" : p === 2 ? "Long turn (2 min)" : "Discussion"}</div>
            </div>
          ))}
        </div>
        <button style={{ ...s.primaryBtn, background: "#c84b31" }} onClick={getQuestion} disabled={loadingQuestion}>
          {loadingQuestion ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={s.spinner} /> Generating question…</span> : "🎯 Get a New Question"}
        </button>
      </div>

      {question && (
        <div style={s.card}>
          <p style={s.sectionLabel}>Part {part} — {question.topic}</p>
          <div style={{ background: "#f9f9f7", border: "0.5px solid #ddd", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e", lineHeight: 1.6, marginBottom: "10px" }}>{question.question}</p>
            {question.follow_ups?.length > 0 && (
              <div><p style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Follow-up questions:</p>
                {question.follow_ups.map((q, i) => <p key={i} style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>• {q}</p>)}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <span style={s.metaBadge}>⏱ {question.time_limit}s suggested</span>
              <span style={s.metaBadge}>💡 {question.tips}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {!recording && !audioBlob && (
              <button style={{ ...s.primaryBtn, background: "#c84b31", maxWidth: "280px" }} onClick={startRecording}>🎙 Start Recording</button>
            )}
            {recording && (
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "10px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#c84b31", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "#c84b31" }}>Recording — {formatTime(timer)}</span>
                </div>
                <button style={{ ...s.primaryBtn, background: "#1a1a2e", maxWidth: "280px" }} onClick={stopRecording}>⏹ Stop Recording</button>
              </div>
            )}
            {audioBlob && !transcript && (
              <div style={{ textAlign: "center", width: "100%" }}>
                <p style={{ fontSize: "13px", color: "#2d7a4f", marginBottom: "10px" }}>✓ Recording saved ({formatTime(timer)})</p>
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: "100%", marginBottom: "10px" }} />
                <button style={{ ...s.primaryBtn, background: "#c84b31", maxWidth: "280px" }} onClick={transcribeAudio} disabled={transcribing}>
                  {transcribing ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={s.spinner} /> Transcribing…</span> : "📝 Transcribe & Score"}
                </button>
              </div>
            )}
          </div>

          {transcript && !result && (
            <div style={{ marginTop: "12px" }}>
              <p style={s.sectionLabel}>Transcript</p>
              <div style={{ background: "#f9f9f7", border: "0.5px solid #ddd", borderRadius: "8px", padding: "12px", fontSize: "14px", color: "#333", lineHeight: 1.7, marginBottom: "10px" }}>{transcript}</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ ...s.primaryBtn, flex: 1 }} onClick={scoreResponse} disabled={scoring}>
                  {scoring ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={s.spinner} /> Scoring…</span> : "📊 Get My Score"}
                </button>
                <button style={{ ...s.primaryBtn, flex: 1, background: "#888" }} onClick={() => { setTranscript(""); setAudioBlob(null); setTimer(0); }}>Re-record</button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {result && (
        <div>
          <div style={s.bandHeader}>
            <div style={s.bandLeft}>
              <div style={{ ...s.bandNumber, color: getBandColor(result.overall_band) }}>{result.overall_band}</div>
              <div style={s.bandLabel}>Speaking Band</div>
            </div>
            <div style={s.bandRight}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>{getBandDescriptor(result.overall_band)}</h2>
              <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          </div>

          <div style={s.criteriaGrid}>
            {speakingCriteria.map(({ key, label }) => {
              const score = result[key]?.score || 0; const color = getBandColor(score);
              return (
                <div key={key} style={s.criterionCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={s.criterionLabel}>{label}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color, lineHeight: 1 }}>{score}</span>
                  </div>
                  <div style={{ height: "3px", background: "#eee", borderRadius: "2px", marginBottom: "8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(score/9)*100}%`, background: color, borderRadius: "2px", transition: "width 0.8s" }} />
                  </div>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{result[key]?.comment}</p>
                </div>
              );
            })}
          </div>

          {result.model_answer_opening && (
            <div style={s.feedbackSection}>
              <h3 style={s.feedbackHeading}>Band 8 Model Opening</h3>
              <div style={s.rewriteText}>{result.model_answer_opening}</div>
            </div>
          )}

          {result.strengths?.length > 0 && (
            <div style={s.feedbackSection}><h3 style={s.feedbackHeading}>Strengths</h3>
              {result.strengths.map((st, i) => <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#2d7a4f", background: "rgba(45,122,79,0.05)" }}><span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#2d7a4f", display: "block", marginBottom: "4px" }}>Strength</span><p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{st}</p></div>)}
            </div>
          )}
          {result.suggestions?.length > 0 && (
            <div style={s.feedbackSection}><h3 style={s.feedbackHeading}>Suggestions</h3>
              {result.suggestions.map((sg, i) => <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#b8860b", background: "rgba(184,134,11,0.05)" }}><span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#b8860b", display: "block", marginBottom: "4px" }}>Suggestion</span><p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{sg}</p></div>)}
            </div>
          )}

          <button style={{ ...s.primaryBtn, marginTop: "8px" }} onClick={() => { setResult(null); setAudioBlob(null); setTranscript(""); setTimer(0); setQuestion(null); }}>Practice Again →</button>
        </div>
      )}
    </div>
  );
}

// ── Listening Tab ────────────────────────────────────────────
function ListeningTab({ token }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [error, setError] = useState("");
  const utteranceRef = useRef(null);

  async function generateExercise() {
    setLoading(true); setError(""); setResult(null); setAnswers({}); setHasListened(false);
    try {
      const data = await apiFetch(`/api/listening/generate?difficulty=${difficulty}`, {}, token);
      setExercise(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function playPassage() {
    if (!exercise) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.passage);
    utterance.rate = 0.9; utterance.pitch = 1.0;
    utterance.onend = () => { setIsPlaying(false); setHasListened(true); };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  function stopPassage() {
    window.speechSynthesis.cancel(); setIsPlaying(false); setHasListened(true);
  }

  async function submitAnswers() {
    setScoring(true); setError("");
    try {
      const data = await apiFetch("/api/listening/score", { method: "POST", body: JSON.stringify({ answers, questions: exercise.questions, passage: exercise.passage }) }, token);
      setResult(data);
    } catch (err) { setError(err.message); } finally { setScoring(false); }
  }

  const allAnswered = exercise && exercise.questions.every(q => answers[q.id]);

  return (
    <div>
      <div style={s.card}>
        <p style={s.sectionLabel}>Difficulty level</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {["easy","medium","hard"].map(d => (
            <div key={d} style={{ ...s.taskOption, ...(difficulty === d ? s.taskOptionActive : {}) }} onClick={() => setDifficulty(d)}>
              <div style={s.taskTitle}>{d.charAt(0).toUpperCase() + d.slice(1)}</div>
              <div style={s.taskDesc}>{d === "easy" ? "Band 4–5" : d === "medium" ? "Band 6–7" : "Band 7.5–9"}</div>
            </div>
          ))}
        </div>
        <button style={{ ...s.primaryBtn, background: "#534AB7" }} onClick={generateExercise} disabled={loading}>
          {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={s.spinner} /> Generating exercise…</span> : "🎧 Generate Listening Exercise"}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {exercise && !result && (
        <div>
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <p style={{ ...s.sectionLabel, marginBottom: "4px" }}>{exercise.title}</p>
                <span style={s.metaBadge}>{exercise.topic}</span>
                <span style={{ ...s.metaBadge, marginLeft: "8px" }}>{exercise.difficulty}</span>
              </div>
            </div>

            <div style={{ background: "rgba(83,74,183,0.06)", border: "0.5px solid rgba(83,74,183,0.3)", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <p style={{ fontSize: "13px", color: "#534AB7", fontWeight: 600, marginBottom: "8px" }}>🔊 Listen carefully — you can play multiple times</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ ...s.primaryBtn, background: isPlaying ? "#888" : "#534AB7", flex: 1 }} onClick={isPlaying ? stopPassage : playPassage}>
                  {isPlaying ? "⏹ Stop" : hasListened ? "🔄 Play Again" : "▶ Play Audio"}
                </button>
              </div>
              {hasListened && <p style={{ fontSize: "12px", color: "#2d7a4f", marginTop: "8px" }}>✓ Now answer the questions below</p>}
            </div>

            <p style={{ fontSize: "12px", color: "#aaa", fontStyle: "italic", marginBottom: "8px" }}>Note: Uses your browser's text-to-speech. For best results, use headphones.</p>
          </div>

          <div style={s.card}>
            <p style={s.sectionLabel}>{exercise.questions.length} Questions</p>
            {exercise.questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: i < exercise.questions.length - 1 ? "0.5px solid #eee" : "none" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginBottom: "10px" }}>{i + 1}. {q.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(q.options).map(([key, val]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: `0.5px solid ${answers[q.id] === key ? "#1a1a2e" : "#ddd"}`, background: answers[q.id] === key ? "#f0efe9" : "#fff", cursor: "pointer" }}>
                      <input type="radio" name={`q${q.id}`} value={key} checked={answers[q.id] === key} onChange={() => setAnswers(a => ({ ...a, [q.id]: key }))} style={{ accentColor: "#1a1a2e" }} />
                      <span style={{ fontSize: "13px", color: "#333" }}><strong>{key}.</strong> {val}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <div style={s.errorBox}>{error}</div>}
            <button style={{ ...s.primaryBtn, background: allAnswered ? "#534AB7" : "#ccc", opacity: scoring ? 0.6 : 1 }} onClick={submitAnswers} disabled={!allAnswered || scoring}>
              {scoring ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={s.spinner} /> Marking…</span> : `Submit Answers (${Object.keys(answers).length}/${exercise.questions.length} answered)`}
            </button>
          </div>
        </div>
      )}

      {result && exercise && (
        <div>
          <div style={s.bandHeader}>
            <div style={s.bandLeft}>
              <div style={{ ...s.bandNumber, color: getBandColor(result.band) }}>{result.band}</div>
              <div style={s.bandLabel}>Band Score</div>
            </div>
            <div style={s.bandRight}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>{result.correct}/{result.total} correct — {result.percentage}%</h2>
              <p style={{ fontSize: "14px", color: "#555" }}>{getBandDescriptor(result.band)}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <span style={{ ...s.metaBadge, background: "rgba(45,122,79,0.1)", color: "#2d7a4f" }}>✓ {result.correct} correct</span>
                <span style={{ ...s.metaBadge, background: "rgba(200,75,49,0.1)", color: "#c84b31" }}>✗ {result.total - result.correct} wrong</span>
              </div>
            </div>
          </div>

          <div style={s.feedbackSection}>
            <h3 style={s.feedbackHeading}>Question Review</h3>
            {result.results.map((r, i) => (
              <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: r.is_correct ? "#2d7a4f" : "#c84b31", background: r.is_correct ? "rgba(45,122,79,0.05)" : "rgba(200,75,49,0.05)", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>Q{i+1}: {r.question}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: r.is_correct ? "#2d7a4f" : "#c84b31" }}>{r.is_correct ? "✓" : "✗"}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>Your answer: <strong>{r.student_answer}. {r.student_option}</strong></p>
                {!r.is_correct && <p style={{ fontSize: "12px", color: "#2d7a4f", marginBottom: "4px" }}>Correct: <strong>{r.correct_answer}. {r.correct_option}</strong></p>}
                <p style={{ fontSize: "12px", color: "#888", fontStyle: "italic" }}>{r.explanation}</p>
              </div>
            ))}
          </div>

          <button style={{ ...s.primaryBtn, background: "#534AB7" }} onClick={() => { setResult(null); setExercise(null); setAnswers({}); setHasListened(false); }}>Try Another Exercise →</button>
        </div>
      )}
    </div>
  );
}

// ── History Tab ──────────────────────────────────────────────
function HistoryTab({ token, onLoadResult }) {
  const [history, setHistory] = useState([]); const [loading, setLoading] = useState(true); const [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await apiFetch("/api/history", {}, token); setHistory(data); } catch (_) {}
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    setDeleting(id);
    try { await apiFetch(`/api/history/${id}`, { method: "DELETE" }, token); setHistory(h => h.filter(x => x.id !== id)); } catch (_) {}
    setDeleting(null);
  }
  async function handleView(item) {
    try { const data = await apiFetch(`/api/history/${item.id}`, {}, token); onLoadResult(data.feedback_json); } catch (_) {}
  }
  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>Loading history…</div>;
  if (!history.length) return <div style={s.emptyState}><div style={s.emptyIcon}>🗂️</div><h3 style={s.emptyTitle}>No history yet</h3><p style={s.emptySub}>Your analyzed essays will appear here.</p></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {history.map(item => (
        <div key={item.id} style={s.historyItem}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>Task {item.task_type}</span>
              <span style={s.metaBadge}>{formatDate(item.created_at)}</span>
              {item.target_band && <span style={s.metaBadge}>Target: {item.target_band}</span>}
            </div>
            <p style={{ fontSize: "13px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.prompt_text || item.essay_text?.substring(0, 80) + "…"}</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "12px", color: "#888" }}>
              <span>TA: {item.task_achievement}</span><span>CC: {item.coherence_cohesion}</span><span>LR: {item.lexical_resource}</span><span>GR: {item.grammatical_range}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "2rem", color: getBandColor(item.overall_band), fontWeight: 700 }}>{item.overall_band}</span>
            <button style={s.iconBtn} onClick={() => handleView(item)}>👁</button>
            <button style={{ ...s.iconBtn, color: "#c84b31" }} onClick={() => handleDelete(item.id)} disabled={deleting === item.id}>{deleting === item.id ? "…" : "🗑"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stats Tab ────────────────────────────────────────────────
function StatsTab({ token }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { apiFetch("/api/stats", {}, token).then(setStats).catch(() => {}); }, [token]);
  if (!stats) return <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>Loading stats…</div>;
  if (stats.total === 0) return <div style={s.emptyState}><div style={s.emptyIcon}>📊</div><h3 style={s.emptyTitle}>No data yet</h3><p style={s.emptySub}>Analyze your first essay to start tracking progress.</p></div>;
  return (
    <div>
      <div style={s.statsGrid}>
        {[{ label: "Total Analyses", value: stats.total }, { label: "Average Band", value: stats.avgBand }, { label: "Best Band", value: stats.best }].map((st, i) => (
          <div key={i} style={s.statCard}><div style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem", color: "#1a1a2e", fontWeight: 700 }}>{st.value}</div><div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{st.label}</div></div>
        ))}
      </div>
      {stats.trend?.length > 1 && (
        <div style={s.card}><p style={s.sectionLabel}>Recent trend</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {stats.trend.map((t, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "100%", background: getBandColor(t.band), borderRadius: "4px 4px 0 0", height: `${(t.band/9)*70}px`, transition: "height 0.5s" }} />
                <span style={{ fontSize: "11px", color: "#888" }}>{t.band}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tips Tab ─────────────────────────────────────────────────
function TipsTab() {
  const criteria = [
    { label: "Task Achievement / Response", pct: "25%", desc: "Address all parts of the task. Clear position, relevant ideas, fully developed arguments." },
    { label: "Coherence & Cohesion", pct: "25%", desc: "Logical organization, clear paragraphing, effective cohesive devices without overuse." },
    { label: "Lexical Resource", pct: "25%", desc: "Range and accuracy of vocabulary. Use less common words naturally." },
    { label: "Grammatical Range & Accuracy", pct: "25%", desc: "Variety of structures, correct grammar, punctuation, controlled subordination." },
  ];
  const tips = [
    { title: "Always write an overview (Task 1)", body: "Without it you cannot score above Band 5 for Task Achievement." },
    { title: "State your position clearly (Task 2)", body: "Make your position 100% clear in the introduction. Never be ambiguous." },
    { title: "Vary your sentence structures", body: "Mix simple, compound, and complex sentences. Short-only caps you at Band 5." },
    { title: "Avoid memorized phrases", body: "'It is a well-known fact that' actually lowers your score. Be natural." },
    { title: "Use topic-specific vocabulary", body: "For environment: 'carbon emissions', 'biodiversity loss'. Precise language scores higher." },
    { title: "Don't pad the word count", body: "Write 150+ (T1) or 250+ (T2) words — but quality beats quantity always." },
  ];
  return (
    <div>
      <div style={s.card}><p style={s.sectionLabel}>How IELTS Writing is marked</p>
        <div style={s.tipsGrid}>{criteria.map((c, i) => <div key={i} style={s.tipCard}><div style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: "#ddd", float: "right", marginLeft: "8px" }}>{c.pct}</div><h4 style={{ fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "6px" }}>{c.label}</h4><p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6 }}>{c.desc}</p></div>)}</div>
      </div>
      <div style={s.card}><p style={s.sectionLabel}>Top tips for a higher band</p>
        <div style={s.tipsGrid}>{tips.map((t, i) => <div key={i} style={s.tipCard}><h4 style={{ fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "6px" }}>{t.title}</h4><p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6 }}>{t.body}</p></div>)}</div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null); const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("writing"); const [writingResult, setWritingResult] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setUser(data.session?.user ?? null); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => { setSession(sess); setUser(sess?.user ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888" }}>Loading…</div>;
  if (!session) return <AuthScreen onAuth={(sess, u) => { setSession(sess); setUser(u); }} />;

  const tabs = [
    { id: "writing", label: "✍️ Writing" },
    { id: "writing_results", label: "Results" },
    { id: "speaking", label: "🎙 Speaking" },
    { id: "listening", label: "🎧 Listening" },
    { id: "history", label: "History" },
    { id: "stats", label: "Stats" },
    { id: "tips", label: "Tips" },
  ];

  return (
    <div style={s.appWrap}>
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.headerBadge}>Ani's Analyser</div>
            <h1 style={s.headerTitle}>IELTS <em style={{ fontStyle: "italic", color: "#c84b31" }}>Preparation</em></h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>{user?.email}</span>
            <button style={s.signOutBtn} onClick={async () => { await supabase.auth.signOut(); setSession(null); setUser(null); }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.tabs}>
          {tabs.map(t => <button key={t.id} style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
        </div>

        {activeTab === "writing" && (
          analyzing ? <AgenticLoader /> : <WritingTab token={session.access_token} onResult={r => { setWritingResult(r); setActiveTab("writing_results"); }} onLoading={setAnalyzing} loading={analyzing} />
        )}
        {activeTab === "writing_results" && <WritingResults result={writingResult} token={session.access_token} onNewAnalysis={() => setActiveTab("writing")} />}
        {activeTab === "speaking" && <SpeakingTab token={session.access_token} />}
        {activeTab === "listening" && <ListeningTab token={session.access_token} />}
        {activeTab === "history" && <HistoryTab token={session.access_token} onLoadResult={r => { setWritingResult(r); setActiveTab("writing_results"); }} />}
        {activeTab === "stats" && <StatsTab token={session.access_token} />}
        {activeTab === "tips" && <TipsTab />}
      </div>
    </div>
  );
}

const s = {
  appWrap: { minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif" },
  main: { maxWidth: "840px", margin: "0 auto", padding: "1.5rem 1rem 4rem" },
  header: { background: "#fff", borderBottom: "0.5px solid #e0ddd8", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: "840px", margin: "0 auto", padding: "14px 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerBadge: { fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#c84b31", fontWeight: 600, marginBottom: "2px" },
  headerTitle: { fontFamily: "'DM Serif Display', 'Georgia', serif", fontSize: "1.5rem", color: "#1a1a2e", margin: 0 },
  tabs: { display: "flex", gap: "4px", background: "#eeecea", borderRadius: "10px", padding: "4px", marginBottom: "1.5rem", overflowX: "auto" },
  tab: { flex: 1, minWidth: "70px", padding: "9px 10px", border: "none", background: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 500, color: "#888", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },
  tabActive: { background: "#fff", color: "#1a1a2e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  card: { background: "#fff", borderRadius: "12px", border: "0.5px solid #dddad4", padding: "1.25rem", marginBottom: "1rem" },
  label: { fontSize: "12px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px" },
  input: { width: "100%", padding: "10px 12px", border: "0.5px solid #ddd", borderRadius: "8px", fontSize: "14px", color: "#222", background: "#fafaf8", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: "200px", padding: "12px 14px", border: "0.5px solid #ddd", borderRadius: "10px", fontSize: "15px", color: "#222", background: "#fafaf8", resize: "vertical", lineHeight: 1.7, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  wordCountRow: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "6px" },
  taskGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  taskOption: { padding: "14px", border: "0.5px solid #ddd", borderRadius: "10px", cursor: "pointer", background: "#fff" },
  taskOptionActive: { border: "1px solid #c84b31", background: "rgba(200,75,49,0.04)" },
  taskTitle: { fontSize: "15px", fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" },
  taskDesc: { fontSize: "12px", color: "#888" },
  metaRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  inputModeTabs: { display: "flex", gap: "6px", marginBottom: "14px" },
  modeTab: { flex: 1, padding: "9px", border: "0.5px solid #ddd", borderRadius: "8px", background: "#fafaf8", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#666" },
  modeTabActive: { background: "#1a1a2e", color: "#fff", border: "0.5px solid #1a1a2e" },
  uploadArea: { padding: "1rem", border: "1px dashed #ccc", borderRadius: "10px", background: "#fafaf8" },
  primaryBtn: { width: "100%", padding: "15px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "block" },
  iconBtn: { padding: "6px 10px", border: "0.5px solid #ddd", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "16px" },
  signOutBtn: { padding: "7px 14px", border: "0.5px solid #ddd", borderRadius: "8px", background: "#fff", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { background: "none", border: "none", color: "#c84b31", cursor: "pointer", fontSize: "14px", textDecoration: "underline", fontFamily: "inherit" },
  spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingSpinner: { width: "40px", height: "40px", border: "3px solid #eee", borderTopColor: "#c84b31", borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto" },
  errorBox: { background: "rgba(200,75,49,0.08)", border: "0.5px solid rgba(200,75,49,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#c84b31", fontSize: "14px", marginBottom: "12px" },
  successBox: { background: "rgba(45,122,79,0.08)", border: "0.5px solid rgba(45,122,79,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#2d7a4f", fontSize: "14px", marginBottom: "12px" },
  sectionLabel: { fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", marginBottom: "12px" },
  metaBadge: { fontSize: "11px", background: "#f0efe9", color: "#666", padding: "3px 10px", borderRadius: "20px" },
  bandHeader: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem", display: "flex", gap: "1.5rem", alignItems: "center" },
  bandLeft: { textAlign: "center", minWidth: "80px" },
  bandNumber: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "4rem", lineHeight: 1, fontWeight: 700 },
  bandLabel: { fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#aaa", marginTop: "4px" },
  bandRight: { flex: 1 },
  criteriaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1rem" },
  criterionCard: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "10px", padding: "14px" },
  criterionLabel: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", color: "#999" },
  feedbackSection: { marginBottom: "1rem" },
  feedbackHeading: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.1rem", color: "#1a1a2e", marginBottom: "10px", paddingBottom: "6px", borderBottom: "0.5px solid #eee" },
  feedbackBlock: { padding: "12px 14px", borderRadius: "8px", marginBottom: "8px", borderLeft: "3px solid" },
  rewriteCard: { background: "#f9f9f7", border: "0.5px solid #ddd", borderRadius: "10px", padding: "1rem" },
  rewriteTitle: { fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginBottom: "10px" },
  rewriteLabel: { fontSize: "11px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px", marginTop: "10px" },
  rewriteText: { fontSize: "14px", lineHeight: 1.8, color: "#333", whiteSpace: "pre-wrap", background: "#fff", border: "0.5px solid #eee", borderRadius: "8px", padding: "10px 12px" },
  historyItem: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "1rem" },
  statCard: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "10px", padding: "16px", textAlign: "center" },
  tipsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  tipCard: { padding: "12px", border: "0.5px solid #dddad4", borderRadius: "10px", background: "#fafaf8" },
  authWrap: { minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "'DM Sans', sans-serif" },
  authCard: { background: "#fff", borderRadius: "16px", border: "0.5px solid #dddad4", padding: "2rem", width: "100%", maxWidth: "420px" },
  authHeader: { textAlign: "center", marginBottom: "1.5rem" },
  authBadge: { display: "inline-block", background: "rgba(200,75,49,0.1)", color: "#c84b31", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", padding: "5px 12px", borderRadius: "20px", marginBottom: "12px", fontWeight: 600 },
  authTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.8rem", color: "#1a1a2e", margin: "0 0 6px" },
  authSub: { fontSize: "14px", color: "#888" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldGroup: { display: "flex", flexDirection: "column" },
  authFooter: { display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" },
  emptyState: { textAlign: "center", padding: "3rem 2rem" },
  emptyIcon: { fontSize: "48px", marginBottom: "12px", opacity: 0.4 },
  emptyTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.3rem", color: "#333", marginBottom: "8px" },
  emptySub: { fontSize: "14px", color: "#888", lineHeight: 1.6 },
};
