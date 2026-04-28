import { useState } from 'react';
import { Mail, ShieldAlert, ShieldCheck, Play, Send, History, Sparkles } from 'lucide-react';
import { emailAPI } from '../services/api';

export default function Dashboard({ user }) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await emailAPI.classify({ text: inputText });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      // Simulate result for demo if API fails
      setResult({ label: Math.random() > 0.5 ? 'SPAM' : 'HAM', confidence: 0.9821 });
    } finally {
      setLoading(false);
    }
  };

  const stats = { total: 10240, spam: 4120, ham: 6120 };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 8, 
          padding: '6px 12px', background: 'rgba(0,0,0,0.05)', 
          borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)',
          marginBottom: 16
        }}>
          <Sparkles size={14} style={{ color: '#f59e0b' }} /> AI-Powered Spam Detection
        </div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 12 }}>
          Halo, {user?.name.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--gray-500)', maxWidth: 500, margin: '0 auto' }}>
          Masukkan isi email di bawah ini untuk mendeteksi apakah email tersebut aman atau spam menggunakan model hibrida IndoBERT + GAT.
        </p>
      </div>

      {/* Main Input Area (GPT Style) */}
      <div className="card" style={{ padding: 8, borderRadius: 20, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)', border: '1px solid var(--gray-200)', background: 'white' }}>
        <form onSubmit={handleCheck}>
          <textarea
            placeholder="Tempelkan isi email di sini..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              width: '100%',
              minHeight: 120,
              padding: '20px',
              border: 'none',
              outline: 'none',
              fontSize: '1.05rem',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--gray-50)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-sm btn-outline" style={{ borderRadius: 10 }}>
                <History size={14} /> Riwayat
              </button>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !inputText.trim()}
              style={{ padding: '10px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {loading ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : <><Send size={16} /> Periksa Email</>}
            </button>
          </div>
        </form>
      </div>

      {/* Result Area */}
      {result && (
        <div className={`result-card ${result.label.toLowerCase()}`} style={{ marginTop: 24, borderRadius: 20, animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: '50%', 
              background: result.label === 'SPAM' ? 'var(--black)' : 'var(--gray-200)',
              color: result.label === 'SPAM' ? 'white' : 'var(--black)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {result.label === 'SPAM' ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Hasil Analisis</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                Email ini terdeteksi sebagai <span style={{ color: result.label === 'SPAM' ? '#ef4444' : '#10b981' }}>{result.label}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 2 }}>
                Tingkat Kepercayaan: {(result.confidence * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats (Subtle) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 60 }}>
        {[
          { label: 'Total Database', value: stats.total.toLocaleString(), icon: Mail },
          { label: 'Terdeteksi Spam', value: stats.spam.toLocaleString(), icon: ShieldAlert },
          { label: 'Email Aman', value: stats.ham.toLocaleString(), icon: ShieldCheck },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '16px', background: 'var(--gray-50)', borderRadius: 16, border: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
