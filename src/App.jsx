import { useState, useRef, useCallback } from "react";

const POSTURE_VIEWS = ["front", "back", "dx", "sx"];
const VIEW_LABELS = { front: "Frontale", back: "Posteriore", dx: "Laterale DX", sx: "Laterale SX" };
const VIEW_COLORS = { front: "#60a5fa", back: "#c084fc", dx: "#4ade80", sx: "#fb923c" };
const POSTURE_CHECKS = [
  { id: "shoulders", label: "Spalle" },
  { id: "hips",      label: "Anca" },
  { id: "knee_dx",   label: "Ginocchio DX" },
  { id: "knee_sx",   label: "Ginocchio SX" },
  { id: "ankle_dx",  label: "Caviglia DX" },
  { id: "ankle_sx",  label: "Caviglia SX" },
  { id: "spine",     label: "Colonna" },
  { id: "head",      label: "Testa" },
];

const loadPlayers    = () => { try { return JSON.parse(localStorage.getItem("sp_players") || "[]"); } catch { return []; } };
const savePlayers    = (a) => localStorage.setItem("sp_players", JSON.stringify(a));
const loadPostureDB  = () => { try { return JSON.parse(localStorage.getItem("sp_posture") || "{}"); } catch { return {}; } };
const savePostureDB  = (d) => localStorage.setItem("sp_posture", JSON.stringify(d));
const emptySession   = () => ({
  id: "s" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
  data: new Date().toISOString(),
  label: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }),
  checks: {}, notes: "",
  photos: { front: null, back: null, dx: null, sx: null },
  aiAnalysis: null,
});
const getAtletaData  = (pid) => {
  const db = loadPostureDB(), raw = db[String(pid)];
  if (!raw) return { sessioni: [] };
  if (raw.sessioni) return raw;
  return { sessioni: [{ ...emptySession(), checks: raw.checks || {}, notes: raw.notes || "", photos: raw.photos || {} }] };
};
const saveAtletaData = (pid, d) => { const db = loadPostureDB(); db[String(pid)] = d; savePostureDB(db); };
const calcAge = (dob) => { if (!dob) return null; const d = new Date(dob), now = new Date(); let a = now.getFullYear() - d.getFullYear(); if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
const calcBMI = (w, h) => w && h ? (w / ((h / 100) ** 2)).toFixed(1) : null;

const scColor = (v) => v <= 3 ? "#4ade80" : v <= 6 ? "#fb923c" : "#f87171";
const scLabel = (v) => v <= 3 ? "OK" : v <= 6 ? "Monitorare" : "Specialista";

const glass     = { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" };
const glassDark = { background: "rgba(10,16,32,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" };
const glassGlow = { background: "rgba(30,100,255,0.15)", border: "1px solid rgba(80,160,255,0.4)", borderRadius: 16, boxShadow: "0 0 24px rgba(30,120,255,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" };
const inputSt   = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "9px 14px", color: "#c8d8ff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: "none", width: "100%" };
const LBL       = { fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(150,180,255,0.5)" };

const BtnGhost = ({ children, onClick, style = {}, title, disabled }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{ padding: "7px 18px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: disabled ? "rgba(150,180,255,0.3)" : "rgba(200,215,255,0.8)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, transition: "all .2s", ...style }}>{children}</button>
);
const BtnPrimary = ({ children, onClick, style = {}, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: "8px 20px", borderRadius: 50, border: "none", background: disabled ? "rgba(59,130,246,0.2)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: disabled ? "rgba(150,180,255,0.4)" : "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: disabled ? "none" : "0 4px 16px rgba(59,130,246,0.4)", transition: "all .2s", ...style }}>{children}</button>
);

function Toast({ msg, type, visible }) {
  const col = { success: "#4ade80", error: "#f87171", info: "#93c5fd" }[type] || "#93c5fd";
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : 80}px)`, background: "rgba(10,16,32,0.95)", border: `1px solid ${col}50`, borderRadius: 50, padding: "11px 24px", fontSize: 13, fontWeight: 700, color: col, zIndex: 9000, transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap", backdropFilter: "blur(12px)" }}>
      {msg}
    </div>
  );
}

function PhotoCard({ view, photo, onPhotoLoad, onPhotoClear }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const handleFile = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = (ev) => onPhotoLoad(view, ev.target.result); r.readAsDataURL(file); e.target.value = ""; };
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file?.type.startsWith("image/")) { const r = new FileReader(); r.onload = (ev) => onPhotoLoad(view, ev.target.result); r.readAsDataURL(file); } };
  const col = VIEW_COLORS[view];
  return (
    <div style={{ ...glassDark, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: col }}>{VIEW_LABELS[view]}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <BtnGhost onClick={() => fileRef.current.click()} style={{ padding: "3px 9px", fontSize: 11 }}>📷</BtnGhost>
          {photo && <BtnGhost onClick={() => onPhotoClear(view)} style={{ padding: "3px 9px", fontSize: 11, color: "#f87171" }}>🗑</BtnGhost>}
        </div>
      </div>
      <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", background: dragging ? "rgba(59,130,246,0.08)" : "rgba(0,0,0,0.3)", transition: "background .2s" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        onClick={() => !photo && fileRef.current.click()}>
        {photo ? <img src={photo} alt={VIEW_LABELS[view]} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} /> : (
          <div style={{ textAlign: "center", color: "rgba(150,180,255,0.25)", padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 10, letterSpacing: 1 }}>{dragging ? "Rilascia qui" : "Clicca o trascina"}</div>
          </div>
        )}
        {dragging && <div style={{ position: "absolute", inset: 0, border: `2px dashed ${col}`, borderRadius: 14, pointerEvents: "none" }} />}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

function CheckSlider({ check, value, onChange }) {
  const v = value || 1, col = scColor(v), pct = ((v - 1) / 9 * 100).toFixed(1);
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(150,180,255,0.6)" }}>{check.label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 50, background: `${col}25`, color: col, border: `1px solid ${col}40` }}>{v} · {scLabel(v)}</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={v} onChange={(e) => onChange(check.id, parseInt(e.target.value))}
        style={{ width: "100%", height: 3, borderRadius: 2, outline: "none", cursor: "pointer", accentColor: col, background: `linear-gradient(to right,${col} ${pct}%,rgba(255,255,255,0.1) ${pct}%)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(150,180,255,0.3)", marginTop: 4 }}><span>OK</span><span>Monitorare</span><span>Specialista</span></div>
    </div>
  );
}

const GEMINI_API_KEY = "AIzaSyBaSmhZGePpdVPFdwHOaCmxAot4pTDXCto";  // <-- metti la tua chiave Gemini qui

function AIPanel({ session, athlete, onApplyAI }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(session.aiAnalysis || null);
  const [selView, setSelView]   = useState("front");
  const urgColor = (u) => u === "alta" ? "#f87171" : u === "media" ? "#fb923c" : "#4ade80";

  const runAI = async () => {
    const photo = session.photos?.[selView];
    if (!photo) { setError("Nessuna foto per la vista selezionata."); return; }
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "INCOLLA_QUI_LA_TUA_CHIAVE") { setError("Chiave API non configurata. Apri App.jsx e inserisci la tua chiave Gemini."); return; }
    setLoading(true); setError(null);
    const ctx = athlete ? `Atleta: ${athlete.name} ${athlete.surname}, sport: ${athlete.sport || "N/D"}, ruolo: ${athlete.ruolo || "portiere"}.` : "";
    const prompt = `Sei un esperto di analisi posturale sportiva. Analizza questa foto posturale (vista: ${VIEW_LABELS[selView]}) e restituisci SOLO JSON valido, senza markdown, senza backtick, senza testo aggiuntivo.
Struttura esatta:
{"view":"${selView}","summary":"sintesi postura max 2 righe","checks":{"shoulders":N,"hips":N,"knee_dx":N,"knee_sx":N,"ankle_dx":N,"ankle_sx":N,"spine":N,"head":N},"findings":["..."],"recommendations":["..."],"urgency":"bassa"}
Scala valutazione: 1-3 OK, 4-6 da monitorare, 7-10 visita specialista.
urgency: "bassa" | "media" | "alta"
${ctx}
Valuta solo ciò che è visibile dalla vista ${selView}.`;
    try {
      const b64 = photo.split(",")[1];
      const mt  = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mt, data: b64 } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message || "Errore Gemini API");
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      parsed.timestamp = new Date().toISOString();
      setResult(parsed); onApplyAI(parsed);
    } catch (e) { setError(e.message || "Errore analisi."); }
    setLoading(false);
  };

  return (
    <div style={{ ...glassGlow, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#3b82f6)", boxShadow: "0 0 16px rgba(16,185,129,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</div>
        <div><div style={{ fontWeight: 700, fontSize: 14, color: "#e0eaff" }}>Analisi AI posturale</div><div style={{ fontSize: 10, color: "rgba(150,180,255,0.5)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Gemini Vision · gratuito · lettura automatica</div></div>
        {result && <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 50, background: `${urgColor(result.urgency)}20`, color: urgColor(result.urgency), border: `1px solid ${urgColor(result.urgency)}40`, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>Urgenza: {result.urgency}</div>}
      </div>


      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {POSTURE_VIEWS.map(v => (
          <button key={v} onClick={() => setSelView(v)} style={{ padding: "5px 14px", borderRadius: 50, border: `1px solid ${selView === v ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)"}`, background: selView === v ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: selView === v ? "#93c5fd" : "rgba(180,200,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all .2s" }}>
            {VIEW_LABELS[v]}{session.photos?.[v] ? " ✓" : ""}
          </button>
        ))}
        <BtnPrimary onClick={runAI} disabled={loading || !session.photos?.[selView]} style={{ marginLeft: "auto", fontSize: 12, padding: "6px 18px" }}>
          {loading ? <><span style={{ display: "inline-block", animation: "spin .8s linear infinite" }}>⟳</span> Analisi...</> : "🤖 Analizza foto"}
        </BtnPrimary>
      </div>
      {!POSTURE_VIEWS.some(v => session.photos?.[v]) && <div style={{ textAlign: "center", padding: 16, color: "rgba(150,180,255,0.35)", fontSize: 12, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.08)" }}>Carica almeno una foto per usare l'analisi AI</div>}
      {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "#fca5a5", fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 14, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#bfdbfe", lineHeight: 1.6 }}>{result.summary}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
            {POSTURE_CHECKS.map(c => { const v = result.checks?.[c.id]; if (!v) return null; return (<div key={c.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif", color: scColor(v) }}>{v}</div><div style={{ fontSize: 9, color: "rgba(150,180,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{c.label}</div></div>); })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["📋 Evidenze", result.findings || [], "#fb923c", "rgba(251,146,60,0.5)"], ["✅ Raccomandazioni", result.recommendations || [], "#4ade80", "rgba(74,222,128,0.5)"]].map(([title, items, col, bdr]) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: col, marginBottom: 8 }}>{title}</div>
                {items.map((f, i) => <div key={i} style={{ fontSize: 11, color: "rgba(180,200,255,0.55)", padding: "3px 0 3px 10px", borderLeft: `2px solid ${bdr}`, marginBottom: 3, lineHeight: 1.5 }}>{f}</div>)}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "rgba(150,180,255,0.3)", textAlign: "right", marginTop: 8 }}>Analizzato: {new Date(result.timestamp).toLocaleString("it-IT")} · {VIEW_LABELS[result.view] || result.view}</div>
        </div>
      )}
    </div>
  );
}

function PosturePage({ athletes, showToast }) {
  const [selectedId, setSelectedId]   = useState(null);
  const [session, setSession]         = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [showStorico, setShowStorico] = useState(false);
  const athlete = athletes.find(a => a.id == selectedId);

  const loadPlayer = (pid) => {
    if (!pid) { setSession(null); setAllSessions([]); return; }
    const data = getAtletaData(String(pid));
    if (!data.sessioni.length) { const s = emptySession(); data.sessioni.push(s); saveAtletaData(String(pid), data); }
    setAllSessions(data.sessioni); setSession({ ...data.sessioni[data.sessioni.length - 1] });
  };

  const upd = (patch) => setSession(s => ({ ...s, ...patch }));

  const handleSave = (silent = false) => {
    if (!selectedId || !session) return;
    const data = getAtletaData(String(selectedId));
    const idx = data.sessioni.findIndex(s => s.id === session.id);
    if (idx >= 0) data.sessioni[idx] = session; else data.sessioni.push(session);
    saveAtletaData(String(selectedId), data); setAllSessions([...data.sessioni]);
    if (!silent) showToast("Sessione salvata ✓", "success");
  };

  const handleNewSession = () => {
    handleSave(true); const s = emptySession();
    const data = getAtletaData(String(selectedId)); data.sessioni.push(s); saveAtletaData(String(selectedId), data);
    setAllSessions([...data.sessioni]); setSession({ ...s }); showToast("Nuova sessione creata");
  };

  const vals = Object.values(session?.checks || {}), fotos = POSTURE_VIEWS.filter(v => session?.photos?.[v]).length;

  return (
    <div>
      <div style={{ ...glass, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={LBL}>⬤ Atleta</span>
        <select value={selectedId || ""} onChange={e => { setSelectedId(e.target.value || null); loadPlayer(e.target.value || null); }} style={{ ...inputSt, flex: 1, maxWidth: 320, borderRadius: 50, padding: "9px 18px" }}>
          <option value="">— Seleziona un atleta —</option>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.surname} {a.name}{a.ruolo ? ` · ${a.ruolo}` : ""}</option>)}
        </select>
        {athlete && <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px 6px 8px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: 50, fontSize: 12, fontWeight: 700, color: "#93c5fd" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 6px #3b82f6", display: "inline-block" }} />{athlete.surname} {athlete.name}</span>}
        {session && <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <BtnGhost onClick={() => setShowStorico(true)} style={{ fontSize: 12, padding: "6px 14px" }}>📋 {allSessions.length} sess.</BtnGhost>
          <BtnGhost onClick={handleNewSession} style={{ fontSize: 12, padding: "6px 14px" }}>+ Nuova</BtnGhost>
          <BtnPrimary onClick={() => handleSave(false)} style={{ fontSize: 12, padding: "6px 18px" }}>💾 Salva</BtnPrimary>
        </div>}
      </div>

      {!selectedId && <div style={{ textAlign: "center", padding: "80px 20px", ...glass }}><div style={{ fontSize: 48, marginBottom: 14, opacity: 0.12 }}>🧍</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: 3, color: "rgba(180,200,255,0.4)", marginBottom: 8 }}>Seleziona un atleta</div><div style={{ color: "rgba(150,180,255,0.3)", fontSize: 13 }}>Scegli un atleta per la scheda posturale</div></div>}

      {session && <>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[["foto", `${fotos}/4`, "#60a5fa"], ["OK", vals.filter(v => v <= 3).length, "#4ade80"], ["monitorare", vals.filter(v => v > 3 && v <= 6).length, "#fb923c"], ["specialista", vals.filter(v => v > 6).length, "#f87171"]].map(([label, val, col]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 50, fontSize: 12, color: "rgba(180,200,255,0.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: col }}>{val}</span> {label}
            </div>
          ))}
        </div>
        <AIPanel session={session} athlete={athlete} onApplyAI={(r) => { const c = { ...session.checks }; Object.entries(r.checks || {}).forEach(([k, v]) => { c[k] = v; }); upd({ checks: c, aiAnalysis: r }); showToast("Valutazioni AI applicate ✓", "success"); }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {POSTURE_VIEWS.map(v => <PhotoCard key={v} view={v} photo={session.photos?.[v]} onPhotoLoad={(view, src) => upd({ photos: { ...session.photos, [view]: src } })} onPhotoClear={(view) => upd({ photos: { ...session.photos, [view]: null } })} />)}
        </div>
        <div style={{ ...glass, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ ...LBL, marginBottom: 14 }}>▸ Valutazione distretti corporei</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {POSTURE_CHECKS.map(c => <CheckSlider key={c.id} check={c} value={session.checks?.[c.id]} onChange={(id, val) => upd({ checks: { ...session.checks, [id]: val } })} />)}
          </div>
        </div>
        <div style={{ ...glass, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ ...LBL, marginBottom: 10 }}>▸ Note cliniche</div>
          <textarea value={session.notes || ""} onChange={e => upd({ notes: e.target.value })} placeholder="Osservazioni, indicazioni, note per il portiere..." style={{ ...inputSt, resize: "vertical", minHeight: 90, borderRadius: 14 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <BtnPrimary onClick={() => handleSave(false)} style={{ padding: "11px 36px", fontSize: 15 }}>💾 Salva sessione</BtnPrimary>
        </div>
      </>}

      {showStorico && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowStorico(false)}>
          <div style={{ background: "rgba(12,20,40,0.97)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 24, width: "100%", maxWidth: 500, maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e0eaff" }}>Storico sessioni — {athlete?.surname} {athlete?.name}</div>
              <BtnGhost onClick={() => setShowStorico(false)} style={{ padding: "4px 10px" }}>✕</BtnGhost>
            </div>
            {[...allSessions].reverse().map(s => {
              const vs = Object.values(s.checks || {}), isCur = s.id === session?.id;
              return (
                <div key={s.id} style={{ background: isCur ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${isCur ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#e0eaff" }}>{s.label}{isCur && <span style={{ fontSize: 10, color: "#93c5fd", marginLeft: 8 }}>● corrente</span>}</div><div style={{ fontSize: 10, color: "rgba(150,180,255,0.4)", marginTop: 2 }}>{new Date(s.data).toLocaleDateString("it-IT")} · {POSTURE_VIEWS.filter(v => s.photos?.[v]).length}/4 foto</div></div>
                    {!isCur && <><BtnGhost onClick={() => { handleSave(true); setSession({ ...s }); setShowStorico(false); }} style={{ padding: "4px 12px", fontSize: 11 }}>👁 Carica</BtnGhost><BtnGhost onClick={() => { const data = getAtletaData(String(selectedId)); data.sessioni = data.sessioni.filter(x => x.id !== s.id); if (!data.sessioni.length) data.sessioni.push(emptySession()); saveAtletaData(String(selectedId), data); setAllSessions([...data.sessioni]); if (session?.id === s.id) setSession({ ...data.sessioni[data.sessioni.length - 1] }); }} style={{ padding: "4px 10px", fontSize: 11, color: "#f87171" }}>🗑</BtnGhost></>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>{[["OK", vs.filter(v => v <= 3).length, "#4ade80"], ["Att", vs.filter(v => v > 3 && v <= 6).length, "#fb923c"], ["Crit", vs.filter(v => v > 6).length, "#f87171"]].map(([l, n, c]) => <span key={l} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 50, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: c }}>{n} {l}</span>)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AthleteForm({ athlete, onSave, onCancel }) {
  const [form, setForm] = useState({ name: athlete?.name || "", surname: athlete?.surname || "", dob: athlete?.dob || "", gender: athlete?.gender || "", peso: athlete?.peso || "", altezza: athlete?.altezza || "", sport: athlete?.sport || "", ruolo: athlete?.ruolo || "", categoria: athlete?.categoria || "", club: athlete?.club || "", note: athlete?.note || "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const bmi = calcBMI(form.peso, form.altezza);
  const F = ({ label: l, k, ...p }) => (<div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(150,180,255,0.45)" }}>{l}</label><input value={form[k]} onChange={e => set(k, e.target.value)} style={inputSt} {...p} /></div>);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <BtnGhost onClick={onCancel} style={{ padding: "6px 14px" }}>← Indietro</BtnGhost>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.7rem", letterSpacing: 3, color: "#e0eaff" }}>{athlete ? "Modifica Atleta" : "Nuovo Atleta"}</div>
      </div>
      <div style={{ ...glass, padding: "16px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Dati Anagrafici</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label="Nome *" k="name" placeholder="Mario" /><F label="Cognome *" k="surname" placeholder="Rossi" />
          <F label="Data di nascita" k="dob" type="date" />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(150,180,255,0.45)" }}>Genere</label><select value={form.gender} onChange={e => set("gender", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}><option value="">—</option><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
          <F label="Peso (kg)" k="peso" type="number" placeholder="70" /><F label="Altezza (cm)" k="altezza" type="number" placeholder="175" />
        </div>
        {bmi && <div style={{ marginTop: 10, padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10, fontSize: 12, color: "rgba(180,200,255,0.5)" }}>BMI: <span style={{ color: "#60a5fa", fontWeight: 800, fontFamily: "monospace" }}>{bmi}</span></div>}
      </div>
      <div style={{ ...glass, padding: "16px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Dati Sportivi</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label="Sport" k="sport" placeholder="Calcio" /><F label="Ruolo" k="ruolo" placeholder="Portiere" />
          <F label="Categoria" k="categoria" placeholder="Under 18" /><F label="Club" k="club" placeholder="A.C. Roma" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}><label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(150,180,255,0.45)" }}>Note / Anamnesi</label><textarea value={form.note} onChange={e => set("note", e.target.value)} placeholder="Infortuni, patologie, obiettivi..." style={{ ...inputSt, resize: "vertical", minHeight: 80, borderRadius: 14 }} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <BtnGhost onClick={onCancel} style={{ flex: 1, justifyContent: "center" }}>Annulla</BtnGhost>
        <BtnPrimary onClick={() => { if (!form.name.trim() || !form.surname.trim()) return; onSave({ id: athlete?.id || Date.now(), ...form, bmi, age: calcAge(form.dob), createdAt: athlete?.createdAt || new Date().toISOString() }); }} style={{ flex: 1, justifyContent: "center" }}>✓ Salva atleta</BtnPrimary>
      </div>
    </div>
  );
}

function AthletesPage({ athletes, onSave, onDelete, showToast }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch]   = useState("");
  if (editing !== null) return <AthleteForm athlete={editing.id ? editing : null} onSave={a => { onSave(a); setEditing(null); showToast(a.id ? "Atleta aggiornato ✓" : "Atleta aggiunto ✓", "success"); }} onCancel={() => setEditing(null)} />;
  const filtered = athletes.filter(a => !search || [a.name, a.surname, a.sport, a.ruolo, a.club].join(" ").toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: 3, color: "#e0eaff" }}>Atleti</div><div style={{ fontSize: 11, color: "rgba(150,180,255,0.4)" }}>{athletes.length} atleti registrati</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cerca..." style={{ ...inputSt, width: 160, borderRadius: 50, padding: "8px 16px" }} />
          <BtnPrimary onClick={() => setEditing({})}>+ Nuovo atleta</BtnPrimary>
        </div>
      </div>
      {!athletes.length ? (
        <div style={{ textAlign: "center", padding: "80px 20px", ...glass }}><div style={{ fontSize: 48, marginBottom: 14, opacity: 0.12 }}>👥</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: 3, color: "rgba(180,200,255,0.35)", marginBottom: 8 }}>Nessun atleta</div><div style={{ color: "rgba(150,180,255,0.3)", fontSize: 13, marginBottom: 20 }}>Registra il tuo primo atleta</div><BtnPrimary onClick={() => setEditing({})}>+ Registra atleta</BtnPrimary></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {filtered.map(a => {
            const ini = (a.name[0] || "") + (a.surname[0] || ""), sc = getAtletaData(String(a.id)).sessioni.length;
            const tags = [a.sport && `🏅 ${a.sport}`, a.ruolo && `⚡ ${a.ruolo}`, a.club && `🏟 ${a.club}`].filter(Boolean);
            return (
              <div key={a.id} style={{ ...glass, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: "0 0 12px rgba(59,130,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>{ini}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <BtnGhost onClick={() => setEditing(a)} style={{ padding: "3px 9px", fontSize: 11 }}>✏️</BtnGhost>
                    <BtnGhost onClick={() => { if (confirm(`Eliminare ${a.name} ${a.surname}?`)) { onDelete(a.id); showToast("Atleta eliminato", "error"); } }} style={{ padding: "3px 9px", fontSize: 11, color: "#f87171" }}>🗑</BtnGhost>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#e0eaff", marginBottom: 2 }}>{a.surname} {a.name}</div>
                {a.dob && <div style={{ fontSize: 11, color: "rgba(150,180,255,0.4)", marginBottom: 8 }}>{new Date(a.dob).toLocaleDateString("it-IT")}{a.age ? ` · ${a.age} anni` : ""}</div>}
                <div style={{ marginBottom: 10 }}>{tags.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 50, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(180,200,255,0.5)", marginRight: 4, display: "inline-block", marginBottom: 4 }}>{t}</span>)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, textAlign: "center" }}>
                  {[["peso", a.peso ? a.peso + " kg" : "—", "#60a5fa"], ["altezza", a.altezza ? a.altezza + " cm" : "—", "#fb923c"], ["schede", sc, "#4ade80"]].map(([l, val, col]) => (
                    <div key={l}><div style={{ fontWeight: 800, fontSize: 13, color: col }}>{val}</div><div style={{ fontSize: 9, color: "rgba(150,180,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BackupModal({ athletes, onClose, onImport, showToast }) {
  const fileRef = useRef(null), lastBackup = localStorage.getItem("sp_last_bk");
  const doExport = () => { const data = { _format: "sporthub_v2", exportedAt: new Date().toISOString(), athletes, postureData: loadPostureDB() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `SPORTHUB_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); localStorage.setItem("sp_last_bk", new Date().toISOString()); showToast("Backup esportato ✓", "success"); onClose(); };
  const doImport = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = (ev) => { try { const data = JSON.parse(ev.target.result), ath = data.athletes || data.players; if (!ath || !Array.isArray(ath)) throw new Error(); if (!confirm(`Ripristinare ${ath.length} atleti?`)) return; savePlayers(ath); if (data.postureData) savePostureDB(data.postureData); onImport(); showToast(`Ripristinati ${ath.length} atleti ✓`, "success"); onClose(); } catch { showToast("File non valido", "error"); } }; r.readAsText(file); e.target.value = ""; };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "rgba(12,20,40,0.97)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><div style={{ fontWeight: 700, fontSize: 15, color: "#e0eaff" }}>Backup & Ripristino</div><BtnGhost onClick={onClose} style={{ padding: "4px 10px" }}>✕</BtnGhost></div>
        {lastBackup && <div style={{ fontSize: 11, color: "rgba(150,180,255,0.4)", marginBottom: 14 }}>Ultimo backup: {new Date(lastBackup).toLocaleString("it-IT")}</div>}
        <BtnPrimary onClick={doExport} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>⬇ Esporta backup completo</BtnPrimary>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 14, padding: 13, fontSize: 13, color: "rgba(180,200,255,0.5)" }}>⬆ Importa backup (.json)<input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={doImport} /></label>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage]         = useState("postura");
  const [athletes, setAthletes] = useState(loadPlayers);
  const [showBackup, setShowBackup] = useState(false);
  const [toast, setToast]       = useState({ msg: "", type: "", visible: false });
  const toastTimer              = useRef(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  const handleSave = (a) => setAthletes(prev => { const idx = prev.findIndex(x => x.id === a.id); const next = idx >= 0 ? prev.map((x, i) => i === idx ? a : x) : [...prev, a]; savePlayers(next); return next; });
  const handleDelete = (id) => setAthletes(prev => { const next = prev.filter(x => x.id != id); savePlayers(next); const db = loadPostureDB(); delete db[String(id)]; savePostureDB(db); return next; });

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "linear-gradient(135deg,#0a0e1a 0%,#0d1528 40%,#0a1020 70%,#060a14 100%)", color: "#f0f4f8", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(30,120,255,0.18) 0%,transparent 70%)", top: -150, left: -100, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,200,255,0.12) 0%,transparent 70%)", bottom: -80, right: -60, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "clamp(12px,2vw,24px)" }}>
        <header style={{ ...glass, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: "0 0 14px rgba(59,130,246,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧍</div>
            <div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", letterSpacing: 3, color: "#e0eaff" }}>SPORTHUB</div><div style={{ fontSize: 10, color: "rgba(150,180,255,0.4)", letterSpacing: "2px", textTransform: "uppercase" }}>Analisi Posturale · AI</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 50 }}>
              {["postura", "atleti"].map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ padding: "7px 18px", borderRadius: 50, border: page === p ? "1px solid rgba(59,130,246,0.4)" : "none", background: page === p ? "rgba(59,130,246,0.25)" : "transparent", color: page === p ? "#93c5fd" : "rgba(180,200,255,0.5)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .2s" }}>
                  {p === "postura" ? "🧍 Posturale" : <>👥 Atleti{athletes.length > 0 && <span style={{ marginLeft: 6, background: "rgba(59,130,246,0.3)", color: "#93c5fd", borderRadius: 50, padding: "0 6px", fontSize: 10, fontWeight: 800 }}>{athletes.length}</span>}</>}
                </button>
              ))}
            </div>
            <BtnGhost onClick={() => setShowBackup(true)} title="Backup" style={{ padding: "7px 12px" }}>🗄</BtnGhost>
          </div>
        </header>
        {page === "postura" && <PosturePage athletes={athletes} showToast={showToast} />}
        {page === "atleti" && <AthletesPage athletes={athletes} onSave={handleSave} onDelete={handleDelete} showToast={showToast} />}
      </div>
      {showBackup && <BackupModal athletes={athletes} onClose={() => setShowBackup(false)} onImport={() => setAthletes(loadPlayers())} showToast={showToast} />}
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #1a2230; }
        input[type=range] { -webkit-appearance: none; appearance: none; border-radius: 2px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: currentColor; cursor: pointer; box-shadow: 0 0 6px currentColor; }
        textarea::placeholder, input::placeholder { color: rgba(150,180,255,0.2); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
