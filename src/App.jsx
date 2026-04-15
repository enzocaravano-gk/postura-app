import { useState, useRef, useCallback } from "react";

const POSTURE_VIEWS = ["front", "back", "dx", "sx"];
const VIEW_LABELS   = { front: "Frontale", back: "Posteriore", dx: "Laterale DX", sx: "Laterale SX" };
const VIEW_COLORS   = { front: "#3b82f6", back: "#8b5cf6", dx: "#10b981", sx: "#f59e0b" };
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

const loadPlayers   = () => { try { return JSON.parse(localStorage.getItem("sp_players") || "[]"); } catch { return []; } };
const savePlayers   = (a) => localStorage.setItem("sp_players", JSON.stringify(a));
const loadPostureDB = () => { try { return JSON.parse(localStorage.getItem("sp_posture") || "{}"); } catch { return {}; } };
const savePostureDB = (d) => localStorage.setItem("sp_posture", JSON.stringify(d));
const emptySession  = () => ({
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
const saveAtletaData = (pid, d) => { const db = loadPostureDB(); db[String(pid)] = d; savePostureDB(d); };
const calcAge = (dob) => { if (!dob) return null; const d = new Date(dob), now = new Date(); let a = now.getFullYear() - d.getFullYear(); if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
const calcBMI = (w, h) => w && h ? (w / ((h / 100) ** 2)).toFixed(1) : null;
const scColor = (v) => v <= 3 ? "#10b981" : v <= 6 ? "#f59e0b" : "#ef4444";
const scLabel = (v) => v <= 3 ? "OK" : v <= 6 ? "Monitorare" : "Specialista";

const TD = {
  bg: "linear-gradient(135deg,#0a0e1a 0%,#0d1528 40%,#0a1020 70%,#060a14 100%)",
  glass: { background:"rgba(255,255,255,0.06)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:18, boxShadow:"0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" },
  glassDark: { background:"rgba(10,16,32,0.75)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, boxShadow:"0 4px 20px rgba(0,0,0,0.4)" },
  glassGlow: { background:"rgba(30,100,255,0.15)", border:"1px solid rgba(80,160,255,0.4)", borderRadius:14, boxShadow:"0 0 24px rgba(30,120,255,0.2)" },
  text:"#e8f0ff", textSub:"rgba(150,180,255,0.6)", textHint:"rgba(120,150,200,0.4)",
  inputBg:"rgba(255,255,255,0.05)", inputBorder:"rgba(255,255,255,0.1)", inputColor:"#c8d8ff",
  cardBg:"rgba(255,255,255,0.04)", cardBorder:"rgba(255,255,255,0.08)",
  rangeBg:"rgba(255,255,255,0.1)", navBg:"rgba(255,255,255,0.04)", navBorder:"rgba(255,255,255,0.08)",
  modalBg:"rgba(12,20,40,0.97)", modalBorder:"rgba(255,255,255,0.12)",
  btnGhostBg:"rgba(255,255,255,0.07)", btnGhostBdr:"rgba(255,255,255,0.12)", btnGhostCol:"rgba(200,215,255,0.85)",
  statBg:"rgba(255,255,255,0.05)", statBorder:"rgba(255,255,255,0.09)",
  phBg:"rgba(0,0,0,0.3)", phText:"rgba(150,180,255,0.25)",
  scrollThumb:"rgba(255,255,255,0.1)", selectOpt:"#1a2230", placeholder:"rgba(150,180,255,0.2)",
};
const TL = {
  bg: "linear-gradient(135deg,#e8f0fe 0%,#f0f4ff 40%,#eaf1ff 70%,#dde8ff 100%)",
  glass: { background:"rgba(255,255,255,0.8)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(100,130,200,0.22)", borderRadius:18, boxShadow:"0 8px 32px rgba(60,80,160,0.1), inset 0 1px 0 rgba(255,255,255,0.9)" },
  glassDark: { background:"rgba(255,255,255,0.65)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(100,130,200,0.18)", borderRadius:14, boxShadow:"0 4px 20px rgba(60,80,160,0.08)" },
  glassGlow: { background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.28)", borderRadius:14, boxShadow:"0 0 20px rgba(59,130,246,0.1)" },
  text:"#1a2540", textSub:"#4a5a80", textHint:"#8a9ab8",
  inputBg:"rgba(255,255,255,0.85)", inputBorder:"rgba(100,130,200,0.25)", inputColor:"#1a2540",
  cardBg:"rgba(255,255,255,0.65)", cardBorder:"rgba(100,130,200,0.16)",
  rangeBg:"rgba(100,130,200,0.15)", navBg:"rgba(255,255,255,0.55)", navBorder:"rgba(100,130,200,0.2)",
  modalBg:"rgba(240,245,255,0.98)", modalBorder:"rgba(100,130,200,0.2)",
  btnGhostBg:"rgba(255,255,255,0.75)", btnGhostBdr:"rgba(100,130,200,0.25)", btnGhostCol:"#3a4a70",
  statBg:"rgba(255,255,255,0.65)", statBorder:"rgba(100,130,200,0.18)",
  phBg:"rgba(200,215,255,0.2)", phText:"rgba(100,130,200,0.5)",
  scrollThumb:"rgba(100,130,200,0.2)", selectOpt:"#f0f4ff", placeholder:"rgba(100,130,200,0.4)",
};

const compressImage = (b64, maxW = 900) => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const r = Math.min(1, maxW / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    res(c.toDataURL("image/jpeg", 0.82));
  };
  img.src = b64;
});

async function exportPDF(athlete, session) {
  if (!window.jspdf) { alert("Libreria PDF non caricata, riprova tra un secondo."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210, M=14, CW=W-M*2;
  const blue=[37,99,235], dark=[20,30,60], gray=[100,120,160], lightBg=[240,245,255];
  const green=[16,185,129], orange=[245,158,11], red=[239,68,68];
  const scC = v => v<=3?green:v<=6?orange:red;

  doc.setFillColor(...blue); doc.rect(0,0,W,22,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(16);
  doc.text("SPORTHUB",M,14);
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.text("ANALISI POSTURALE",M+44,14);
  doc.text(new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"}),W-M,14,{align:"right"});

  let y=30;
  if(athlete){
    doc.setFillColor(...lightBg); doc.roundedRect(M,y,CW,28,3,3,"F");
    doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,28,3,3,"S");
    doc.setFillColor(...blue); doc.circle(M+9,y+14,7,"F");
    const ini=((athlete.name?.[0]||"")+(athlete.surname?.[0]||"")).toUpperCase();
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text(ini,M+9,y+17,{align:"center"});
    doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text(`${athlete.surname||""} ${athlete.name||""}`,M+21,y+11);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...gray);
    doc.text([athlete.sport,athlete.ruolo,athlete.categoria,athlete.club].filter(Boolean).join(" · ")||"Atleta",M+21,y+18);
    doc.text([athlete.age?`${athlete.age} anni`:null,athlete.peso?`${athlete.peso} kg`:null,athlete.altezza?`${athlete.altezza} cm`:null,athlete.bmi?`BMI ${athlete.bmi}`:null].filter(Boolean).join("   "),M+21,y+25);
    y+=35;
  }

  doc.setTextColor(...gray); doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.text(`Sessione: ${session.label}`,M,y); y+=8;

  doc.setFillColor(...blue); doc.rect(M,y,CW,7,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  doc.text("VALUTAZIONE DISTRETTI CORPOREI",M+3,y+5); y+=11;

  const cols=4, bW=CW/cols, bH=18;
  POSTURE_CHECKS.forEach((c,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const x=M+col*bW, by=y+row*(bH+2), v=session.checks?.[c.id]||1, cc=scC(v);
    doc.setFillColor(248,250,255); doc.roundedRect(x,by,bW-1,bH,2,2,"F");
    doc.setDrawColor(...cc); doc.setLineWidth(0.4); doc.roundedRect(x,by,bW-1,bH,2,2,"S");
    doc.setFillColor(...cc); doc.roundedRect(x,by,3,bH,2,2,"F"); doc.rect(x,by,1.5,bH,"F");
    doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text(String(v),x+bW/2,by+10,{align:"center"});
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text(c.label,x+bW/2,by+15,{align:"center"});
  });
  y+=Math.ceil(POSTURE_CHECKS.length/cols)*(bH+2)+6;

  if(session.aiAnalysis?.summary){
    doc.setFillColor(239,246,255); doc.roundedRect(M,y,CW,18,3,3,"F");
    doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,18,3,3,"S");
    doc.setTextColor(...blue); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    doc.text("ANALISI AI",M+3,y+5);
    doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(session.aiAnalysis.summary,CW-6).slice(0,2),M+3,y+11);
    y+=22;
  }

  if(session.aiAnalysis?.findings?.length||session.aiAnalysis?.recommendations?.length){
    const hw=(CW-4)/2;
    [["EVIDENZE",session.aiAnalysis.findings||[],orange],["RACCOMANDAZIONI",session.aiAnalysis.recommendations||[],green]].forEach(([title,items,col],idx)=>{
      if(!items.length)return;
      const fx=M+idx*(hw+4), bh=8+items.length*7;
      doc.setFillColor(252,252,255); doc.roundedRect(fx,y,hw,bh,2,2,"F");
      doc.setDrawColor(...col); doc.setLineWidth(0.3); doc.roundedRect(fx,y,hw,bh,2,2,"S");
      doc.setFillColor(...col); doc.rect(fx,y,2.5,bh,"F");
      doc.setTextColor(...col); doc.setFont("helvetica","bold"); doc.setFontSize(7);
      doc.text(title,fx+5,y+5.5);
      doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      items.slice(0,4).forEach((item,ii)=>{ doc.text(doc.splitTextToSize(`• ${item}`,hw-8)[0],fx+5,y+11+ii*7); });
    });
    y+=Math.max(8+(session.aiAnalysis.findings?.length||0)*7,8+(session.aiAnalysis.recommendations?.length||0)*7)+6;
  }

  if(session.notes?.trim()){
    doc.setFillColor(248,250,255); doc.roundedRect(M,y,CW,22,3,3,"F");
    doc.setDrawColor(...gray); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,22,3,3,"S");
    doc.setTextColor(...gray); doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    doc.text("NOTE CLINICHE",M+3,y+5);
    doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(session.notes,CW-6).slice(0,3),M+3,y+11);
    y+=26;
  }

  const photoViews=POSTURE_VIEWS.filter(v=>session.photos?.[v]);
  if(photoViews.length){
    doc.addPage();
    doc.setFillColor(...blue); doc.rect(0,0,W,14,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text("SPORTHUB · ANALISI FOTOGRAFICA POSTURALE",M,9.5);
    const imgW=(CW-4)/2, imgH=imgW*1.35;
    for(let i=0;i<photoViews.length;i++){
      const v=photoViews[i], c2=i%2, r2=Math.floor(i/2);
      const fx=M+c2*(imgW+4), fy=20+r2*(imgH+14);
      doc.setFillColor(240,245,255); doc.roundedRect(fx,fy,imgW,8,2,2,"F");
      doc.setDrawColor(...blue); doc.setLineWidth(0.2); doc.roundedRect(fx,fy,imgW,8,2,2,"S");
      doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.text(VIEW_LABELS[v],fx+3,fy+5.5);
      try{ const cmp=await compressImage(session.photos[v],600); doc.addImage(cmp,"JPEG",fx,fy+8,imgW,imgH,undefined,"FAST"); }catch{}
    }
  }

  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setDrawColor(220,228,240); doc.setLineWidth(0.3); doc.line(M,286,W-M,286);
    doc.setTextColor(...gray); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text("Screening visivo — non sostituisce valutazione specialistica",M,291);
    doc.text(`${i} / ${pages}`,W-M,291,{align:"right"});
  }

  const nm=athlete?`${athlete.surname}_${athlete.name}`:"Atleta";
  doc.save(`SPORTHUB_${nm}_${new Date().toISOString().slice(0,10)}.pdf`);
}

function Toast({ msg, type, visible }) {
  const col = { success:"#10b981", error:"#ef4444", info:"#3b82f6" }[type]||"#3b82f6";
  return <div style={{ position:"fixed", bottom:28, left:"50%", transform:`translateX(-50%) translateY(${visible?0:80}px)`, background:"rgba(10,16,32,0.95)", border:`1px solid ${col}60`, borderRadius:50, padding:"11px 24px", fontSize:13, fontWeight:700, color:col, zIndex:9000, transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)", whiteSpace:"nowrap", backdropFilter:"blur(12px)" }}>{msg}</div>;
}

const BtnGhost = ({ children, onClick, style={}, title, disabled, t }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{ padding:"7px 18px", borderRadius:50, border:`1px solid ${(t||TD).btnGhostBdr}`, background:(t||TD).btnGhostBg, color:disabled?(t||TD).textHint:(t||TD).btnGhostCol, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, cursor:disabled?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:7, transition:"all .2s", ...style }}>{children}</button>
);
const BtnPrimary = ({ children, onClick, style={}, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding:"8px 20px", borderRadius:50, border:"none", background:disabled?"rgba(59,130,246,0.2)":"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:disabled?"rgba(150,180,255,0.4)":"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, cursor:disabled?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:7, boxShadow:disabled?"none":"0 4px 16px rgba(59,130,246,0.4)", transition:"all .2s", ...style }}>{children}</button>
);

function PhotoCard({ view, photo, onPhotoLoad, onPhotoClear, t }) {
  const th = t || TD;
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const load = (e) => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>onPhotoLoad(view,ev.target.result); r.readAsDataURL(f); e.target.value=""; };
  const drop = (e) => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f?.type.startsWith("image/")){ const r=new FileReader(); r.onload=ev=>onPhotoLoad(view,ev.target.result); r.readAsDataURL(f); } };
  const col = VIEW_COLORS[view];
  return (
    <div style={{ ...th.glassDark, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", borderBottom:`1px solid ${th.cardBorder}` }}>
        <span style={{ fontSize:11, fontWeight:700, color:col }}>{VIEW_LABELS[view]}</span>
        <div style={{ display:"flex", gap:4 }}>
          <BtnGhost t={th} onClick={()=>fileRef.current.click()} style={{ padding:"2px 8px", fontSize:11 }}>📷</BtnGhost>
          {photo && <BtnGhost t={th} onClick={()=>onPhotoClear(view)} style={{ padding:"2px 8px", fontSize:11, color:"#ef4444" }}>🗑</BtnGhost>}
        </div>
      </div>
      <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", background:drag?"rgba(59,130,246,0.08)":th.phBg, transition:"background .2s" }}
        onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={drop}
        onClick={()=>!photo&&fileRef.current.click()}>
        {photo
          ? <img src={photo} alt={VIEW_LABELS[view]} style={{ width:"100%", height:"100%", objectFit:"contain", position:"absolute", inset:0 }} />
          : <div style={{ textAlign:"center", color:th.phText, padding:16 }}><div style={{ fontSize:24, marginBottom:5 }}>📷</div><div style={{ fontSize:10 }}>{drag?"Rilascia qui":"Clicca o trascina"}</div></div>
        }
        {drag && <div style={{ position:"absolute", inset:0, border:`2px dashed ${col}`, borderRadius:12, pointerEvents:"none" }} />}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={load} />
    </div>
  );
}

function CheckSlider({ check, value, onChange, t }) {
  const th = t || TD;
  const v = value || 1, col = scColor(v), pct = ((v-1)/9*100).toFixed(1);
  return (
    <div style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:12, padding:"11px 13px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.5, color:th.textSub }}>{check.label}</span>
        <span style={{ fontSize:11, fontWeight:800, padding:"2px 9px", borderRadius:50, background:`${col}20`, color:col, border:`1px solid ${col}40` }}>{v} · {scLabel(v)}</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={v} onChange={e=>onChange(check.id,parseInt(e.target.value))}
        style={{ width:"100%", height:3, borderRadius:2, outline:"none", cursor:"pointer", accentColor:col, background:`linear-gradient(to right,${col} ${pct}%,${th.rangeBg} ${pct}%)` }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:th.textHint, marginTop:4 }}><span>OK</span><span>Monitorare</span><span>Specialista</span></div>
    </div>
  );
}

function AIPanel({ session, athlete, onApplyAI, t }) {
  const th = t || TD;
  const [loading,setLoading]=useState(false), [error,setError]=useState(null);
  const [result,setResult]=useState(session.aiAnalysis||null);
  const [selV,setSelV]=useState("front");
  const urgColor = u => u==="alta"?"#ef4444":u==="media"?"#f59e0b":"#10b981";

  const runAI = async () => {
    const photo = session.photos?.[selV];
    if(!photo){ setError("Nessuna foto per questa vista."); return; }
    setLoading(true); setError(null);
    const ctx = athlete?`Atleta: ${athlete.name} ${athlete.surname}, sport:${athlete.sport||"N/D"}, ruolo:${athlete.ruolo||"portiere"}.`:"";
    const sys = `Sei un esperto di analisi posturale sportiva. Analizza la foto e restituisci SOLO JSON valido, senza markdown, senza backtick.\n{"view":"${selV}","summary":"sintesi max 2 righe","checks":{"shoulders":N,"hips":N,"knee_dx":N,"knee_sx":N,"ankle_dx":N,"ankle_sx":N,"spine":N,"head":N},"findings":["..."],"recommendations":["..."],"urgency":"bassa"}\nScala:1-3 OK,4-6 monitorare,7-10 specialista. urgency:bassa|media|alta. ${ctx} Valuta solo ciò visibile da vista ${selV}.`;
    try {
      const cmp = await compressImage(photo, 900);
      const b64 = cmp.split(",")[1];
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1024, system:sys,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},
            {type:"text",text:`Analizza vista ${VIEW_LABELS[selV]} e restituisci il JSON.`}
          ]}]
        })
      });
      const data = await resp.json();
      if(data.error) throw new Error(data.error.message||"Errore API");
      const text = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      parsed.timestamp = new Date().toISOString();
      setResult(parsed); onApplyAI(parsed);
    } catch(e){ setError(e.message||"Errore analisi."); }
    setLoading(false);
  };

  return (
    <div style={{ ...th.glassGlow, padding:"15px 17px", marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:12 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#10b981)", boxShadow:"0 0 14px rgba(59,130,246,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🤖</div>
        <div><div style={{ fontWeight:700, fontSize:13, color:th.text }}>Analisi AI posturale</div><div style={{ fontSize:10, color:th.textSub, letterSpacing:1, textTransform:"uppercase" }}>Claude Vision · analisi automatica</div></div>
        {result && <div style={{ marginLeft:"auto", padding:"3px 11px", borderRadius:50, background:`${urgColor(result.urgency)}18`, color:urgColor(result.urgency), border:`1px solid ${urgColor(result.urgency)}40`, fontSize:11, fontWeight:800 }}>Urgenza: {result.urgency}</div>}
      </div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
        {POSTURE_VIEWS.map(v=>(
          <button key={v} onClick={()=>setSelV(v)} style={{ padding:"4px 12px", borderRadius:50, border:`1px solid ${selV===v?"rgba(59,130,246,0.6)":th.cardBorder}`, background:selV===v?"rgba(59,130,246,0.18)":"transparent", color:selV===v?"#3b82f6":th.textSub, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {VIEW_LABELS[v]}{session.photos?.[v]?" ✓":""}
          </button>
        ))}
        <BtnPrimary onClick={runAI} disabled={loading||!session.photos?.[selV]} style={{ marginLeft:"auto", fontSize:11, padding:"5px 16px" }}>
          {loading?<><span style={{ display:"inline-block", animation:"spin .8s linear infinite" }}>⟳</span> Analisi...</>:"🤖 Analizza"}
        </BtnPrimary>
      </div>
      {!POSTURE_VIEWS.some(v=>session.photos?.[v]) && <div style={{ textAlign:"center", padding:14, color:th.textHint, fontSize:12, background:th.cardBg, borderRadius:10, border:`1px dashed ${th.cardBorder}` }}>Carica almeno una foto per usare l'analisi AI</div>}
      {error && <div style={{ padding:"9px 13px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, color:"#ef4444", fontSize:12, marginTop:10 }}>⚠ {error}</div>}
      {result && (
        <div style={{ marginTop:12 }}>
          <div style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:12, padding:"11px 14px", marginBottom:10, fontSize:12, color:th.text, lineHeight:1.6 }}>{result.summary}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, marginBottom:10 }}>
            {POSTURE_CHECKS.map(c=>{ const v=result.checks?.[c.id]; if(!v)return null; return(<div key={c.id} style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:10, padding:"8px 4px", textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800, fontFamily:"'Bebas Neue',sans-serif", color:scColor(v) }}>{v}</div><div style={{ fontSize:9, color:th.textHint, textTransform:"uppercase", marginTop:2 }}>{c.label}</div></div>); })}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["📋 Evidenze",result.findings||[],"#f59e0b","rgba(245,158,11,0.4)"],["✅ Raccomandazioni",result.recommendations||[],"#10b981","rgba(16,185,129,0.4)"]].map(([title,items,col,bdr])=>(
              <div key={title} style={{ background:th.cardBg, border:`1px solid ${th.cardBorder}`, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:1, textTransform:"uppercase", color:col, marginBottom:7 }}>{title}</div>
                {items.map((f,i)=><div key={i} style={{ fontSize:11, color:th.textSub, padding:"2px 0 2px 9px", borderLeft:`2px solid ${bdr}`, marginBottom:3, lineHeight:1.5 }}>{f}</div>)}
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:th.textHint, textAlign:"right", marginTop:8 }}>{new Date(result.timestamp).toLocaleString("it-IT")} · {VIEW_LABELS[result.view]||result.view}</div>
        </div>
      )}
    </div>
  );
}

// FIX BUG INPUT: ogni campo ha il proprio useState separato
function AthleteForm({ athlete, onSave, onCancel, t }) {
  const th = t || TD;
  const [name,      setName]      = useState(athlete?.name      || "");
  const [surname,   setSurname]   = useState(athlete?.surname   || "");
  const [dob,       setDob]       = useState(athlete?.dob       || "");
  const [gender,    setGender]    = useState(athlete?.gender    || "");
  const [peso,      setPeso]      = useState(String(athlete?.peso      || ""));
  const [altezza,   setAltezza]   = useState(String(athlete?.altezza   || ""));
  const [sport,     setSport]     = useState(athlete?.sport     || "");
  const [ruolo,     setRuolo]     = useState(athlete?.ruolo     || "");
  const [categoria, setCategoria] = useState(athlete?.categoria || "");
  const [club,      setClub]      = useState(athlete?.club      || "");
  const [note,      setNote]      = useState(athlete?.note      || "");
  const bmi = calcBMI(peso, altezza);

  const inp = { background:th.inputBg, border:`1px solid ${th.inputBorder}`, borderRadius:10, padding:"9px 13px", color:th.inputColor, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:"none", width:"100%" };
  const lbl = { fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:th.textHint, display:"block", marginBottom:5 };
  const F = ({ label:lb, value, onChange, type="text", placeholder }) => (
    <div><label style={lbl}>{lb}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inp} /></div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <BtnGhost t={th} onClick={onCancel} style={{ padding:"6px 14px", fontSize:12 }}>← Indietro</BtnGhost>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.7rem", letterSpacing:3, color:th.text }}>{athlete?"Modifica Atleta":"Nuovo Atleta"}</div>
      </div>
      <div style={{ ...th.glass, padding:"16px 18px", marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:800, color:"#3b82f6", textTransform:"uppercase", letterSpacing:2, marginBottom:14 }}>Dati Anagrafici</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <F label="Nome *"          value={name}      onChange={setName}      placeholder="Mario" />
          <F label="Cognome *"       value={surname}   onChange={setSurname}   placeholder="Rossi" />
          <F label="Data di nascita" value={dob}       onChange={setDob}       type="date" />
          <div><label style={lbl}>Genere</label><select value={gender} onChange={e=>setGender(e.target.value)} style={{ ...inp, cursor:"pointer" }}><option value="">—</option><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
          <F label="Peso (kg)"       value={peso}      onChange={setPeso}      type="number" placeholder="70" />
          <F label="Altezza (cm)"    value={altezza}   onChange={setAltezza}   type="number" placeholder="175" />
        </div>
        {bmi && <div style={{ marginTop:10, padding:"7px 12px", background:th.cardBg, borderRadius:8, fontSize:12, color:th.textSub }}>BMI: <span style={{ color:"#3b82f6", fontWeight:800 }}>{bmi}</span></div>}
      </div>
      <div style={{ ...th.glass, padding:"16px 18px", marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:800, color:"#10b981", textTransform:"uppercase", letterSpacing:2, marginBottom:14 }}>Dati Sportivi</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <F label="Sport"     value={sport}     onChange={setSport}     placeholder="Calcio" />
          <F label="Ruolo"     value={ruolo}     onChange={setRuolo}     placeholder="Portiere" />
          <F label="Categoria" value={categoria} onChange={setCategoria} placeholder="Under 18" />
          <F label="Club"      value={club}      onChange={setClub}      placeholder="A.C. Roma" />
        </div>
        <div style={{ marginTop:12 }}>
          <label style={lbl}>Note / Anamnesi</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Infortuni, patologie, obiettivi..."
            style={{ ...inp, resize:"vertical", minHeight:80, borderRadius:10 }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <BtnGhost t={th} onClick={onCancel} style={{ flex:1, justifyContent:"center" }}>Annulla</BtnGhost>
        <BtnPrimary onClick={()=>{ if(!name.trim()||!surname.trim())return; onSave({ id:athlete?.id||Date.now(), name, surname, dob, gender, peso:parseFloat(peso)||null, altezza:parseFloat(altezza)||null, bmi, age:calcAge(dob), sport, ruolo, categoria, club, note, createdAt:athlete?.createdAt||new Date().toISOString() }); }} style={{ flex:1, justifyContent:"center" }}>✓ Salva atleta</BtnPrimary>
      </div>
    </div>
  );
}

function PosturePage({ athletes, showToast, t, onExportPDF }) {
  const th = t || TD;
  const [selId,setSelId]=useState(null), [sess,setSess]=useState(null);
  const [allS,setAllS]=useState([]), [showStor,setShowStor]=useState(false);
  const athlete = athletes.find(a=>a.id==selId);
  const notesRef = useRef(null);

  const loadPlayer = pid => {
    if(!pid){ setSess(null); setAllS([]); return; }
    const data=getAtletaData(String(pid));
    if(!data.sessioni.length){ const s=emptySession(); data.sessioni.push(s); saveAtletaData(String(pid),data); }
    setAllS(data.sessioni); setSess({...data.sessioni[data.sessioni.length-1]});
  };
  const upd = patch => setSess(s=>({...s,...patch}));

  const handleSave = useCallback((silent=false) => {
    if(!selId||!sess)return;
    const notes = notesRef.current?.value ?? sess.notes;
    const updated = {...sess, notes};
    const data=getAtletaData(String(selId));
    const idx=data.sessioni.findIndex(s=>s.id===updated.id);
    if(idx>=0)data.sessioni[idx]=updated; else data.sessioni.push(updated);
    saveAtletaData(String(selId),data); setAllS([...data.sessioni]);
    if(!silent)showToast("Sessione salvata ✓","success");
  },[selId,sess,showToast]);

  const newSess = () => { handleSave(true); const s=emptySession(); const data=getAtletaData(String(selId)); data.sessioni.push(s); saveAtletaData(String(selId),data); setAllS([...data.sessioni]); setSess({...s}); showToast("Nuova sessione creata"); };
  const vals=Object.values(sess?.checks||{}), fotos=POSTURE_VIEWS.filter(v=>sess?.photos?.[v]).length;
  const inp={background:th.inputBg,border:`1px solid ${th.inputBorder}`,borderRadius:14,padding:"9px 13px",color:th.inputColor,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",width:"100%"};

  return (
    <div>
      <div style={{ ...th.glass, padding:"13px 17px", marginBottom:14, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:th.textHint }}>⬤ Atleta</span>
        <select value={selId||""} onChange={e=>{setSelId(e.target.value||null);loadPlayer(e.target.value||null);}} style={{ ...inp, flex:1, maxWidth:300, borderRadius:50, padding:"8px 16px" }}>
          <option value="">— Seleziona un atleta —</option>
          {athletes.map(a=><option key={a.id} value={a.id}>{a.surname} {a.name}{a.ruolo?` · ${a.ruolo}`:""}</option>)}
        </select>
        {athlete && <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 13px 5px 7px", background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.3)", borderRadius:50, fontSize:12, fontWeight:700, color:"#3b82f6" }}><span style={{ width:7, height:7, borderRadius:"50%", background:"#3b82f6", display:"inline-block" }} />{athlete.surname} {athlete.name}</span>}
        {sess && <div style={{ display:"flex", gap:6, marginLeft:"auto", flexWrap:"wrap" }}>
          <BtnGhost t={th} onClick={()=>setShowStor(true)} style={{ fontSize:11, padding:"5px 13px" }}>📋 {allS.length}</BtnGhost>
          <BtnGhost t={th} onClick={newSess} style={{ fontSize:11, padding:"5px 13px" }}>+ Nuova</BtnGhost>
          <BtnGhost t={th} onClick={()=>onExportPDF(athlete,{...sess,notes:notesRef.current?.value??sess.notes})} style={{ fontSize:11, padding:"5px 13px", color:"#ef4444" }}>📄 PDF</BtnGhost>
          <BtnPrimary onClick={()=>handleSave(false)} style={{ fontSize:11, padding:"5px 16px" }}>💾 Salva</BtnPrimary>
        </div>}
      </div>

      {!selId && <div style={{ textAlign:"center", padding:"80px 20px", ...th.glass }}><div style={{ fontSize:48, marginBottom:14, opacity:.12 }}>🧍</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.8rem", letterSpacing:3, color:th.textHint, marginBottom:8 }}>Seleziona un atleta</div><div style={{ color:th.textHint, fontSize:13 }}>Scegli un atleta per la scheda posturale</div></div>}

      {sess && <>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          {[["📷",`${fotos}/4`,"#3b82f6"],["✅ OK",vals.filter(v=>v<=3).length,"#10b981"],["⚠",vals.filter(v=>v>3&&v<=6).length,"#f59e0b"],["🔴",vals.filter(v=>v>6).length,"#ef4444"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 15px", background:th.statBg, border:`1px solid ${th.statBorder}`, borderRadius:50, fontSize:12, color:th.textSub }}>
              <span style={{ fontWeight:800, fontSize:13, color:col }}>{val}</span>{lbl}
            </div>
          ))}
        </div>

        <AIPanel session={sess} athlete={athlete} t={th} onApplyAI={r=>{ const c={...sess.checks}; Object.entries(r.checks||{}).forEach(([k,v])=>{ c[k]=v; }); upd({checks:c,aiAnalysis:r}); showToast("Valutazioni AI applicate ✓","success"); }} />

        {/* Foto grid — max 680px, 2 colonne */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10, marginBottom:14, maxWidth:680, marginLeft:"auto", marginRight:"auto" }}>
          {POSTURE_VIEWS.map(v=><PhotoCard key={v} view={v} photo={sess.photos?.[v]} t={th} onPhotoLoad={(view,src)=>upd({photos:{...sess.photos,[view]:src}})} onPhotoClear={view=>upd({photos:{...sess.photos,[view]:null}})} />)}
        </div>

        <div style={{ ...th.glass, padding:"15px 17px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:th.textHint, marginBottom:13 }}>▸ Valutazione distretti corporei</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
            {POSTURE_CHECKS.map(c=><CheckSlider key={c.id} check={c} value={sess.checks?.[c.id]} t={th} onChange={(id,val)=>upd({checks:{...sess.checks,[id]:val}})} />)}
          </div>
        </div>

        <div style={{ ...th.glass, padding:"15px 17px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:th.textHint, marginBottom:10 }}>▸ Note cliniche</div>
          <textarea ref={notesRef} defaultValue={sess.notes||""} placeholder="Osservazioni, indicazioni, note per il portiere..."
            style={{ ...inp, resize:"vertical", minHeight:90, borderRadius:12 }} />
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
          <BtnGhost t={th} onClick={()=>onExportPDF(athlete,{...sess,notes:notesRef.current?.value??sess.notes})} style={{ color:"#ef4444" }}>📄 Esporta PDF</BtnGhost>
          <BtnPrimary onClick={()=>handleSave(false)} style={{ padding:"11px 34px", fontSize:14 }}>💾 Salva sessione</BtnPrimary>
        </div>
      </>}

      {showStor && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setShowStor(false)}>
          <div style={{ background:th.modalBg, border:`1px solid ${th.modalBorder}`, borderRadius:20, padding:22, width:"100%", maxWidth:480, maxHeight:"80vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, color:th.text }}>Storico — {athlete?.surname} {athlete?.name}</div>
              <BtnGhost t={th} onClick={()=>setShowStor(false)} style={{ padding:"3px 9px" }}>✕</BtnGhost>
            </div>
            {[...allS].reverse().map(s=>{
              const vs=Object.values(s.checks||{}), isCur=s.id===sess?.id;
              return (
                <div key={s.id} style={{ background:isCur?"rgba(59,130,246,0.08)":th.cardBg, border:`1px solid ${isCur?"rgba(59,130,246,0.35)":th.cardBorder}`, borderRadius:12, padding:"11px 13px", marginBottom:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:th.text }}>{s.label}{isCur&&<span style={{ fontSize:10, color:"#3b82f6", marginLeft:7 }}>● corrente</span>}</div><div style={{ fontSize:10, color:th.textHint, marginTop:2 }}>{new Date(s.data).toLocaleDateString("it-IT")} · {POSTURE_VIEWS.filter(v=>s.photos?.[v]).length}/4 foto</div></div>
                    {!isCur&&<><BtnGhost t={th} onClick={()=>{ handleSave(true); setSess({...s}); setShowStor(false); }} style={{ padding:"3px 10px", fontSize:11 }}>👁 Carica</BtnGhost><BtnGhost t={th} onClick={()=>{ const data=getAtletaData(String(selId)); data.sessioni=data.sessioni.filter(x=>x.id!==s.id); if(!data.sessioni.length)data.sessioni.push(emptySession()); saveAtletaData(String(selId),data); setAllS([...data.sessioni]); if(sess?.id===s.id)setSess({...data.sessioni[data.sessioni.length-1]}); }} style={{ padding:"3px 8px", fontSize:11, color:"#ef4444" }}>🗑</BtnGhost></>}
                  </div>
                  <div style={{ display:"flex", gap:5 }}>{[["OK",vs.filter(v=>v<=3).length,"#10b981"],["Att",vs.filter(v=>v>3&&v<=6).length,"#f59e0b"],["Crit",vs.filter(v=>v>6).length,"#ef4444"]].map(([l,n,col])=><span key={l} style={{ fontSize:10, padding:"2px 8px", borderRadius:50, background:th.cardBg, border:`1px solid ${th.cardBorder}`, color:col }}>{n} {l}</span>)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AthletesPage({ athletes, onSave, onDelete, showToast, t }) {
  const th = t || TD;
  const [editing,setEditing]=useState(null), [search,setSearch]=useState("");
  if(editing!==null)return <AthleteForm athlete={editing.id?editing:null} t={th} onSave={a=>{ onSave(a); setEditing(null); showToast(a.id?"Atleta aggiornato ✓":"Atleta aggiunto ✓","success"); }} onCancel={()=>setEditing(null)} />;
  const filtered=athletes.filter(a=>!search||[a.name,a.surname,a.sport,a.ruolo,a.club].join(" ").toLowerCase().includes(search.toLowerCase()));
  const inp={background:th.inputBg,border:`1px solid ${th.inputBorder}`,borderRadius:50,padding:"7px 15px",color:th.inputColor,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none"};
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.8rem", letterSpacing:3, color:th.text }}>Atleti</div><div style={{ fontSize:11, color:th.textHint }}>{athletes.length} atleti registrati</div></div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cerca..." style={{ ...inp, width:150 }} />
          <BtnPrimary onClick={()=>setEditing({})}>+ Nuovo atleta</BtnPrimary>
        </div>
      </div>
      {!athletes.length
        ? <div style={{ textAlign:"center", padding:"80px 20px", ...th.glass }}><div style={{ fontSize:48, marginBottom:14, opacity:.12 }}>👥</div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.8rem", letterSpacing:3, color:th.textHint, marginBottom:8 }}>Nessun atleta</div><div style={{ color:th.textHint, fontSize:13, marginBottom:20 }}>Registra il tuo primo atleta</div><BtnPrimary onClick={()=>setEditing({})}>+ Registra atleta</BtnPrimary></div>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
            {filtered.map(a=>{
              const ini=(a.name?.[0]||"")+(a.surname?.[0]||""), sc=getAtletaData(String(a.id)).sessioni.length;
              const tags=[a.sport&&`🏅 ${a.sport}`,a.ruolo&&`⚡ ${a.ruolo}`,a.club&&`🏟 ${a.club}`].filter(Boolean);
              return (
                <div key={a.id} style={{ ...th.glass, padding:15 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow:"0 0 10px rgba(59,130,246,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:"#fff" }}>{ini}</div>
                    <div style={{ display:"flex", gap:4 }}>
                      <BtnGhost t={th} onClick={()=>setEditing(a)} style={{ padding:"2px 8px", fontSize:11 }}>✏️</BtnGhost>
                      <BtnGhost t={th} onClick={()=>{ if(confirm(`Eliminare ${a.name} ${a.surname}?`)){ onDelete(a.id); showToast("Atleta eliminato","error"); } }} style={{ padding:"2px 8px", fontSize:11, color:"#ef4444" }}>🗑</BtnGhost>
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:th.text, marginBottom:2 }}>{a.surname} {a.name}</div>
                  {a.dob && <div style={{ fontSize:11, color:th.textHint, marginBottom:7 }}>{new Date(a.dob).toLocaleDateString("it-IT")}{a.age?` · ${a.age} anni`:""}</div>}
                  <div style={{ marginBottom:9 }}>{tags.map(tag=><span key={tag} style={{ fontSize:10, padding:"2px 8px", borderRadius:50, background:th.cardBg, border:`1px solid ${th.cardBorder}`, color:th.textSub, marginRight:4, display:"inline-block", marginBottom:3 }}>{tag}</span>)}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderTop:`1px solid ${th.cardBorder}`, paddingTop:9, textAlign:"center" }}>
                    {[["peso",a.peso?a.peso+" kg":"—","#3b82f6"],["altezza",a.altezza?a.altezza+" cm":"—","#f59e0b"],["schede",sc,"#10b981"]].map(([l,val,col])=>(
                      <div key={l}><div style={{ fontWeight:800, fontSize:13, color:col }}>{val}</div><div style={{ fontSize:9, color:th.textHint, textTransform:"uppercase" }}>{l}</div></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

function BackupModal({ athletes, onClose, onImport, showToast, t }) {
  const th = t || TD;
  const fileRef=useRef(null), last=localStorage.getItem("sp_last_bk");
  const doExport=()=>{ const data={_format:"sporthub_v2",exportedAt:new Date().toISOString(),athletes,postureData:loadPostureDB()}; const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`SPORTHUB_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); localStorage.setItem("sp_last_bk",new Date().toISOString()); showToast("Backup esportato ✓","success"); onClose(); };
  const doImport=e=>{ const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=ev=>{ try{ const data=JSON.parse(ev.target.result),ath=data.athletes||data.players; if(!ath||!Array.isArray(ath))throw new Error(); if(!confirm(`Ripristinare ${ath.length} atleti?`))return; savePlayers(ath); if(data.postureData)savePostureDB(data.postureData); onImport(); showToast(`Ripristinati ${ath.length} atleti ✓`,"success"); onClose(); }catch{ showToast("File non valido","error"); } }; r.readAsText(file); e.target.value=""; };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:th.modalBg, border:`1px solid ${th.modalBorder}`, borderRadius:20, padding:22, width:"100%", maxWidth:400 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:th.text }}>Backup & Ripristino</div>
          <BtnGhost t={th} onClick={onClose} style={{ padding:"3px 9px" }}>✕</BtnGhost>
        </div>
        {last && <div style={{ fontSize:11, color:th.textHint, marginBottom:13 }}>Ultimo backup: {new Date(last).toLocaleString("it-IT")}</div>}
        <BtnPrimary onClick={doExport} style={{ width:"100%", justifyContent:"center", marginBottom:10 }}>⬇ Esporta backup</BtnPrimary>
        <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer", background:th.cardBg, border:`1px dashed ${th.cardBorder}`, borderRadius:12, padding:12, fontSize:13, color:th.textSub }}>
          ⬆ Importa backup (.json)<input ref={fileRef} type="file" accept=".json" style={{ display:"none" }} onChange={doImport} />
        </label>
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("postura");
  const [athletes,setAthletes]=useState(loadPlayers);
  const [showBackup,setShowBackup]=useState(false);
  const [isDark,setIsDark]=useState(()=>localStorage.getItem("sp_theme")!=="light");
  const [toast,setToast]=useState({ msg:"", type:"", visible:false });
  const toastTimer=useRef(null);
  const th = isDark ? TD : TL;

  const toggleTheme=()=>setIsDark(d=>{ localStorage.setItem("sp_theme",d?"light":"dark"); return !d; });
  const showToast=useCallback((msg,type="info")=>{ setToast({msg,type,visible:true}); clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(x=>({...x,visible:false})),3000); },[]);
  const handleSave=(a)=>setAthletes(prev=>{ const idx=prev.findIndex(x=>x.id===a.id); const next=idx>=0?prev.map((x,i)=>i===idx?a:x):[...prev,a]; savePlayers(next); return next; });
  const handleDelete=(id)=>setAthletes(prev=>{ const next=prev.filter(x=>x.id!=id); savePlayers(next); const db=loadPostureDB(); delete db[String(id)]; savePostureDB(db); return next; });
  const handleExportPDF=async(athlete,session)=>{ if(!session){ showToast("Nessuna sessione","error"); return; } showToast("Generando PDF...","info"); try{ await exportPDF(athlete,session); showToast("PDF salvato ✓","success"); }catch(e){ showToast("Errore PDF: "+e.message,"error"); } };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:th.bg, color:th.text, minHeight:"100vh", position:"relative", overflow:"hidden" }}>
      {isDark&&<>
        <div style={{ position:"fixed", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(30,120,255,0.16) 0%,transparent 70%)", top:-150, left:-100, pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"fixed", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,200,255,0.1) 0%,transparent 70%)", bottom:-80, right:-60, pointerEvents:"none", zIndex:0 }} />
      </>}
      <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"clamp(12px,2vw,24px)" }}>
        <header style={{ ...th.glass, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 17px", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow:"0 0 12px rgba(59,130,246,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🧍</div>
            <div><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", letterSpacing:3, color:th.text }}>SPORTHUB</div><div style={{ fontSize:9, color:th.textHint, letterSpacing:2, textTransform:"uppercase" }}>Analisi Posturale · AI</div></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", gap:3, padding:3, background:th.navBg, border:`1px solid ${th.navBorder}`, borderRadius:50 }}>
              {["postura","atleti"].map(p=>(
                <button key={p} onClick={()=>setPage(p)} style={{ padding:"6px 16px", borderRadius:50, border:page===p?"1px solid rgba(59,130,246,0.4)":"none", background:page===p?"rgba(59,130,246,0.2)":"transparent", color:page===p?"#3b82f6":th.textSub, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:12, cursor:"pointer", transition:"all .2s" }}>
                  {p==="postura"?"🧍 Posturale":<>👥 Atleti{athletes.length>0&&<span style={{ marginLeft:5, background:"rgba(59,130,246,0.25)", color:"#3b82f6", borderRadius:50, padding:"0 6px", fontSize:10, fontWeight:800 }}>{athletes.length}</span>}</>}
                </button>
              ))}
            </div>
            <button onClick={toggleTheme} title={isDark?"Tema chiaro":"Tema scuro"} style={{ width:34, height:34, borderRadius:10, border:`1px solid ${th.btnGhostBdr}`, background:th.btnGhostBg, color:th.btnGhostCol, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              {isDark?"☀️":"🌙"}
            </button>
            <BtnGhost t={th} onClick={()=>setShowBackup(true)} title="Backup" style={{ padding:"6px 11px" }}>🗄</BtnGhost>
          </div>
        </header>
        {page==="postura"&&<PosturePage athletes={athletes} showToast={showToast} t={th} onExportPDF={handleExportPDF} />}
        {page==="atleti"&&<AthletesPage athletes={athletes} onSave={handleSave} onDelete={handleDelete} showToast={showToast} t={th} />}
      </div>
      {showBackup&&<BackupModal athletes={athletes} onClose={()=>setShowBackup(false)} onImport={()=>setAthletes(loadPlayers())} showToast={showToast} t={th} />}
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        select option{background:${th.selectOpt};color:${th.inputColor};}
        input[type=range]{-webkit-appearance:none;appearance:none;border-radius:2px;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:currentColor;cursor:pointer;box-shadow:0 0 5px currentColor;}
        textarea::placeholder,input::placeholder{color:${th.placeholder};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${th.scrollThumb};border-radius:3px;}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}
