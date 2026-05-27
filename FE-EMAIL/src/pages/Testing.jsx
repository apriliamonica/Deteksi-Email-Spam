import { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert, ShieldCheck, Mail, Upload, Trash2, Search, FileText, Calendar, Activity } from 'lucide-react';
import { modelAPI, emailAPI } from '../services/api';

export default function Testing() {
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [activeResult, setActiveResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [activeModelLoading, setActiveModelLoading] = useState(true);
  const [testHistory, setTestHistory] = useState([]);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const fileInputRef = useRef(null);

  // Batch upload flow state
  const [batchFile, setBatchFile] = useState(null);
  const [batchColumns, setBatchColumns] = useState([]);   // daftar kolom dari file
  const [batchMetrics, setBatchMetrics] = useState(null);
  const [testMode, setTestMode] = useState('all');
  const [loadingColumns, setLoadingColumns] = useState(false);

  useEffect(() => {
    fetchActiveModel();
  }, []);

  const fetchActiveModel = async () => {
    try {
      setActiveModelLoading(true);
      const res = await modelAPI.getActiveModel();
      setActiveModel(res.data);
    } catch (error) {
      console.error("Gagal mengambil model aktif:", error);
      setActiveModel(null);
    } finally {
      setActiveModelLoading(false);
    }
  };

  const handleManualTest = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);

    try {
      const payload = { body: body };
      if (subject.trim()) payload.subject = subject.trim();
      if (sender.trim()) payload.sender = sender.trim();

      const res = await emailAPI.classify(payload);
      const data = res.data;

      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        text: data.body || body,
        label: data.label,
        conf: data.confidence,
        detail: data.processing_detail
      };

      setTestHistory(prev => [newEntry, ...prev]);
      setActiveResult(newEntry);
      setBody('');
      setSubject('');
      setSender('');
    } catch (error) {
      console.error("Gagal melakukan klasifikasi manual:", error);
      alert("Gagal melakukan prediksi. Pastikan backend menyala dan model sudah dilatih.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: user picks a file → read columns
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBatchFile(file);
    setBatchColumns([]);
    setTestMode('all');
    setLoadingColumns(true);
    try {
      const res = await emailAPI.previewColumns(file);
      const cols = res.data.columns;
      setBatchColumns(cols);
      setBatchMetrics(res.data.metrics);
      setBatchMetrics(res.data.metrics);
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal membaca kolom file.');
      setBatchFile(null);
    } finally {
      setLoadingColumns(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // Step 2: user picks mode, clicks Mulai Testing
  const handleRunBatch = async () => {
    if (!batchFile) return;
    setUploadingBatch(true);
    try {
      const formData = new FormData();
      formData.append('file', batchFile);
      if (testMode !== 'all') {
        formData.append('text_column', testMode);
        formData.append('subject_column', 'NONE');
        formData.append('sender_column', 'NONE');
      }
      const res = await emailAPI.classifyBatch(formData);
      const results = res.data.results.map((r, i) => ({
        id: r.id || Date.now() + i,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        text: r.body,
        label: r.label,
        conf: r.confidence,
        detail: r.processing_detail
      }));
      setTestHistory(prev => [...results, ...prev]);
      setBatchFile(null); setBatchColumns([]);
      alert(`Berhasil menguji ${results.length} email!`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Gagal menguji file. Pastikan format benar.';
      alert(`Error: ${errorMsg}`);
    } finally {
      setUploadingBatch(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus hasil pengujian ini?")) {
      setTestHistory(prev => prev.filter(h => h.id !== id));
      if (activeResult?.id === id) setActiveResult(null);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Testing & Klasifikasi Email</h1>
        <p style={{ color: 'var(--gray-500)' }}>Uji model IndoBERT + GAT Anda dengan teks manual atau unggah file CSV untuk pengujian batch.</p>
      </div>

      {/* Active Model Indicator Banner */}
      {activeModelLoading ? (
        <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-50)' }}>
          <Activity size={18} className="spinner" style={{ color: 'var(--gray-500)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>Memeriksa model yang aktif...</span>
        </div>
      ) : activeModel ? (
        <div className="card" style={{
          padding: '16px 24px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          borderLeft: '4px solid #10b981',
          background: '#f0fdf4',
          borderColor: '#10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#dcfce7', padding: 8, borderRadius: '50%', color: '#15803d' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '1rem' }}>Model Deteksi Aktif</h4>
                <span className="badge badge-ham" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}>
                  Ready
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#166534' }}>
                Model: <strong style={{ color: '#14532d' }}>{activeModel.model_name}</strong> | Dataset: <strong style={{ color: '#14532d' }}>{activeModel.dataset_name}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>AKURASI MODEL</span>
              <strong style={{ fontSize: '1.2rem', color: '#14532d', fontWeight: 800 }}>{(activeModel.accuracy * 100).toFixed(2)}%</strong>
            </div>
            <div style={{ height: 28, width: 1, background: '#bbf7d0' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>F1-SCORE MODEL</span>
              <strong style={{ fontSize: '1.2rem', color: '#14532d', fontWeight: 800 }}>{(activeModel.f1_score * 100).toFixed(2)}%</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{
          padding: '16px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderLeft: '4px solid #ef4444',
          background: '#fef2f2',
          borderColor: '#ef4444'
        }}>
          <div style={{ background: '#fee2e2', padding: 8, borderRadius: '50%', color: '#991b1b' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, color: '#7f1d1d', fontSize: '1rem' }}>Tidak Ada Model Aktif</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#991b1b' }}>
              Silakan latih model baru atau pilih model yang ingin diaktifkan di halaman <strong style={{ color: '#7f1d1d' }}>Riwayat Model</strong>.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Input & Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Uji Teks Manual</h3>
              <form onSubmit={handleManualTest}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Pengirim (misal: user@domain.com)"
                      value={sender}
                      onChange={e => setSender(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Subjek Email"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Masukkan atau tempel isi email di sini... (wajib)"
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

            {/* Batch Upload Card */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} /> Pengujian Batch (CSV / Excel)
              </h3>

              {/* Step 1: Pick file */}
              {!batchFile && !loadingColumns && (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
                    Upload file CSV/Excel berisi daftar email, lalu pilih kolom yang ingin digunakan.
                  </p>
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
                  <button className="btn btn-outline" style={{ width: '100%', padding: 12 }} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> Pilih File Dataset
                  </button>
                </>
              )}

              {/* Loading columns */}
              {loadingColumns && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                  <Activity size={28} className="spinner" style={{ marginBottom: 8 }} />
                  <p>Membaca kolom file...</p>
                </div>
              )}

              {/* Step 2: Column selection */}
              {batchFile && batchColumns.length > 0 && batchMetrics && !uploadingBatch && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>Detail Dataset Terpilih:</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--black)', marginBottom: 12 }}>{batchFile.name}</div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--black)' }}>{batchMetrics.total_rows.toLocaleString()} Baris Data</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        Pilih Kolom Pengujian
                      </label>
                      <select className="form-input" value={testMode} onChange={e => setTestMode(e.target.value)}>
                        <option value="all">Gunakan Semua Kolom (Full)</option>
                        {batchColumns.map(c => <option key={c} value={c}>Hanya Kolom: {c}</option>)}
                      </select>
                      <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 8 }}>
                        {testMode === 'all' 
                          ? 'Sistem akan otomatis mendeteksi kolom teks, subject, dan sender untuk diuji.' 
                          : 'Hanya kolom terpilih yang akan diuji sebagai teks email (subject dan sender akan diabaikan).'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setBatchFile(null); setBatchColumns([]); }}>
                      Ganti File
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                      disabled={!batchFile}
                      onClick={handleRunBatch}
                    >
                      <Send size={16} /> Mulai Testing
                    </button>
                  </div>
                </div>
              )}

              {/* Running */}
              {uploadingBatch && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                  <Activity size={28} className="spinner" style={{ color: 'var(--primary)', marginBottom: 8 }} />
                  <p>Sedang memproses dan mengklasifikasi email...</p>
                </div>
              )}
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
                    <tr key={item.id} style={{ cursor: 'pointer', background: activeResult?.id === item.id ? 'var(--gray-50)' : 'transparent' }} onClick={() => setActiveResult(item)}>
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
                    <line x1="150" y1="90" x2="80" y2="40" stroke="#ef4444" strokeWidth={activeResult.label === 'spam' ? "3" : "0.5"} opacity={activeResult.label === 'spam' ? "0.8" : "0.1"} />
                    <line x1="150" y1="90" x2="220" y2="50" stroke="#ef4444" strokeWidth={activeResult.label === 'spam' ? "2" : "0.5"} opacity={activeResult.label === 'spam' ? "0.6" : "0.1"} />
                    <line x1="150" y1="90" x2="90" y2="140" stroke="#10b981" strokeWidth={activeResult.label === 'ham' ? "2.5" : "0.5"} opacity={activeResult.label === 'ham' ? "0.7" : "0.1"} />
                    <line x1="150" y1="90" x2="210" y2="130" stroke="#10b981" strokeWidth={activeResult.label === 'ham' ? "3" : "0.5"} opacity={activeResult.label === 'ham' ? "0.8" : "0.1"} />
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
