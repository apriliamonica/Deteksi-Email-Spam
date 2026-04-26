import { useState } from 'react';
import { Mail, Send, ShieldAlert, ShieldCheck, Loader, FileText, Cpu, GitBranch } from 'lucide-react';

export default function Classify() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sender, setSender] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Demo - di production ganti dengan API call
      // const res = await emailAPI.classify({ subject, body, sender });
      // setResult(res.data);

      await new Promise(r => setTimeout(r, 1500));

      // Simulasi hasil
      const isSpam = body.toLowerCase().includes('hadiah') ||
                     body.toLowerCase().includes('gratis') ||
                     body.toLowerCase().includes('menang') ||
                     body.toLowerCase().includes('klik') ||
                     body.toLowerCase().includes('transfer');

      setResult({
        label: isSpam ? 'spam' : 'ham',
        confidence: isSpam ? 0.9234 : 0.8876,
        body,
        subject,
        processing_detail: {
          preprocessed_text: body.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 100),
          original_embedding_dim: 768,
          reduced_embedding_dim: 128,
          graph_nodes: 1251,
          graph_edges: 8432,
        },
      });
    } catch (err) {
      setError('Gagal mengklasifikasi email. Pastikan model sudah di-training.');
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Klasifikasi Email</h1>
        <p>Masukkan email untuk mendeteksi apakah spam atau bukan.</p>
      </div>

      <div className="grid-2">
        {/* Input Form */}
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={20} /> Input Email
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Pengirim (opsional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: promo@email.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subjek (opsional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Subjek email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Isi Email *</label>
              <textarea
                className="form-textarea"
                placeholder="Masukkan isi email di sini..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                required
              />
              <div className="form-hint">{body.length} karakter</div>
            </div>

            {error && (
              <div className="alert alert-error">
                <ShieldAlert size={16} /> {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !body.trim()}>
              {loading ? (
                <><div className="spinner" /> Menganalisis...</>
              ) : (
                <><Send size={18} /> Deteksi Spam</>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        <div>
          {loading && (
            <div className="card loading-overlay">
              <Loader size={40} className="spinner" style={{ width: 40, height: 40 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'var(--surface-200)', marginBottom: 4 }}>Memproses email...</p>
                <p style={{ fontSize: '0.8rem' }}>IndoBERT → UMAP → GAT</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className={`result-card ${result.label}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {result.label === 'spam' ? (
                  <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={28} color="var(--danger-400)" />
                  </div>
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={28} color="var(--accent-400)" />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {result.label === 'spam' ? '🚫 SPAM' : '✅ AMAN (HAM)'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--surface-400)' }}>
                    Confidence: <strong style={{ color: 'var(--surface-200)' }}>{(result.confidence * 100).toFixed(2)}%</strong>
                  </div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--surface-400)' }}>
                  <span>Confidence Score</span>
                  <span>{(result.confidence * 100).toFixed(2)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${result.confidence * 100}%`,
                    background: result.label === 'spam'
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : 'linear-gradient(90deg, #10b981, #34d399)',
                  }} />
                </div>
              </div>

              {/* Processing Detail */}
              {result.processing_detail && (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--surface-400)', marginBottom: 12, fontWeight: 600 }}>
                    Detail Proses
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <FileText size={14} color="var(--primary-400)" />
                      <span style={{ color: 'var(--surface-400)' }}>Embedding:</span>
                      <strong>{result.processing_detail.original_embedding_dim}d</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <Cpu size={14} color="var(--accent-400)" />
                      <span style={{ color: 'var(--surface-400)' }}>UMAP:</span>
                      <strong>{result.processing_detail.reduced_embedding_dim}d</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <GitBranch size={14} color="var(--warning-400)" />
                      <span style={{ color: 'var(--surface-400)' }}>Nodes:</span>
                      <strong>{result.processing_detail.graph_nodes}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <GitBranch size={14} color="var(--danger-400)" />
                      <span style={{ color: 'var(--surface-400)' }}>Edges:</span>
                      <strong>{result.processing_detail.graph_edges}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && (
            <div className="card loading-overlay" style={{ minHeight: 300 }}>
              <Mail size={48} style={{ color: 'var(--surface-600)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 500, color: 'var(--surface-400)' }}>Masukkan email untuk memulai deteksi</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--surface-500)' }}>Hasil klasifikasi akan muncul di sini</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
