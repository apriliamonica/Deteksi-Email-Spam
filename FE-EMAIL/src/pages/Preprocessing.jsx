import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Play, CheckCircle, Database, ChevronRight, Activity, ArrowDown, ShieldAlert, Settings } from 'lucide-react';
import { emailAPI } from '../services/api';

const STEPS = [
  { key: 'raw', label: 'Dataset Baru', desc: 'Memuat data email mentah dari database.' },
  { key: 'case', label: 'Case Folding', desc: 'Mengubah semua huruf menjadi lowercase (huruf kecil).' },
  { key: 'token', label: 'Tokenisasi', desc: 'Memecah kalimat menjadi token kata (WordPiece).' },
  { key: 'stem', label: 'Stemming', desc: 'Mengubah kata berimbuhan ke bentuk dasar (Sastrawi).' },
  { key: 'stop', label: 'Stopword', desc: 'Menghapus kata hubung/umum yang tidak bermakna.' },
  { key: 'result', label: 'Hasil Akhir', desc: 'Data telah bersih dan siap dimasukkan ke model IndoBERT.' },
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
  const [currentStep, setCurrentStep] = useState(() => getInitial('step', -1));
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalLock, setGlobalLock] = useState(null);

  // Handle incoming state from DataCollection
  useEffect(() => {
    if (location.state?.selectedDatasetId) {
      setSelectedDataset('db-01'); // Mock auto-select to database
      if (currentStep === -1) {
        // Automatically start if coming from Data Collection
        handleStart();
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

  const fetchStats = () => {
    emailAPI.stats()
      .then(res => setDbStats(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleStart = () => {
    setCurrentStep(0);
    setIsProcessing(true);
    localStorage.setItem('preproc_running', 'true');
    localStorage.setItem('global_process_active', 'preprocessing');
  };

  // Resume Simulation Logic
  useEffect(() => {
    const isRunning = localStorage.getItem('preproc_running') === 'true';
    if (isRunning && currentStep >= 0 && currentStep < STEPS.length - 1) {
      setIsProcessing(true);
      localStorage.setItem('global_process_active', 'preprocessing');
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isProcessing && currentStep < STEPS.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2000); 
    } else if (isProcessing && currentStep === STEPS.length - 1) {
      setIsProcessing(false); 
      localStorage.removeItem('preproc_running');
      localStorage.removeItem('global_process_active');
    }
    return () => clearTimeout(timer);
  }, [currentStep, isProcessing]);

  const handleReset = () => {
    localStorage.removeItem('preproc_step');
    localStorage.removeItem('preproc_selectedDataset');
    localStorage.removeItem('preproc_running');
    localStorage.removeItem('global_process_active');
    window.location.reload();
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
                  setSelectedDataset(e.target.value);
                  setCurrentStep(-1);
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
                style={{ maxWidth: 280, fontWeight: 600, background: isProcessing ? 'var(--gray-50)' : 'white' }}
              >
                <option value="" disabled>-- Pilih Dataset Aktif --</option>
                {hasDataset && <option value="db-01">Database Utama ({dbStats.total_emails.toLocaleString()} Email)</option>}
              </select>
          </div>
          {selectedDataset && hasDataset && (
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} style={{ color: '#10b981' }} /> Dataset siap diproses ke dalam model.
            </div>
          )}
        </div>
        
        <div>
          {globalLock && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> Harap tunggu, proses {globalLock} sedang berjalan.
            </div>
          )}
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 24px', fontSize: '1rem' }}
            disabled={!selectedDataset || isProcessing || currentStep === STEPS.length - 1 || !!globalLock}
            onClick={handleStart}
          >
            {isProcessing ? (
              <><Activity size={18} className="spinner" /> Memproses...</>
            ) : currentStep === STEPS.length - 1 ? (
              <><CheckCircle size={18} /> Selesai</>
            ) : (
              <><Play size={18} /> Mulai Pre-Processing</>
            )}
          </button>
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
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Total Keseluruhan</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--black)' }}>{dbStats.total_emails.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: 20, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Terindikasi Spam</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{dbStats.total_spam.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: 20, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>Email Aman (Ham)</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{dbStats.total_ham.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Tampilan Khusus Step Tengah (1-4): Menunggu Proses */}
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', borderRadius: 12, border: '1px dashed var(--gray-300)' }}>
              {isProcessing ? (
                <>
                  <Activity size={32} className="spinner" style={{ color: 'var(--gray-400)', marginBottom: 16 }} />
                  <p style={{ color: 'var(--gray-500)', margin: 0, fontWeight: 500 }}>Sistem sedang menerapkan {STEPS[currentStep].label.toLowerCase()} pada seluruh dataset...</p>
                </>
              ) : (
                <CheckCircle size={32} style={{ color: '#10b981', marginBottom: 16 }} />
              )}
            </div>
          )}

          {/* Tampilan Khusus Step Akhir (5): Hasil Akhir */}
          {currentStep === STEPS.length - 1 && (
            <div style={{ padding: 40, background: 'var(--gray-50)', borderRadius: 12, border: '1px dashed var(--gray-300)', textAlign: 'center' }}>
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
