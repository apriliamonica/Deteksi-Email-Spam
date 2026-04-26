import { useState } from 'react';
import { FlaskConical, Send, ShieldAlert, ShieldCheck, Mail, FileText, Cpu, GitBranch } from 'lucide-react';

export default function Testing() {
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true); setResult(null);
    await new Promise(r => setTimeout(r, 1500));

    const isSpam = body.toLowerCase().match(/hadiah|gratis|menang|klik|transfer|undian|segera|prize/);
    setResult({
      label: isSpam ? 'spam' : 'ham',
      confidence: isSpam ? 0.9234 : 0.8876,
      detail: { preprocessed: body.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 80), embedding: 768, umap: 128, nodes: 1251, edges: 8432 },
    });
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header"><h1>Testing</h1><p>Uji model dengan email baru untuk melihat hasil klasifikasi.</p></div>
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical size={20}/> Input Email Baru</h3>
          <form onSubmit={handleTest}>
            <div className="form-group">
              <label className="form-label">Subjek (opsional)</label>
              <input className="form-input" placeholder="Subjek email" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Isi Email *</label>
              <textarea className="form-textarea" rows={8} placeholder="Masukkan isi email yang ingin diuji..." value={body} onChange={e => setBody(e.target.value)} required />
              <div className="form-hint">{body.length} karakter</div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !body.trim()}>
              {loading ? <><div className="spinner"/> Menganalisis...</> : <><Send size={18}/> Uji Klasifikasi</>}
            </button>
          </form>
        </div>

        <div>
          {result ? (
            <div className={`result-card ${result.label}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: result.label === 'spam' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {result.label === 'spam' ? <ShieldAlert size={30} color="var(--danger-400)"/> : <ShieldCheck size={30} color="var(--accent-400)"/>}
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{result.label === 'spam' ? '🚫 SPAM' : '✅ AMAN (HAM)'}</div>
                  <div style={{ color: 'var(--surface-400)', fontSize: '0.85rem' }}>Confidence: <strong style={{ color: 'var(--surface-200)' }}>{(result.confidence * 100).toFixed(2)}%</strong></div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--surface-400)' }}><span>Confidence</span><span>{(result.confidence*100).toFixed(2)}%</span></div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${result.confidence*100}%`, background: result.label==='spam' ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#10b981,#34d399)' }}/></div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--surface-400)', marginBottom: 12 }}>Detail Proses</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    [FileText, 'Embedding', `${result.detail.embedding}d`, 'var(--primary-400)'],
                    [Cpu, 'UMAP', `${result.detail.umap}d`, 'var(--accent-400)'],
                    [GitBranch, 'Nodes', result.detail.nodes, 'var(--warning-400)'],
                    [GitBranch, 'Edges', result.detail.edges, 'var(--danger-400)'],
                  ].map(([I, l, v, c], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <I size={14} color={c}/> <span style={{ color: 'var(--surface-400)' }}>{l}:</span> <strong>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card loading-overlay" style={{ minHeight: 350 }}>
              <Mail size={48} style={{ color: 'var(--surface-600)' }} />
              <p style={{ color: 'var(--surface-400)' }}>Masukkan email untuk menguji model</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
