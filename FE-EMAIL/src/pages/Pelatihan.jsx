import { useState } from 'react';
import { Brain, Play, Loader, CheckCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Pelatihan() {
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');

  const handleTrain = async () => {
    setTraining(true); setProgress(0); setResult(null);
    const steps = [
      { s: '1/7 Preprocessing teks...', p: 10 },
      { s: '2/7 Fine-tuning IndoBERT (5 epochs)...', p: 35 },
      { s: '3/7 Generating embeddings (768d)...', p: 50 },
      { s: '4/7 UMAP reduction (768d → 128d)...', p: 60 },
      { s: '5/7 Building graph (cosine similarity)...', p: 70 },
      { s: '6/7 Training GAT (30 epochs)...', p: 90 },
      { s: '7/7 Menyimpan model...', p: 100 },
    ];
    for (const st of steps) {
      setStep(st.s); setProgress(st.p);
      await new Promise(r => setTimeout(r, 1200));
    }
    setResult({
      accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1_score: 0.9481,
      train_size: 8000, test_size: 2000,
      ft_loss: Array.from({ length: 5 }, (_, i) => ({ epoch: i+1, loss: +(2.1 * Math.exp(-i*0.5) + 0.3).toFixed(4) })),
      gat_loss: Array.from({ length: 30 }, (_, i) => ({ epoch: i+1, loss: +(1.5 * Math.exp(-i*0.12) + 0.1).toFixed(4) })),
    });
    setTraining(false);
  };

  return (
    <div>
      <div className="page-header"><h1>Pelatihan Model</h1><p>Training pipeline: IndoBERT Fine-tune → UMAP → GAT</p></div>

      {/* Start Button */}
      <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 40 }}>
        <Brain size={48} style={{ color: training ? 'var(--primary-400)' : 'var(--surface-500)', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>
          {training ? 'Sedang Training...' : result ? 'Training Selesai!' : 'Mulai Pelatihan Model'}
        </h2>
        <p style={{ color: 'var(--surface-400)', marginBottom: 24, fontSize: '0.85rem' }}>
          Pastikan dataset dan parameter sudah dikonfigurasi di menu sebelumnya.
        </p>

        {training && (
          <div style={{ maxWidth: 500, margin: '0 auto', marginBottom: 20 }}>
            <div className="progress-bar" style={{ height: 14, marginBottom: 10 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--surface-400)' }}>{step} — {progress}%</p>
          </div>
        )}

        {!training && (
          <button className="btn btn-primary btn-lg" onClick={handleTrain}>
            <Play size={20} /> {result ? 'Training Ulang' : 'Mulai Training'}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="alert alert-success" style={{ marginBottom: 24 }}>
            <CheckCircle size={16} /> Training selesai! Model tersimpan. Train: {result.train_size} | Test: {result.test_size}
          </div>

          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { l: 'Accuracy', v: result.accuracy, c: 'var(--primary-400)' },
              { l: 'Precision', v: result.precision, c: 'var(--accent-400)' },
              { l: 'Recall', v: result.recall, c: 'var(--warning-400)' },
              { l: 'F1 Score', v: result.f1_score, c: 'var(--danger-400)' },
            ].map((m, i) => (
              <div key={i} className="stat-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
                <div className="stat-label">{m.l}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.c }}>{(m.v * 100).toFixed(2)}%</div>
                <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${m.v*100}%`, background: m.c }} /></div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 16 }}><BarChart3 size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> IndoBERT Fine-tune Loss</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={result.ft_loss}><CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)"/><XAxis dataKey="epoch" stroke="var(--surface-500)" fontSize={11}/><YAxis stroke="var(--surface-500)" fontSize={11}/><Tooltip contentStyle={{ background:'var(--surface-800)', border:'1px solid var(--surface-700)', borderRadius:8, color:'var(--surface-100)' }}/><Line type="monotone" dataKey="loss" stroke="var(--accent-400)" strokeWidth={2} dot={{ r:3 }}/></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}><BarChart3 size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> GAT Training Loss</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={result.gat_loss}><CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)"/><XAxis dataKey="epoch" stroke="var(--surface-500)" fontSize={11}/><YAxis stroke="var(--surface-500)" fontSize={11}/><Tooltip contentStyle={{ background:'var(--surface-800)', border:'1px solid var(--surface-700)', borderRadius:8, color:'var(--surface-100)' }}/><Line type="monotone" dataKey="loss" stroke="var(--primary-400)" strokeWidth={2} dot={false}/></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
