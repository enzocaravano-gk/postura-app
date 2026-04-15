import { useState, useEffect, useRef, useCallback } from "react";

// ─── COSTANTI ────────────────────────────────────────────────────────────────
const POSTURE_VIEWS = ["front", "back", "dx", "sx"];
const VIEW_LABELS = { front: "Frontale", back: "Posteriore", dx: "Laterale DX", sx: "Laterale SX" };
const VIEW_COLORS = { front: "#00e5ff", back: "#d500f9", dx: "#00e676", sx: "#ff9100" };
const POSTURE_CHECKS = [
  { id: "shoulders", label: "Spalle" },
  { id: "hips",      label: "Anca" },
  { id: "knee_dx",   label: "Ginocchio DX" },
  { id: "knee_sx",   label: "Ginocchio SX" },
  { id: "ankle_dx",  label: "Caviglia DX" },
  { id: "ankle_sx",  label: "Caviglia SX" },
  { id: "spine",     label: "Colonna Vertebrale" },
  { id: "head",      label: "Posizione Testa" },
];

// ─── DATA LAYER ───────────────────────────────────────────────────────────────
const loadPlayers = () => { try { return JSON.parse(localStorage.getItem("postura_players") || "[]"); } catch { return []; } };
const savePlayers = (arr) => localStorage.setItem("postura_players", JSON.stringify(arr));
const loadPostureDB = () => { try { return JSON.parse(localStorage.getItem("postura_data") || "{}"); } catch { return {}; } };
const savePostureDB = (db) => localStorage.setItem("postura_data", JSON.stringify(db));
const emptySession = () => ({
  id: "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
  data: new Date().toISOString(),
  label: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }),
  lines: { front: [], back: [], dx: [], sx: [] },
  circles: { front: [], back: [], dx: [], sx: [] },
  checks: {},
  notes: "",
  photos: { front: null, back: null, dx: null, sx: null },
  aiAnalysis: null,
});
const getAtletaData = (pid) => {
  const db = loadPostureDB();
  const raw = db[String(pid)];
  if (!raw) return { sessioni: [] };
  if (raw.sessioni) return raw;
  // migrate old format
  const sess = { ...emptySession(), lines: raw.lines || {}, checks: raw.checks || {}, notes: raw.notes || "", photos: raw.photos || {} };
  return { sessioni: [sess] };
};
const saveAtletaData = (pid, data) => { const db = loadPostureDB(); db[String(pid)] = data; savePostureDB(db); };
const calcAge = (dob) => { if (!dob) return null; const d = new Date(dob); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--; return age; };
const calcBMI = (w, h) => { if (!w || !h) return null; return (w / ((h / 100) ** 2)).toFixed(1); };

// ─── COLORS ───────────────────────────────────────────────────────────────────
const scoreColor = (v) => v <= 3 ? "#00e676" : v <= 6 ? "#ff9100" : "#ff1744";
const scoreBg    = (v) => v <= 3 ? "rgba(0,230,118,0.12)" : v <= 6 ? "rgba(255,145,0,0.12)" : "rgba(255,23,68,0.12)";

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════════
function Toast({ msg, type, visible }) {
  const color = type === "error" ? "#ff1744" : type === "success" ? "#00e676" : "#00e5ff";
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 80}px)`,
      background: "#0d1117", border: `1px solid ${color}`, borderRadius: 50,
      padding: "12px 24px", fontSize: "0.85rem", fontWeight: 700, color,
      zIndex: 9000, transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTO CARD — con linee guida e cerchi
// ═══════════════════════════════════════════════════════════════════════════════
function PhotoCard({ view, photo, onPhotoLoad, onPhotoClear }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (ev) => onPhotoLoad(view, ev.target.result);
      r.readAsDataURL(file);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => onPhotoLoad(view, ev.target.result);
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const col = VIEW_COLORS[view];
  return (
    <div style={{ background: "#0d1117", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#131920" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: col }}>
          {VIEW_LABELS[view]}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fileRef.current.click()} title="Carica foto" style={iconBtnStyle}>📷</button>
          {photo && <button onClick={() => onPhotoClear(view)} title="Rimuovi" style={{ ...iconBtnStyle, color: "#ff1744" }}>🗑</button>}
        </div>
      </div>
      {/* Canvas area */}
      <div
        style={{ position: "relative", minHeight: 280, background: "#07090f", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !photo && fileRef.current.click()}
      >
        {photo ? (
          <img src={photo} alt={VIEW_LABELS[view]} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
        ) : (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", padding: 20 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: "0.72rem", letterSpacing: 1 }}>
              {dragging ? "Rilascia qui" : "Clicca o trascina una foto"}
            </div>
          </div>
        )}
        {dragging && <div style={{ position: "absolute", inset: 0, border: `2px dashed ${col}`, borderRadius: 10, background: `${col}10`, pointerEvents: "none" }} />}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

const iconBtnStyle = { background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "2px 6px", borderRadius: 4, color: "rgba(255,255,255,0.4)", transition: "color 0.15s" };

// ═══════════════════════════════════════════════════════════════════════════════
// AI ANALYSIS PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AIAnalysisPanel({ session, athlete, onApplyAI }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [result, setResult] = useState(session.aiAnalysis || null);
  const [selectedView, setSelectedView] = useState("front");

  const hasPhotos = POSTURE_VIEWS.some(v => session.photos?.[v]);

  const runAnalysis = async () => {
    const photo = session.photos?.[selectedView];
    if (!photo) { setError("Nessuna foto per la vista selezionata."); return; }
    setLoading(true); setError(null);

    const athleteCtx = athlete
      ? `Atleta: ${athlete.name} ${athlete.surname}, ${athlete.age ? athlete.age + " anni" : ""}, sport: ${athlete.sport || "N/D"}, ruolo: ${athlete.ruolo || "N/D"}.`
      : "";

    const checksGuide = POSTURE_CHECKS.map(c => `- ${c.label} (id: ${c.id})`).join("\n");

    const systemPrompt = `Sei un esperto di analisi posturale sportiva. Analizza la foto posturale e restituisci SOLO un JSON valido, senza markdown, senza backtick, senza testo aggiuntivo.
Il JSON deve avere esattamente questa struttura:
{
  "view": "${selectedView}",
  "summary": "Breve descrizione generale della postura (max 2 righe)",
  "checks": {
    "shoulders": <numero 1-10>,
    "hips": <numero 1-10>,
    "knee_dx": <numero 1-10>,
    "knee_sx": <numero 1-10>,
    "ankle_dx": <numero 1-10>,
    "ankle_sx": <numero 1-10>,
    "spine": <numero 1-10>,
    "head": <numero 1-10>
  },
  "findings": ["finding1", "finding2", "finding3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "urgency": "bassa" | "media" | "alta"
}

Scala valutazione: 1-3 = OK (normale), 4-6 = Da monitorare, 7-10 = Visita specialista.
${athleteCtx}
Valuta solo ciò che è visibile dalla vista ${selectedView}.`;

    try {
      const base64 = photo.split(",")[1];
      const mediaType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text",  text: `Analizza questa foto posturale (vista: ${VIEW_LABELS[selectedView]}) e restituisci il JSON richiesto.` }
            ]
          }]
        })
      });

      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      let parsed;
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error("Risposta AI non parsabile. Riprova.");
      }
      parsed.timestamp = new Date().toISOString();
      setResult(parsed);
      onApplyAI(parsed);
    } catch (e) {
      setError(e.message || "Errore durante l'analisi.");
    } finally {
      setLoading(false);
    }
  };

  const urgencyColor = (u) => u === "alta" ? "#ff1744" : u === "media" ? "#ff9100" : "#00e676";

  return (
    <div style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00e5ff,#0077ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🤖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f0f4f8" }}>Analisi AI Posturale</div>
          <div style={{ fontSize: "0.72rem", color: "#4d6070", letterSpacing: 1 }}>CLAUDE VISION · ANALISI AUTOMATICA</div>
        </div>
        {result && (
          <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: `${urgencyColor(result.urgency)}20`, color: urgencyColor(result.urgency), fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
            Urgenza: {result.urgency}
          </div>
        )}
      </div>

      {/* Vista selector + run */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: "#4d6070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Vista:</span>
        {POSTURE_VIEWS.map(v => (
          <button key={v} onClick={() => setSelectedView(v)}
            style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${selectedView === v ? VIEW_COLORS[v] : "rgba(255,255,255,0.1)"}`, background: selectedView === v ? `${VIEW_COLORS[v]}20` : "transparent", color: selectedView === v ? VIEW_COLORS[v] : "#8899aa", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
            {VIEW_LABELS[v]}
            {session.photos?.[v] ? " ✓" : " ✗"}
          </button>
        ))}
        <button onClick={runAnalysis} disabled={loading || !session.photos?.[selectedView]}
          style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 50, border: "none", background: loading ? "#1a2230" : "linear-gradient(135deg,#00e5ff,#0077ff)", color: loading ? "#4d6070" : "#07090f", fontWeight: 800, fontSize: "0.85rem", cursor: loading || !session.photos?.[selectedView] ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
          {loading ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Analisi in corso...</>
          ) : "🤖 Analizza Foto"}
        </button>
      </div>

      {!hasPhotos && (
        <div style={{ textAlign: "center", padding: "20px", color: "#4d6070", fontSize: "0.82rem", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.07)" }}>
          Carica almeno una foto per usare l'analisi AI
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(255,23,68,0.1)", border: "1px solid #ff1744", borderRadius: 10, color: "#ff1744", fontSize: "0.83rem", marginTop: 10 }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          {/* Summary */}
          <div style={{ padding: "12px 16px", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 10, marginBottom: 14 }}>
            <div style={{ fontSize: "0.7rem", color: "#00e5ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Sintesi</div>
            <div style={{ fontSize: "0.85rem", color: "#f0f4f8", lineHeight: 1.6 }}>{result.summary}</div>
          </div>

          {/* Checks grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {POSTURE_CHECKS.map(c => {
              const v = result.checks?.[c.id];
              if (!v) return null;
              return (
                <div key={c.id} style={{ background: scoreBg(v), border: `1px solid ${scoreColor(v)}40`, borderRadius: 10, padding: "10px 10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: scoreColor(v), fontFamily: "monospace" }}>{v}</div>
                  <div style={{ fontSize: "0.6rem", color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{c.label}</div>
                </div>
              );
            })}
          </div>

          {/* Findings + Recommendations */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#ff9100", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>📋 Evidenze</div>
              {(result.findings || []).map((f, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "#8899aa", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(255,145,0,0.4)", lineHeight: 1.5 }}>{f}</div>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#00e676", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>✅ Raccomandazioni</div>
              {(result.recommendations || []).map((r, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "#8899aa", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(0,230,118,0.4)", lineHeight: 1.5 }}>{r}</div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: "0.68rem", color: "#4d6070", textAlign: "right" }}>
            Analizzato il {new Date(result.timestamp).toLocaleString("it-IT")} · Vista {VIEW_LABELS[result.view]}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK SLIDER
// ═══════════════════════════════════════════════════════════════════════════════
function CheckSlider({ check, value, onChange }) {
  const v = value || 1;
  const col = scoreColor(v);
  const lbl = v <= 3 ? "OK" : v <= 6 ? "Monitorare" : "Specialista";
  return (
    <div style={{ background: "#131920", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1 }}>{check.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 900, color: col, background: `${col}20`, padding: "1px 8px", borderRadius: 6, border: `1px solid ${col}40` }}>{v}</span>
          <span style={{ fontSize: "0.65rem", color: col, fontWeight: 700 }}>{lbl}</span>
        </div>
      </div>
      <input type="range" min={1} max={10} value={v}
        onChange={(e) => onChange(check.id, parseInt(e.target.value))}
        style={{ width: "100%", accentColor: col, height: 4, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "#4d6070", marginTop: 4 }}>
        <span>OK</span><span>Monitorare</span><span>Specialista</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETE FORM
// ═══════════════════════════════════════════════════════════════════════════════
function AthleteForm({ athlete, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: athlete?.name || "", surname: athlete?.surname || "",
    dob: athlete?.dob || "", gender: athlete?.gender || "",
    peso: athlete?.peso || "", altezza: athlete?.altezza || "",
    sport: athlete?.sport || "", ruolo: athlete?.ruolo || "",
    categoria: athlete?.categoria || "", club: athlete?.club || "",
    note: athlete?.note || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const bmi = calcBMI(form.peso, form.altezza);

  const handleSave = () => {
    if (!form.name.trim() || !form.surname.trim()) return;
    const a = {
      id: athlete?.id || Date.now(),
      ...form,
      bmi,
      age: calcAge(form.dob),
      createdAt: athlete?.createdAt || new Date().toISOString(),
    };
    onSave(a);
  };

  const field = (label, key, props = {}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.7rem", color: "#4d6070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
      <input value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ background: "#1a2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 12px", color: "#f0f4f8", fontSize: "0.88rem", outline: "none", fontFamily: "inherit" }}
        {...props} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#8899aa", cursor: "pointer", fontSize: "1.4rem" }}>←</button>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: 2, color: "#f0f4f8" }}>
          {athlete ? "MODIFICA ATLETA" : "NUOVO ATLETA"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        {/* Dati anagrafici */}
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>👤 Dati Anagrafici</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Nome *", "name", { placeholder: "Mario" })}
            {field("Cognome *", "surname", { placeholder: "Rossi" })}
            {field("Data di nascita", "dob", { type: "date" })}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.7rem", color: "#4d6070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Genere</label>
              <select value={form.gender} onChange={e => set("gender", e.target.value)}
                style={{ background: "#1a2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 12px", color: "#f0f4f8", fontSize: "0.88rem", outline: "none" }}>
                <option value="">—</option><option value="M">Maschio</option><option value="F">Femmina</option>
              </select>
            </div>
            {field("Peso (kg)", "peso", { type: "number", placeholder: "70" })}
            {field("Altezza (cm)", "altezza", { type: "number", placeholder: "175" })}
          </div>
          {bmi && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#131920", borderRadius: 8, fontSize: "0.82rem", color: "#8899aa" }}>
              BMI: <span style={{ color: "#00e5ff", fontWeight: 800, fontFamily: "monospace" }}>{bmi}</span>
            </div>
          )}
        </div>

        {/* Dati sportivi */}
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#00e676", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>🏅 Dati Sportivi</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Sport", "sport", { placeholder: "Calcio" })}
            {field("Ruolo", "ruolo", { placeholder: "Portiere" })}
            {field("Categoria", "categoria", { placeholder: "Under 18" })}
            {field("Club", "club", { placeholder: "A.C. Roma" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <label style={{ fontSize: "0.7rem", color: "#4d6070", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Note cliniche / Anamnesi</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)}
              placeholder="Infortuni pregressi, obiettivi, patologie..."
              style={{ background: "#1a2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 12px", color: "#f0f4f8", fontSize: "0.88rem", outline: "none", resize: "vertical", minHeight: 80, fontFamily: "inherit" }} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={onCancel} style={ghostBtn}>Annulla</button>
        <button onClick={handleSave} style={neonBtn}>✓ Salva Atleta</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETE CARD
// ═══════════════════════════════════════════════════════════════════════════════
function AthleteCard({ athlete, onSelect, onEdit, onDelete, sessionCount }) {
  const initials = (athlete.name[0] || "") + (athlete.surname[0] || "");
  return (
    <div onClick={() => onSelect(athlete)} style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, cursor: "pointer", transition: "border-color 0.2s", position: "relative" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#00e5ff,#0077ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.2rem", color: "#07090f", fontWeight: 900 }}>{initials}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(athlete); }} style={{ ...iconBtnStyle, fontSize: "0.85rem", background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "4px 8px" }}>✏️</button>
          <button onClick={e => { e.stopPropagation(); onDelete(athlete.id); }} style={{ ...iconBtnStyle, fontSize: "0.85rem", background: "rgba(255,23,68,0.1)", borderRadius: 6, padding: "4px 8px", color: "#ff1744" }}>🗑</button>
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: "1rem", color: "#f0f4f8", marginBottom: 2 }}>{athlete.surname} {athlete.name}</div>
      {athlete.dob && <div style={{ fontSize: "0.75rem", color: "#4d6070", marginBottom: 8 }}>{new Date(athlete.dob).toLocaleDateString("it-IT")} {athlete.age ? `· ${athlete.age} anni` : ""}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {athlete.sport && <span style={tagStyle}>🏅 {athlete.sport}</span>}
        {athlete.ruolo && <span style={tagStyle}>⚡ {athlete.ruolo}</span>}
        {athlete.club && <span style={tagStyle}>🏟 {athlete.club}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        {[["peso", athlete.peso ? athlete.peso + " kg" : "—", "#00e5ff"], ["altezza", athlete.altezza ? athlete.altezza + " cm" : "—", "#ff9100"], ["schede", sessionCount, "#00e676"]].map(([lbl, val, col]) => (
          <div key={lbl} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95rem", color: col }}>{val}</div>
            <div style={{ fontSize: "0.62rem", color: "#4d6070", textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const tagStyle = { fontSize: "0.68rem", padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8899aa" };
const neonBtn = { padding: "10px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#00e5ff,#0077ff)", color: "#07090f", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", flex: 1 };
const ghostBtn = { padding: "10px 24px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8899aa", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", flex: 1 };

// ═══════════════════════════════════════════════════════════════════════════════
// POSTURE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function PosturePage({ athletes, showToast }) {
  const [selectedId, setSelectedId] = useState(null);
  const [session, setSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [showStorico, setShowStorico] = useState(false);

  const athlete = athletes.find(a => a.id == selectedId);

  useEffect(() => {
    if (!selectedId) { setSession(null); setAllSessions([]); return; }
    const data = getAtletaData(String(selectedId));
    if (!data.sessioni.length) {
      const s = emptySession();
      data.sessioni.push(s);
      saveAtletaData(String(selectedId), data);
    }
    setAllSessions(data.sessioni);
    setSession({ ...data.sessioni[data.sessioni.length - 1] });
  }, [selectedId]);

  const updateSession = (update) => {
    setSession(s => ({ ...s, ...update }));
  };

  const handlePhotoLoad = (view, src) => {
    updateSession({ photos: { ...session.photos, [view]: src } });
  };
  const handlePhotoClear = (view) => {
    updateSession({ photos: { ...session.photos, [view]: null } });
  };
  const handleCheckChange = (id, val) => {
    updateSession({ checks: { ...session.checks, [id]: val } });
  };
  const handleApplyAI = (aiResult) => {
    const newChecks = { ...session.checks };
    Object.entries(aiResult.checks || {}).forEach(([k, v]) => { newChecks[k] = v; });
    updateSession({ checks: newChecks, aiAnalysis: aiResult });
    showToast("✓ Valutazioni AI applicate alla scheda", "success");
  };

  const handleSave = (silent = false) => {
    if (!selectedId || !session) return;
    const data = getAtletaData(String(selectedId));
    const idx = data.sessioni.findIndex(s => s.id === session.id);
    if (idx >= 0) data.sessioni[idx] = session;
    else { data.sessioni.push(session); }
    saveAtletaData(String(selectedId), data);
    setAllSessions([...data.sessioni]);
    if (!silent) showToast("✓ Sessione salvata!", "success");
  };

  const handleNewSession = () => {
    if (!selectedId) return;
    handleSave(true);
    const s = emptySession();
    const data = getAtletaData(String(selectedId));
    data.sessioni.push(s);
    saveAtletaData(String(selectedId), data);
    setAllSessions([...data.sessioni]);
    setSession({ ...s });
    showToast("✓ Nuova sessione creata");
  };

  const loadSession = (s) => {
    handleSave(true);
    setSession({ ...s });
    setShowStorico(false);
  };

  const deleteSession = (sid) => {
    const data = getAtletaData(String(selectedId));
    data.sessioni = data.sessioni.filter(s => s.id !== sid);
    if (!data.sessioni.length) { const s = emptySession(); data.sessioni.push(s); }
    saveAtletaData(String(selectedId), data);
    setAllSessions([...data.sessioni]);
    if (session?.id === sid) setSession({ ...data.sessioni[data.sessioni.length - 1] });
  };

  // Stats
  const checks = session?.checks || {};
  const vals = Object.values(checks);
  const fotos = POSTURE_VIEWS.filter(v => session?.photos?.[v]).length;
  const nOk = vals.filter(v => v <= 3).length;
  const nWarn = vals.filter(v => v > 3 && v <= 6).length;
  const nBad = vals.filter(v => v > 6).length;

  return (
    <div>
      {/* Player select */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: 2 }}>👤 Atleta</span>
        <select value={selectedId || ""} onChange={e => setSelectedId(e.target.value || null)}
          style={{ flex: 1, maxWidth: 360, background: "#1a2230", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#f0f4f8", fontSize: "0.88rem", outline: "none" }}>
          <option value="">— Seleziona un atleta —</option>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.surname} {a.name} {a.ruolo ? `· ${a.ruolo}` : ""}</option>)}
        </select>
        {athlete && (
          <span style={{ padding: "5px 14px 5px 8px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 50, fontSize: "0.8rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00e5ff", display: "inline-block" }} />
            {athlete.surname} {athlete.name}
          </span>
        )}
        {session && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={() => setShowStorico(true)} style={ghostBtn} title="Storico sessioni">
              📋 {allSessions.length} sessioni
            </button>
            <button onClick={handleNewSession} style={ghostBtn}>+ Nuova</button>
            <button onClick={() => handleSave(false)} style={neonBtn}>💾 Salva</button>
          </div>
        )}
      </div>

      {!selectedId && (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "#0d1117", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.15 }}>🧍</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", letterSpacing: 2, marginBottom: 8, color: "#f0f4f8" }}>Seleziona un Atleta</div>
          <div style={{ color: "#4d6070", fontSize: "0.85rem" }}>Scegli un atleta per visualizzare o creare la scheda posturale</div>
        </div>
      )}

      {session && (
        <>
          {/* Stats strip */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[["📷 Foto", `${fotos}/4`, "#00e5ff"], ["✅ OK", nOk, "#00e676"], ["⚠ Monit.", nWarn, "#ff9100"], ["🔴 Spec.", nBad, "#ff1744"]].map(([lbl, val, col]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 50, fontSize: "0.78rem" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 800, color: col }}>{val}</span>
                <span style={{ color: "#4d6070" }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* AI Panel */}
          <AIAnalysisPanel session={session} athlete={athlete} onApplyAI={handleApplyAI} />

          {/* 4 foto grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
            {POSTURE_VIEWS.map(v => (
              <PhotoCard key={v} view={v} photo={session.photos?.[v]}
                onPhotoLoad={handlePhotoLoad} onPhotoClear={handlePhotoClear} />
            ))}
          </div>

          {/* Checklist */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f0f4f8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>📊 Valutazione Distretti Corporei</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {POSTURE_CHECKS.map(c => (
                <CheckSlider key={c.id} check={c} value={checks[c.id]} onChange={handleCheckChange} />
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#f0f4f8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>📝 Note Cliniche</div>
            <textarea value={session.notes || ""} onChange={e => updateSession({ notes: e.target.value })}
              placeholder="Osservazioni, indicazioni, note..."
              style={{ width: "100%", background: "#131920", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", color: "#f0f4f8", fontSize: "0.88rem", outline: "none", resize: "vertical", minHeight: 100, fontFamily: "inherit" }} />
          </div>

          {/* Save button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => handleSave(false)} style={{ ...neonBtn, flex: "unset", padding: "12px 36px", fontSize: "1rem" }}>
              💾 Salva Sessione
            </button>
          </div>
        </>
      )}

      {/* Storico Modal */}
      {showStorico && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,9,15,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowStorico(false)}>
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 520, maxHeight: "80vh", overflow: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem", letterSpacing: 2 }}>STORICO SESSIONI</div>
              <button onClick={() => setShowStorico(false)} style={{ background: "none", border: "none", color: "#8899aa", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>
            {[...allSessions].reverse().map(s => {
              const vs = Object.values(s.checks || {});
              const isCurrent = s.id === session?.id;
              return (
                <div key={s.id} style={{ background: "#131920", border: `1px solid ${isCurrent ? "#00e5ff" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{s.label} {isCurrent && <span style={{ fontSize: "0.65rem", color: "#00e5ff" }}>● corrente</span>}</div>
                      <div style={{ fontSize: "0.72rem", color: "#4d6070", marginTop: 2 }}>{new Date(s.data).toLocaleDateString("it-IT")} · {POSTURE_VIEWS.filter(v => s.photos?.[v]).length}/4 foto</div>
                    </div>
                    {!isCurrent && (
                      <>
                        <button onClick={() => loadSession(s)} style={{ ...ghostBtn, flex: "unset", padding: "4px 12px", fontSize: "0.75rem" }}>👁 Carica</button>
                        <button onClick={() => deleteSession(s.id)} style={{ background: "rgba(255,23,68,0.1)", border: "1px solid rgba(255,23,68,0.3)", borderRadius: 8, padding: "4px 10px", color: "#ff1744", cursor: "pointer", fontSize: "0.75rem" }}>🗑</button>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ ...tagStyle, color: "#00e676" }}>{vs.filter(v => v <= 3).length} OK</span>
                    <span style={{ ...tagStyle, color: "#ff9100" }}>{vs.filter(v => v > 3 && v <= 6).length} Att</span>
                    <span style={{ ...tagStyle, color: "#ff1744" }}>{vs.filter(v => v > 6).length} Crit</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function AthletesPage({ athletes, onSaveAthlete, onDeleteAthlete, showToast }) {
  const [editing, setEditing] = useState(null); // null = list, {} = new, athlete = edit
  const [search, setSearch] = useState("");

  if (editing !== null) {
    return (
      <AthleteForm
        athlete={editing.id ? editing : null}
        onSave={(a) => { onSaveAthlete(a); setEditing(null); showToast(a.id ? "✓ Atleta aggiornato" : "✓ Atleta aggiunto", "success"); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const filtered = athletes.filter(a =>
    !search || [a.name, a.surname, a.sport, a.ruolo, a.club, a.categoria].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", letterSpacing: 2 }}>ATLETI</div>
          <div style={{ fontSize: "0.8rem", color: "#4d6070" }}>{athletes.length} {athletes.length === 1 ? "atleta registrato" : "atleti registrati"}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cerca atleta..."
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#f0f4f8", fontSize: "0.85rem", outline: "none" }} />
          <button onClick={() => setEditing({})} style={neonBtn}>+ Nuovo Atleta</button>
        </div>
      </div>

      {!athletes.length ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "#0d1117", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.15 }}>👥</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", letterSpacing: 2, marginBottom: 8 }}>Nessun atleta</div>
          <div style={{ color: "#4d6070", fontSize: "0.85rem", marginBottom: 20 }}>Registra il tuo primo atleta per iniziare</div>
          <button onClick={() => setEditing({})} style={neonBtn}>+ Registra atleta</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {filtered.map(a => {
            const data = getAtletaData(String(a.id));
            return (
              <AthleteCard key={a.id} athlete={a} sessionCount={data.sessioni.length}
                onSelect={(a) => setEditing(a)}
                onEdit={(a) => setEditing(a)}
                onDelete={(id) => { if (confirm("Eliminare questo atleta e tutti i suoi dati?")) { onDeleteAthlete(id); showToast("Atleta eliminato", "error"); } }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function BackupModal({ athletes, onClose, onImport, showToast }) {
  const fileRef = useRef(null);
  const lastBackup = localStorage.getItem("postura_last_backup");

  const doExport = () => {
    const db = loadPostureDB();
    const data = { _format: "sporthub_posturale_v2", exportedAt: new Date().toISOString(), athletes, postureData: db };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `SPORTHUB_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    localStorage.setItem("postura_last_backup", new Date().toISOString());
    showToast("✓ Backup esportato!", "success");
    onClose();
  };

  const doImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const ath = data.athletes || data.players;
        if (!ath || !Array.isArray(ath)) throw new Error("Formato non valido");
        if (!confirm(`Ripristinare ${ath.length} atleti? I dati attuali verranno sostituiti.`)) return;
        savePlayers(ath);
        if (data.postureData) savePostureDB(data.postureData);
        onImport();
        showToast(`✓ Ripristinati ${ath.length} atleti`, "success");
        onClose();
      } catch { showToast("File non valido", "error"); }
    };
    r.readAsText(file); e.target.value = "";
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,9,15,0.85)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 440 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem", letterSpacing: 2 }}>BACKUP & RIPRISTINO</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8899aa", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
        </div>
        {lastBackup && (
          <div style={{ padding: "10px 14px", background: "#131920", borderRadius: 10, marginBottom: 16, fontSize: "0.8rem", color: "#4d6070" }}>
            Ultimo backup: <span style={{ color: "#00e5ff" }}>{new Date(lastBackup).toLocaleString("it-IT")}</span>
          </div>
        )}
        <button onClick={doExport} style={{ ...neonBtn, display: "block", width: "100%", marginBottom: 12, textAlign: "center" }}>
          ⬇ Esporta backup completo
        </button>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", background: "#131920", border: "1.5px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px", fontSize: "0.85rem", color: "#8899aa" }}>
          ⬆ Importa backup (.json)
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={doImport} />
        </label>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("postura");
  const [athletes, setAthletes] = useState(loadPlayers);
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState({ msg: "", type: "", visible: false });
  const [showBackup, setShowBackup] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  const handleSaveAthlete = (a) => {
    setAthletes(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      const next = idx >= 0 ? prev.map((x, i) => i === idx ? a : x) : [...prev, a];
      savePlayers(next);
      return next;
    });
  };

  const handleDeleteAthlete = (id) => {
    setAthletes(prev => {
      const next = prev.filter(x => x.id != id);
      savePlayers(next);
      const db = loadPostureDB(); delete db[String(id)]; savePostureDB(db);
      return next;
    });
  };

  const navBtnStyle = (p) => ({
    padding: "9px 20px", borderRadius: 50, border: "none",
    background: page === p ? "linear-gradient(135deg,#00e5ff,#0077ff)" : "rgba(255,255,255,0.04)",
    color: page === p ? "#07090f" : "#8899aa",
    fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
    transition: "all 0.2s",
  });

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#07090f", color: "#f0f4f8", minHeight: "100vh", position: "relative" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", background: "#00e5ff", filter: "blur(120px)", opacity: 0.05, top: -200, left: -100, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "#d500f9", filter: "blur(120px)", opacity: 0.05, bottom: 100, right: -100, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "clamp(12px,2vw,28px)" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#00e5ff,#0077ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", boxShadow: "0 0 30px rgba(0,229,255,0.25)" }}>🧍</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: 3, background: "linear-gradient(135deg,#fff 30%,#00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>POSTURALE</div>
              <div style={{ fontSize: "0.65rem", color: "#4d6070", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>Analisi Posturale · SPORTHUB</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 50, padding: 4 }}>
              <button style={navBtnStyle("postura")} onClick={() => setPage("postura")}>🧍 Posturale</button>
              <button style={navBtnStyle("atleti")} onClick={() => setPage("atleti")}>
                👥 Atleti
                {athletes.length > 0 && <span style={{ background: "#00e5ff", color: "#07090f", borderRadius: 50, padding: "0 6px", fontSize: "0.7rem", fontWeight: 900 }}>{athletes.length}</span>}
              </button>
            </div>
            <button onClick={() => setShowBackup(true)} title="Backup" style={{ width: 40, height: 40, borderRadius: 10, background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", color: "#8899aa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🗄</button>
          </div>
        </header>

        {/* Pages */}
        {page === "postura" && <PosturePage athletes={athletes} showToast={showToast} />}
        {page === "atleti" && <AthletesPage athletes={athletes} onSaveAthlete={handleSaveAthlete} onDeleteAthlete={handleDeleteAthlete} showToast={showToast} />}
      </div>

      {showBackup && <BackupModal athletes={athletes} onClose={() => setShowBackup(false)} onImport={() => setAthletes(loadPlayers())} showToast={showToast} />}
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: currentColor; cursor: pointer; }
        select option { background: #1a2230; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}
