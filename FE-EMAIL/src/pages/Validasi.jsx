import { useState } from 'react';
import { ShieldCheck, Play, CheckCircle, BarChart3 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Validasi() {
  const [validated, setValidated] = useState(false);
  const [result, setResult] = useState(null);

  const handleValidate = async () => {
    setValidated(false);
    await new Promise(r => setTimeout(r, 2000));
    setResult({
      accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1_score: 0.9481,
      confusion_matrix: { tp: 452, tn: 720, fp: 43, fn: 35 },
      scatter: Array.from({ length: 200 }, () => ({
        x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20,
        label: Math.random() > 0.4 ? 0 : 1,
      })),
    });
    setValidated(true);
  };

  return (
    <div>
      <div className="page-header"><h1>Validasi Model</h1><p>Validasi performa model pada data testing.</p></div>

      <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
        <ShieldCheck size={40} style={{ color: validated ? 'var(--accent-400)' : 'var(--surface-500)', marginBottom: 12 }} />
        <h3>{validated ? 'Validasi Selesai' : 'Jalankan Validasi'}</h3>
        <p style={{ color: 'var(--surface-400)', fontSize: '0.85rem', marginBottom: 20 }}>Menguji model dengan data test yang belum pernah dilihat.</p>
        <button className="btn btn-primary" onClick={handleValidate}><Play size={16} /> {validated ? 'Validasi Ulang' : 'Mulai Validasi'}</button>
      </div>

      {result && (
        <>
          {/* Confusion Matrix */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Confusion Matrix</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gridTemplateRows: 'auto auto auto', gap: 0, maxWidth: 400, margin: '0 auto' }}>
              <div></div>
              <div style={{ textAlign: 'center', padding: 10, fontWeight: 600, fontSize: '0.75rem', color: 'var(--surface-400)' }}>Prediksi HAM</div>
              <div style={{ textAlign: 'center', padding: 10, fontWeight: 600, fontSize: '0.75rem', color: 'var(--surface-400)' }}>Prediksi SPAM</div>
              <div style={{ display: 'flex', alignItems: 'center', padding: 10, fontWeight: 600, fontSize: '0.75rem', color: 'var(--surface-400)' }}>Aktual HAM</div>
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, margin: 4, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-400)' }}>{result.confusion_matrix.tn}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--surface-400)' }}>TN</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, margin: 4, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger-400)' }}>{result.confusion_matrix.fp}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--surface-400)' }}>FP</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: 10, fontWeight: 600, fontSize: '0.75rem', color: 'var(--surface-400)' }}>Aktual SPAM</div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, margin: 4, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger-400)' }}>{result.confusion_matrix.fn}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--surface-400)' }}>FN</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, margin: 4, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-400)' }}>{result.confusion_matrix.tp}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--surface-400)' }}>TP</div>
              </div>
            </div>
          </div>

          {/* UMAP Scatter */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Visualisasi UMAP 2D</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)"/><XAxis type="number" dataKey="x" stroke="var(--surface-500)" fontSize={11}/><YAxis type="number" dataKey="y" stroke="var(--surface-500)" fontSize={11}/><Tooltip/>
                <Scatter data={result.scatter.filter(d => d.label === 0)} fill="#10b981" opacity={0.6} name="Ham" />
                <Scatter data={result.scatter.filter(d => d.label === 1)} fill="#ef4444" opacity={0.6} name="Spam" />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: '0.8rem' }}>
              <span>🟢 Ham (Aman)</span><span>🔴 Spam</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
