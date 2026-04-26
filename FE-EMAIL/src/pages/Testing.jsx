import { useState } from 'react';
import { FlaskConical, Send, ShieldAlert, ShieldCheck, Mail } from 'lucide-react';

export default function Testing() {
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async (e) => {
    e.preventDefault(); if (!body.trim()) return;
    setLoading(true); setResult(null);
    await new Promise(r => setTimeout(r, 1500));
    const isSpam = body.toLowerCase().match(/hadiah|gratis|menang|klik|transfer|undian/);
    setResult({
      label: isSpam ? 'spam' : 'ham',
      confidence: isSpam ? 0.9234 : 0.8876,
      detail: { embedding: 768, umap: 128, nodes: 1251, edges: 8432 },
    });
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header"><h1>Testing</h1><p>Uji model dengan email baru.</p></div>
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Input Email</h3>
          <form onSubmit={handleTest}>
            <div className="form-group"><label className="form-label">Subjek (opsional)</label>
              <input className="form-input" placeholder="Subjek email" value={subject} onChange={e => setSubject(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Isi Email *</label>
              <textarea className="form-textarea" rows={7} placeholder="Masukkan isi email..." value={body} onChange={e => setBody(e.target.value)} required />
              <div className="form-hint">{body.length} karakter</div></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%' }} disabled={loading||!body.trim()}>
              {loading ? <><div className="spinner"/> Menganalisis...</> : <><Send size={16}/> Uji Klasifikasi</>}
            </button>
          </form>
        </div>
        <div>
          {result ? (
            <div className={`result-card ${result.label}`}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                {result.label === 'spam'
                  ? <ShieldAlert size={28} />
                  : <ShieldCheck size={28} style={{ color:'var(--gray-400)' }} />}
                <div>
                  <div style={{ fontSize:'1.4rem', fontWeight:800 }}>{result.label === 'spam' ? 'SPAM' : 'AMAN (HAM)'}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--gray-500)' }}>Confidence: <strong style={{ color:'var(--black)' }}>{(result.confidence*100).toFixed(2)}%</strong></div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${result.confidence*100}%` }}/></div>
              </div>
              <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:14 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--gray-500)', marginBottom:8 }}>Detail Proses</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.8rem' }}>
                  <div>Embedding: <strong>{result.detail.embedding}d</strong></div>
                  <div>UMAP: <strong>{result.detail.umap}d</strong></div>
                  <div>Nodes: <strong>{result.detail.nodes}</strong></div>
                  <div>Edges: <strong>{result.detail.edges}</strong></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card loading-overlay" style={{ minHeight:300 }}>
              <Mail size={36} style={{ color:'var(--gray-300)' }} />
              <p style={{ color:'var(--gray-400)', fontSize:'0.85rem' }}>Masukkan email untuk menguji model</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
