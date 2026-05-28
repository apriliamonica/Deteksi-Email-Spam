import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Play, CheckCircle, Database, ChevronRight, Activity, ShieldAlert, Settings, FileText } from 'lucide-react';
import { emailAPI, modelAPI } from '../services/api';

const STEPS = [
  { key: 'raw', label: 'Dataset Baru', desc: 'Memuat data email mentah dari database.' },
  { key: 'html', label: 'Pembersihan HTML', desc: 'Menghapus tag HTML (<div>, <a>, dll) agar teks bersih.' },
  { key: 'mask', label: 'Masking URL/Email', desc: 'Mengubah link menjadi [URL] dan email menjadi [EMAIL].' },
  { key: 'norm', label: 'Normalisasi', desc: 'Menghapus simbol aneh dan merapikan spasi (Whitespace).' },
  { key: 'case', label: 'Case Folding', desc: 'Mengubah huruf menjadi kecil untuk konsistensi IndoBERT.' },
  { key: 'result', label: 'Hasil Akhir', desc: 'Data bersih dan siap untuk Tokenisasi & Graf GAT.' },
];

export default function PreprocessingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dbStats, setDbStats] = useState(null);

  // Load from localStorage
  const getInitial = (key, def) => {
    const saved = localStorage.getItem(`preproc_${key}`);
    try { return saved ? JSON.parse(saved) : def; } catch { return saved || def; }
  };

  const [selectedDataset, setSelectedDataset] = useState(() => getInitial('selectedDataset', ''));
  const [datasets, setDatasets] = useState([]);
  const [currentStep, setCurrentStep] = useState(() => getInitial('step', -1));
  const [isProcessing, setIsProcessing] = useState(false);
  const [preprocStatus, setPreprocStatus] = useState(null);
  const [globalLock, setGlobalLock] = useState(null);
  const [isForce, setIsForce] = useState(false);
  const [comparisonRows, setComparisonRows] = useState([]);
  const [comparisonTotal, setComparisonTotal] = useState(0);
  const [comparisonPage, setComparisonPage] = useState(0);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const COMPARISON_LIMIT = 10;

  const fetchDatasets = async () => {
    try {
      const res = await modelAPI.listDatasets();
      setDatasets(res.data);
    } catch (err) {
      console.error("Gagal mengambil daftar dataset:", err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Handle incoming state from DataCollection
  useEffect(() => {
    if (location.state?.selectedDatasetId) {
      const dsId = location.state.selectedDatasetId.toString();
      setSelectedDataset(dsId);
      // Auto set step to 0 to show stats
      if (currentStep === -1) {
        setCurrentStep(0);
      }
    }
  }, [location.state]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('preproc_step', JSON.stringify(currentStep));
    localStorage.setItem('preproc_selectedDataset', selectedDataset);
  }, [currentStep, selectedDataset]);

  // Global Lock Check
  useEffect(() => {
    const checkLock = () => {
      const lock = localStorage.getItem('global_process_active');
      if (lock && lock !== 'preprocessing') {
        setGlobalLock(lock);
      } else {
        setGlobalLock(null);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = (dsId = null) => {
    emailAPI.stats(dsId)
      .then(res => setDbStats(res.data))
      .catch(err => console.error(err));
  };

  const fetchComparisonRows = async (dsId, page = 0) => {
    if (!dsId) return;
    setComparisonLoading(true);
    try {
      const res = await modelAPI.getDatasetRows(dsId, COMPARISON_LIMIT, page * COMPARISON_LIMIT);
      setComparisonRows(res.data.rows);
      setComparisonTotal(res.data.total);
    } catch (err) {
      console.error('Gagal mengambil data perbandingan:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  useEffect(() => {
    const dsId = (selectedDataset && selectedDataset !== "db-01") ? parseInt(selectedDataset) : null;
    fetchStats(dsId);
    if (dsId) {
      setComparisonPage(0);
      fetchComparisonRows(dsId, 0);
    }
  }, [selectedDataset]);

  // Re-fetch comparison rows when step reaches final (processed_body now available)
  useEffect(() => {
    if (currentStep === STEPS.length - 1) {
      const dsId = (selectedDataset && selectedDataset !== "db-01") ? parseInt(selectedDataset) : null;
      if (dsId) {
        setComparisonPage(0);
        fetchComparisonRows(dsId, 0);
      }
    }
  }, [currentStep]);

  const handleStart = async () => {
    try {
      const dsId = selectedDataset === "db-01" ? null : parseInt(selectedDataset);
      await modelAPI.startPreprocess(dsId, isForce);
      setCurrentStep(1);
      setIsProcessing(true);
      localStorage.setItem('preproc_running', 'true');
      localStorage.setItem('global_process_active', 'preprocessing');
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal memulai pre-processing");
      console.error(err);
    }
  };

  // Resume Simulation Logic
  useEffect(() => {
    const isRunning = localStorage.getItem('preproc_running') === 'true';
    if (isRunning && currentStep >= 0 && currentStep < STEPS.length - 1) {
      setIsProcessing(true);
      localStorage.setItem('global_process_active', 'preprocessing');
    }
  }, []);

  // Real Polling Logic
  useEffect(() => {
    let pollInterval;
    if (isProcessing) {
      pollInterval = setInterval(async () => {
        try {
          const res = await modelAPI.getPreprocessStatus();
          const status = res.data;
          setPreprocStatus(status);
          
          if (status.progress > 0 && status.progress < 100) {
            // Map progress to steps 1-4
            const stepMapping = Math.min(4, Math.floor(status.progress / 25) + 1);
            setCurrentStep(stepMapping);
          }

          if (!status.is_running && status.progress === 100) {
            setIsProcessing(false);
            setCurrentStep(5); // Hasil Akhir
            localStorage.removeItem('preproc_running');
            localStorage.removeItem('global_process_active');
            fetchStats((selectedDataset && selectedDataset !== "db-01") ? parseInt(selectedDataset) : null); // Update stats (total_processed)
            fetchDatasets(); // Update datasets status
            clearInterval(pollInterval);
          } else if (!status.is_running && status.message.includes("Error")) {
            setIsProcessing(false);
            alert(status.message);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 1000);
    }
    return () => clearInterval(pollInterval);
  }, [isProcessing]);

  const handleReset = async () => {
    if (window.confirm("Apakah Anda yakin ingin membatalkan proses pre-processing?")) {
      try {
        await modelAPI.cancelPreprocess();
        localStorage.removeItem('preproc_step');
        localStorage.removeItem('preproc_selectedDataset');
        localStorage.removeItem('preproc_running');
        localStorage.removeItem('global_process_active');
        window.location.reload();
      } catch (err) {
        console.error("Gagal membatalkan proses:", err);
        // Tetap reset UI jika server gagal merespon
        localStorage.removeItem('preproc_running');
        window.location.reload();
      }
    }
  };

  const hasDataset = dbStats && dbStats.total_emails > 0;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Pre-Processing Engine</h1>
        <p style={{ color: 'var(--gray-500)' }}>Pilih dataset yang telah diunggah untuk memulai proses pembersihan dan transformasi data.</p>
      </div>

      {(isProcessing || currentStep > -1) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button 
            onClick={handleReset}
            style={{ 
              padding: '8px 16px', 
              background: '#fee2e2', 
              color: '#ef4444', 
              border: '1px solid #fecaca', 
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
          >
            <Settings size={14} className="spinner" /> Batalkan & Reset Proses
          </button>
        </div>
      )}

      {/* Dataset Selection Area */}
      <div className="card" style={{ marginBottom: 32, padding: 24, display: 'flex', alignItems: 'center', gap: 24, background: 'linear-gradient(to right, #ffffff, #f8fafc)', border: '1px solid var(--gray-200)' }}>
        <div style={{ padding: 16, background: 'var(--gray-100)', borderRadius: '50%' }}>
          <Database size={32} style={{ color: 'var(--black)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Pengaturan Dataset</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                className="form-select" 
                value={selectedDataset} 
                onChange={e => {
                  const val = e.target.value;
                  setSelectedDataset(val);
                  localStorage.setItem('preproc_selectedDatasetId', val);
                  setCurrentStep(0); // Show dataset stats
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
                style={{ maxWidth: 280, fontWeight: 600, background: isProcessing ? 'var(--gray-50)' : 'white' }}
              >
                <option value="" disabled>-- Pilih Dataset Aktif --</option>
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({(ds.total_rows || 0).toLocaleString()} Email)
                  </option>
                ))}
                {datasets.length === 0 && hasDataset && (
                  <option value="db-01">Database Utama ({dbStats.total_emails.toLocaleString()} Email)</option>
                )}
              </select>

              {selectedDataset && !isProcessing && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                  <input 
                    type="checkbox" 
                    checked={isForce} 
                    onChange={e => setIsForce(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Proses ulang data yang sudah ada (Force)
                </label>
              )}
          </div>
          {selectedDataset && (
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {datasets.find(ds => ds.id.toString() === selectedDataset.toString())?.status === "Preprocessed" || datasets.find(ds => ds.id.toString() === selectedDataset.toString())?.status === "Trained" ? (
                <><CheckCircle size={16} style={{ color: '#10b981' }} /> Dataset ini sudah melewati tahap preprocessing.</>
              ) : (
                <><Activity size={16} style={{ color: '#3b82f6' }} /> Dataset siap diproses ke dalam model.</>
              )}
            </div>
          )}
        </div>
        
        <div>
          {globalLock && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> Harap tunggu, proses {globalLock} sedang berjalan.
            </div>
          )}
          {selectedDataset && (datasets.find(ds => ds.id.toString() === selectedDataset.toString())?.status === "Preprocessed" || datasets.find(ds => ds.id.toString() === selectedDataset.toString())?.status === "Trained") && !isForce ? (
            <div style={{ 
              padding: '12px 24px', 
              background: '#ecfdf5', 
              color: '#059669', 
              border: '1px solid #d1fae5', 
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle size={18} /> Sudah Diproses
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ padding: '12px 24px', fontSize: '1rem' }}
              disabled={!selectedDataset || isProcessing || !!globalLock}
              onClick={handleStart}
            >
              {isProcessing ? (
                <><Activity size={18} className="spinner" /> Memproses...</>
              ) : (
                <><Play size={18} /> Mulai Pre-Processing</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Pipeline Visualization */}
      <div className="card" style={{ padding: '32px 24px', marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 700 }}>
          {STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isDone = currentStep > index;
            const isPending = currentStep < index;

            return (
              <div key={step.key} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isPending ? 0.4 : 1, transition: 'all 0.5s ease' }}>
                
                {/* Connecting Line (drawn to the right of the circle) */}
                {index < STEPS.length - 1 && (
                  <div style={{ 
                    position: 'absolute', top: 18, left: 'calc(50% + 18px)', 
                    width: 'calc(100% - 36px)', height: 4, 
                    background: isDone ? '#10b981' : 'var(--gray-200)',
                    borderRadius: 2, zIndex: 1, overflow: 'hidden',
                    transition: 'background 0.5s ease'
                  }}>
                    {isActive && isProcessing && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
                        background: 'linear-gradient(to right, transparent, #171717, transparent)',
                        animation: 'slideRight 1s infinite linear'
                      }} />
                    )}
                  </div>
                )}

                {/* Step Circle */}
                <div style={{ 
                  width: 36, height: 36, borderRadius: '50%', 
                  background: isDone ? '#10b981' : isActive ? '#171717' : 'var(--gray-200)',
                  color: isPending && !isActive ? 'var(--gray-500)' : 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 4px rgba(23,23,23,0.1)' : 'none',
                  transition: 'all 0.3s ease', zIndex: 2
                }}>
                  {isDone ? <CheckCircle size={20} /> : <span style={{ fontWeight: 'bold' }}>{index + 1}</span>}
                </div>

                {/* Step Label */}
                <div style={{ marginTop: 12, textAlign: 'center', padding: '0 8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--black)' : 'var(--gray-600)', transition: 'color 0.3s ease' }}>
                    {step.label}
                  </div>
                  {isActive && isProcessing && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 4, animation: 'pulse 1.5s infinite' }}>
                      Memproses...
                    </div>
                  )}
                </div>
                
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Content Box below the pipeline */}
      {currentStep >= 0 && (
        <div className="card" style={{ padding: 24, border: '2px solid var(--black)', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--black)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {currentStep + 1}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{STEPS[currentStep].label}</h2>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: 24 }}>{STEPS[currentStep].desc}</p>
          
          {/* Tampilan Khusus Step 0: Dataset Baru */}
          {currentStep === 0 && dbStats && (
            <div style={{ display: 'flex', gap: 16, animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ flex: 1, padding: 20, background: 'var(--gray-50)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Total Email</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--black)' }}>{dbStats.total_emails.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: 20, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Sudah Diproses</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{dbStats.total_processed.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: 20, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Spam</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{dbStats.total_spam.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Tampilan Khusus Step Tengah (1-4): Menunggu Proses */}
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', borderRadius: 12, border: '1px dashed var(--gray-300)' }}>
              {isProcessing ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 400, marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{preprocStatus?.message || "Sedang memproses..."}</span>
                    <span style={{ fontWeight: 700 }}>{preprocStatus?.progress || 0}%</span>
                  </div>
                  <div style={{ width: '100%', maxWidth: 400, height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ width: `${preprocStatus?.progress || 0}%`, height: '100%', background: 'var(--black)', transition: 'width 0.3s ease' }} />
                  </div>
                  <p style={{ color: 'var(--gray-500)', margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>
                    <span style={{ color: 'var(--black)' }}>{preprocStatus?.current_item?.toLocaleString() || '0'}</span> 
                    {' dari '} 
                    <span style={{ color: 'var(--black)' }}>{preprocStatus?.total_items?.toLocaleString() || '0'}</span> email selesai diproses.
                  </p>
                  <p style={{ color: 'var(--gray-400)', marginTop: 8, fontSize: '0.75rem' }}>
                    Status: {preprocStatus?.message}
                  </p>
                </>
              ) : (
                <CheckCircle size={32} style={{ color: '#10b981', marginBottom: 16 }} />
              )}
            </div>
          )}

          {/* Tampilan Khusus Step Akhir (5): Hasil Akhir */}
          {currentStep === STEPS.length - 1 && (
            <div style={{ background: 'var(--gray-50)', borderRadius: 12, border: '1px dashed var(--gray-300)', overflow: 'hidden' }}>
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Layers size={40} style={{ color: 'var(--black)', margin: '0 auto 16px auto' }} />
                <h4 style={{ color: 'var(--black)', margin: '0 0 12px 0', fontSize: '1.2rem' }}>Data Siap Ditraining</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', margin: '0 0 24px 0' }}>
                  Dataset telah berhasil melewati seluruh tahap preprocessing dan siap dimasukkan ke dalam model IndoBERT.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '12px 32px', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                  onClick={() => navigate('/processing', { state: { datasetName: 'Database Utama (Pre-Processed)' } })}
                >
                  Lanjut ke Proses Training <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tabel Perbandingan Sebelum & Sesudah Preprocessing */}
      {currentStep >= 0 && selectedDataset && comparisonRows.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
          <div style={{ padding: '16px 24px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} />
            <span style={{ fontWeight: 600 }}>Tabel Perbandingan Teks Sebelum & Sesudah Preprocessing</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              Menampilkan {comparisonRows.length} dari {comparisonTotal.toLocaleString()} data
            </span>
          </div>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            {comparisonLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>Memuat data...</div>
            ) : (
              <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ width: 50, textAlign: 'center', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>No</th>
                    <th style={{ width: '45%', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>Teks Sebelum (Original)</th>
                    <th style={{ width: '45%', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>Teks Sesudah (Preprocessed)</th>
                    <th style={{ width: 70, textAlign: 'center', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>Label</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>
                        {comparisonPage * COMPARISON_LIMIT + idx + 1}
                      </td>
                      <td style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--gray-700)', maxWidth: 350, wordBreak: 'break-word', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>
                        {row.body || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>-</span>}
                      </td>
                      <td style={{ fontSize: '0.82rem', lineHeight: 1.5, maxWidth: 350, wordBreak: 'break-word', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>
                        {currentStep === STEPS.length - 1 && row.processed_body ? (
                          <span style={{ color: '#059669' }}>{row.processed_body}</span>
                        ) : (
                          <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Menunggu preprocessing selesai...</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>
                        <span className={row.label === 'spam' ? 'badge badge-spam' : 'badge badge-ham'} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {row.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination */}
          {comparisonTotal > COMPARISON_LIMIT && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={comparisonPage === 0}
                onClick={() => { const p = comparisonPage - 1; setComparisonPage(p); fetchComparisonRows(parseInt(selectedDataset), p); }}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                Halaman {comparisonPage + 1} dari {Math.ceil(comparisonTotal / COMPARISON_LIMIT)}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={(comparisonPage + 1) * COMPARISON_LIMIT >= comparisonTotal}
                onClick={() => { const p = comparisonPage + 1; setComparisonPage(p); fetchComparisonRows(parseInt(selectedDataset), p); }}
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lock Overlay removed per user request */}
      
      <style>{`
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
