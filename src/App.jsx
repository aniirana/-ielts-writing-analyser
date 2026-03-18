// ============================================================
//  IELTS Analyzer — Complete Frontend
//  File: src/App.jsx
//  Stack: React + Vite + Tailwind CSS + Supabase Auth
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client (uses Vite env vars) ─────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ============================================================
//  HELPERS
// ============================================================
function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function getBandColor(score) {
  if (score >= 7.5) return "#2d7a4f";
  if (score >= 6.0) return "#b8860b";
  return "#c84b31";
}

function getBandDescriptor(score) {
  if (score >= 9) return "Expert User";
  if (score >= 8) return "Very Good User";
  if (score >= 7) return "Good User";
  if (score >= 6) return "Competent User";
  if (score >= 5) return "Modest User";
  return "Limited User";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ============================================================
//  AUTH SCREEN
// ============================================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.session, data.user);
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) onAuth(data.session, data.user);
        else setMessage("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.authHeader}>
          <div style={s.authBadge}>Ani's Analyser</div>
          <h1 style={s.authTitle}>
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Get started" : "Reset password"}
          </h1>
          <p style={s.authSub}>
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your free account" : "We'll send you a reset link"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "signup" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Full name</label>
              <input style={s.input} type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div style={s.fieldGroup}>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          {mode !== "reset" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}

          {error && <div style={s.errorBox}>{error}</div>}
          {message && <div style={s.successBox}>{message}</div>}

          <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : mode === "signup" ? "Create Account →" : "Send Reset Link →"}
          </button>
        </form>

        <div style={s.authFooter}>
          {mode === "login" && <>
            <button style={s.linkBtn} onClick={() => setMode("signup")}>No account? Sign up</button>
            <button style={s.linkBtn} onClick={() => setMode("reset")}>Forgot password?</button>
          </>}
          {mode === "signup" && <button style={s.linkBtn} onClick={() => setMode("login")}>Already have an account? Sign in</button>}
          {mode === "reset" && <button style={s.linkBtn} onClick={() => setMode("login")}>Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  ANALYZE TAB
// ============================================================
function AnalyzeTab({ token, onResult }) {
  const [taskType, setTaskType] = useState("2");
  const [essay, setEssay] = useState("");
  const [prompt, setPrompt] = useState("");
  const [targetBand, setTargetBand] = useState("7.0");
  const [inputMode, setInputMode] = useState("text");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extractedText, setExtractedText] = useState("");

  const wc = countWords(essay || extractedText);
  const minWc = taskType === "1" ? 150 : 250;

  async function handleAnalyze() {
    setError(""); setLoading(true);
    try {
      let result;
      if (inputMode === "text") {
        if (wc < 50) throw new Error("Please write at least 50 words.");
        result = await apiFetch("/api/analyze", {
          method: "POST",
          body: JSON.stringify({ essay, prompt, taskType, targetBand }),
        }, token);
      } else {
        if (!file) throw new Error("Please select a file to upload.");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("taskType", taskType);
        formData.append("targetBand", targetBand);
        formData.append("prompt", prompt);
        const res = await fetch(`${API}/api/analyze-file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "File analysis failed");
        if (data.extracted_text) setExtractedText(data.extracted_text);
        result = data;
      }
      onResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Task type */}
      <div style={s.card}>
        <p style={s.sectionLabel}>Task type</p>
        <div style={s.taskGrid}>
          {["1", "2"].map(t => (
            <div key={t} style={{ ...s.taskOption, ...(taskType === t ? s.taskOptionActive : {}) }}
              onClick={() => setTaskType(t)}>
              <div style={s.taskTitle}>Task {t}</div>
              <div style={s.taskDesc}>
                {t === "1" ? "Describe graphs, charts, diagrams or processes" : "Argumentative or discursive essay"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div style={s.card}>
        <div style={s.metaRow}>
          <div>
            <label style={s.label}>Essay question / prompt (optional)</label>
            <input style={s.input} type="text" placeholder="Paste the IELTS question here…"
              value={prompt} onChange={e => setPrompt(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Target band score</label>
            <select style={s.input} value={targetBand} onChange={e => setTargetBand(e.target.value)}>
              {["5.0","5.5","6.0","6.5","7.0","7.5","8.0","8.5","9.0"].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Input mode toggle */}
      <div style={s.card}>
        <div style={s.inputModeTabs}>
          {["text","file"].map(m => (
            <button key={m} style={{ ...s.modeTab, ...(inputMode === m ? s.modeTabActive : {}) }}
              onClick={() => { setInputMode(m); setError(""); }}>
              {m === "text" ? "📝 Type / Paste" : "📄 Upload PDF or Image"}
            </button>
          ))}
        </div>

        {inputMode === "text" ? (
          <>
            <label style={s.label}>Your essay</label>
            <textarea style={s.textarea} placeholder="Type or paste your IELTS essay here…"
              value={essay} onChange={e => setEssay(e.target.value)} />
            <div style={s.wordCountRow}>
              <span style={{ color: wc > 0 && wc < minWc ? "#c84b31" : wc >= minWc ? "#2d7a4f" : "#888" }}>
                {wc} words {wc > 0 && wc < minWc ? `— ${minWc - wc} more needed` : wc >= minWc ? "✓ Minimum met" : ""}
              </span>
              <span style={{ color: "#aaa", fontSize: "12px" }}>Min: {minWc} words for Task {taskType}</span>
            </div>
          </>
        ) : (
          <div style={s.uploadArea}>
            <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={e => setFile(e.target.files[0])} style={{ marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", color: "#888" }}>Supported: PDF, PNG, JPG (max 10 MB)</p>
            {file && <p style={{ fontSize: "13px", color: "#2d7a4f", marginTop: "8px" }}>✓ {file.name} selected</p>}
            {extractedText && (
              <div style={{ marginTop: "12px" }}>
                <p style={{ ...s.label, marginBottom: "6px" }}>Extracted text:</p>
                <div style={{ ...s.textarea, overflowY: "auto", maxHeight: "160px", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                  {extractedText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }}
        onClick={handleAnalyze} disabled={loading}>
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={s.spinner} /> Analyzing…
          </span>
        ) : "Analyze with Ani's Analyser →"}
      </button>
    </div>
  );
}

// ============================================================
//  RESULTS TAB
// ============================================================
function ResultsTab({ result, onNewAnalysis }) {
  if (!result) {
    return (
      <div style={s.emptyState}>
        <div style={s.emptyIcon}>📝</div>
        <h3 style={s.emptyTitle}>No analysis yet</h3>
        <p style={s.emptySub}>Submit your essay on the Analyze tab to see your detailed band score and feedback.</p>
        <button style={{ ...s.primaryBtn, maxWidth: "220px", margin: "16px auto 0" }} onClick={onNewAnalysis}>
          Start Analyzing →
        </button>
      </div>
    );
  }

  const criteria = [
    { key: "task_achievement", label: result.task_type === "1" ? "Task Achievement" : "Task Response" },
    { key: "coherence_cohesion", label: "Coherence & Cohesion" },
    { key: "lexical_resource", label: "Lexical Resource" },
    { key: "grammatical_range", label: "Grammatical Range & Accuracy" },
  ];

  return (
    <div>
      {/* Overall band */}
      <div style={s.bandHeader}>
        <div style={s.bandLeft}>
          <div style={{ ...s.bandNumber, color: getBandColor(result.overall_band) }}>
            {result.overall_band}
          </div>
          <div style={s.bandLabel}>Overall Band</div>
        </div>
        <div style={s.bandRight}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>
            {getBandDescriptor(result.overall_band)}
          </h2>
          <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>{result.summary}</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={s.metaBadge}>Task {result.task_type || "2"}</span>
            <span style={s.metaBadge}>{result.word_count || "—"} words</span>
            {result.target_band && <span style={s.metaBadge}>Target: {result.target_band}</span>}
          </div>
        </div>
      </div>

      {/* Criteria grid */}
      <div style={s.criteriaGrid}>
        {criteria.map(({ key, label }) => {
          const score = result[key]?.score || 0;
          const comment = result[key]?.comment || "";
          const color = getBandColor(score);
          return (
            <div key={key} style={s.criterionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={s.criterionLabel}>{label}</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", color, lineHeight: 1 }}>{score}</span>
              </div>
              <div style={{ height: "3px", background: "#eee", borderRadius: "2px", marginBottom: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(score / 9) * 100}%`, background: color, borderRadius: "2px", transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>{comment}</p>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {result.strengths?.length > 0 && (
        <div style={s.feedbackSection}>
          <h3 style={s.feedbackHeading}>Strengths</h3>
          {result.strengths.map((s_, i) => (
            <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#2d7a4f", background: "rgba(45,122,79,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#2d7a4f", display: "block", marginBottom: "4px" }}>Strength</span>
              <p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{s_}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weaknesses */}
      {result.weaknesses?.length > 0 && (
        <div style={s.feedbackSection}>
          <h3 style={s.feedbackHeading}>Areas to Improve</h3>
          {result.weaknesses.map((w, i) => (
            <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#c84b31", background: "rgba(200,75,49,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#c84b31", display: "block", marginBottom: "4px" }}>To improve</span>
              <p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions?.length > 0 && (
        <div style={s.feedbackSection}>
          <h3 style={s.feedbackHeading}>Suggestions</h3>
          {result.suggestions.map((sg, i) => (
            <div key={i} style={{ ...s.feedbackBlock, borderLeftColor: "#b8860b", background: "rgba(184,134,11,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#b8860b", display: "block", marginBottom: "4px" }}>Suggestion</span>
              <p style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{sg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Improved opening */}
      {result.improved_opening && (
        <div style={s.feedbackSection}>
          <h3 style={s.feedbackHeading}>Improved Opening Paragraph</h3>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>
            Here's how your introduction could be rewritten to target a higher band:
          </p>
          <div style={{ background: "#f9f9f7", border: "0.5px solid #ddd", borderRadius: "10px", padding: "1rem 1.2rem", fontSize: "14px", lineHeight: 1.8, color: "#333", whiteSpace: "pre-wrap" }}>
            {result.improved_opening}
          </div>
        </div>
      )}

      <button style={{ ...s.primaryBtn, marginTop: "8px" }} onClick={onNewAnalysis}>
        Analyze Another Essay →
      </button>
    </div>
  );
}

// ============================================================
//  HISTORY TAB
// ============================================================
function HistoryTab({ token, onLoadResult }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/history", {}, token);
      setHistory(data);
    } catch (_) {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await apiFetch(`/api/history/${id}`, { method: "DELETE" }, token);
      setHistory(h => h.filter(x => x.id !== id));
    } catch (_) {}
    setDeleting(null);
  }

  async function handleView(item) {
    try {
      const data = await apiFetch(`/api/history/${item.id}`, {}, token);
      onLoadResult(data.feedback_json);
    } catch (_) {}
  }

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>Loading history…</div>;

  if (!history.length) {
    return (
      <div style={s.emptyState}>
        <div style={s.emptyIcon}>🗂️</div>
        <h3 style={s.emptyTitle}>No history yet</h3>
        <p style={s.emptySub}>Your analyzed essays will appear here so you can track your improvement over time.</p>
      </div>
    );
  }

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
            <p style={{ fontSize: "13px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.prompt_text || item.essay_text?.substring(0, 80) + "…"}
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "12px", color: "#888" }}>
              <span>TA: {item.task_achievement}</span>
              <span>CC: {item.coherence_cohesion}</span>
              <span>LR: {item.lexical_resource}</span>
              <span>GR: {item.grammatical_range}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "2rem", color: getBandColor(item.overall_band), fontWeight: 700 }}>
              {item.overall_band}
            </span>
            <button style={s.iconBtn} onClick={() => handleView(item)} title="View full feedback">👁</button>
            <button style={{ ...s.iconBtn, color: "#c84b31" }}
              onClick={() => handleDelete(item.id)} disabled={deleting === item.id} title="Delete">
              {deleting === item.id ? "…" : "🗑"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  TIPS TAB
// ============================================================
function TipsTab() {
  const criteria = [
    { label: "Task Achievement / Response", pct: "25%", desc: "Address all parts of the task. For Task 2: clear position, relevant ideas, fully developed arguments with examples. For Task 1: accurate overview and key features." },
    { label: "Coherence & Cohesion", pct: "25%", desc: "Logical organization, clear paragraphing, effective use of cohesive devices (linkers, pronouns, referencing) without overuse." },
    { label: "Lexical Resource", pct: "25%", desc: "Range and accuracy of vocabulary. Use less common words naturally, show awareness of collocation and style." },
    { label: "Grammatical Range & Accuracy", pct: "25%", desc: "Variety of structures (simple, compound, complex), correct grammar, punctuation, and controlled use of subordination." },
  ];

  const bands = [
    { band: 9, desc: "Expert — Full operational command. Appropriate, accurate and fluent with complete understanding.", color: "#2d7a4f" },
    { band: 8, desc: "Very Good — Fully operational command with only occasional unsystematic inaccuracies.", color: "#2d7a4f" },
    { band: 7, desc: "Good — Operational command. Handles complex language well though some inaccuracies occur.", color: "#b8860b" },
    { band: 6, desc: "Competent — Generally effective command despite inaccuracies, misunderstandings, and inappropriate use.", color: "#b8860b" },
    { band: 5, desc: "Modest — Partial command. Copes with overall meaning though many mistakes occur.", color: "#c84b31" },
    { band: 4, desc: "Limited — Basic competence limited to familiar situations. Frequent problems in misunderstanding.", color: "#c84b31" },
  ];

  const tips = [
    { title: "Always write an overview (Task 1)", body: "The overview is the most important paragraph for Task 1. Without it you cannot score above Band 5 for Task Achievement." },
    { title: "State your position clearly (Task 2)", body: "In the introduction, make your position 100% clear. Examiners should never be unsure whether you agree or disagree." },
    { title: "Vary your sentence structures", body: "Mix simple, compound, and complex sentences. Too many short sentences caps you at Band 5 for Grammatical Range." },
    { title: "Avoid memorized phrases", body: "Examiners can spot memorized vocabulary. Use natural language. 'It is a well-known fact that' actually lowers your score." },
    { title: "Use topic-specific vocabulary", body: "Use precise, topic-relevant words. For environment essays: 'carbon emissions', 'deforestation', 'biodiversity loss'." },
    { title: "Check word count — but don't pad", body: "Write at least 150 (T1) or 250 (T2) words, but don't pad with repetition. Quality over quantity always." },
  ];

  return (
    <div>
      <div style={s.card}>
        <p style={s.sectionLabel}>How IELTS Writing is marked</p>
        <div style={s.tipsGrid}>
          {criteria.map((c, i) => (
            <div key={i} style={s.tipCard}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: "#ddd", float: "right", marginLeft: "8px" }}>{c.pct}</div>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "6px" }}>{c.label}</h4>
              <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionLabel}>Band descriptors</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {bands.map(b => (
            <div key={b.band} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 12px", borderRadius: "8px", background: "#f9f9f7" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: b.color, minWidth: "32px", fontWeight: 700 }}>{b.band}</span>
              <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <p style={s.sectionLabel}>Top tips for a higher band</p>
        <div style={s.tipsGrid}>
          {tips.map((t, i) => (
            <div key={i} style={s.tipCard}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#222", marginBottom: "6px" }}>{t.title}</h4>
              <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6 }}>{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  STATS TAB
// ============================================================
function StatsTab({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/api/stats", {}, token).then(setStats).catch(() => {});
  }, [token]);

  if (!stats) return <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>Loading stats…</div>;

  if (stats.total === 0) {
    return (
      <div style={s.emptyState}>
        <div style={s.emptyIcon}>📊</div>
        <h3 style={s.emptyTitle}>No data yet</h3>
        <p style={s.emptySub}>Analyze your first essay to start tracking your progress.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={s.statsGrid}>
        {[
          { label: "Total Analyses", value: stats.total },
          { label: "Average Band", value: stats.avgBand },
          { label: "Best Band", value: stats.best },
        ].map((st, i) => (
          <div key={i} style={s.statCard}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem", color: "#1a1a2e", fontWeight: 700 }}>{st.value}</div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{st.label}</div>
          </div>
        ))}
      </div>

      {stats.trend?.length > 1 && (
        <div style={s.card}>
          <p style={s.sectionLabel}>Recent trend</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {stats.trend.map((t, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "100%", background: getBandColor(t.band), borderRadius: "4px 4px 0 0", height: `${(t.band / 9) * 70}px`, transition: "height 0.5s ease" }} />
                <span style={{ fontSize: "11px", color: "#888" }}>{t.band}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "8px", textAlign: "center" }}>Last {stats.trend.length} analyses</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  MAIN APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("analyze");
  const [result, setResult] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen to Supabase auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleAuth(sess, u) { setSession(sess); setUser(u); }
  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null); setUser(null); setResult(null);
  }
  function handleResult(r) { setResult(r); setActiveTab("results"); }
  function handleNewAnalysis() { setActiveTab("analyze"); }
  function handleLoadFromHistory(r) { setResult(r); setActiveTab("results"); }

  if (authLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888" }}>Loading…</div>;
  }

  if (!session) return <AuthScreen onAuth={handleAuth} />;

  const tabs = [
    { id: "analyze", label: "Analyze" },
    { id: "results", label: "Results" },
    { id: "history", label: "History" },
    { id: "stats", label: "My Stats" },
    { id: "tips", label: "Tips" },
  ];

  return (
    <div style={s.appWrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.headerBadge}>Ani's Analyser</div>
            <h1 style={s.headerTitle}>IELTS Writing <em style={{ fontStyle: "italic", color: "#c84b31" }}>Analyser</em></h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>{user?.email}</span>
            <button style={s.signOutBtn} onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={s.main}>
        {/* Tabs */}
        <div style={s.tabs}>
          {tabs.map(t => (
            <button key={t.id} style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "analyze" && <AnalyzeTab token={session.access_token} onResult={handleResult} />}
        {activeTab === "results" && <ResultsTab result={result} onNewAnalysis={handleNewAnalysis} />}
        {activeTab === "history" && <HistoryTab token={session.access_token} onLoadResult={handleLoadFromHistory} />}
        {activeTab === "stats" && <StatsTab token={session.access_token} />}
        {activeTab === "tips" && <TipsTab />}
      </div>
    </div>
  );
}

// ============================================================
//  STYLES OBJECT
// ============================================================
const s = {
  // Layout
  appWrap: { minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif" },
  main: { maxWidth: "840px", margin: "0 auto", padding: "1.5rem 1rem 4rem" },

  // Header
  header: { background: "#fff", borderBottom: "0.5px solid #e0ddd8", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: "840px", margin: "0 auto", padding: "14px 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerBadge: { fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#c84b31", fontWeight: 600, marginBottom: "2px" },
  headerTitle: { fontFamily: "'DM Serif Display', 'Georgia', serif", fontSize: "1.5rem", color: "#1a1a2e", margin: 0 },

  // Tabs
  tabs: { display: "flex", gap: "4px", background: "#eeecea", borderRadius: "10px", padding: "4px", marginBottom: "1.5rem", overflowX: "auto" },
  tab: { flex: 1, minWidth: "70px", padding: "9px 12px", border: "none", background: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, color: "#888", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },
  tabActive: { background: "#fff", color: "#1a1a2e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },

  // Cards
  card: { background: "#fff", borderRadius: "12px", border: "0.5px solid #dddad4", padding: "1.25rem", marginBottom: "1rem" },

  // Form
  label: { fontSize: "12px", fontWeight: 600, color: "#666", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px" },
  input: { width: "100%", padding: "10px 12px", border: "0.5px solid #ddd", borderRadius: "8px", fontSize: "14px", color: "#222", background: "#fafaf8", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: "200px", padding: "12px 14px", border: "0.5px solid #ddd", borderRadius: "10px", fontSize: "15px", color: "#222", background: "#fafaf8", resize: "vertical", lineHeight: 1.7, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  wordCountRow: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "6px" },

  // Task selector
  taskGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  taskOption: { padding: "14px", border: "0.5px solid #ddd", borderRadius: "10px", cursor: "pointer", background: "#fff" },
  taskOptionActive: { border: "1px solid #c84b31", background: "rgba(200,75,49,0.04)" },
  taskTitle: { fontSize: "15px", fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" },
  taskDesc: { fontSize: "12px", color: "#888" },

  // Meta row
  metaRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },

  // Input mode tabs
  inputModeTabs: { display: "flex", gap: "6px", marginBottom: "14px" },
  modeTab: { flex: 1, padding: "9px", border: "0.5px solid #ddd", borderRadius: "8px", background: "#fafaf8", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#666" },
  modeTabActive: { background: "#1a1a2e", color: "#fff", border: "0.5px solid #1a1a2e" },

  // Upload area
  uploadArea: { padding: "1rem", border: "1px dashed #ccc", borderRadius: "10px", background: "#fafaf8" },

  // Buttons
  primaryBtn: { width: "100%", padding: "15px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "block" },
  iconBtn: { padding: "6px 10px", border: "0.5px solid #ddd", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "16px" },
  signOutBtn: { padding: "7px 14px", border: "0.5px solid #ddd", borderRadius: "8px", background: "#fff", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { background: "none", border: "none", color: "#c84b31", cursor: "pointer", fontSize: "14px", textDecoration: "underline", fontFamily: "inherit" },

  // Spinner
  spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  // Feedback
  errorBox: { background: "rgba(200,75,49,0.08)", border: "0.5px solid rgba(200,75,49,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#c84b31", fontSize: "14px", marginBottom: "12px" },
  successBox: { background: "rgba(45,122,79,0.08)", border: "0.5px solid rgba(45,122,79,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#2d7a4f", fontSize: "14px", marginBottom: "12px" },
  sectionLabel: { fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", marginBottom: "12px" },
  metaBadge: { fontSize: "11px", background: "#f0efe9", color: "#666", padding: "3px 10px", borderRadius: "20px" },

  // Results
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

  // History
  historyItem: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },

  // Stats
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "1rem" },
  statCard: { background: "#fff", border: "0.5px solid #dddad4", borderRadius: "10px", padding: "16px", textAlign: "center" },

  // Tips
  tipsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  tipCard: { padding: "12px", border: "0.5px solid #dddad4", borderRadius: "10px", background: "#fafaf8" },

  // Auth
  authWrap: { minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "'DM Sans', sans-serif" },
  authCard: { background: "#fff", borderRadius: "16px", border: "0.5px solid #dddad4", padding: "2rem", width: "100%", maxWidth: "420px" },
  authHeader: { textAlign: "center", marginBottom: "1.5rem" },
  authBadge: { display: "inline-block", background: "rgba(200,75,49,0.1)", color: "#c84b31", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", padding: "5px 12px", borderRadius: "20px", marginBottom: "12px", fontWeight: 600 },
  authTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.8rem", color: "#1a1a2e", margin: "0 0 6px" },
  authSub: { fontSize: "14px", color: "#888" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldGroup: { display: "flex", flexDirection: "column" },
  authFooter: { display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" },

  // Empty state
  emptyState: { textAlign: "center", padding: "3rem 2rem" },
  emptyIcon: { fontSize: "48px", marginBottom: "12px", opacity: 0.4 },
  emptyTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.3rem", color: "#333", marginBottom: "8px" },
  emptySub: { fontSize: "14px", color: "#888", lineHeight: 1.6 },
};
