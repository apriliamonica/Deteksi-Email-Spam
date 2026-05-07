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
    () =>
      location.state?.datasetName ||
      getInitial("datasetName", "Database Utama (Pre-Processed)"),
  );
  const [activeDatasetId, setActiveDatasetId] = useState(() => {
    const fromState = location.state?.datasetId;
    const fromStorage = localStorage.getItem("preproc_selectedDatasetId");
    return fromState || (fromStorage === "db-01" ? null : fromStorage);
  });

  const [modelName, setModelName] = useState(() =>
    getInitial("modelName", "Model_Spam_GAT_01"),
  );
  const [trainRatio, setTrainRatio] = useState(() =>
    getInitial("trainRatio", 80),
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
    localStorage.setItem("processing_testRatio", testRatio);
    localStorage.setItem("processing_epoch", epoch);
    localStorage.setItem("processing_lr", lr);
    localStorage.setItem("processing_trainResult", JSON.stringify(trainResult));
    localStorage.setItem("processing_datasetName", activeDatasetName);
  }, [
    currentStep,
    modelName,
    trainRatio,
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
    if (parseInt(trainRatio) + parseInt(testRatio) !== 100)
      return alert("Total Train dan Test harus 100!");

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
        finetune_epochs: 2,
        finetune_lr: parseFloat(lr),
        gat_epochs: parseInt(epoch),
        gat_lr: parseFloat(lr) * 10,
        finetune_batch_size: 16,
        umap_components: 128,
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
    const keys = [
      "step",
      "modelName",
      "trainRatio",
      "testRatio",
      "epoch",
      "lr",
      "trainResult",
      "datasetName",
    ];
    keys.forEach((k) => localStorage.removeItem(`processing_${k}`));
    localStorage.removeItem("preproc_step");
    localStorage.removeItem("preproc_selectedDataset");
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
                      cursor: !training ? "pointer" : "default"
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
                                padding: 16,
                                borderRadius: 8,
                                border: "1px solid var(--gray-200)",
                                marginBottom: 20,
                              }}
                            >
                              <label className="form-label mb-2 d-flex align-items-center gap-2">
                                <Database size={16} /> Pilih Dataset untuk
                                Pelatihan
                              </label>

                              <select
                                className="form-select mb-3"
                                value={activeDatasetId || "db-01"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setActiveDatasetId(
                                    val === "db-01" ? null : val,
                                  );
                                  const ds = datasets.find(
                                    (d) => d.id.toString() === val,
                                  );
                                  setActiveDatasetName(
                                    ds
                                      ? ds.name
                                      : "Database Utama (Pre-Processed)",
                                  );
                                }}
                                disabled={training}
                              >
                                <option value="db-01">
                                  Database Utama (Semua Data)
                                </option>
                                {datasets.map((ds) => (
                                  <option key={ds.id} value={ds.id}>
                                    {ds.name} (
                                    {(ds.total_rows || 0).toLocaleString()}{" "}
                                    Email)
                                  </option>
                                ))}
                              </select>

                              <div
                                style={{
                                  background: "white",
                                  padding: "12px 16px",
                                  borderRadius: 6,
                                  border: "1px solid var(--gray-300)",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{activeDatasetName}</span>
                                <span
                                  className="badge bg-success"
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  {dbStats?.total_processed > 0
                                    ? "Siap Ditraining"
                                    : "Butuh Preprocessing"}
                                </span>
                              </div>

                              {dbStats && (
                                <div className="row g-2 mt-2">
                                  <div className="col-4">
                                    <div className="p-2 border rounded text-center bg-white">
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "var(--gray-500)",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Total
                                      </div>
                                      <div style={{ fontWeight: 700 }}>
                                        {dbStats.total_emails.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="p-2 border rounded text-center bg-white">
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#ef4444",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Spam
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          color: "#ef4444",
                                        }}
                                      >
                                        {dbStats.total_spam.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="p-2 border rounded text-center bg-white">
                                      <div
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#10b981",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Ham
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          color: "#10b981",
                                        }}
                                      >
                                        {dbStats.total_ham.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="row mb-3">
                              <div className="col-12">
                                <label className="form-label">Nama Model</label>
                                <input
                                  className="form-control"
                                  value={modelName}
                                  onChange={(e) => setModelName(e.target.value)}
                                  required
                                  disabled={currentStep > 0 || training}
                                />
                              </div>
                            </div>

                            <div className="row g-3 mb-4">
                              <div className="col-3">
                                <label className="form-label">Train (%)</label>
                                <input
                                  className="form-control"
                                  type="number"
                                  value={trainRatio}
                                  onChange={(e) =>
                                    setTrainRatio(e.target.value)
                                  }
                                  disabled={currentStep > 0 || training}
                                />
                              </div>
                              <div className="col-3">
                                <label className="form-label">Test (%)</label>
                                <input
                                  className="form-control"
                                  type="number"
                                  value={testRatio}
                                  onChange={(e) => setTestRatio(e.target.value)}
                                  disabled={currentStep > 0 || training}
                                />
                              </div>
                              <div className="col-3">
                                <label className="form-label">Epoch</label>
                                <input
                                  className="form-control"
                                  type="number"
                                  value={epoch}
                                  onChange={(e) => setEpoch(e.target.value)}
                                  disabled={currentStep > 0 || training}
                                />
                              </div>
                              <div className="col-3">
                                <label className="form-label">LR</label>
                                <input
                                  className="form-control"
                                  type="number"
                                  step="0.001"
                                  value={lr}
                                  onChange={(e) => setLr(e.target.value)}
                                  disabled={currentStep > 0 || training}
                                />
                              </div>
                            </div>

                            {currentStep === 0 && (
                              <div className="d-flex gap-3">
                                <button
                                  type="submit"
                                  className="btn btn-primary-ham d-flex align-items-center justify-content-center gap-2 flex-grow-1 py-2"
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
                                  }}
                                >
                                  {training ? (
                                    <>
                                      <div className="spinner-border spinner-border-sm"></div>{" "}
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
                                    className="btn btn-outline-danger d-flex align-items-center gap-2"
                                    style={{
                                      height: 48,
                                      borderRadius: 8,
                                      fontWeight: 600,
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
                                onClick={() => { setError(null); setCurrentStep(0); }}
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
