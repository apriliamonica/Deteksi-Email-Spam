import { useState } from 'react';
import { Send, ShieldAlert, ShieldCheck, Mail, Upload, Trash2, Search, FileText, Calendar, Activity } from 'lucide-react';

export default function Testing() {
  const [body, setBody] = useState('');
  const [activeResult, setActiveResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testHistory, setTestHistory] = useState([
    { id: 1, date: "28/04/26", text: "Segera klaim hadiah undian Anda di link ini", label: "spam", conf: 0.95 },
    { id: 2, date: "28/04/26", text: "Rapat tim akan diadakan besok pagi jam 10", label: "ham", conf: 0.92 },
    { id: 3, date: "27/04/26", text: "Anda terpilih sebagai pemenang iPhone 15 GRATIS", label: "spam", conf: 0.98 },
  ]);

  const handleManualTest = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    const isSpam = body.toLowerCase().match(/hadiah|gratis|menang|klik|transfer|undian|rekening/);
    const label = isSpam ? 'spam' : 'ham';
    const conf = isSpam ? 0.9234 : 0.8876;
    
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      text: body,
      label,
      conf
    };

    setTestHistory(prev => [newEntry, ...prev]);
    setActiveResult({
      ...newEntry,
      detail: { embedding: 768, umap: 128, nodes: 1251, edges: 8432 },
    });
    setBody('');
    setLoading(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus hasil pengujian ini?")) {
      setTestHistory(prev => prev.filter(h => h.id !== id));
      if (activeResult?.id === id) setActiveResult(null);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Testing & Klasifikasi Email</h1>
        <p style={{ color: 'var(--gray-500)' }}>Uji model IndoBERT + GAT Anda dengan teks manual atau unggah file CSV untuk pengujian batch.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Input & Upload */}
          <div className="grid-2" style={{ gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Uji Teks Manual</h3>
              <form onSubmit={handleManualTest}>
                <div className="form-group">
                  <textarea 
                    className="form-textarea" 
                    rows={4} 
                    placeholder="Masukkan atau tempel isi email di sini..." 
                    value={body} 
                    onChange={e => setBody(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading || !body.trim()}>
                  {loading ? <><Activity size={18} className="spinner" /> Memproses...</> : <><Send size={18} /> Periksa Email</>}
                </button>
              </form>
            </div>

            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', border: '2px dashed var(--gray-300)', background: 'var(--gray-50)' }}>
              <Upload size={40} style={{ color: 'var(--gray-400)', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8 }}>Pengujian Batch (CSV)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 20 }}>Unggah file CSV berisi daftar email untuk klasifikasi massal.</p>
              <button className="btn btn-outline" style={{ background: 'white' }}>Pilih File CSV</button>
            </div>
          </div>

          {/* Section 2: History Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Hasil Pengujian Terbaru</h3>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input type="text" placeholder="Cari hasil..." style={{ padding: '6px 12px 6px 32px', borderRadius: 20, border: '1px solid var(--gray-200)', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div className="table-container">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ width: 50 }}>No</th>
                    <th style={{ width: 120 }}><Calendar size={14} /> Tgl Pengujian</th>
                    <th>Testing (Konten Email)</th>
                    <th style={{ width: 120 }}>Keterangan</th>
                    <th style={{ width: 100, textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {testHistory.map((item, index) => (
                    <tr key={item.id} style={{ cursor: 'pointer', background: activeResult?.id === item.id ? 'var(--gray-50)' : 'transparent' }} onClick={() => setActiveResult({ ...item, detail: { embedding: 768, umap: 128, nodes: 1251, edges: 8432 } })}>
                      <td>{index + 1}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{item.date}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--black)', fontWeight: 500 }}>
                          {item.text.length > 60 ? item.text.substring(0, 60) + '...' : item.text}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${item.label}`} style={{ display: 'block', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>
                          {item.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', borderColor: '#ef4444', padding: '4px 8px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {testHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Belum ada data pengujian.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Detail & GAT Visualization */}
        <div style={{ position: 'sticky', top: 24 }}>
          {activeResult ? (
            <div className={`card`} style={{ padding: 24, border: '2px solid var(--black)', animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                {activeResult.label === 'spam' ? (
                  <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}><ShieldAlert size={24} style={{ color: '#ef4444' }} /></div>
                ) : (
                  <div style={{ padding: 10, background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}><ShieldCheck size={24} style={{ color: '#10b981' }} /></div>
                )}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Prediksi Model</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: activeResult.label === 'spam' ? '#ef4444' : '#10b981' }}>
                    {activeResult.label === 'spam' ? 'TERDETEKSI SPAM' : 'EMAIL AMAN (HAM)'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                  <span>Confidence Level</span>
                  <span style={{ fontWeight: 700 }}>{(activeResult.conf * 100).toFixed(2)}%</span>
                </div>
                <div className="progress-bar" style={{ height: 8, background: 'var(--gray-100)' }}>
                  <div className="progress-fill" style={{ width: `${activeResult.conf * 100}%`, background: activeResult.label === 'spam' ? '#ef4444' : '#10b981' }} />
                </div>
              </div>

              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: 16, background: 'var(--gray-50)', marginBottom: 20 }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: 12 }}>Visualisasi Graph Attention (GAT)</h4>
                <div style={{ height: 180, background: 'white', borderRadius: 8, border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
                  <svg width="100%" height="100%" viewBox="0 0 300 180">
                    <line x1="150" y1="90" x2="80" y2="40" stroke="#ef4444" strokeWidth={activeResult.label==='spam' ? "3" : "0.5"} opacity={activeResult.label==='spam' ? "0.8" : "0.1"} />
                    <line x1="150" y1="90" x2="220" y2="50" stroke="#ef4444" strokeWidth={activeResult.label==='spam' ? "2" : "0.5"} opacity={activeResult.label==='spam' ? "0.6" : "0.1"} />
                    <line x1="150" y1="90" x2="90" y2="140" stroke="#10b981" strokeWidth={activeResult.label==='ham' ? "2.5" : "0.5"} opacity={activeResult.label==='ham' ? "0.7" : "0.1"} />
                    <line x1="150" y1="90" x2="210" y2="130" stroke="#10b981" strokeWidth={activeResult.label==='ham' ? "3" : "0.5"} opacity={activeResult.label==='ham' ? "0.8" : "0.1"} />
                    <circle cx="80" cy="40" r="8" fill="#ef4444" /> 
                    <circle cx="220" cy="50" r="10" fill="#ef4444" /> 
                    <circle cx="90" cy="140" r="12" fill="#10b981" /> 
                    <circle cx="210" cy="130" r="9" fill="#10b981" /> 
                    <circle cx="150" cy="90" r="14" fill="white" stroke="var(--black)" strokeWidth="2" />
                    <circle cx="150" cy="90" r="5" fill="var(--black)" />
                  </svg>
                </div>
              </div>

              <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 12 }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 8 }}>Isi Email Pengujian:</h4>
                <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                  "{activeResult.text}"
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px dashed var(--gray-300)' }}>
              <Mail size={48} style={{ color: 'var(--gray-200)', marginBottom: 16 }} />
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Pilih hasil pengujian dari tabel atau lakukan uji manual untuk melihat detail visualisasi GAT.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
