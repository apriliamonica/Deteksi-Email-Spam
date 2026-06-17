import { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert, ShieldCheck, Mail, Upload, Search, FileText, Calendar, Activity } from 'lucide-react';
import { modelAPI, emailAPI } from '../services/api';
import Pagination from '../components/Pagination';

export default function Testing() {
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [activeResult, setActiveResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [activeModelLoading, setActiveModelLoading] = useState(true);
  const [modelsHistory, setModelsHistory] = useState([]);
  const [isActivating, setIsActivating] = useState(false);
  const [testHistory, setTestHistory] = useState([]);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  // Batch upload flow state
  const [batchFile, setBatchFile] = useState(null);
  const [batchColumns, setBatchColumns] = useState([]);   // daftar kolom dari file
  const [batchMetrics, setBatchMetrics] = useState(null);

  // Selected columns for testing
  const [colText, setColText] = useState('');
  const [colSubject, setColSubject] = useState('');
  const [colSender, setColSender] = useState('');
  const [loadingColumns, setLoadingColumns] = useState(false);



  const fetchActiveModel = async () => {
    try {
      setActiveModelLoading(true);
      const [activeRes, historyRes] = await Promise.all([
        modelAPI.getActiveModel(),
        modelAPI.getHistory()
      ]);
      setActiveModel(activeRes.data);
      setModelsHistory(historyRes.data);
    } catch (error) {
      console.error("Gagal mengambil model aktif:", error);
      setActiveModel(null);
    } finally {
      setActiveModelLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveModel();
  }, []);

  const handleModelChange = async (e) => {
    const newId = e.target.value;
    if (!newId || newId == activeModel?.id) return;

    setIsActivating(true);
    try {
      await modelAPI.activateModel(newId);
      await fetchActiveModel();
    } catch (error) {
      console.error("Gagal mengubah model:", error);
      alert("Gagal mengubah model aktif.");
    } finally {
      setIsActivating(false);
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
        type: 'manual',
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
    setLoadingColumns(true);
    try {
      const res = await emailAPI.previewColumns(file);
      const cols = res.data.columns;
      setBatchColumns(cols);
      setBatchMetrics(res.data.metrics);
      // Auto-detect sensible defaults
      const find = (...names) => cols.find(c => names.includes(c)) || '';
      setColText(find('text_id', 'text', 'body'));
      setColSubject(find('subject_id', 'subject'));
      setColSender(find('sender'));
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
      formData.append('text_column', colText);
      formData.append('subject_column', colSubject);
      formData.append('sender_column', colSender);

      const res = await emailAPI.classifyBatch(formData);
      const results = res.data.results.map((r, i) => ({
        id: r.id || Date.now() + i,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        text: r.body,
        label: r.label,
        conf: r.confidence,
        detail: r.processing_detail
      }));

      const newEntry = {
        id: Date.now(),
        type: 'batch',
        filename: batchFile.name,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        text: `Pengujian batch dari file: ${batchFile.name} (${results.length} data diproses)`,
        label: 'batch',
        results: results,
      };

      setTestHistory(prev => [newEntry, ...prev]);
      setBatchFile(null); setBatchColumns([]);
      alert(`Berhasil menguji ${results.length} email!`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Gagal menguji file. Pastikan format benar.';
      alert(`Error: ${errorMsg}`);
    } finally {
      setUploadingBatch(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredHistory = testHistory.filter(item => {
    const textMatch = item.text?.toLowerCase().includes(searchTerm.toLowerCase());
    const labelMatch = item.label?.toLowerCase().includes(searchTerm.toLowerCase());
    const filenameMatch = item.filename?.toLowerCase().includes(searchTerm.toLowerCase());
    return textMatch || labelMatch || filenameMatch;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full px-4 md:px-0 animate-in fade-in duration-300">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold text-app-text mb-1">Testing</h1>
        <p className="text-sm text-app-text-muted">Uji model IndoBERT + GAT Anda dengan teks manual atau unggah file CSV untuk pengujian batch.</p>
      </div>

      {/* Model Selection Dropdown */}
      <div className="mb-6 p-4 bg-app-surface border border-app-border rounded-2xl flex flex-wrap items-center gap-3 shadow-sm">
        <label className="font-semibold text-xs md:text-sm text-app-text">Model untuk Testing:</label>
        <select 
          value={activeModel?.id || ''} 
          onChange={handleModelChange} 
          disabled={isActivating} 
          className="p-1.5 md:p-2 rounded-xl border border-app-border bg-app-bg text-app-text text-xs md:text-sm font-semibold outline-none focus:border-ocean cursor-pointer"
        >
          {modelsHistory.map(m => (
            <option key={m.id} value={m.id}>
              {m.model_name} (Acc: {(m.accuracy * 100).toFixed(1)}%)
            </option>
          ))}
        </select>
        {isActivating && <Activity size={14} className="spinner text-app-text-muted" />}
      </div>

      {/* Active Model Indicator Banner */}
      {activeModelLoading ? (
        <div className="card !p-4 mb-6 flex items-center gap-3 bg-app-surface border border-app-border rounded-2xl">
          <Activity size={18} className="spinner text-app-text-muted" />
          <span className="text-xs md:text-sm text-app-text-muted">Memeriksa model yang aktif...</span>
        </div>
      ) : activeModel ? (
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-mint bg-mint-light/20 dark:bg-mint-light/5 border border-app-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-mint-light dark:bg-mint-dark text-mint dark:text-mint-light p-2 rounded-full shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-extrabold text-app-text text-sm md:text-base">Model Deteksi Aktif</h4>
                <span className="badge badge-ham text-[9px] font-bold py-0.5 px-2">Ready</span>
              </div>
              <p className="text-xs text-app-text-muted mt-1">Menggunakan model: <span className="font-semibold text-ocean">{activeModel.model_name}</span></p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-left md:text-right">
              <span className="block text-[10px] text-app-text-muted font-bold uppercase tracking-wider">AKURASI MODEL</span>
              <strong className="text-lg font-extrabold text-mint">{(activeModel.accuracy * 100).toFixed(2)}%</strong>
            </div>
            <div className="h-6 w-[1px] bg-app-border" />
            <div className="text-left md:text-right">
              <span className="block text-[10px] text-app-text-muted font-bold uppercase tracking-wider">F1-SCORE MODEL</span>
              <strong className="text-lg font-extrabold text-mint">{(activeModel.f1_score * 100).toFixed(2)}%</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 border-l-4 border-sunrise bg-sunrise-light/20 dark:bg-sunrise-light/5 border border-app-border rounded-2xl p-4 shadow-sm">
          <div className="bg-sunrise-light dark:bg-sunrise-dark text-sunrise dark:text-sunrise-light p-2 rounded-full shadow-sm">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-app-text text-sm md:text-base">Tidak Ada Model Aktif</h4>
            <p className="text-xs text-app-text-muted mt-0.5">
              Silakan latih model baru atau pilih model yang ingin diaktifkan di halaman <strong className="text-ocean">Riwayat Model</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid (Responsive layout) */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-6 items-start">

        <div className="flex flex-col gap-6 w-full">
          {/* Section 1: Input & Upload */}
          <div className="flex flex-col gap-6">
            <div className="card !p-5 !rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <h3 className="font-bold text-sm md:text-base text-app-text mb-4 flex items-center gap-2"><FileText size={18} className="text-ocean" /> Uji Teks Manual</h3>
              <form onSubmit={handleManualTest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="form-group !mb-0">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Pengirim (misal: user@domain.com)"
                      value={sender}
                      onChange={e => setSender(e.target.value)}
                    />
                  </div>
                  <div className="form-group !mb-0">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Subjek Email"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group !mb-0">
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Masukkan atau tempel isi email di sini... (wajib)"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full py-2.5 !rounded-xl" disabled={loading || !body.trim()}>
                  {loading ? <><Activity size={16} className="spinner" /> Memproses...</> : <><Send size={16} /> Periksa Email</>}
                </button>
              </form>
            </div>

            {/* Batch Upload Card */}
            <div className="card !p-5 !rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <h3 className="font-bold text-sm md:text-base text-app-text mb-3 flex items-center gap-2">
                <Upload size={18} className="text-ocean" /> Pengujian Batch (CSV / Excel)
              </h3>

              {/* Step 1: Pick file */}
              {!batchFile && !loadingColumns && (
                <>
                  <p className="text-xs text-app-text-muted mb-4">
                    Upload file CSV/Excel berisi daftar email, lalu pilih kolom yang ingin digunakan.
                  </p>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button className="btn btn-outline w-full py-2.5 !rounded-xl" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> Pilih File Dataset
                  </button>
                </>
              )}

              {/* Loading columns */}
              {loadingColumns && (
                <div className="text-center py-6 text-app-text-muted">
                  <Activity size={24} className="spinner mx-auto mb-2 text-ocean" />
                  <p className="text-xs">Membaca kolom file...</p>
                </div>
              )}

              {/* Step 2: Column selection */}
              {batchFile && batchColumns.length > 0 && batchMetrics && !uploadingBatch && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-app-bg border border-app-border p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider mb-1">Detail Dataset Terpilih:</div>
                    <div className="text-xs font-semibold text-app-text mb-2 break-all">{batchFile.name}</div>
                    <div className="text-base font-extrabold text-app-text">{batchMetrics.total_rows.toLocaleString()} Baris Data</div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-app-text-muted block mb-1">
                        Kolom Isi Email (Teks) <span className="text-sunrise">*</span>
                      </label>
                      <select className="form-select" value={colText} onChange={e => setColText(e.target.value)}>
                        <option value="">-- Pilih kolom --</option>
                        {batchColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-app-text-muted block mb-1">
                        Kolom Subject <span className="text-sunrise">*</span>
                      </label>
                      <select className="form-select" value={colSubject} onChange={e => setColSubject(e.target.value)}>
                        <option value="">-- Pilih kolom --</option>
                        {batchColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-app-text-muted block mb-1">
                        Kolom Pengirim (Sender) <span className="text-sunrise">*</span>
                      </label>
                      <select className="form-select" value={colSender} onChange={e => setColSender(e.target.value)}>
                        <option value="">-- Pilih kolom --</option>
                        {batchColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn btn-outline flex-1 py-2 !rounded-xl text-xs" onClick={() => { setBatchFile(null); setBatchColumns([]); setColText(''); setColSubject(''); setColSender(''); }}>
                      Ganti File
                    </button>
                    <button className="btn btn-primary flex-[2] py-2 !rounded-xl text-xs" disabled={!colText || !colSubject || !colSender} onClick={handleRunBatch}>
                      <Send size={14} /> Mulai Testing
                    </button>
                  </div>
                </div>
              )}

              {/* Running */}
              {uploadingBatch && (
                <div className="text-center py-6 text-app-text-muted">
                  <Activity size={24} className="spinner mx-auto mb-2 text-ocean" />
                  <p className="text-xs">Sedang memproses dan mengklasifikasi email...</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: History Table */}
          <div className="card !p-0 !rounded-2xl border border-app-border bg-app-surface overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-app-border bg-app-bg/20 flex flex-wrap justify-between items-center gap-3">
              <h3 className="font-bold text-sm md:text-base text-app-text">Hasil Pengujian Terbaru</h3>
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                <input 
                  type="text" 
                  placeholder="Cari hasil..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 w-full sm:w-48 text-xs rounded-full border border-app-border bg-app-surface text-app-text focus:outline-none focus:border-ocean" 
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-app-bg/50">
                    <th className="w-12 text-center text-[10px] tracking-wider py-3">No</th>
                    <th className="w-32 text-[10px] tracking-wider py-3"><Calendar size={12} className="inline mr-1" /> Tgl Pengujian</th>
                    <th className="text-[10px] tracking-wider py-3">Testing (Konten Email)</th>
                    <th className="w-28 text-center text-[10px] tracking-wider py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((item, index) => (
                    <tr key={item.id} className={`cursor-pointer hover:bg-app-bg/40 border-b border-app-border transition-colors ${activeResult?.id === item.id ? 'bg-ocean-light/30 dark:bg-ocean-dark/20' : ''}`} onClick={() => setActiveResult(item)}>
                      <td className="text-center text-xs py-3">{startIndex + index + 1}</td>
                      <td className="text-xs text-app-text-muted py-3">{item.date}</td>
                      <td className="py-3 px-2">
                        <div className="text-xs text-app-text font-medium line-clamp-1 break-all">
                          {item.text}
                        </div>
                      </td>
                      <td className="text-center py-3">
                        {item.type === 'batch' ? (
                          <span className="inline-block bg-ocean-light dark:bg-ocean-dark/40 text-ocean dark:text-ocean-dark font-extrabold text-[9px] px-2 py-0.5 rounded">
                            BATCH
                          </span>
                        ) : (
                          <span className={`badge badge-${item.label} text-[9px] font-extrabold px-2 py-0.5`}>
                            {item.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-app-text-muted text-xs">Belum ada data pengujian yang cocok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="py-4 px-4 border-t border-app-border bg-app-bg/10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Detail & GAT Visualization (Sticky on desktop) */}
        <div className="w-full lg:sticky lg:top-6 flex flex-col gap-6">
          {activeResult ? (
            activeResult.type === 'batch' ? (
              <div className="card !p-5 !rounded-2xl border-2 border-ocean bg-app-surface shadow-md animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-5 border-b border-app-border pb-4">
                  <div className="p-2.5 bg-ocean-light dark:bg-ocean-dark text-ocean rounded-full"><FileText size={20} /></div>
                  <div>
                    <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider">Detail Batch</div>
                    <div className="text-sm font-extrabold text-app-text break-all">
                      {activeResult.filename}
                    </div>
                  </div>
                </div>

                <div className="bg-app-bg border border-app-border p-4 rounded-xl mb-5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-muted">Total Data Diuji:</span>
                    <strong className="text-app-text">{activeResult.results.length} Email</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-muted">Total Spam:</span>
                    <strong className="text-sunrise font-extrabold">{activeResult.results.filter(r => r.label === 'spam').length}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-muted">Total Non-Spam:</span>
                    <strong className="text-mint font-extrabold">{activeResult.results.filter(r => r.label === 'ham').length}</strong>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-app-text mb-3">Daftar Hasil Prediksi:</h4>
                <div className="max-h-[260px] overflow-y-auto border border-app-border rounded-xl p-2 space-y-2 bg-app-bg/30">
                  {activeResult.results.map((res, i) => (
                    <div key={res.id} className="p-3 bg-app-surface rounded-lg border border-app-border">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-extrabold tracking-wider uppercase ${
                          res.label === 'spam' ? 'text-sunrise' : 'text-mint'
                        }`}>
                          {res.label}
                        </span>
                        <span className="text-[10px] text-app-text-muted">{(res.conf * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-app-text-muted line-clamp-2 leading-relaxed">
                        {res.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card !p-5 !rounded-2xl border-2 border-ocean bg-app-surface shadow-md animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-5 border-b border-app-border pb-4">
                  {activeResult.label === 'spam' ? (
                    <div className="p-2.5 bg-sunrise-light text-sunrise dark:bg-sunrise-dark dark:text-sunrise-light rounded-full"><ShieldAlert size={20} /></div>
                  ) : (
                    <div className="p-2.5 bg-mint-light text-mint dark:bg-mint-dark dark:text-mint-light rounded-full"><ShieldCheck size={20} /></div>
                  )}
                  <div>
                    <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider">Prediksi Model</div>
                    <div className={`text-sm md:text-base font-extrabold ${activeResult.label === 'spam' ? 'text-sunrise' : 'text-mint'}`}>
                      {activeResult.label === 'spam' ? 'TERDETEKSI SPAM' : 'EMAIL AMAN (HAM)'}
                    </div>
                  </div>
                </div>

                <div className="mb-5 bg-app-bg/50 border border-app-border p-4 rounded-xl">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-app-text-muted font-medium">Confidence Level</span>
                    <span className="font-extrabold text-app-text">{(activeResult.conf * 100).toFixed(2)}%</span>
                  </div>
                  <div className="progress-bar w-full">
                    <div className={`progress-fill ${activeResult.label === 'spam' ? '!bg-sunrise' : '!bg-mint'}`} style={{ width: `${activeResult.conf * 100}%` }} />
                  </div>
                </div>

                <div className="border border-app-border rounded-xl p-4 bg-app-bg/30 mb-5">
                  <h4 className="text-xs font-bold text-app-text mb-3">Visualisasi Graph Attention (GAT)</h4>
                  <div className="h-[180px] bg-app-surface rounded-lg border border-app-border overflow-hidden shadow-inner">
                    <svg width="100%" height="100%" viewBox="0 0 300 180">
                      <line x1="150" y1="90" x2="80" y2="40" stroke="#ffb703" strokeWidth={activeResult.label === 'spam' ? "3" : "0.5"} opacity={activeResult.label === 'spam' ? "0.8" : "0.1"} />
                      <line x1="150" y1="90" x2="220" y2="50" stroke="#ffb703" strokeWidth={activeResult.label === 'spam' ? "2" : "0.5"} opacity={activeResult.label === 'spam' ? "0.6" : "0.1"} />
                      <line x1="150" y1="90" x2="90" y2="140" stroke="#57cc99" strokeWidth={activeResult.label === 'ham' ? "2.5" : "0.5"} opacity={activeResult.label === 'ham' ? "0.7" : "0.1"} />
                      <line x1="150" y1="90" x2="210" y2="130" stroke="#57cc99" strokeWidth={activeResult.label === 'ham' ? "3" : "0.5"} opacity={activeResult.label === 'ham' ? "0.8" : "0.1"} />
                      <circle cx="80" cy="40" r="8" fill="#ffb703" className="shadow-sm" />
                      <circle cx="220" cy="50" r="10" fill="#ffb703" className="shadow-sm" />
                      <circle cx="90" cy="140" r="12" fill="#57cc99" className="shadow-sm" />
                      <circle cx="210" cy="130" r="9" fill="#57cc99" className="shadow-sm" />
                      <circle cx="150" cy="90" r="14" fill="white" className="dark:fill-slate-800" stroke="var(--ocean)" strokeWidth="2.5" />
                      <circle cx="150" cy="90" r="5" fill="var(--ocean)" />
                    </svg>
                  </div>
                </div>

                <div className="bg-app-bg border border-app-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider mb-2">Isi Email Pengujian:</h4>
                  <p className="text-xs italic text-app-text leading-relaxed font-medium">
                    "{activeResult.text}"
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="card !p-8 text-center min-h-[300px] flex flex-col justify-center items-center border border-dashed border-app-border bg-app-surface !rounded-2xl shadow-sm">
              <Mail size={40} className="text-app-text-muted/40 mb-3" />
              <p className="text-xs text-app-text-muted leading-relaxed max-w-[240px]">Pilih hasil pengujian dari tabel atau lakukan uji manual untuk melihat detail visualisasi GAT.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
