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
            localStorage.setItem(
              "processing_trainResult",
              JSON.stringify(result),
            );
            setCurrentStep(2);
          }
          setTraining(false);
          localStorage.removeItem("processing_running");
          localStorage.removeItem("global_process_active");
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
        } else if (localStorage.getItem("processing_running") === "true") {
          // Hanya reset jika sudah 'idle' cukup lama (misal 10 detik)
          // untuk memberi waktu Background Task di server mulai jalan
          const startTime = localStorage.getItem("processing_startTime");
          const now = Date.now();
          if (startTime && now - parseInt(startTime) > 10000) {
            setTraining(false);
            setTrainStepDesc("");
            localStorage.removeItem("processing_running");
            localStorage.removeItem("global_process_active");
            localStorage.removeItem("processing_startTime");
          }
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
        finetune_epochs: 3,
        finetune_lr: parseFloat(lr),
        gat_epochs: parseInt(epoch),
        gat_lr: parseFloat(lr),
        finetune_batch_size: 16,
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
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
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
          style={{ color: "var(--gray-500)", maxWidth: 600, margin: "0 auto" }}
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
                            <div
                              style={{
                                background: "var(--gray-50)",
                                padding: 20,
                                borderRadius: 12,
                                border: "1px solid var(--gray-200)",
                                marginBottom: 20,
                              }}
                            >
                              <label
                                className="form-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginBottom: "10px",
                                  fontWeight: 600,
                                  fontSize: "0.95rem",
                                  color: "var(--gray-800)"
                                }}
                              >
                                <Database size={16} style={{ color: "var(--gmail-blue)" }} /> Pilih Dataset untuk Pelatihan
                              </label>

                              <select
                                className="form-select"
                                value={activeDatasetId || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setActiveDatasetId(val);
                                  const ds = datasets.find(
                                    (d) => d.id.toString() === val,
                                  );
                                  setActiveDatasetName(ds ? ds.name : "");
                                }}
                                disabled={training}
                                style={{
                                  height: 42,
                                  borderRadius: 8,
                                  fontSize: "0.9rem",
                                  marginBottom: "16px",
                                }}
                              >
                                {datasets.filter(
                                  (ds) =>
                                    ds.status === "Preprocessed" ||
                                    ds.status === "Trained" ||
                                    ds.status === "Training",
                                ).length === 0 ? (
                                  <option value="">
                                    -- Belum ada dataset yang tersedia --
                                  </option>
                                ) : (
                                  <>
                                    <option value="" disabled>
                                      -- Pilih Dataset untuk Pelatihan --
                                    </option>
                                    {datasets
                                      .filter(
                                        (ds) =>
                                          ds.status === "Preprocessed" ||
                                          ds.status === "Trained" ||
                                          ds.status === "Training",
                                      )
                                      .map((ds) => (
                                        <option key={ds.id} value={ds.id}>
                                          {ds.name} (
                                          {(
                                            ds.total_rows || 0
                                          ).toLocaleString()}{" "}
                                          Email)
                                        </option>
                                      ))}
                                  </>
                                )}
                              </select>

                              <div
                                style={{
                                  background: "white",
                                  padding: "12px 16px",
                                  borderRadius: 8,
                                  border: "1px solid var(--gray-200)",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em",
                                    ...(activeDatasetId &&
                                    (datasets.find(
                                      (ds) =>
                                        ds.id.toString() ===
                                        activeDatasetId.toString(),
                                    )?.status === "Preprocessed" ||
                                      datasets.find(
                                        (ds) =>
                                          ds.id.toString() ===
                                          activeDatasetId.toString(),
                                      )?.status === "Trained")
                                      ? {
                                          backgroundColor: "var(--gmail-green-light)",
                                          color: "var(--gmail-green)",
                                        }
                                      : {
                                          backgroundColor: "#fef3c7",
                                          color: "#d97706",
                                        }),
                                  }}
                                >
                                  {activeDatasetId &&
                                  (datasets.find(
                                    (ds) =>
                                      ds.id.toString() ===
                                      activeDatasetId.toString(),
                                  )?.status === "Preprocessed" ||
                                    datasets.find(
                                      (ds) =>
                                        ds.id.toString() ===
                                        activeDatasetId.toString(),
                                  )?.status === "Trained")
                                    ? "Siap Ditraining"
                                    : activeDatasetId
                                      ? "Butuh Preprocessing"
                                      : "Belum Memilih Dataset"}
                                </span>
                              </div>

                              {dbStats && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ padding: '8px', border: '1px solid var(--gray-200)', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "var(--gray-500)",
                                          textTransform: "uppercase",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Total
                                      </div>
                                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--gray-800)", marginTop: 2 }}>
                                        {dbStats.total_emails.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ padding: '8px', border: '1px solid var(--gray-200)', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#ef4444",
                                          textTransform: "uppercase",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Spam
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: "0.95rem",
                                          color: "#ef4444",
                                          marginTop: 2
                                        }}
                                      >
                                        {dbStats.total_spam.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ padding: '8px', border: '1px solid var(--gray-200)', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white' }}>
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#10b981",
                                          textTransform: "uppercase",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Ham
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: "0.95rem",
                                          color: "#10b981",
                                          marginTop: 2
                                        }}
                                      >
                                        {dbStats.total_ham.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ marginBottom: 20 }}>
                              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--gray-800)" }}>
                                Nama Model
                              </label>
                              <input
                                className="form-input"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                required
                                disabled={currentStep > 0 || training}
                                placeholder="Contoh: Model_Spam_01"
                                style={{
                                  height: 42,
                                  fontSize: "0.9rem",
                                  borderRadius: 8,
                                }}
                              />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label className="form-label mb-0" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--gray-800)", marginBottom: 0 }}>
                                  Proporsi Data Split
                                </label>
                                <span style={{ color: "var(--gmail-red)", fontSize: "1.2rem", fontWeight: "bold", lineHeight: 1 }}>*</span>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={trainRatio}
                                    onChange={(e) => setTrainRatio(e.target.value)}
                                    disabled={currentStep > 0 || training}
                                    placeholder="Train"
                                    style={{
                                      height: 42,
                                      fontSize: "0.9rem",
                                      borderRadius: 8,
                                      width: "100%",
                                    }}
                                  />
                                  <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 4, paddingLeft: 2, fontWeight: 500 }}>
                                    Train (%)
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={valRatio}
                                    onChange={(e) => setValRatio(e.target.value)}
                                    disabled={currentStep > 0 || training}
                                    placeholder="Validation"
                                    style={{
                                      height: 42,
                                      fontSize: "0.9rem",
                                      borderRadius: 8,
                                      width: "100%",
                                    }}
                                  />
                                  <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 4, paddingLeft: 2, fontWeight: 500 }}>
                                    Validation (%)
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={testRatio}
                                    onChange={(e) => setTestRatio(e.target.value)}
                                    disabled={currentStep > 0 || training}
                                    placeholder="Test"
                                    style={{
                                      height: 42,
                                      fontSize: "0.9rem",
                                      borderRadius: 8,
                                      width: "100%",
                                    }}
                                  />
                                  <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 4, paddingLeft: 2, fontWeight: 500 }}>
                                    Test (%)
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ background: "var(--gray-50)", padding: "18px 20px", borderRadius: 12, border: "1px solid var(--gray-200)", marginBottom: 24 }}>
                              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 16, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                <Settings size={16} style={{ color: "var(--gmail-blue)" }} /> Hyperparameter Model
                              </h4>
                              <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                  <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--gray-600)", fontWeight: 600, marginBottom: 6 }}>Epochs</label>
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={epoch}
                                    onChange={(e) => setEpoch(e.target.value)}
                                    disabled={currentStep > 0 || training}
                                    style={{
                                      height: 42,
                                      fontSize: "0.9rem",
                                      borderRadius: 8,
                                      width: "100%",
                                    }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--gray-600)", fontWeight: 600, marginBottom: 6 }}>Learning Rate (LR)</label>
                                  <input
                                    className="form-input"
                                    type="number"
                                    step="0.001"
                                    value={lr}
                                    onChange={(e) => setLr(e.target.value)}
                                    disabled={currentStep > 0 || training}
                                    style={{
                                      height: 42,
                                      fontSize: "0.9rem",
                                      borderRadius: 8,
                                      width: "100%",
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {currentStep === 0 && (
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                  type="submit"
                                  className="btn btn-primary"
                                  disabled={
                                    training ||
                                    !!globalLock ||
                                    dbStats?.total_processed === 0
                                  }
                                  style={{
                                    height: 48,
                                    borderRadius: 8,
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: 'var(--gmail-blue)',
                                    color: 'white',
                                  }}
                                >
                                  {training ? (
                                    <>
                                      <div className="spinner" style={{ width: 18, height: 18, borderTopColor: "white", borderLeftColor: "white" }}></div>
                                      Melatih...
                                    </>
                                  ) : (
                                    <>
                                      <Play size={18} /> Mulai Proses Pelatihan
                                    </>
                                  )}
                                </button>

                                {training && (
                                  <button
                                    type="button"
                                    onClick={handleCancelTrain}
                                    className="btn btn-outline"
                                    style={{
                                      height: 48,
                                      borderRadius: 8,
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      borderColor: 'var(--gmail-red)',
                                      color: 'var(--gmail-red-dark)',
                                      backgroundColor: 'var(--gmail-red-light)',
                                    }}
                                  >
                                    <XCircle size={18} /> Batalkan
                                  </button>
                                )}
                              </div>
                            )}
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
                                  * Tahap Fine-tuning IndoBERT memang memakan
                                  waktu cukup lama (bisa 5-15 menit tergantung
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

                              <button
                                className="btn btn-dark btn-lg w-100 py-3"
                                onClick={clearPersistence}
                              >
                                <Save size={18} /> Selesai & Reset Pipeline
                              </button>
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
