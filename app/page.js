'use client';
import { useState, useRef, useCallback } from 'react';

const s = {
  wrap:        { position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:'0 24px' },
  header:      { borderBottom:'1px solid var(--border)', padding:'18px 0', backdropFilter:'blur(10px)', position:'sticky', top:0, zIndex:100, background:'rgba(13,17,23,0.88)' },
  headerInner: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  logo:        { display:'flex', alignItems:'center', gap:12 },
  logoIcon:    { width:34, height:34, background:'linear-gradient(135deg,#3fb950,#1a7f37)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 },
  logoText:    { fontFamily:'var(--serif)', fontSize:21, fontWeight:600, letterSpacing:'-0.5px' },
  badge:       { fontFamily:'var(--mono)', fontSize:10, background:'rgba(63,185,80,0.15)', color:'var(--accent)', border:'1px solid rgba(63,185,80,0.3)', padding:'3px 8px', borderRadius:20, letterSpacing:'0.05em', textTransform:'uppercase' },
  hero:        { padding:'48px 0 36px', textAlign:'center' },
  heroTag:     { fontFamily:'var(--mono)', fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--accent)', marginBottom:18, animation:'fadeUp 0.6s ease forwards 0.1s', opacity:0 },
  heroH1:      { fontFamily:'var(--serif)', fontSize:'clamp(30px,5vw,52px)', fontWeight:300, lineHeight:1.1, letterSpacing:'-1px', marginBottom:14, animation:'fadeUp 0.6s ease forwards 0.2s', opacity:0 },
  heroP:       { fontSize:15, color:'var(--text-muted)', maxWidth:500, margin:'0 auto 28px', lineHeight:1.7, fontWeight:300, animation:'fadeUp 0.6s ease forwards 0.3s', opacity:0 },

  apikeyWrap:  { maxWidth:580, margin:'0 auto 20px', animation:'fadeUp 0.6s ease forwards 0.35s', opacity:0 },
  apikeyCard:  { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 22px', textAlign:'left' },
  apikeyLabel: { fontFamily:'var(--mono)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:10 },
  apikeyRow:   { display:'flex', gap:10, marginBottom:10 },
  apikeyInput: { flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontFamily:'var(--mono)', fontSize:13, padding:'10px 14px', outline:'none' },
  apikeyHint:  { fontSize:12, color:'var(--text-dim)', lineHeight:1.5 },

  uploadZone:  { border:'1.5px dashed var(--border)', borderRadius:16, padding:'44px 36px', textAlign:'center', cursor:'pointer', background:'rgba(22,27,34,0.6)', position:'relative', maxWidth:580, margin:'0 auto', animation:'fadeUp 0.6s ease forwards 0.45s', opacity:0, transition:'all 0.25s' },
  uploadIcon:  { width:58, height:58, margin:'0 auto 16px', background:'rgba(63,185,80,0.1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, border:'1px solid rgba(63,185,80,0.2)' },
  fileTags:    { display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:16 },
  fileTag:     { fontFamily:'var(--mono)', fontSize:11, padding:'3px 10px', borderRadius:4, background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)' },

  progressCard:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'26px 28px', maxWidth:580, margin:'32px auto' },
  progressHeader: { display:'flex', alignItems:'center', gap:12, marginBottom:18 },
  progressDot:    { width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'pulse 1.5s infinite' },
  progressLabel:  { fontFamily:'var(--mono)', fontSize:13, color:'var(--text-muted)' },
  steps:          { display:'flex', flexDirection:'column', gap:10 },

  resultsHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:26, paddingBottom:22, borderBottom:'1px solid var(--border)' },
  resultsTitle:  { fontFamily:'var(--serif)', fontSize:26, fontWeight:600, letterSpacing:'-0.5px', marginBottom:5 },
  resultsMeta:   { fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' },
  resultsActions:{ display:'flex', gap:10, flexWrap:'wrap' },

  statsRow:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 },
  statCard:  { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'15px 18px' },
  statValue: { fontFamily:'var(--serif)', fontSize:28, fontWeight:700, letterSpacing:'-1px', lineHeight:1, marginBottom:5 },
  statLabel: { fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' },

  summary: { background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'3px solid var(--accent)', borderRadius:10, padding:'16px 20px', marginBottom:22, fontSize:14, lineHeight:1.7, color:'var(--text-muted)' },
  filters: { display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' },
  filterLabel: { fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginRight:4 },

  tableWrap: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  th: { padding:'12px 16px', textAlign:'left', fontFamily:'var(--mono)', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', whiteSpace:'nowrap', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  td: { padding:'14px 16px', fontSize:13, verticalAlign:'top', borderBottom:'1px solid rgba(48,54,61,0.6)', lineHeight:1.6 },

  errorBox: { background:'rgba(248,81,73,0.08)', border:'1px solid rgba(248,81,73,0.3)', borderRadius:10, padding:'14px 18px', color:'var(--danger)', fontSize:13, lineHeight:1.6, fontFamily:'var(--mono)', maxWidth:580, margin:'14px auto 0', wordBreak:'break-word' },
};

const SYSTEM_PROMPT = `You are an expert environmental compliance attorney and permit analyst.`;

function Btn({ children, onClick, secondary }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
      borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer',
      transition:'all 0.2s', border: secondary ? '1px solid var(--border)' : 'none',
      fontFamily:'var(--sans)', background: secondary ? 'var(--surface2)' : 'var(--accent)',
      color: secondary ? 'var(--text)' : '#0d1117',
    }}>{children}</button>
  );
}

function FilterBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'5px 14px', borderRadius:20, fontSize:12, fontFamily:'var(--mono)',
      cursor:'pointer', border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
      background: active ? 'rgba(63,185,80,0.08)' : 'var(--surface)',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
    }}>{children}</button>
  );
}

function Step({ n, label, status }) {
  const colors = { done:'var(--accent)', active:'var(--text)', idle:'var(--text-dim)' };
  const iconBorder = { done:'var(--accent)', active:'var(--accent2)', idle:'var(--text-dim)' };
  const iconBg = { done:'rgba(63,185,80,0.15)', active:'rgba(88,166,255,0.1)', idle:'transparent' };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:14, color:colors[status], transition:'all 0.3s' }}>
      <div style={{ width:20, height:20, borderRadius:'50%', border:`1.5px solid ${iconBorder[status]}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0, background:iconBg[status], color:iconBorder[status] }}>
        {status === 'done' ? '✓' : status === 'active' ? '⟳' : n}
      </div>
      <span>{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cfg = {
    High:   { bg:'rgba(248,81,73,0.15)',  color:'var(--danger)', border:'rgba(248,81,73,0.3)',  icon:'🔴' },
    Medium: { bg:'rgba(227,179,65,0.15)', color:'var(--warn)',   border:'rgba(227,179,65,0.3)', icon:'🟡' },
    Low:    { bg:'rgba(63,185,80,0.12)',  color:'var(--accent)', border:'rgba(63,185,80,0.25)', icon:'🟢' },
  };
  const c = cfg[priority] || cfg.Low;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontFamily:'var(--mono)', fontSize:11, fontWeight:500, whiteSpace:'nowrap', background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {c.icon} {priority || 'Low'}
    </span>
  );
}

const STEPS = ['Reading file', 'Identifying permit structure & sections', 'Parsing compliance obligations & conditions', 'Extracting deadlines, frequencies & citations', 'Building actionable compliance table'];

export default function Home() {
  const [apiKey, setApiKey]       = useState('');
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'ok' | {error}
  const [phase, setPhase]         = useState('upload'); // upload | progress | results
  const [step, setStep]           = useState(0);
  const [error, setError]         = useState(null);
  const [items, setItems]         = useState([]);
  const [permitData, setPermitData] = useState(null);
  const [filter, setFilter]       = useState('all');
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef();

  const testKey = async () => {
    if (!apiKey) { setTestStatus({ error: 'Enter an API key first.' }); return; }
    setTestStatus('testing');
    const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: apiKey, test: true }) });
    const d = await res.json();
    if (d.error) setTestStatus({ error: d.error });
    else setTestStatus('ok');
  };

  const readFile = (file) => new Promise((resolve, reject) => {
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const reader = new FileReader();
    reader.onerror = reject;
    if (isPDF) {
      reader.onload = e => resolve({ type:'pdf', data: e.target.result.split(',')[1] });
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => resolve({ type:'text', data: e.target.result });
      reader.readAsText(file);
    }
  });

  const handleFile = async (file) => {
    if (!apiKey) { setError('Enter your Anthropic API key first.'); return; }
    setError(null);
    setPhase('progress');
    setStep(1);

    try {
      const content = await readFile(file);
      setStep(2); await delay(300);
      setStep(3); await delay(300);
      setStep(4);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey, content, filename: file.name }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);

      setStep(5); await delay(300);
      setPermitData(d.result);
      setItems(d.result.items || []);
      setPhase('results');
    } catch (e) {
      setError(e.message);
      setPhase('upload');
    }
  };

  const exportCSV = () => {
    const h = ['ID','Citation','Subsection','Requirement','Category','Frequency','Priority','Responsible Party','Notes'];
    const rows = items.map(i => [i.id,i.citation,i.subsection,i.requirement,i.category,i.frequency,i.priority,i.responsible_party,i.notes].map(v=>`"${String(v||'').replace(/"/g,'""')}"`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[h.join(','),...rows.map(r=>r.join(','))].join('\n')], {type:'text/csv'}));
    a.download = 'permit_actions.csv'; a.click();
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.priority === filter);
  const high = items.filter(i=>i.priority==='High').length;
  const med  = items.filter(i=>i.priority==='Medium').length;
  const low  = items.filter(i=>i.priority==='Low').length;
  const cats = new Set(items.map(i=>i.category)).size;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        input::placeholder { color: var(--text-dim); }
        tr:hover td { background: rgba(255,255,255,0.02); }
        a { color: var(--accent2); text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>

      <header style={s.header}>
        <div style={{...s.wrap, ...s.headerInner}}>
          <div style={s.logo}>
            <div style={s.logoIcon}>🌿</div>
            <div style={s.logoText}>Permit<span style={{color:'var(--accent)'}}>Scope</span></div>
          </div>
          <span style={s.badge}>Environmental AI</span>
        </div>
      </header>

      <main style={s.wrap}>

        {/* ── UPLOAD PHASE ── */}
        {phase === 'upload' && (
          <div style={s.hero}>
            <div style={s.heroTag}>Environmental Compliance Intelligence</div>
            <h1 style={s.heroH1}>
              Parse permits into<br /><em style={{fontStyle:'italic',color:'var(--accent)'}}>actionable obligations</em>
            </h1>
            <p style={s.heroP}>Upload any environmental permit — air, water, hazardous waste, stormwater — and get a structured table of every compliance action, deadline, and requirement with citations.</p>

            {/* API Key */}
            <div style={s.apikeyWrap}>
              <div style={s.apikeyCard}>
                <div style={s.apikeyLabel}>
                  🔑 Anthropic API Key &nbsp;<span style={{color:'var(--danger)'}}>* required</span>
                </div>
                <div style={s.apikeyRow}>
                  <input
                    type="password"
                    placeholder="sk-ant-api03-…"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={s.apikeyInput}
                    autoComplete="off"
                  />
                  <Btn secondary onClick={testKey}>Test Key</Btn>
                </div>
                <div style={s.apikeyHint}>
                  Sent only to this Vercel server — never stored or logged. Get a key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>.
                </div>
                {testStatus === 'testing' && <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:12,color:'var(--text-muted)'}}>Testing…</div>}
                {testStatus === 'ok'      && <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:12,color:'var(--accent)'}}>✓ Key valid — ready to analyze!</div>}
                {testStatus?.error        && <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:12,color:'var(--danger)'}}>✗ {testStatus.error}</div>}
              </div>
            </div>

            {/* Upload zone */}
            <div
              style={{...s.uploadZone, ...(dragOver ? {borderColor:'var(--accent)',background:'rgba(63,185,80,0.05)',transform:'translateY(-2px)',boxShadow:'0 0 40px rgba(63,185,80,0.1)'} : {})}}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:'none'}} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              <div style={s.uploadIcon}>📄</div>
              <h3 style={{fontFamily:'var(--serif)',fontWeight:600,fontSize:18,marginBottom:6}}>Drop your permit file here</h3>
              <p style={{fontSize:13,color:'var(--text-muted)',fontWeight:300}}>or click to browse — PDF recommended</p>
              <div style={s.fileTags}>
                {['.PDF','.TXT','.DOC','.DOCX'].map(t => <span key={t} style={s.fileTag}>{t}</span>)}
              </div>
            </div>

            {error && <div style={s.errorBox}>⚠ {error}</div>}
          </div>
        )}

        {/* ── PROGRESS PHASE ── */}
        {phase === 'progress' && (
          <div style={s.progressCard}>
            <div style={s.progressHeader}>
              <div style={s.progressDot} />
              <div style={s.progressLabel}>Analyzing permit…</div>
            </div>
            <div style={s.steps}>
              {STEPS.map((label, i) => {
                const n = i + 1;
                const status = step > n ? 'done' : step === n ? 'active' : 'idle';
                return <Step key={n} n={n} label={label} status={status} />;
              })}
            </div>
          </div>
        )}

        {/* ── RESULTS PHASE ── */}
        {phase === 'results' && permitData && (
          <div style={{paddingBottom:64}}>
            <div style={s.resultsHeader}>
              <div>
                <div style={s.resultsTitle}>{permitData.permit_name || 'Permit Analysis'}</div>
                <div style={s.resultsMeta}>{[permitData.permit_type, permitData.permit_number, permitData.issuing_authority].filter(Boolean).join(' · ')}</div>
              </div>
              <div style={s.resultsActions}>
                <Btn secondary onClick={exportCSV}>⬇ Export CSV</Btn>
                <Btn secondary onClick={() => { setPhase('upload'); setItems([]); setPermitData(null); setFilter('all'); }}>↩ New Permit</Btn>
              </div>
            </div>

            {permitData.summary && <div style={s.summary}>{permitData.summary}</div>}

            <div style={s.statsRow}>
              {[
                { v: items.length, l: 'Total Actions',   c: 'var(--text)' },
                { v: high,         l: 'High Priority',   c: 'var(--danger)' },
                { v: med,          l: 'Medium Priority', c: 'var(--warn)' },
                { v: low,          l: 'Low Priority',    c: 'var(--accent)' },
                { v: cats,         l: 'Categories',      c: 'var(--accent2)' },
              ].map(({v,l,c}) => (
                <div key={l} style={s.statCard}>
                  <div style={{...s.statValue, color:c}}>{v}</div>
                  <div style={s.statLabel}>{l}</div>
                </div>
              ))}
            </div>

            <div style={s.filters}>
              <span style={s.filterLabel}>Filter:</span>
              {[['all','All'],['High','🔴 High'],['Medium','🟡 Medium'],['Low','🟢 Low']].map(([v,l]) => (
                <FilterBtn key={v} active={filter===v} onClick={() => setFilter(v)}>{l}</FilterBtn>
              ))}
            </div>

            <div style={s.tableWrap}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {['#','Citation / Section','Requirement / Action','Category','Frequency / Deadline','Priority'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{...s.td,textAlign:'center',padding:'50px',color:'var(--text-muted)'}}>No items match.</td></tr>
                  ) : filtered.map((item, i) => (
                    <tr key={item.id || i}>
                      <td style={{...s.td,fontFamily:'var(--mono)',fontSize:11,color:'var(--text-dim)',width:36}}>{String(item.id||i+1).padStart(2,'0')}</td>
                      <td style={{...s.td,fontFamily:'var(--mono)',fontSize:12,color:'var(--accent2)',minWidth:110,whiteSpace:'nowrap'}}>
                        <div>{item.citation||'—'}</div>
                        {item.subsection && <div style={{color:'var(--text-dim)',fontSize:11,marginTop:2}}>{item.subsection}</div>}
                      </td>
                      <td style={{...s.td,minWidth:250}}>
                        <div>{item.requirement||''}</div>
                        {item.notes && <div style={{fontSize:12,color:'var(--text-muted)',marginTop:5,fontStyle:'italic'}}>{item.notes}</div>}
                      </td>
                      <td style={s.td}>
                        <span style={{display:'inline-block',padding:'2px 9px',borderRadius:4,fontFamily:'var(--mono)',fontSize:11,background:'var(--surface2)',color:'var(--text-muted)',border:'1px solid var(--border)'}}>{item.category||'Other'}</span>
                      </td>
                      <td style={{...s.td,fontFamily:'var(--mono)',fontSize:12,color:'var(--text-muted)'}}>{item.frequency||'—'}</td>
                      <td style={s.td}><PriorityBadge priority={item.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
