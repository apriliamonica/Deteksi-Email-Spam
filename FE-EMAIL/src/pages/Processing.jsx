import { useState } from 'react';
import { Settings, Brain, ShieldCheck, Play, Save, CheckCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function ProcessingPage() {
  const [tab, setTab] = useState('pengaturan');

  return (
    <div>
      <div className="page-header"><h1>Processing</h1><p>Pengaturan, pelatihan, dan validasi model.</p></div>
      <div className="tabs">
        <button className={`tab ${tab==='pengaturan'?'active':''}`} onClick={() => setTab('pengaturan')}><Settings size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Pengaturan</button>
        <button className={`tab ${tab==='pelatihan'?'active':''}`} onClick={() => setTab('pelatihan')}><Brain size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Pelatihan</button>
        <button className={`tab ${tab==='validasi'?'active':''}`} onClick={() => setTab('validasi')}><ShieldCheck size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Validasi</button>
      </div>
      {tab === 'pengaturan' && <PengaturanTab />}
      {tab === 'pelatihan' && <PelatihanTab />}
      {tab === 'validasi' && <ValidasiTab />}
    </div>
  );
}

function PengaturanTab() {
  const [params, setParams] = useState({
    ft_epochs: 5, ft_lr: 0.00002, batch: 16, wd: 0.01, max_len: 256,
    umap_dim: 128, umap_n: 15, umap_d: 0.1,
    gat_epochs: 30, gat_lr: 0.005, gat_heads: 8, gat_hidden: 128, gat_drop: 0.3,
    split: 0.2,
  });
  const [saved, setSaved] = useState(false);
  const F = ({ label, k, step, hint }) => (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label">{label}</label>
      <input type="number" className="form-input" step={step||1} value={params[k]} onChange={e => setParams({...params, [k]: +e.target.value})} />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>IndoBERT Fine-Tuning</h3>
          <F label="Epochs" k="ft_epochs" hint="3–5" /><F label="Learning Rate" k="ft_lr" step={0.00001} hint="2e-5 ~ 5e-5" />
          <F label="Batch Size" k="batch" hint="8/16/32" /><F label="Weight Decay" k="wd" step={0.001} /><F label="Max Length" k="max_len" />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>UMAP & GAT</h3>
          <F label="UMAP Dimensions" k="umap_dim" hint="64–256" /><F label="GAT Epochs" k="gat_epochs" hint="20–50" />
          <F label="GAT Learning Rate" k="gat_lr" step={0.001} /><F label="Attention Heads" k="gat_heads" />
          <F label="Dropout" k="gat_drop" step={0.05} /><F label="Test Split" k="split" step={0.05} />
        </div>
      </div>
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button className="btn btn-primary btn-lg" onClick={() => { setSaved(true); setTimeout(()=>setSaved(false), 2000); }}>
          {saved ? <><CheckCircle size={16}/> Tersimpan</> : <><Save size={16}/> Simpan</>}
        </button>
      </div>
    </div>
  );
}

function PelatihanTab() {
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');

  const handleTrain = async () => {
    setTraining(true); setProgress(0); setResult(null);
    for (const [s, p] of [['Preprocessing...', 10],['Fine-tune IndoBERT...', 35],['Embeddings (768d)...', 50],['UMAP (768→128d)...', 60],['Build graph...', 70],['Train GAT (30 ep)...', 90],['Simpan model...', 100]]) {
      setStep(s); setProgress(p); await new Promise(r => setTimeout(r, 1000));
    }
    setResult({
      accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1: 0.9481,
      train: 8000, test: 2000,
      ftLoss: Array.from({length:5}, (_,i) => ({e:i+1, l:+(2.1*Math.exp(-i*0.5)+0.3).toFixed(4)})),
      gatLoss: Array.from({length:30}, (_,i) => ({e:i+1, l:+(1.5*Math.exp(-i*0.12)+0.1).toFixed(4)})),
    });
    setTraining(false);
  };

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
        <Brain size={36} style={{ color: 'var(--gray-400)', marginBottom: 12 }} />
        <h2>{training ? 'Sedang Training...' : result ? 'Training Selesai' : 'Mulai Pelatihan'}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginBottom: 16 }}>Pipeline: IndoBERT → UMAP → GAT</p>
        {training && <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}><div className="progress-fill" style={{ width:`${progress}%` }}/></div>
          <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{step} {progress}%</p>
        </div>}
        {!training && <button className="btn btn-primary btn-lg" onClick={handleTrain}><Play size={16}/> {result ? 'Training Ulang' : 'Mulai Training'}</button>}
      </div>
      {result && <>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[['Accuracy',result.accuracy],['Precision',result.precision],['Recall',result.recall],['F1 Score',result.f1]].map(([l,v],i) => (
            <div key={i} className="stat-card" style={{ flexDirection:'column', textAlign:'center' }}>
              <div className="stat-label">{l}</div>
              <div style={{ fontSize:'1.5rem', fontWeight:800 }}>{(v*100).toFixed(2)}%</div>
            </div>
          ))}
        </div>
        <div className="grid-2">
          <div className="card"><h3 style={{ marginBottom: 12 }}>IndoBERT Loss</h3>
            <ResponsiveContainer width="100%" height={180}><LineChart data={result.ftLoss}><CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/><XAxis dataKey="e" stroke="#a3a3a3" fontSize={11}/><YAxis stroke="#a3a3a3" fontSize={11}/><Tooltip contentStyle={{ border:'1px solid #e5e5e5', borderRadius:6, fontSize:'0.8rem' }}/><Line type="monotone" dataKey="l" stroke="#171717" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer>
          </div>
          <div className="card"><h3 style={{ marginBottom: 12 }}>GAT Loss</h3>
            <ResponsiveContainer width="100%" height={180}><LineChart data={result.gatLoss}><CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/><XAxis dataKey="e" stroke="#a3a3a3" fontSize={11}/><YAxis stroke="#a3a3a3" fontSize={11}/><Tooltip contentStyle={{ border:'1px solid #e5e5e5', borderRadius:6, fontSize:'0.8rem' }}/><Line type="monotone" dataKey="l" stroke="#171717" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
          </div>
        </div>
      </>}
    </div>
  );
}

function ValidasiTab() {
  const [done, setDone] = useState(false);
  const cm = { tp: 452, tn: 720, fp: 43, fn: 35 };
  const scatter = Array.from({length:200}, () => ({ x:(Math.random()-0.5)*20, y:(Math.random()-0.5)*20, l: Math.random()>0.4?0:1 }));

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 24 }}>
        <ShieldCheck size={32} style={{ color: 'var(--gray-400)', marginBottom: 8 }} />
        <h3>{done ? 'Validasi Selesai' : 'Validasi Model'}</h3>
        <p style={{ color:'var(--gray-500)', fontSize:'0.8rem', marginBottom: 14 }}>Uji model pada data test.</p>
        <button className="btn btn-primary" onClick={async () => { await new Promise(r=>setTimeout(r,1500)); setDone(true); }}>
          <Play size={14}/> {done ? 'Ulang' : 'Mulai Validasi'}
        </button>
      </div>
      {done && <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Confusion Matrix</h3>
          <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr', maxWidth:350, margin:'0 auto' }}>
            <div/><div style={{ textAlign:'center', padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)' }}>Pred HAM</div><div style={{ textAlign:'center', padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)' }}>Pred SPAM</div>
            <div style={{ padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)', display:'flex', alignItems:'center' }}>Aktual HAM</div>
            <div style={{ background:'var(--gray-100)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:800 }}>{cm.tn}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-500)' }}>TN</div></div>
            <div style={{ background:'var(--gray-50)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:700, color:'var(--gray-500)' }}>{cm.fp}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-400)' }}>FP</div></div>
            <div style={{ padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)', display:'flex', alignItems:'center' }}>Aktual SPAM</div>
            <div style={{ background:'var(--gray-50)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:700, color:'var(--gray-500)' }}>{cm.fn}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-400)' }}>FN</div></div>
            <div style={{ background:'var(--gray-100)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:800 }}>{cm.tp}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-500)' }}>TP</div></div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>UMAP 2D</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/><XAxis type="number" dataKey="x" stroke="#a3a3a3" fontSize={10}/><YAxis type="number" dataKey="y" stroke="#a3a3a3" fontSize={10}/>
              <Scatter data={scatter.filter(d=>d.l===0)} fill="#a3a3a3" opacity={0.5}/>
              <Scatter data={scatter.filter(d=>d.l===1)} fill="#171717" opacity={0.6}/>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', justifyContent:'center', gap:16, fontSize:'0.7rem', color:'var(--gray-500)', marginTop:8 }}>
            <span>● Ham (abu)</span><span style={{ color:'var(--black)' }}>● Spam (hitam)</span>
          </div>
        </div>
      </div>}
    </div>
  );
}
