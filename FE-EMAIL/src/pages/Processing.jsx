import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { emailAPI, modelAPI } from "../services/api";
import {
  Play,
  CheckCircle,
  Database,
  Layers,
  Activity,
  Settings,
  TrendingUp,
  Save,
  ChevronRight,
  ShieldAlert,
  XCircle,
} from "lucide-react";
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
  {
    key: "setup",
    label: "1. Pengaturan",
    desc: "Konfigurasi dataset, pembagian data (train/test), dan hyperparameter model.",
  },
  {
    key: "training",
    label: "2. Pelatihan",
    desc: "Proses training model hibrida IndoBERT + GAT pada dataset terpilih.",
  },
  {
    key: "validation",
    label: "3. Validasi",
    desc: "Analisis hasil akurasi, grafik loss, dan simpan model ke riwayat.",
  },
];

export default function ProcessingPage() {
  const location = useLocation();

  // Load from localStorage or defaults
  const getInitial = (key, def) => {
    const saved = localStorage.getItem(`processing_${key}`);
    try {
      return saved ? JSON.parse(saved) : def;
    } catch {
      return saved || def;
    }
  };

  const [currentStep, setCurrentStep] = useState(() => getInitial("step", 0));
  const [dbStats, setDbStats] = useState(null);
  const [activeDatasetName, setActiveDatasetName] = useState(
    () => location.state?.datasetName || getInitial("datasetName", ""),
  );
  const [activeDatasetId, setActiveDatasetId] = useState(() => {
    const fromState = location.state?.datasetId;
    const fromStorage = localStorage.getItem("preproc_selectedDatasetId");
    return fromState || (fromStorage === "db-01" ? "" : fromStorage || "");
  });

  const [modelName, setModelName] = useState(() =>
    getInitial("modelName", "Model_Spam_GAT_01"),
  );
  const [trainRatio, setTrainRatio] = useState(() =>
    getInitial("trainRatio", 70),
  );
  const [valRatio, setValRatio] = useState(() =>
    getInitial("valRatio", 10),
  );
  const [testRatio, setTestRatio] = useState(() => getInitial("testRatio", 20));
  const [epoch, setEpoch] = useState(() => getInitial("epoch", 30));
  const [lr, setLr] = useState(() => getInitial("lr", 0.001));
  
  // --- New UI States ---
  const [activeModelTab, setActiveModelTab] = useState("indobert");
  const [cvFolds, setCvFolds] = useState(5);
  const [randomSeed, setRandomSeed] = useState(42);
  const [shuffleData, setShuffleData] = useState(true);
  
  // IndoBERT Config
  const [indoLR, setIndoLR] = useState(0.00002);
  const [batchSize, setBatchSize] = useState(16);
  const [indoEpochs, setIndoEpochs] = useState(10);
  const [maxSeqLength, setMaxSeqLength] = useState(512);
  const [warmupSteps, setWarmupSteps] = useState(500);
  const [weightDecay, setWeightDecay] = useState(0.01);
  const [dropoutRate, setDropoutRate] = useState(0.1);
  const [optimizer, setOptimizer] = useState("AdamW");
  
  // GAT Config
  const [gatLR, setGatLR] = useState(0.001);
  const [gatEpochs, setGatEpochs] = useState(100);
  const [gatWeightDecay, setGatWeightDecay] = useState(0.0001);
  
  const [earlyStopping, setEarlyStopping] = useState(3);
  // ----------------------
  const [datasets, setDatasets] = useState([]);
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainStepDesc, setTrainStepDesc] = useState("");
  const [liveEpoch, setLiveEpoch] = useState(0);
  const [liveLoss, setLiveLoss] = useState(0);
  const [globalLock, setGlobalLock] = useState(null);
  const [trainResult, setTrainResult] = useState(() =>
    getInitial("trainResult", null),
  );
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  useEffect(() => {
    localStorage.setItem("processing_step", JSON.stringify(currentStep));
    localStorage.setItem("processing_modelName", modelName);
    localStorage.setItem("processing_trainRatio", trainRatio);
    localStorage.setItem("processing_valRatio", valRatio);
    localStorage.setItem("processing_testRatio", testRatio);
    localStorage.setItem("processing_epoch", epoch);
    localStorage.setItem("processing_lr", lr);
    localStorage.setItem("processing_trainResult", JSON.stringify(trainResult));
    localStorage.setItem("processing_datasetName", activeDatasetName);
  }, [
    currentStep,
    modelName,
    trainRatio,
    valRatio,
    testRatio,
    epoch,
    lr,
    trainResult,
    activeDatasetName,
  ]);

  useEffect(() => {
    modelAPI
      .listDatasets()
      .then((res) => setDatasets(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    emailAPI
      .stats(activeDatasetId)
      .then((res) => setDbStats(res.data))
      .catch((err) => console.error(err));
  }, [activeDatasetId]);

  useEffect(() => {
    const checkLock = () => {
      const lock = localStorage.getItem("global_process_active");
      if (lock && lock !== "training") {
        setGlobalLock(lock);
      } else {
        setGlobalLock(null);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync with server
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const res = await modelAPI.getProgress();
        const status = res.data;

        if (status.status === "training") {
          setTraining(true);
          setCurrentStep(1);
          setLiveEpoch(status.epoch);
          setLiveLoss(status.loss);
          setTrainProgress(status.progress);
          setTrainStepDesc(status.current_step);
          localStorage.setItem("processing_running", "true");
          localStorage.setItem("global_process_active", "training");
          localStorage.removeItem("processing_startTime");
        } else if (status.status === "success") {
          // Only process success if we were actually running a training
          if (localStorage.getItem("processing_running") === "true") {
            if (status.metrics && !trainResult) {
              const result = {
                accuracy: status.metrics.accuracy,
                precision: status.metrics.precision,
                recall: status.metrics.recall,
                f1: status.metrics.f1_score,
                macro_avg: status.metrics.macro_avg.f1,
                weighted_avg: status.metrics.weighted_avg.f1,
                mcc: status.metrics.mcc,
                roc_auc: status.metrics.roc_auc,
                mean_std: status.metrics.std_loss,
                gatLoss: status.metrics.gat_loss_history.map((l, i) => ({
                  e: i + 1,
                  l: l,
                })),
              };
              setTrainResult(result);
              localStorage.setItem("processing_trainResult", JSON.stringify(result));
              setCurrentStep(2);
            }
            setTraining(false);
            localStorage.removeItem("processing_running");
            localStorage.removeItem("global_process_active");
          }
        } else if (status.status === "error") {
          setTraining(false);
          setError(status.current_step || "Terjadi kesalahan pada server.");
          localStorage.removeItem("processing_running");
          localStorage.removeItem("global_process_active");
        } else if (status.status === "cancelled") {
          setTraining(false);
          setTrainStepDesc("Pelatihan dibatalkan.");
          localStorage.removeItem("processing_running");
          localStorage.removeItem("global_process_active");
          setToast({
            show: true,
            msg: "Pelatihan dibatalkan.",
            type: "warning",
          });
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    syncWithServer();
    const interval = setInterval(syncWithServer, 2000);
    return () => clearInterval(interval);
  }, [trainResult]);

  const handleCancelTrain = async () => {
    try {
      await modelAPI.cancelTrain();
      setToast({
        show: true,
        msg: "Permintaan pembatalan dikirim...",
        type: "info",
      });
    } catch (err) {
      setToast({
        show: true,
        msg: "Gagal membatalkan pelatihan.",
        type: "danger",
      });
    }
  };

  const handleTrain = async (e) => {
    e.preventDefault();
    if (globalLock) return alert(`Harap tunggu proses ${globalLock} selesai.`);
    if (!modelName.trim()) return alert("Nama model tidak boleh kosong!");
    if (parseInt(trainRatio) + parseInt(valRatio) + parseInt(testRatio) !== 100)
      return alert("Total Train, Validation, dan Test harus 100!");

    setTrainResult(null);
    setError(null);
    setCurrentStep(1);
    setTraining(true);
    setTrainProgress(10);
    localStorage.setItem("processing_running", "true");
    localStorage.setItem("global_process_active", "training");
    localStorage.setItem("processing_startTime", Date.now().toString());

    try {
      setTrainStepDesc("Menghubungkan ke server...");
      await modelAPI.train({
        dataset_id: activeDatasetId ? parseInt(activeDatasetId) : null,
        model_name: modelName,
        test_split: parseInt(testRatio) / 100,
        val_split: parseInt(valRatio) / 100,
        finetune_epochs: parseInt(indoEpochs),
        finetune_lr: parseFloat(indoLR),
        finetune_batch_size: parseInt(batchSize),
        weight_decay: parseFloat(weightDecay),
        gat_epochs: parseInt(gatEpochs),
        gat_lr: parseFloat(gatLR),
        gat_weight_decay: parseFloat(gatWeightDecay),
      });
    } catch (err) {
      console.error("Training error:", err);
      setError(
        err.response?.data?.detail || "Gagal melakukan pelatihan model.",
      );
      setTraining(false);
      localStorage.removeItem("processing_running");
      localStorage.removeItem("global_process_active");
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin membatalkan proses pelatihan ini? Semua progres akan hilang.",
      )
    ) {
      setTraining(false);
      setTrainProgress(0);
      setTrainResult(null);
      setCurrentStep(0);
      localStorage.removeItem("processing_running");
      localStorage.removeItem("global_process_active");
      localStorage.removeItem("processing_step");
      localStorage.removeItem("processing_trainResult");
      window.location.reload();
    }
  };

  const clearPersistence = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("processing_") || key.startsWith("preproc_") || key === "global_process_active")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: "100%", padding: "0 24px", paddingBottom: 60 }}>
      {toast.show && (
        <div
          className={`alert alert-${toast.type}`}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            minWidth: 300,
          }}
        >
          {toast.msg}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToast({ ...toast, show: false })}
          ></button>
        </div>
      )}

      <div
        className="page-header"
        style={{ textAlign: "center", marginBottom: 40 }}
      >
        <h1 style={{ fontSize: "2.2rem", marginBottom: 8 }}>
          Model Training Pipeline
        </h1>
        <p
          style={{ color: "var(--gray-500)", maxWidth: 800, margin: "0 auto" }}
        >
          Latih model hibrida IndoBERT + GAT Anda menggunakan dataset yang telah
          dibersihkan pada tahap pre-processing.
        </p>
      </div>

      <div style={{ paddingLeft: 10 }}>
        {(training || currentStep > 0) && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <button
              onClick={handleReset}
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
              style={{ fontWeight: 600 }}
            >
              <Settings size={14} /> Batalkan & Reset Proses
            </button>
          </div>
        )}

        {STEPS.map((step, index) => {
          const isActive = currentStep === index;
          const isDone = currentStep > index;
          const isPending = currentStep < index;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                marginBottom: index === STEPS.length - 1 ? 0 : 20,
                opacity: isPending ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginRight: 24,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isDone
                      ? "#10b981"
                      : isActive
                        ? "#171717"
                        : "var(--gray-200)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isDone ? (
                    <CheckCircle size={20} />
                  ) : (
                    <span style={{ fontWeight: "bold" }}>{index + 1}</span>
                  )}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div className="card">
                  <div
                    onClick={() => !training && setCurrentStep(index)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: isActive || isDone ? 16 : 0,
                      cursor: !training ? "pointer" : "default",
                    }}
                  >
                    <div>
                      <h3 style={{ marginBottom: 4 }}>{step.label}</h3>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--gray-500)",
                          margin: 0,
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {(isActive || isDone) && (
                    <div
                      style={{
                        borderTop: "1px solid var(--gray-100)",
                        paddingTop: 16,
                      }}
                    >
                      {index === 0 && (
                        <div style={{ animation: "slideUp 0.4s ease" }}>
                          {error && (
                            <div className="alert alert-danger d-flex align-items-center gap-3 mb-4">
                              <ShieldAlert size={20} />
                              <div>{error}</div>
                            </div>
                          )}
                          <form onSubmit={handleTrain}>
                            
                            {/* 3-COLUMN LAYOUT */}
                            <div className="row mb-4">
                              {/* COL 1: DATA SPLIT */}
                              <div className="col-lg-4 mb-3 mb-lg-0">
                                <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", height: '100%' }}>
                                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Database size={18} style={{ color: "var(--gmail-blue)" }} /> Data Split Configuration
                                  </h4>

                                  {/* Dataset Selector */}
                                  <div style={{ marginBottom: 20 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Pilih Dataset</label>
                                    <select
                                      className="form-select"
                                      value={activeDatasetId || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setActiveDatasetId(val);
                                        const ds = datasets.find((d) => d.id.toString() === val);
                                        setActiveDatasetName(ds ? ds.name : "");
                                      }}
                                      disabled={training}
                                      style={{ height: 42, borderRadius: 8, fontSize: "0.9rem" }}
                                    >
                                      {datasets.length === 0 ? (
                                        <option value="">-- Belum ada dataset --</option>
                                      ) : (
                                        <>
                                          <option value="" disabled>-- Pilih Dataset --</option>
                                          {datasets.map((ds) => (
                                            <option key={ds.id} value={ds.id}>
                                              {ds.name} ({(ds.total_rows || 0).toLocaleString()} Email)
                                            </option>
                                          ))}
                                        </>
                                      )}
                                    </select>
                                  </div>

                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Train-Validation-Test Split Ratio</label>
                                  <div style={{ display: 'flex', gap: '12px', marginBottom: 12 }}>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Train (%)</span>
                                      <input className="form-input" type="number" value={trainRatio} onChange={(e) => setTrainRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Validation (%)</span>
                                      <input className="form-input" type="number" value={valRatio} onChange={(e) => setValRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Test (%)</span>
                                      <input className="form-input" type="number" value={testRatio} onChange={(e) => setTestRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                  </div>
                                  
                                  {/* Visual Progress Bar */}
                                  <div style={{ height: 8, borderRadius: 4, display: 'flex', overflow: 'hidden', marginBottom: 8, background: 'var(--gray-100)' }}>
                                    <div style={{ width: `${trainRatio}%`, background: 'var(--gmail-blue)' }}></div>
                                    <div style={{ width: `${valRatio}%`, background: 'var(--gmail-blue-light)' }}></div>
                                    <div style={{ width: `${testRatio}%`, background: 'var(--gray-300)' }}></div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 20 }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                      <span style={{ color: 'var(--gmail-blue)' }}>● Train: {trainRatio}%</span>
                                      <span style={{ color: 'var(--gmail-blue-dark)' }}>● Validation: {valRatio}%</span>
                                      <span>● Test: {testRatio}%</span>
                                    </div>
                                    <span style={{ color: (parseInt(trainRatio)+parseInt(valRatio)+parseInt(testRatio)) === 100 ? 'var(--gmail-green)' : 'var(--gmail-red)' }}>
                                      Total: {parseInt(trainRatio)+parseInt(valRatio)+parseInt(testRatio)}%
                                    </span>
                                  </div>

                                  <div style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cross Validation Folds</label>
                                    <input className="form-input" type="number" value={cvFolds} onChange={(e) => setCvFolds(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  </div>
                                  <div style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Random Seed</label>
                                    <input className="form-input" type="number" value={randomSeed} onChange={(e) => setRandomSeed(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <input type="checkbox" id="shuffle" checked={shuffleData} onChange={(e) => setShuffleData(e.target.checked)} disabled={training} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                    <label htmlFor="shuffle" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: 'pointer', margin: 0 }}>Shuffle data sebelum split</label>
                                  </div>
                                </div>
                              </div>

                              {/* COL 2: INDOBERT PARAMETERS */}
                              <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
                                <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", height: '100%' }}>
                                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Settings size={18} style={{ color: "var(--gmail-blue)" }} /> IndoBERT Parameters
                                  </h4>
                                  
                                  <div className="row g-3">
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Learning Rate</label>
                                      <input className="form-input" type="number" step="0.00001" value={indoLR} onChange={(e) => setIndoLR(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 2e-5</span>
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Batch Size</label>
                                      <input className="form-input" type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 16</span>
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Epochs</label>
                                      <input className="form-input" type="number" value={indoEpochs} onChange={(e) => setIndoEpochs(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Max Sequence Length</label>
                                      <input className="form-input" type="number" value={maxSeqLength} onChange={(e) => setMaxSeqLength(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Warmup Steps</label>
                                      <input className="form-input" type="number" value={warmupSteps} onChange={(e) => setWarmupSteps(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Weight Decay</label>
                                      <input className="form-input" type="number" step="0.01" value={weightDecay} onChange={(e) => setWeightDecay(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Dropout Rate</label>
                                      <input className="form-input" type="number" step="0.1" value={dropoutRate} onChange={(e) => setDropoutRate(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div className="col-6">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Optimizer</label>
                                      <select className="form-select" value={optimizer} onChange={(e) => setOptimizer(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }}>
                                        <option value="AdamW">AdamW</option>
                                        <option value="Adam">Adam</option>
                                        <option value="SGD">SGD</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* COL 3: GAT PARAMETERS */}
                              <div className="col-lg-4 col-md-6">
                                <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", height: '100%' }}>
                                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Settings size={18} style={{ color: "var(--gmail-blue)" }} /> GAT Parameters
                                  </h4>
                                  
                                  <div className="row g-3">
                                    <div className="col-12">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Learning Rate (GAT)</label>
                                      <input className="form-input" type="number" step="0.001" value={gatLR} onChange={(e) => setGatLR(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 0.001</span>
                                    </div>
                                    <div className="col-12">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Epochs (GAT)</label>
                                      <input className="form-input" type="number" value={gatEpochs} onChange={(e) => setGatEpochs(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 100</span>
                                    </div>
                                    <div className="col-12">
                                      <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Weight Decay (GAT)</label>
                                      <input className="form-input" type="number" step="0.0001" value={gatWeightDecay} onChange={(e) => setGatWeightDecay(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* BOTTOM SECTION: TRAINING CONFIGURATION */}
                            <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", marginBottom: 24 }}>
                              <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16, color: "var(--gray-800)" }}>
                                Training Configuration
                              </h4>
                              
                              <div className="row mb-3">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Nama Model</label>
                                  <input className="form-input" value={modelName} onChange={(e) => setModelName(e.target.value)} required disabled={training} placeholder="Contoh: Model_Spam_01" style={{ height: 38, borderRadius: 6 }} />
                                </div>
                              </div>

                              <div className="row">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Validation Split</label>
                                  <input className="form-input" type="number" step="0.1" value={valRatio / 100} disabled style={{ height: 38, borderRadius: 6, background: 'var(--gray-100)' }} />
                                  <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Proportion untuk validasi (diambil otomatis dari atas)</span>
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Early Stopping Patience</label>
                                  <input className="form-input" type="number" value={earlyStopping} onChange={(e) => setEarlyStopping(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Epochs menunggu sebelum stop</span>
                                </div>
                              </div>
                            </div>

                            {/* ACTION BAR */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button
                                type="button"
                                className="btn"
                                disabled={training}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 2,
                                  background: 'var(--gmail-blue)',
                                  color: 'white',
                                }}
                              >
                                <Save size={18} /> Simpan Parameter
                              </button>

                              <button
                                type="button"
                                className="btn"
                                disabled={training}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 1,
                                  background: 'var(--gray-200)',
                                  color: 'var(--gray-700)',
                                }}
                              >
                                <Activity size={18} /> Reset ke Default
                              </button>

                              <button
                                type="submit"
                                className="btn"
                                disabled={training || !!globalLock || (dbStats?.total_processed === 0 && !activeDatasetId)}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 1,
                                  background: '#10b981',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                }}
                              >
                                {training ? (
                                  <>
                                    <div className="spinner" style={{ width: 18, height: 18, borderTopColor: "white", borderLeftColor: "white" }}></div>
                                    Melatih...
                                  </>
                                ) : (
                                  <>
                                    <Play size={18} /> Mulai Training
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                      {index === 1 && (
                        <div>
                          {training ? (
                            <div className="py-3">
                              <div className="d-flex justify-content-between align-items-end mb-2">
                                <div className="d-flex flex-column gap-1">
                                  <span style={{ fontWeight: 700 }}>
                                    {trainStepDesc}
                                  </span>
                                  {liveEpoch > 0 && (
                                    <div
                                      className="d-flex gap-3"
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--gray-600)",
                                      }}
                                    >
                                      <span>
                                        Epoch:{" "}
                                        <strong>
                                          {liveEpoch} / {epoch}
                                        </strong>
                                      </span>
                                      <span>
                                        Loss:{" "}
                                        <strong className="text-danger">
                                          {liveLoss.toFixed(6)}
                                        </strong>
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: "1.2rem",
                                  }}
                                >
                                  {trainProgress}%
                                </span>
                              </div>
                              <div
                                className="progress mb-4"
                                style={{ height: 10 }}
                              >
                                <div
                                  className="progress-bar bg-dark"
                                  style={{ width: `${trainProgress}%` }}
                                ></div>
                              </div>

                              <div className="p-3 bg-light rounded text-center border">
                                <Activity
                                  size={24}
                                  className="spinner text-muted mb-2"
                                />
                                <p className="small text-muted mb-1">
                                  Memantau metrik pelatihan secara real-time...
                                </p>
                                <p
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "#ef4444",
                                  }}
                                >
                                  * (bisa 5-15 menit tergantung
                                  spesifikasi hardware).
                                </p>
                                <button
                                  onClick={handleCancelTrain}
                                  className="btn btn-link text-danger btn-sm mt-1 text-decoration-none fw-bold"
                                >
                                  Hentikan Proses
                                </button>
                              </div>
                            </div>
                          ) : error ? (
                            <div className="py-4 text-center text-danger">
                              <ShieldAlert size={48} className="mb-3" />
                              <h4 className="mb-1">Terjadi Kesalahan</h4>
                              <p className="small mb-0">{error}</p>
                              <button
                                className="btn btn-outline-danger btn-sm mt-3"
                                onClick={() => {
                                  setError(null);
                                  setCurrentStep(0);
                                }}
                              >
                                Coba Lagi
                              </button>
                            </div>
                          ) : trainResult ? (
                            <div className="py-4 text-center">
                              <CheckCircle
                                size={48}
                                className="text-success mb-3"
                              />
                              <h4 className="mb-1">Pelatihan Selesai!</h4>
                              <p className="text-muted">
                                Model "{modelName}" siap divalidasi.
                              </p>
                            </div>
                          ) : (
                            <div className="py-4 text-center text-muted">
                              Menunggu instruksi pelatihan...
                            </div>
                          )}
                        </div>
                      )}

                      {index === 2 && (
                        <div>
                          {trainResult ? (
                            <div>
                              <div className="card p-0 overflow-hidden mb-4 border">
                                <div className="p-3 bg-light border-bottom fw-bold small">
                                  TABEL HASIL VALIDASI MODEL
                                </div>
                                <div className="table-responsive">
                                  <table className="table table-sm mb-0">
                                    <thead>
                                      <tr className="bg-light">
                                        <th className="px-3 py-2 border-0">
                                          Metrik
                                        </th>
                                        <th className="px-3 py-2 border-0 text-end">
                                          Nilai
                                        </th>
                                        <th
                                          className="px-3 py-2 border-0"
                                          style={{ width: "40%" }}
                                        >
                                          Visual
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        {
                                          label: "Accuracy",
                                          val: trainResult.accuracy,
                                          color: "#10b981",
                                        },
                                        {
                                          label: "Precision",
                                          val: trainResult.precision,
                                          color: "#3b82f6",
                                        },
                                        {
                                          label: "Recall",
                                          val: trainResult.recall,
                                          color: "#f59e0b",
                                        },
                                        {
                                          label: "F1-Score",
                                          val: trainResult.f1,
                                          color: "#8b5cf6",
                                        },
                                        {
                                          label: "MCC",
                                          val: trainResult.mcc,
                                          noPercent: true,
                                          color: "#14b8a6",
                                        },
                                        {
                                          label: "ROC-AUC",
                                          val: trainResult.roc_auc,
                                          noPercent: true,
                                          color: "#f97316",
                                        },
                                      ].map((m, i) => (
                                        <tr key={i}>
                                          <td className="px-3 py-2 fw-bold small border-0">
                                            {m.label}
                                          </td>
                                          <td className="px-3 py-2 text-end fw-bold border-0">
                                            {m.noPercent
                                              ? m.val.toFixed(4)
                                              : (m.val * 100).toFixed(2) + "%"}
                                          </td>
                                          <td className="px-3 py-2 border-0">
                                            <div
                                              className="progress"
                                              style={{ height: 6 }}
                                            >
                                              <div
                                                className="progress-bar"
                                                style={{
                                                  width: `${Math.min(m.val * 100, 100)}%`,
                                                  backgroundColor: m.color,
                                                }}
                                              ></div>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="p-3 border rounded mb-4">
                                <h4 className="small fw-bold text-muted mb-3 d-flex align-items-center gap-2">
                                  <TrendingUp size={16} /> Grafik Loss Training
                                </h4>
                                <div style={{ height: 200 }}>
                                  <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                  >
                                    <AreaChart data={trainResult.gatLoss}>
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                      />
                                      <XAxis dataKey="e" hide />
                                      <YAxis hide />
                                      <RechartsTooltip />
                                      <Area
                                        type="monotone"
                                        dataKey="l"
                                        stroke="#171717"
                                        fill="#f3f4f6"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                  className="btn btn-outline-dark btn-lg w-100 py-3"
                                  onClick={clearPersistence}
                                >
                                  Latih Model Baru
                                </button>
                                <button
                                  className="btn btn-dark btn-lg w-100 py-3"
                                  onClick={() => window.location.href = '/testing'}
                                >
                                  <Save size={18} /> Lanjut ke Testing
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center text-muted">
                              Menunggu hasil komputasi...
                            </div>
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
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
