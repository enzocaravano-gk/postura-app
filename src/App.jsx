import { useState, useRef, useCallback } from "react";

const VIEWS   = ["front","back","dx","sx"];
const VLBL    = { front:"Frontale", back:"Posteriore", dx:"Lat. DX", sx:"Lat. SX" };
const VCOL    = { front:"#3b82f6", back:"#8b5cf6", dx:"#10b981", sx:"#f59e0b" };
const CHECKS  = [
  {id:"shoulders",label:"Spalle"},
  {id:"hips",     label:"Anca"},
  {id:"knee_dx",  label:"Ginocchio DX"},
  {id:"knee_sx",  label:"Ginocchio SX"},
  {id:"ankle_dx", label:"Caviglia DX"},
  {id:"ankle_sx", label:"Caviglia SX"},
  {id:"spine",    label:"Colonna"},
  {id:"head",     label:"Testa"},
];

// ── DATA ──────────────────────────────────────────────────────────────────────
const lp  = () => { try{ return JSON.parse(localStorage.getItem("sp_pl")||"[]"); }catch{ return []; }};
const sp  = a  => localStorage.setItem("sp_pl", JSON.stringify(a));
const lpd = () => { try{ return JSON.parse(localStorage.getItem("sp_po")||"{}"); }catch{ return {}; }};
const spd = d  => localStorage.setItem("sp_po", JSON.stringify(d));
const getAD  = pid => { const db=lpd(), r=db[String(pid)]; if(!r)return{sessioni:[]}; if(r.sessioni)return r; return{sessioni:[{...eS(),checks:r.checks||{},notes:r.notes||"",photos:r.photos||{}}]}; };
const saveAD = (pid,d) => { const db=lpd(); db[String(pid)]=d; spd(db); }; // FIX: spd(db) non spd(d)
const eS = () => ({ id:"s"+Date.now()+"_"+Math.random().toString(36).slice(2,5), data:new Date().toISOString(), label:new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"}), checks:{}, notes:"", photos:{front:null,back:null,dx:null,sx:null}, aiAnalysis:null });
const calcAge = dob => { if(!dob)return null; const d=new Date(dob),n=new Date(); let a=n.getFullYear()-d.getFullYear(); if(n<new Date(n.getFullYear(),d.getMonth(),d.getDate()))a--; return a; };
const calcBMI = (w,h) => w&&h ? (w/((h/100)**2)).toFixed(1) : null;
const scCol   = v => v<=3?"#10b981":v<=6?"#f59e0b":"#ef4444";
const scLbl   = v => v<=3?"OK":v<=6?"Mon.":"Spec.";

// ── THEMES ────────────────────────────────────────────────────────────────────
const TD = {
  bg:"linear-gradient(135deg,#0a0e1a 0%,#0d1528 40%,#0a1020 70%,#060a14 100%)",
  glass:{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.15)"},
  gd:{background:"rgba(10,16,32,0.75)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"},
  gg:{background:"rgba(30,100,255,0.14)",border:"1px solid rgba(80,160,255,0.38)",borderRadius:12,boxShadow:"0 0 22px rgba(30,120,255,0.18)"},
  tx:"#e8f0ff", ts:"rgba(150,180,255,0.6)", th:"rgba(120,150,200,0.4)",
  ib:"rgba(255,255,255,0.05)", ibd:"rgba(255,255,255,0.1)", ic:"#c8d8ff",
  cb:"rgba(255,255,255,0.04)", cbr:"rgba(255,255,255,0.08)",
  rb:"rgba(255,255,255,0.1)", nb:"rgba(255,255,255,0.04)", nbr:"rgba(255,255,255,0.08)",
  mb:"rgba(12,20,40,0.97)", mbr:"rgba(255,255,255,0.12)",
  gb:"rgba(255,255,255,0.07)", gbr:"rgba(255,255,255,0.12)", gc:"rgba(200,215,255,0.85)",
  sb:"rgba(255,255,255,0.05)", sbr:"rgba(255,255,255,0.09)",
  pb:"rgba(0,0,0,0.3)", pt:"rgba(150,180,255,0.25)",
  sc:"rgba(255,255,255,0.1)", so:"#1a2230", pl:"rgba(150,180,255,0.2)",
};
const TL = {
  bg:"linear-gradient(135deg,#e8f0fe 0%,#f0f4ff 40%,#eaf1ff 70%,#dde8ff 100%)",
  glass:{background:"rgba(255,255,255,0.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(100,130,200,0.22)",borderRadius:16,boxShadow:"0 8px 32px rgba(60,80,160,0.1),inset 0 1px 0 rgba(255,255,255,0.9)"},
  gd:{background:"rgba(255,255,255,0.68)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(100,130,200,0.18)",borderRadius:12,boxShadow:"0 4px 20px rgba(60,80,160,0.08)"},
  gg:{background:"rgba(59,130,246,0.07)",border:"1px solid rgba(59,130,246,0.28)",borderRadius:12,boxShadow:"0 0 18px rgba(59,130,246,0.1)"},
  tx:"#1a2540", ts:"#4a5a80", th:"#8a9ab8",
  ib:"rgba(255,255,255,0.88)", ibd:"rgba(100,130,200,0.25)", ic:"#1a2540",
  cb:"rgba(255,255,255,0.68)", cbr:"rgba(100,130,200,0.16)",
  rb:"rgba(100,130,200,0.15)", nb:"rgba(255,255,255,0.55)", nbr:"rgba(100,130,200,0.2)",
  mb:"rgba(240,245,255,0.98)", mbr:"rgba(100,130,200,0.2)",
  gb:"rgba(255,255,255,0.78)", gbr:"rgba(100,130,200,0.25)", gc:"#3a4a70",
  sb:"rgba(255,255,255,0.68)", sbr:"rgba(100,130,200,0.18)",
  pb:"rgba(200,215,255,0.2)", pt:"rgba(100,130,200,0.5)",
  sc:"rgba(100,130,200,0.2)", so:"#f0f4ff", pl:"rgba(100,130,200,0.4)",
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const compress = (b64,maxW=900) => new Promise(res => {
  const img=new Image(); img.onload=()=>{ const r=Math.min(1,maxW/img.width),c=document.createElement("canvas"); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r); c.getContext("2d").drawImage(img,0,0,c.width,c.height); res(c.toDataURL("image/jpeg",0.82)); }; img.src=b64;
});

// ── PDF ───────────────────────────────────────────────────────────────────────
async function exportPDF(athlete, sess) {
  if(!window.jspdf){ alert("Libreria PDF non ancora caricata, riprova."); return; }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,M=14,CW=W-M*2;
  const blue=[37,99,235],dark=[20,30,60],gray=[100,120,160],lbg=[240,245,255];
  const green=[16,185,129],orange=[245,158,11],red=[239,68,68];
  const scc=v=>v<=3?green:v<=6?orange:red;

  // header
  doc.setFillColor(...blue); doc.rect(0,0,W,22,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(16);
  doc.text("SPORTHUB",M,14);
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.text("ANALISI POSTURALE",M+44,14);
  doc.text(new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"}),W-M,14,{align:"right"});
  let y=30;

  // atleta
  if(athlete){
    doc.setFillColor(...lbg); doc.roundedRect(M,y,CW,28,3,3,"F");
    doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,28,3,3,"S");
    doc.setFillColor(...blue); doc.circle(M+9,y+14,7,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text(((athlete.name?.[0]||"")+(athlete.surname?.[0]||"")).toUpperCase(),M+9,y+17,{align:"center"});
    doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text(`${athlete.surname||""} ${athlete.name||""}`,M+21,y+11);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...gray);
    doc.text([athlete.sport,athlete.ruolo,athlete.categoria,athlete.club].filter(Boolean).join(" · ")||"Atleta",M+21,y+18);
    doc.text([athlete.age?`${athlete.age} anni`:null,athlete.peso?`${athlete.peso} kg`:null,athlete.altezza?`${athlete.altezza} cm`:null,athlete.bmi?`BMI ${athlete.bmi}`:null].filter(Boolean).join("   "),M+21,y+25);
    y+=35;
  }
  doc.setTextColor(...gray); doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.text(`Sessione: ${sess.label}`,M,y); y+=8;

  // valutazione
  doc.setFillColor(...blue); doc.rect(M,y,CW,7,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  doc.text("VALUTAZIONE DISTRETTI CORPOREI",M+3,y+5); y+=11;
  const bW=CW/4, bH=18;
  CHECKS.forEach((c,i)=>{
    const cx=i%4,rw=Math.floor(i/4),x=M+cx*bW,by=y+rw*(bH+2),v=sess.checks?.[c.id]||1,cc=scc(v);
    doc.setFillColor(248,250,255); doc.roundedRect(x,by,bW-1,bH,2,2,"F");
    doc.setDrawColor(...cc); doc.setLineWidth(0.4); doc.roundedRect(x,by,bW-1,bH,2,2,"S");
    doc.setFillColor(...cc); doc.roundedRect(x,by,3,bH,2,2,"F"); doc.rect(x,by,1.5,bH,"F");
    doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text(String(v),x+bW/2,by+10,{align:"center"});
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text(c.label,x+bW/2,by+15,{align:"center"});
  });
  y+=Math.ceil(CHECKS.length/4)*(bH+2)+6;

  // AI summary
  if(sess.aiAnalysis?.summary){
    doc.setFillColor(239,246,255); doc.roundedRect(M,y,CW,18,3,3,"F");
    doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,18,3,3,"S");
    doc.setTextColor(...blue); doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.text("ANALISI AI",M+3,y+5);
    doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(sess.aiAnalysis.summary,CW-6).slice(0,2),M+3,y+11); y+=22;
  }

  // findings
  if(sess.aiAnalysis?.findings?.length||sess.aiAnalysis?.recommendations?.length){
    const hw=(CW-4)/2;
    [["EVIDENZE",sess.aiAnalysis.findings||[],orange],["RACCOMANDAZIONI",sess.aiAnalysis.recommendations||[],green]].forEach(([title,items,col],idx)=>{
      if(!items.length)return;
      const fx=M+idx*(hw+4),bh=8+Math.min(items.length,4)*7;
      doc.setFillColor(252,252,255); doc.roundedRect(fx,y,hw,bh,2,2,"F");
      doc.setDrawColor(...col); doc.setLineWidth(0.3); doc.roundedRect(fx,y,hw,bh,2,2,"S");
      doc.setFillColor(...col); doc.rect(fx,y,2.5,bh,"F");
      doc.setTextColor(...col); doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.text(title,fx+5,y+5.5);
      doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      items.slice(0,4).forEach((item,ii)=>doc.text(doc.splitTextToSize(`• ${item}`,hw-8)[0],fx+5,y+11+ii*7));
    });
    y+=Math.max(8+(sess.aiAnalysis.findings?.length||0)*7,8+(sess.aiAnalysis.recommendations?.length||0)*7)+6;
  }

  // note
  if(sess.notes?.trim()){
    doc.setFillColor(248,250,255); doc.roundedRect(M,y,CW,22,3,3,"F");
    doc.setDrawColor(...gray); doc.setLineWidth(0.3); doc.roundedRect(M,y,CW,22,3,3,"S");
    doc.setTextColor(...gray); doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.text("NOTE CLINICHE",M+3,y+5);
    doc.setTextColor(...dark); doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(sess.notes,CW-6).slice(0,3),M+3,y+11); y+=26;
  }

  // pagina 2 foto
  const pvs=VIEWS.filter(v=>sess.photos?.[v]);
  if(pvs.length){
    doc.addPage();
    doc.setFillColor(...blue); doc.rect(0,0,W,14,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text("SPORTHUB · ANALISI FOTOGRAFICA",M,9.5);
    const iW=(CW-4)/2, iH=iW*1.35;
    for(let i=0;i<pvs.length;i++){
      const v=pvs[i],c2=i%2,r2=Math.floor(i/2),fx=M+c2*(iW+4),fy=20+r2*(iH+14);
      doc.setFillColor(240,245,255); doc.roundedRect(fx,fy,iW,8,2,2,"F");
      doc.setTextColor(...dark); doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.text(VLBL[v],fx+3,fy+5.5);
      try{ const cmp=await compress(sess.photos[v],600); doc.addImage(cmp,"JPEG",fx,fy+8,iW,iH,undefined,"FAST"); }catch{}
    }
  }

  // footer
  const pgs=doc.getNumberOfPages();
  for(let i=1;i<=pgs;i++){
    doc.setPage(i);
    doc.setDrawColor(220,228,240); doc.setLineWidth(0.3); doc.line(M,286,W-M,286);
    doc.setTextColor(...gray); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text("Screening visivo — non sostituisce valutazione specialistica",M,291);
    doc.text(`${i} / ${pgs}`,W-M,291,{align:"right"});
  }
  const nm=athlete?`${athlete.surname}_${athlete.name}`:"Atleta";
  const filename=`SPORTHUB_${nm}_${new Date().toISOString().slice(0,10)}.pdf`;
  // Prova download diretto, fallback su nuova scheda (compatibile con iframe/Safari)
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.target = "_blank";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
  } catch {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({msg,type,visible}){
  const col={success:"#10b981",error:"#ef4444",info:"#3b82f6"}[type]||"#3b82f6";
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:`translateX(-50%) translateY(${visible?0:80}px)`,background:"rgba(10,16,32,0.95)",border:`1px solid ${col}60`,borderRadius:50,padding:"11px 24px",fontSize:13,fontWeight:700,color:col,zIndex:9000,transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"nowrap",backdropFilter:"blur(12px)"}}>{msg}</div>;
}

const Btn = ({children,onClick,style={},title,disabled,t})=>(
  <button onClick={onClick} title={title} disabled={disabled} style={{padding:"7px 18px",borderRadius:50,border:`1px solid ${(t||TD).gbr}`,background:(t||TD).gb,color:disabled?(t||TD).th:(t||TD).gc,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:7,transition:"all .2s",...style}}>{children}</button>
);
const BtnP = ({children,onClick,style={},disabled})=>(
  <button onClick={onClick} disabled={disabled} style={{padding:"8px 20px",borderRadius:50,border:"none",background:disabled?"rgba(59,130,246,0.2)":"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:disabled?"rgba(150,180,255,0.4)":"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:7,boxShadow:disabled?"none":"0 4px 16px rgba(59,130,246,0.4)",transition:"all .2s",...style}}>{children}</button>
);

// ── PHOTO CARD ────────────────────────────────────────────────────────────────
function PhotoCard({view,photo,onLoad,onClear,t}){
  const th=t||TD, ref=useRef(null), [drag,setDrag]=useState(false);
  const load=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>onLoad(view,ev.target.result);r.readAsDataURL(f);e.target.value="";};
  const drop=e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){const r=new FileReader();r.onload=ev=>onLoad(view,ev.target.result);r.readAsDataURL(f);}};
  const col=VCOL[view];
  return(
    <div style={{...th.gd,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderBottom:`1px solid ${th.cbr}`}}>
        <span style={{fontSize:11,fontWeight:700,color:col}}>{VLBL[view]}</span>
        <div style={{display:"flex",gap:3}}>
          <Btn t={th} onClick={()=>ref.current.click()} style={{padding:"2px 7px",fontSize:11}}>📷</Btn>
          {photo&&<Btn t={th} onClick={()=>onClear(view)} style={{padding:"2px 7px",fontSize:11,color:"#ef4444"}}>🗑</Btn>}
        </div>
      </div>
      <div style={{height:380,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",background:drag?"rgba(59,130,246,0.08)":"#000",transition:"background .2s"}}
        onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={drop} onClick={()=>!photo&&ref.current.click()}>
        {photo?<img src={photo} alt={VLBL[view]} style={{width:"100%",height:"100%",objectFit:"contain",position:"absolute",inset:0}}/>
          :<div style={{textAlign:"center",color:th.pt,padding:12}}><div style={{fontSize:22,marginBottom:4}}>📷</div><div style={{fontSize:9}}>{drag?"Rilascia":"Carica foto"}</div></div>}
        {drag&&<div style={{position:"absolute",inset:0,border:`2px dashed ${col}`,borderRadius:10,pointerEvents:"none"}}/>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={load}/>
    </div>
  );
}

// ── CHECK SLIDER ──────────────────────────────────────────────────────────────
function CheckSlider({check,value,onChange,t}){
  const th=t||TD, v=value||1, col=scCol(v), pct=((v-1)/9*100).toFixed(1);
  return(
    <div style={{background:th.cb,border:`1px solid ${th.cbr}`,borderRadius:11,padding:"10px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:th.ts}}>{check.label}</span>
        <span style={{fontSize:11,fontWeight:800,padding:"1px 8px",borderRadius:50,background:`${col}20`,color:col,border:`1px solid ${col}40`}}>{v} · {scLbl(v)}</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={v} onChange={e=>onChange(check.id,parseInt(e.target.value))}
        style={{width:"100%",height:3,borderRadius:2,outline:"none",cursor:"pointer",accentColor:col,background:`linear-gradient(to right,${col} ${pct}%,${th.rb} ${pct}%)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:th.th,marginTop:3}}><span>OK</span><span>Mon.</span><span>Spec.</span></div>
    </div>
  );
}

// ── AI PANEL ──────────────────────────────────────────────────────────────────
function AIPanel({sess,athlete,onApply,t}){
  const th=t||TD;
  const [load,setLoad]=useState(false),[err,setErr]=useState(null);
  const [res,setRes]=useState(sess.aiAnalysis||null),[selV,setSelV]=useState("front");
  const urgCol=u=>u==="alta"?"#ef4444":u==="media"?"#f59e0b":"#10b981";
  const run=async()=>{
    const photo=sess.photos?.[selV]; if(!photo){setErr("Nessuna foto per questa vista.");return;}
    setLoad(true);setErr(null);
    const ctx=athlete?`Atleta: ${athlete.name} ${athlete.surname}, sport:${athlete.sport||"N/D"}, ruolo:${athlete.ruolo||"portiere"}.`:"";
    const sys=`Sei esperto analisi posturale sportiva. Foto e restituisci SOLO JSON valido senza markdown.\n{"view":"${selV}","summary":"max 2 righe","checks":{"shoulders":N,"hips":N,"knee_dx":N,"knee_sx":N,"ankle_dx":N,"ankle_sx":N,"spine":N,"head":N},"findings":["..."],"recommendations":["..."],"urgency":"bassa"}\nScala 1-3 OK,4-6 mon,7-10 spec. urgency:bassa|media|alta. ${ctx} Vista:${selV}.`;
    try{
      const cmp=await compress(photo,900),b64=cmp.split(",")[1];
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1024,system:sys,
          messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:`Analizza ${VLBL[selV]} restituisci JSON.`}]}]})});
      const data=await resp.json();
      if(data.error)throw new Error(data.error.message||"Errore API");
      const parsed=JSON.parse((data.content?.find(b=>b.type==="text")?.text||"").replace(/```json|```/g,"").trim());
      parsed.timestamp=new Date().toISOString();
      setRes(parsed);onApply(parsed);
    }catch(e){setErr(e.message||"Errore.");}
    setLoad(false);
  };
  return(
    <div style={{...th.gg,padding:"14px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:12}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#10b981)",boxShadow:"0 0 12px rgba(59,130,246,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤖</div>
        <div><div style={{fontWeight:700,fontSize:13,color:th.tx}}>Analisi AI posturale</div><div style={{fontSize:9,color:th.ts,letterSpacing:1,textTransform:"uppercase"}}>Claude Vision · analisi automatica</div></div>
        {res&&<div style={{marginLeft:"auto",padding:"3px 10px",borderRadius:50,background:`${urgCol(res.urgency)}18`,color:urgCol(res.urgency),border:`1px solid ${urgCol(res.urgency)}40`,fontSize:11,fontWeight:800}}>Urgenza: {res.urgency}</div>}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:11}}>
        {VIEWS.map(v=>(
          <button key={v} onClick={()=>setSelV(v)} style={{padding:"4px 11px",borderRadius:50,border:`1px solid ${selV===v?"rgba(59,130,246,0.6)":th.cbr}`,background:selV===v?"rgba(59,130,246,0.18)":"transparent",color:selV===v?"#3b82f6":th.ts,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {VLBL[v]}{sess.photos?.[v]?" ✓":""}
          </button>
        ))}
        <BtnP onClick={run} disabled={load||!sess.photos?.[selV]} style={{marginLeft:"auto",fontSize:11,padding:"5px 15px"}}>
          {load?<><span style={{display:"inline-block",animation:"spin .8s linear infinite"}}>⟳</span> Analisi...</>:"🤖 Analizza"}
        </BtnP>
      </div>
      {!VIEWS.some(v=>sess.photos?.[v])&&<div style={{textAlign:"center",padding:12,color:th.th,fontSize:12,background:th.cb,borderRadius:9,border:`1px dashed ${th.cbr}`}}>Carica una foto per usare l'analisi AI</div>}
      {err&&<div style={{padding:"8px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:9,color:"#ef4444",fontSize:12,marginTop:9}}>⚠ {err}</div>}
      {res&&(
        <div style={{marginTop:12}}>
          <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:11,padding:"10px 13px",marginBottom:9,fontSize:12,color:th.tx,lineHeight:1.6}}>{res.summary}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:9}}>
            {CHECKS.map(c=>{const v=res.checks?.[c.id];if(!v)return null;return(<div key={c.id} style={{background:th.cb,border:`1px solid ${th.cbr}`,borderRadius:9,padding:"7px 4px",textAlign:"center"}}><div style={{fontSize:19,fontWeight:800,fontFamily:"'Bebas Neue',sans-serif",color:scCol(v)}}>{v}</div><div style={{fontSize:9,color:th.th,textTransform:"uppercase",marginTop:2}}>{c.label}</div></div>);})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {[["📋 Evidenze",res.findings||[],"#f59e0b","rgba(245,158,11,0.4)"],["✅ Raccomandazioni",res.recommendations||[],"#10b981","rgba(16,185,129,0.4)"]].map(([title,items,col,bdr])=>(
              <div key={title} style={{background:th.cb,border:`1px solid ${th.cbr}`,borderRadius:9,padding:"9px 11px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:col,marginBottom:6}}>{title}</div>
                {items.map((f,i)=><div key={i} style={{fontSize:11,color:th.ts,padding:"2px 0 2px 8px",borderLeft:`2px solid ${bdr}`,marginBottom:3,lineHeight:1.5}}>{f}</div>)}
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:th.th,textAlign:"right",marginTop:7}}>{new Date(res.timestamp).toLocaleString("it-IT")} · {VLBL[res.view]||res.view}</div>
        </div>
      )}
    </div>
  );
}

// ── ATHLETE FORM — FIX DEFINITIVO: niente componente F interno, input diretti ─
function AthleteForm({athlete,onSave,onCancel,t}){
  const th=t||TD;
  // Ogni campo ha useState SEPARATO — unico modo per evitare il bug del re-render
  const [name,      setName]      = useState(athlete?.name      ||"");
  const [surname,   setSurname]   = useState(athlete?.surname   ||"");
  const [dob,       setDob]       = useState(athlete?.dob       ||"");
  const [gender,    setGender]    = useState(athlete?.gender    ||"");
  const [peso,      setPeso]      = useState(athlete?.peso      ? String(athlete.peso)      :"");
  const [altezza,   setAltezza]   = useState(athlete?.altezza   ? String(athlete.altezza)   :"");
  const [sport,     setSport]     = useState(athlete?.sport     ||"");
  const [ruolo,     setRuolo]     = useState(athlete?.ruolo     ||"");
  const [categoria, setCategoria] = useState(athlete?.categoria ||"");
  const [club,      setClub]      = useState(athlete?.club      ||"");
  const [note,      setNote]      = useState(athlete?.note      ||"");
  const bmi=calcBMI(peso,altezza);

  // stili definiti FUORI dal render per non essere ricreati
  const inp={background:th.ib,border:`1px solid ${th.ibd}`,borderRadius:10,padding:"9px 13px",color:th.ic,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",width:"100%"};
  const lb={fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:th.th,display:"block",marginBottom:5};
  const save=()=>{
    if(!name.trim()||!surname.trim())return;
    onSave({id:athlete?.id||Date.now(),name,surname,dob,gender,peso:parseFloat(peso)||null,altezza:parseFloat(altezza)||null,bmi,age:calcAge(dob),sport,ruolo,categoria,club,note,createdAt:athlete?.createdAt||new Date().toISOString()});
  };

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <Btn t={th} onClick={onCancel} style={{padding:"6px 14px",fontSize:12}}>← Indietro</Btn>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:3,color:th.tx}}>{athlete?"Modifica Atleta":"Nuovo Atleta"}</div>
      </div>

      {/* DATI ANAGRAFICI */}
      <div style={{...th.glass,padding:"16px 18px",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:800,color:"#3b82f6",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Dati Anagrafici</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={lb}>Nome *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Mario" style={inp}/></div>
          <div><label style={lb}>Cognome *</label><input value={surname} onChange={e=>setSurname(e.target.value)} placeholder="Rossi" style={inp}/></div>
          <div><label style={lb}>Data di nascita</label><input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={inp}/></div>
          <div><label style={lb}>Genere</label><select value={gender} onChange={e=>setGender(e.target.value)} style={{...inp,cursor:"pointer"}}><option value="">—</option><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
          <div><label style={lb}>Peso (kg)</label><input type="number" value={peso} onChange={e=>setPeso(e.target.value)} placeholder="70" style={inp}/></div>
          <div><label style={lb}>Altezza (cm)</label><input type="number" value={altezza} onChange={e=>setAltezza(e.target.value)} placeholder="175" style={inp}/></div>
        </div>
        {bmi&&<div style={{marginTop:10,padding:"7px 12px",background:th.cb,borderRadius:8,fontSize:12,color:th.ts}}>BMI: <span style={{color:"#3b82f6",fontWeight:800}}>{bmi}</span></div>}
      </div>

      {/* DATI SPORTIVI */}
      <div style={{...th.glass,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:800,color:"#10b981",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Dati Sportivi</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={lb}>Sport</label><input value={sport} onChange={e=>setSport(e.target.value)} placeholder="Calcio" style={inp}/></div>
          <div><label style={lb}>Ruolo</label><input value={ruolo} onChange={e=>setRuolo(e.target.value)} placeholder="Portiere" style={inp}/></div>
          <div><label style={lb}>Categoria</label><input value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Under 18" style={inp}/></div>
          <div><label style={lb}>Club</label><input value={club} onChange={e=>setClub(e.target.value)} placeholder="A.C. Roma" style={inp}/></div>
        </div>
        <div style={{marginTop:12}}>
          <label style={lb}>Note / Anamnesi</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Infortuni, patologie, obiettivi..."
            style={{...inp,resize:"vertical",minHeight:80,borderRadius:10}}/>
        </div>
      </div>

      <div style={{display:"flex",gap:10}}>
        <Btn t={th} onClick={onCancel} style={{flex:1,justifyContent:"center"}}>Annulla</Btn>
        <BtnP onClick={save} style={{flex:1,justifyContent:"center"}}>✓ Salva atleta</BtnP>
      </div>
    </div>
  );
}

// ── POSTURE PAGE ──────────────────────────────────────────────────────────────
function PosturePage({athletes,showToast,t,onExportPDF}){
  const th=t||TD;
  const [selId,setSelId]=useState(null),[sess,setSess]=useState(null);
  const [allS,setAllS]=useState([]),[showStor,setShowStor]=useState(false);
  const athlete=athletes.find(a=>a.id==selId);
  const notesRef=useRef(null);

  const loadPlayer=pid=>{
    if(!pid){setSess(null);setAllS([]);return;}
    const data=getAD(String(pid));
    if(!data.sessioni.length){const s=eS();data.sessioni.push(s);saveAD(String(pid),data);}
    setAllS(data.sessioni);setSess({...data.sessioni[data.sessioni.length-1]});
  };
  const upd=patch=>setSess(s=>({...s,...patch}));

  const handleSave=useCallback((silent=false)=>{
    if(!selId||!sess)return;
    const notes=notesRef.current?.value??sess.notes;
    const updated={...sess,notes};
    const data=getAD(String(selId));
    const idx=data.sessioni.findIndex(s=>s.id===updated.id);
    if(idx>=0)data.sessioni[idx]=updated; else data.sessioni.push(updated);
    saveAD(String(selId),data);setAllS([...data.sessioni]);
    if(!silent)showToast("Sessione salvata ✓","success");
  },[selId,sess,showToast]);

  const newSess=()=>{handleSave(true);const s=eS();const data=getAD(String(selId));data.sessioni.push(s);saveAD(String(selId),data);setAllS([...data.sessioni]);setSess({...s});showToast("Nuova sessione creata");};
  const vals=Object.values(sess?.checks||{}),fotos=VIEWS.filter(v=>sess?.photos?.[v]).length;
  const inp={background:th.ib,border:`1px solid ${th.ibd}`,borderRadius:14,padding:"9px 13px",color:th.ic,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none",width:"100%"};

  return(
    <div>
      {/* Barra selezione atleta */}
      <div style={{...th.glass,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:th.th}}>⬤ Atleta</span>
        <select value={selId||""} onChange={e=>{setSelId(e.target.value||null);loadPlayer(e.target.value||null);}} style={{...inp,flex:1,maxWidth:290,borderRadius:50,padding:"8px 16px"}}>
          <option value="">— Seleziona un atleta —</option>
          {athletes.map(a=><option key={a.id} value={a.id}>{a.surname} {a.name}{a.ruolo?` · ${a.ruolo}`:""}</option>)}
        </select>
        {athlete&&<span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px 5px 7px",background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:50,fontSize:12,fontWeight:700,color:"#3b82f6"}}><span style={{width:7,height:7,borderRadius:"50%",background:"#3b82f6",display:"inline-block"}}/>{athlete.surname} {athlete.name}</span>}
        {sess&&<div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
          <Btn t={th} onClick={()=>setShowStor(true)} style={{fontSize:11,padding:"5px 12px"}}>📋 {allS.length}</Btn>
          <Btn t={th} onClick={newSess} style={{fontSize:11,padding:"5px 12px"}}>+ Nuova</Btn>
          <Btn t={th} onClick={()=>onExportPDF(athlete,{...sess,notes:notesRef.current?.value??sess.notes})} style={{fontSize:11,padding:"5px 12px",color:"#ef4444"}}>📄 PDF</Btn>
          <BtnP onClick={()=>handleSave(false)} style={{fontSize:11,padding:"5px 15px"}}>💾 Salva</BtnP>
        </div>}
      </div>

      {!selId&&<div style={{textAlign:"center",padding:"70px 20px",...th.glass}}><div style={{fontSize:44,marginBottom:12,opacity:.1}}>🧍</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:3,color:th.th,marginBottom:7}}>Seleziona un atleta</div><div style={{color:th.th,fontSize:13}}>Scegli un atleta per la scheda posturale</div></div>}

      {sess&&<>
        {/* Stats strip */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:13}}>
          {[["📷",`${fotos}/4`,"#3b82f6"],["✅ OK",vals.filter(v=>v<=3).length,"#10b981"],["⚠ Mon.",vals.filter(v=>v>3&&v<=6).length,"#f59e0b"],["🔴 Spec.",vals.filter(v=>v>6).length,"#ef4444"]].map(([lb,val,col])=>(
            <div key={lb} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",background:th.sb,border:`1px solid ${th.sbr}`,borderRadius:50,fontSize:12,color:th.ts}}>
              <span style={{fontWeight:800,fontSize:13,color:col}}>{val}</span>{lb}
            </div>
          ))}
        </div>

        {/* AI Panel */}
        <AIPanel sess={sess} athlete={athlete} t={th} onApply={r=>{const c={...sess.checks};Object.entries(r.checks||{}).forEach(([k,v])=>{c[k]=v;});upd({checks:c,aiAnalysis:r});showToast("Valutazioni AI applicate ✓","success");}}/>

        {/* ── FOTO 4 colonne — rettangoli stretti e alti ── */}
        <div className="photo-grid" style={{display:"grid",gap:8,marginBottom:14}}>
          {["front","back","dx","sx"].map(v=>(
            <PhotoCard key={v} view={v} photo={sess.photos?.[v]} t={th}
              onLoad={(vw,s)=>upd({photos:{...sess.photos,[vw]:s}})}
              onClear={vw=>upd({photos:{...sess.photos,[vw]:null}})}/>
          ))}
        </div>

        {/* ── DISTRETTI CORPOREI ── */}
        <div style={{...th.glass,padding:"15px 17px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:th.th,marginBottom:12}}>▸ Valutazione distretti corporei</div>
          <div className="checks-grid" style={{display:"grid",gap:8}}>
            {CHECKS.map(c=><CheckSlider key={c.id} check={c} value={sess.checks?.[c.id]} t={th} onChange={(id,val)=>upd({checks:{...sess.checks,[id]:val}})}/>)}
          </div>
        </div>

        {/* Note */}
        <div style={{...th.glass,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:th.th,marginBottom:9}}>▸ Note cliniche</div>
          <textarea ref={notesRef} defaultValue={sess.notes||""} placeholder="Osservazioni, indicazioni, note per il portiere..."
            style={{...inp,resize:"vertical",minHeight:90,borderRadius:11}}/>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn t={th} onClick={()=>onExportPDF(athlete,{...sess,notes:notesRef.current?.value??sess.notes})} style={{color:"#ef4444"}}>📄 Esporta PDF</Btn>
          <BtnP onClick={()=>handleSave(false)} style={{padding:"11px 34px",fontSize:14}}>💾 Salva sessione</BtnP>
        </div>
      </>}

      {/* Storico Modal */}
      {showStor&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowStor(false)}>
          <div style={{background:th.mb,border:`1px solid ${th.mbr}`,borderRadius:20,padding:22,width:"100%",maxWidth:460,maxHeight:"80vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:15}}>
              <div style={{fontWeight:700,fontSize:14,color:th.tx}}>Storico — {athlete?.surname} {athlete?.name}</div>
              <Btn t={th} onClick={()=>setShowStor(false)} style={{padding:"3px 9px"}}>✕</Btn>
            </div>
            {[...allS].reverse().map(s=>{
              const vs=Object.values(s.checks||{}),isCur=s.id===sess?.id;
              return(
                <div key={s.id} style={{background:isCur?"rgba(59,130,246,0.08)":th.cb,border:`1px solid ${isCur?"rgba(59,130,246,0.35)":th.cbr}`,borderRadius:11,padding:"10px 12px",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:th.tx}}>{s.label}{isCur&&<span style={{fontSize:10,color:"#3b82f6",marginLeft:7}}>● corrente</span>}</div><div style={{fontSize:10,color:th.th,marginTop:2}}>{new Date(s.data).toLocaleDateString("it-IT")} · {VIEWS.filter(v=>s.photos?.[v]).length}/4 foto</div></div>
                    {!isCur&&<><Btn t={th} onClick={()=>{handleSave(true);setSess({...s});setShowStor(false);}} style={{padding:"3px 10px",fontSize:11}}>👁 Carica</Btn><Btn t={th} onClick={()=>{const data=getAD(String(selId));data.sessioni=data.sessioni.filter(x=>x.id!==s.id);if(!data.sessioni.length)data.sessioni.push(eS());saveAD(String(selId),data);setAllS([...data.sessioni]);if(sess?.id===s.id)setSess({...data.sessioni[data.sessioni.length-1]});}} style={{padding:"3px 8px",fontSize:11,color:"#ef4444"}}>🗑</Btn></>}
                  </div>
                  <div style={{display:"flex",gap:5}}>{[["OK",vs.filter(v=>v<=3).length,"#10b981"],["Att",vs.filter(v=>v>3&&v<=6).length,"#f59e0b"],["Crit",vs.filter(v=>v>6).length,"#ef4444"]].map(([l,n,col])=><span key={l} style={{fontSize:10,padding:"2px 7px",borderRadius:50,background:th.cb,border:`1px solid ${th.cbr}`,color:col}}>{n} {l}</span>)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ATHLETES PAGE ─────────────────────────────────────────────────────────────
function AthletesPage({athletes,onSave,onDelete,showToast,t}){
  const th=t||TD;
  const [editing,setEditing]=useState(null),[search,setSearch]=useState("");
  if(editing!==null)return <AthleteForm athlete={editing.id?editing:null} t={th} onSave={a=>{onSave(a);setEditing(null);showToast(a.id?"Atleta aggiornato ✓":"Atleta aggiunto ✓","success");}} onCancel={()=>setEditing(null)}/>;
  const filtered=athletes.filter(a=>!search||[a.name,a.surname,a.sport,a.ruolo,a.club].join(" ").toLowerCase().includes(search.toLowerCase()));
  const inp={background:th.ib,border:`1px solid ${th.ibd}`,borderRadius:50,padding:"7px 15px",color:th.ic,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none"};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:3,color:th.tx}}>Atleti</div><div style={{fontSize:11,color:th.th}}>{athletes.length} atleti registrati</div></div>
        <div style={{display:"flex",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cerca..." style={{...inp,width:150}}/>
          <BtnP onClick={()=>setEditing({})}>+ Nuovo atleta</BtnP>
        </div>
      </div>
      {!athletes.length
        ?<div style={{textAlign:"center",padding:"70px 20px",...th.glass}}><div style={{fontSize:44,marginBottom:12,opacity:.1}}>👥</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:3,color:th.th,marginBottom:7}}>Nessun atleta</div><div style={{color:th.th,fontSize:13,marginBottom:18}}>Registra il tuo primo atleta</div><BtnP onClick={()=>setEditing({})}>+ Registra atleta</BtnP></div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:12}}>
          {filtered.map(a=>{
            const ini=(a.name?.[0]||"")+(a.surname?.[0]||""),sc=getAD(String(a.id)).sessioni.length;
            const tags=[a.sport&&`🏅 ${a.sport}`,a.ruolo&&`⚡ ${a.ruolo}`,a.club&&`🏟 ${a.club}`].filter(Boolean);
            return(
              <div key={a.id} style={{...th.glass,padding:15}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",boxShadow:"0 0 10px rgba(59,130,246,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#fff"}}>{ini}</div>
                  <div style={{display:"flex",gap:4}}>
                    <Btn t={th} onClick={()=>setEditing(a)} style={{padding:"2px 7px",fontSize:11}}>✏️</Btn>
                    <Btn t={th} onClick={()=>{if(confirm(`Eliminare ${a.name} ${a.surname}?`)){onDelete(a.id);showToast("Atleta eliminato","error");}}} style={{padding:"2px 7px",fontSize:11,color:"#ef4444"}}>🗑</Btn>
                  </div>
                </div>
                <div style={{fontWeight:700,fontSize:14,color:th.tx,marginBottom:2}}>{a.surname} {a.name}</div>
                {a.dob&&<div style={{fontSize:11,color:th.th,marginBottom:7}}>{new Date(a.dob).toLocaleDateString("it-IT")}{a.age?` · ${a.age} anni`:""}</div>}
                <div style={{marginBottom:9}}>{tags.map(tag=><span key={tag} style={{fontSize:10,padding:"2px 7px",borderRadius:50,background:th.cb,border:`1px solid ${th.cbr}`,color:th.ts,marginRight:4,display:"inline-block",marginBottom:3}}>{tag}</span>)}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid ${th.cbr}`,paddingTop:9,textAlign:"center"}}>
                  {[["peso",a.peso?a.peso+" kg":"—","#3b82f6"],["altezza",a.altezza?a.altezza+" cm":"—","#f59e0b"],["schede",sc,"#10b981"]].map(([l,val,col])=>(
                    <div key={l}><div style={{fontWeight:800,fontSize:13,color:col}}>{val}</div><div style={{fontSize:9,color:th.th,textTransform:"uppercase"}}>{l}</div></div>
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

// ── BACKUP MODAL ──────────────────────────────────────────────────────────────
function BackupModal({athletes,onClose,onImport,showToast,t}){
  const th=t||TD,ref=useRef(null),last=localStorage.getItem("sp_last_bk");
  const doExp=()=>{const data={_format:"sporthub_v2",exportedAt:new Date().toISOString(),athletes,postureData:lpd()};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`SPORTHUB_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();localStorage.setItem("sp_last_bk",new Date().toISOString());showToast("Backup esportato ✓","success");onClose();};
  const doImp=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const data=JSON.parse(ev.target.result),ath=data.athletes||data.players;if(!ath||!Array.isArray(ath))throw new Error();if(!confirm(`Ripristinare ${ath.length} atleti?`))return;sp(ath);if(data.postureData)spd(data.postureData);onImport();showToast(`Ripristinati ${ath.length} atleti ✓`,"success");onClose();}catch{showToast("File non valido","error");}};r.readAsText(file);e.target.value="";};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:th.mb,border:`1px solid ${th.mbr}`,borderRadius:20,padding:22,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:15}}>
          <div style={{fontWeight:700,fontSize:14,color:th.tx}}>Backup & Ripristino</div>
          <Btn t={th} onClick={onClose} style={{padding:"3px 9px"}}>✕</Btn>
        </div>
        {last&&<div style={{fontSize:11,color:th.th,marginBottom:12}}>Ultimo backup: {new Date(last).toLocaleString("it-IT")}</div>}
        <BtnP onClick={doExp} style={{width:"100%",justifyContent:"center",marginBottom:10}}>⬇ Esporta backup</BtnP>
        <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",background:th.cb,border:`1px dashed ${th.cbr}`,borderRadius:11,padding:12,fontSize:13,color:th.ts}}>
          ⬆ Importa backup (.json)<input ref={ref} type="file" accept=".json" style={{display:"none"}} onChange={doImp}/>
        </label>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("postura");
  const [athletes,setAthletes]=useState(lp);
  const [showBk,setShowBk]=useState(false);
  const [isDark,setIsDark]=useState(()=>localStorage.getItem("sp_theme")!=="light");
  const [toast,setToast]=useState({msg:"",type:"",visible:false});
  const tRef=useRef(null);
  const th=isDark?TD:TL;

  const toggleTheme=()=>setIsDark(d=>{localStorage.setItem("sp_theme",d?"light":"dark");return !d;});
  const showToast=useCallback((msg,type="info")=>{setToast({msg,type,visible:true});clearTimeout(tRef.current);tRef.current=setTimeout(()=>setToast(x=>({...x,visible:false})),3000);},[]);
  const doSave=(a)=>setAthletes(prev=>{const idx=prev.findIndex(x=>x.id===a.id);const next=idx>=0?prev.map((x,i)=>i===idx?a:x):[...prev,a];sp(next);return next;});
  const doDel=(id)=>setAthletes(prev=>{const next=prev.filter(x=>x.id!=id);sp(next);const db=lpd();delete db[String(id)];spd(db);return next;});
  const doPDF=async(athlete,sess)=>{if(!sess){showToast("Nessuna sessione","error");return;}showToast("Generando PDF...","info");try{await exportPDF(athlete,sess);showToast("PDF salvato ✓","success");}catch(e){showToast("Errore PDF: "+e.message,"error");}};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:th.bg,color:th.tx,minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      {isDark&&<>
        <div style={{position:"fixed",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(30,120,255,0.16) 0%,transparent 70%)",top:-150,left:-100,pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"fixed",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,200,255,0.1) 0%,transparent 70%)",bottom:-80,right:-60,pointerEvents:"none",zIndex:0}}/>
      </>}
      <div style={{position:"relative",zIndex:1,maxWidth:1200,margin:"0 auto",padding:"clamp(12px,2vw,24px)"}}>
        <header style={{...th.glass,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 17px",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",boxShadow:"0 0 12px rgba(59,130,246,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🧍</div>
            <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:3,color:th.tx}}>SPORTHUB</div><div style={{fontSize:9,color:th.th,letterSpacing:2,textTransform:"uppercase"}}>Analisi Posturale · AI</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:3,padding:3,background:th.nb,border:`1px solid ${th.nbr}`,borderRadius:50}}>
              {["postura","atleti"].map(p=>(
                <button key={p} onClick={()=>setPage(p)} style={{padding:"6px 16px",borderRadius:50,border:page===p?"1px solid rgba(59,130,246,0.4)":"none",background:page===p?"rgba(59,130,246,0.2)":"transparent",color:page===p?"#3b82f6":th.ts,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
                  {p==="postura"?"🧍 Posturale":<>👥 Atleti{athletes.length>0&&<span style={{marginLeft:5,background:"rgba(59,130,246,0.25)",color:"#3b82f6",borderRadius:50,padding:"0 6px",fontSize:10,fontWeight:800}}>{athletes.length}</span>}</>}
                </button>
              ))}
            </div>
            <button onClick={toggleTheme} title={isDark?"Tema chiaro":"Tema scuro"} style={{width:34,height:34,borderRadius:10,border:`1px solid ${th.gbr}`,background:th.gb,color:th.gc,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
              {isDark?"☀️":"🌙"}
            </button>
            <Btn t={th} onClick={()=>setShowBk(true)} title="Backup" style={{padding:"6px 11px"}}>🗄</Btn>
          </div>
        </header>
        {page==="postura"&&<PosturePage athletes={athletes} showToast={showToast} t={th} onExportPDF={doPDF}/>}
        {page==="atleti"&&<AthletesPage athletes={athletes} onSave={doSave} onDelete={doDel} showToast={showToast} t={th}/>}
      </div>
      {showBk&&<BackupModal athletes={athletes} onClose={()=>setShowBk(false)} onImport={()=>setAthletes(lp())} showToast={showToast} t={th}/>}
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible}/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        select option{background:${th.so};color:${th.ic};}
        input[type=range]{-webkit-appearance:none;appearance:none;border-radius:2px;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:currentColor;cursor:pointer;box-shadow:0 0 5px currentColor;}
        textarea::placeholder,input::placeholder{color:${th.pl};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${th.sc};border-radius:3px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .photo-grid{grid-template-columns:repeat(4,1fr);}
        .checks-grid{grid-template-columns:repeat(4,1fr);}
        @media(max-width:600px){
          .photo-grid{grid-template-columns:repeat(2,1fr);}
          .checks-grid{grid-template-columns:repeat(2,1fr);}
        }
      `}</style>
    </div>
  );
}
