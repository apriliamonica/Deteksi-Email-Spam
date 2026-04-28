import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { emailAPI } from '../services/api';
import { Play, CheckCircle, Database, BarChart2, Layers, Activity, Settings, TrendingUp, Save, ChevronRight, Check, ShieldAlert } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const STEPS = [
  { key: 'setup', label: '1. Pengaturan', desc: 'Konfigurasi dataset, pembagian data (train/test), dan hyperparameter model.' },
  { key: 'training', label: '2. Pelatihan', desc: 'Proses training model hibrida IndoBERT + GAT pada dataset terpilih.' },
  { key: 'validation', label: '3. Validasi', desc: 'Analisis hasil akurasi, grafik loss, dan simpan model ke riwayat.' }
];

export default function ProcessingPage() {
  const location = useLocation();
  
  // Load from localStorage or defaults
  const getInitial = (key, def) => {
    const saved = localStorage.getItem(`processing_${key}`);
    try { return saved ? JSON.parse(saved) : def; } catch { return saved || def; }
  };

  const [currentStep, setCurrentStep] = useState(() => getInitial('step', 0));
  const [dbStats, setDbStats] = useState(null);
  const [activeDatasetName, setActiveDatasetName] = useState(() => 
    location.state?.datasetName || getInitial('datasetName', "Database Utama (Pre-Processed)")
  );

  // --- STEP 0: Config ---
  const [modelName, setModelName] = useState(() => getInitial('modelName', "Model_Spam_GAT_01"));
  const [trainRatio, setTrainRatio] = useState(() => getInitial('trainRatio', 80));
  const [testRatio, setTestRatio] = useState(() => getInitial('testRatio', 20));
  const [epoch, setEpoch] = useState(() => getInitial('epoch', 30));
  const [lr, setLr] = useState(() => getInitial('lr', 0.001));

  // --- STEP 1: Train ---
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainStepDesc, setTrainStepDesc] = useState('');
  const [globalLock, setGlobalLock] = useState(null);

  // --- STEP 2: Eval ---
  const [trainResult, setTrainResult] = useState(() => getInitial('trainResult', null));

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('processing_step', JSON.stringify(currentStep));
    localStorage.setItem('processing_modelName', modelName);
    localStorage.setItem('processing_trainRatio', trainRatio);
    localStorage.setItem('processing_testRatio', testRatio);
    localStorage.setItem('processing_epoch', epoch);
    localStorage.setItem('processing_lr', lr);
    localStorage.setItem('processing_trainResult', JSON.stringify(trainResult));
    localStorage.setItem('processing_datasetName', activeDatasetName);
  }, [currentStep, modelName, trainRatio, testRatio, epoch, lr, trainResult, activeDatasetName]);

  useEffect(() => {
    emailAPI.stats()
      .then(res => setDbStats(res.data))
      .catch(err => console.error(err));
  }, []);

  // Simulation State

  const [subStep, setSubStep] = useState(0);
  const SIM_STEPS = [
    ["Memuat Dataset Pre-processed...", 10],
    ["Fine-tuning IndoBERT...", 30],
    ["Augmentasi Data (SMOTE)...", 50],
    ["Dimensi Reduksi UMAP...", 60],
    ["Membuat Graph...", 70],
    ["Training GAT Final...", 90],
    ["Menyimpan Model...", 100],
  ];

  // Global Lock Check
  useEffect(() => {
    const checkLock = () => {
      const lock = localStorage.getItem('global_process_active');
      if (lock && lock !== 'training') {
        setGlobalLock(lock);
      } else {
        setGlobalLock(null);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000); 
    return () => clearInterval(interval);
  }, []);

  // Resume Simulation Logic
  useEffect(() => {
    const isRunning = localStorage.getItem('processing_running') === 'true';
    if (isRunning && currentStep === 1 && !trainResult) {
      setTraining(true);
      localStorage.setItem('global_process_active', 'training');
    }
  }, []);

  const finalizeTraining = () => {
    const baseAcc = 0.88 + (parseInt(trainRatio) || 80) * 0.0008;
    const epochNum = parseInt(epoch) || 30;
    setTrainResult({
      accuracy: baseAcc + Math.random() * 0.02,
      precision: baseAcc - 0.01 + Math.random() * 0.02,
      recall: baseAcc + 0.01 + Math.random() * 0.02,
      f1: baseAcc + Math.random() * 0.02,
      macro_avg: baseAcc - 0.005 + Math.random() * 0.01,
      weighted_avg: baseAcc + 0.005 + Math.random() * 0.01,
      mcc: 0.8921 + (Math.random() * 0.01),
      roc_auc: 0.9654 + (Math.random() * 0.01),
      mean_std: 0.0124 + (Math.random() * 0.005),
      original_counts: { spam: 4200, ham: 5800 },
      oversampled_counts: { spam: 5800, ham: 5800 },
      gatLoss: Array.from({ length: epochNum }, (_, i) => ({
        e: i + 1,
        l: +(1.5 * Math.exp(-i * 0.12) + 0.1).toFixed(4),
      })),
    });
    setTraining(false);
    setCurrentStep(2);
    setSubStep(0);
    localStorage.removeItem('processing_running');
    localStorage.removeItem('global_process_active');
  };

  // Simulation Loop
  useEffect(() => {
    let timer;
    if (training && subStep < SIM_STEPS.length) {
      setTrainStepDesc(SIM_STEPS[subStep][0]);
      setTrainProgress(SIM_STEPS[subStep][1]);
      timer = setTimeout(() => {
        setSubStep(prev => prev + 1);
      }, 1200);
    } else if (training && subStep === SIM_STEPS.length) {
      finalizeTraining();
    }
    return () => clearTimeout(timer);
  }, [training, subStep]);

  const handleTrain = (e) => {
    e.preventDefault();
    if (globalLock) return alert(`Harap tunggu proses ${globalLock} selesai.`);
    if (!modelName.trim()) return alert("Nama model tidak boleh kosong!");
    if (parseInt(trainRatio) + parseInt(testRatio) !== 100) return alert("Total Train dan Test harus 100!");
    
    setTrainResult(null);
    setCurrentStep(1);
    setSubStep(0);
    setTraining(true);
    localStorage.setItem('processing_running', 'true');
    localStorage.setItem('global_process_active', 'training');
  };

  const handleCancel = () => {
    if (window.confirm("Apakah Anda yakin ingin membatalkan proses pelatihan ini? Semua progres akan hilang.")) {
      setTraining(false);
      setSubStep(0);
      setTrainProgress(0);
      setTrainResult(null);
      setCurrentStep(0);
      localStorage.removeItem('processing_running');
      localStorage.removeItem('global_process_active');
      localStorage.removeItem('processing_step');
      localStorage.removeItem('processing_trainResult');
      window.location.reload();
    }
  };

  const [historyList, setHistoryList] = useState([
    { date: "11/04/26", name: "Train 1.0 (50:50)", ratio: "50:50", acc: "87.40%", active: false },
    { date: "12/04/26", name: "Train 1.1 (60:40)", ratio: "60:40", acc: "91.20%", active: true }
  ]);

  const handleSaveToHistory = () => {
    const newEntry = {
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      name: modelName,
      ratio: `${trainRatio}:${testRatio}`,
      acc: `${(trainResult.accuracy * 100).toFixed(2)}%`,
      active: false
    };
    setHistoryList(prev => [...prev, newEntry]);
    setCurrentStep(3); 
  };

  const clearPersistence = () => {
    const keys = ['step', 'modelName', 'trainRatio', 'testRatio', 'epoch', 'lr', 'trainResult', 'datasetName'];
    keys.forEach(k => localStorage.removeItem(`processing_${k}`));
    localStorage.removeItem('preproc_step');
    localStorage.removeItem('preproc_selectedDataset');
    window.location.reload();
  };

  const setModelActive = (idx) => {
    const updated = historyList.map((h, i) => ({ ...h, active: i === idx }));
    setHistoryList(updated);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* UI remains same but 'Selesai' button will use clearPersistence */}
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 8 }}>Model Training Pipeline</h1>
        <p style={{ color: 'var(--gray-500)', maxWidth: 600, margin: '0 auto' }}>
          Latih model hibrida IndoBERT + GAT Anda menggunakan dataset yang telah dibersihkan pada tahap pre-processing.
        </p>
      </div>

      <div style={{ paddingLeft: 10 }}>
        {(training || currentStep > 0) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button 
              onClick={handleCancel}
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
        {STEPS.map((step, index) => {
          const isActive = currentStep === index;
          const isDone = currentStep > index;
          const isPending = currentStep < index;

          return (
            <div key={step.key} style={{ display: 'flex', marginBottom: index === STEPS.length - 1 ? 0 : 20, opacity: isPending ? 0.5 : 1, transition: 'all 0.4s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 24, flexShrink: 0 }}>
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
                {index < STEPS.length - 1 && (
                  <div style={{ 
                    width: 3, flex: 1, minHeight: isActive ? 100 : 40,
                    background: isDone ? '#10b981' : 'var(--gray-200)',
                    marginTop: 8, marginBottom: 8, transition: 'all 0.5s ease',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    {isActive && training && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '50%',
                        background: 'linear-gradient(to bottom, transparent, #171717, transparent)',
                        animation: 'slideDown 1s infinite linear'
                      }} />
                    )}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, paddingTop: 4, paddingBottom: isDone ? 16 : 0 }}>
                <div className="card" style={{ 
                  border: isActive ? '2px solid var(--black)' : '1px solid var(--gray-200)',
                  transform: isActive ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
                  background: isPending ? 'var(--gray-50)' : 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (isActive || isDone) ? 16 : 0 }}>
                    <div>
                      <h3 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
                        {step.label}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>{step.desc}</p>
                    </div>
                    {isDone && <CheckCircle style={{ color: '#10b981' }} size={24} />}
                  </div>

                  {(isActive || isDone) && (
                    <div style={{ animation: 'fadeIn 0.5s ease-out', borderTop: '1px solid var(--gray-100)', paddingTop: 16 }}>
                      
                      {index === 0 && (
                        <form onSubmit={handleTrain}>
                          <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 8, border: '1px solid var(--gray-200)', marginBottom: 20 }}>
                            <label className="form-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--black)' }}>
                              <Database size={16} /> Dataset Aktif (Otomatis dari Pre-Processing)
                            </label>
                            
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--gray-300)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{activeDatasetName}</span>
                              <span className="badge badge-ham" style={{ fontSize: '0.7rem' }}>Siap Ditraining</span>
                            </div>
                            
                            {dbStats && (
                              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                                <div style={{ flex: 1, padding: 12, background: 'white', borderRadius: 8, textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>Total Email</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{dbStats.total_emails.toLocaleString()}</div>
                                </div>
                                <div style={{ flex: 1, padding: 12, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>Spam</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>{dbStats.total_spam.toLocaleString()}</div>
                                </div>
                                <div style={{ flex: 1, padding: 12, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 8, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Ham (Aman)</div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{dbStats.total_ham.toLocaleString()}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid-2" style={{ marginBottom: 20 }}>
                            <div className="form-group">
                              <label className="form-label">Nama Model</label>
                              <input className="form-input" value={modelName} onChange={(e) => setModelName(e.target.value)} required disabled={currentStep > 0 || training} />
                            </div>
                          </div>

                          <div className="grid-4" style={{ marginBottom: 24 }}>
                            <div className="form-group">
                              <label className="form-label">Train (%)</label>
                              <input className="form-input" type="number" value={trainRatio} onChange={(e) => setTrainRatio(e.target.value)} disabled={currentStep > 0 || training} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Test (%)</label>
                              <input className="form-input" type="number" value={testRatio} onChange={(e) => setTestRatio(e.target.value)} disabled={currentStep > 0 || training} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Epoch</label>
                              <input className="form-input" type="number" value={epoch} onChange={(e) => setEpoch(e.target.value)} disabled={currentStep > 0 || training} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Learning Rate</label>
                              <input className="form-input" type="number" step="0.001" value={lr} onChange={(e) => setLr(e.target.value)} disabled={currentStep > 0 || training} />
                            </div>
                          </div>

                          {currentStep === 0 && (
                            <div style={{ width: '100%' }}>
                              {globalLock && (
                                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <ShieldAlert size={14} /> Harap tunggu, proses {globalLock} sedang berjalan. Selesaikan atau reset proses tersebut sebelum memulai pelatihan baru.
                                </div>
                              )}
                              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={training || !!globalLock}>
                                {training ? <><Activity size={18} className="spinner" /> Sedang Melatih...</> : <><Play size={18} /> Mulai Proses Pelatihan</>}
                              </button>
                            </div>
                          )}
                        </form>
                      )}

                      {index === 1 && (
                        <div>
                           {training ? (
                            <div style={{ padding: 20 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{trainStepDesc}</span>
                                <span style={{ fontSize: "0.9rem", color: "var(--gray-500)" }}>{trainProgress}%</span>
                              </div>
                              <div className="progress-bar" style={{ height: 10, background: 'var(--gray-200)' }}>
                                <div className="progress-fill" style={{ width: `${trainProgress}%`, background: 'var(--black)', transition: 'width 0.5s ease' }}></div>
                              </div>
                            </div>
                          ) : trainResult ? (
                            <div style={{ padding: 20, textAlign: 'center' }}>
                              <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Pelatihan Selesai!</h4>
                              <p style={{ color: 'var(--gray-500)', margin: 0 }}>Model "{modelName}" berhasil dilatih.</p>
                            </div>
                          ) : (
                             <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)' }}>Menunggu instruksi pelatihan...</div>
                          )}
                        </div>
                      )}

                      {index === 2 && (
                        <div>
                          {trainResult ? (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                                {[
                                  { label: "Akurasi", val: trainResult.accuracy },
                                  { label: "Presisi", val: trainResult.precision },
                                  { label: "Recall", val: trainResult.recall },
                                  { label: "F1-Score", val: trainResult.f1 },
                                  { label: "Macro Avg", val: trainResult.macro_avg },
                                  { label: "Weighted Avg", val: trainResult.weighted_avg },
                                  { label: "MCC", val: trainResult.mcc, noPercent: true },
                                  { label: "ROC-AUC", val: trainResult.roc_auc, noPercent: true },
                                  { label: "Mean Std Dev", val: trainResult.mean_std, noPercent: true },
                                ].map((m, i) => (
                                  <div key={i} style={{ border: "1px solid var(--gray-200)", padding: '16px 12px', borderRadius: "var(--radius-md)", textAlign: "center", background: 'var(--gray-50)' }}>
                                    <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                                    <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                                      {m.noPercent ? m.val.toFixed(4) : (m.val * 100).toFixed(2) + "%"}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div style={{ border: "1px solid var(--gray-200)", padding: 20, borderRadius: "var(--radius-md)", marginBottom: 24 }}>
                                <h4 style={{ fontSize: "0.9rem", color: "var(--gray-600)", marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} /> Grafik Loss Training ({epoch} Epoch)</h4>
                                <div style={{ height: 220 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trainResult.gatLoss} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--gray-200)" />
                                      <XAxis dataKey="e" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--gray-500)" }} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--gray-500)" }} />
                                      <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "0.8rem" }} />
                                      <Area type="monotone" dataKey="l" stroke="var(--black)" fill="var(--gray-100)" strokeWidth={2} name="Loss" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {!isDone && (
                                <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: 14, marginTop: 24 }} onClick={handleSaveToHistory}>
                                  <Save size={18} /> Simpan ke Riwayat & Selesai
                                </button>
                              )}

                              {isDone && (
                                <div style={{ marginTop: 24, textAlign: 'center' }}>
                                  <div style={{ background: 'var(--gray-50)', padding: 24, borderRadius: 12, border: '1px solid var(--gray-200)' }}>
                                    <h4 style={{ marginBottom: 12 }}>Proses Selesai!</h4>
                                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 20 }}>
                                      Model telah disimpan ke riwayat. Anda dapat membersihkan konfigurasi ini untuk memulai pelatihan baru.
                                    </p>
                                    <button className="btn btn-outline" onClick={clearPersistence}>
                                      Bersihkan & Kembali ke Awal
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                             <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)' }}>Menunggu hasil komputasi model...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
