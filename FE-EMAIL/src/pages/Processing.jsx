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
  XCircle,
  Lock,
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
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
  const [valRatio, setValRatio] = useState(() => getInitial("valRatio", 10));
  const [testRatio, setTestRatio] = useState(() => getInitial("testRatio", 20));
  const [epoch, setEpoch] = useState(() => getInitial("epoch", 30));
  const [lr, setLr] = useState(() => getInitial("lr", 0.001));

  // --- UI States ---
  const [activeModelTab, setActiveModelTab] = useState("gat");

  // GAT Config (IndoBERT config di-skip karena hanya sebagai feature extractor)
  const [gatLR, setGatLR] = useState("1e-3");
  const [gatEpochs, setGatEpochs] = useState(100);
  const [gatWeightDecay, setGatWeightDecay] = useState("1e-4");
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
              localStorage.setItem(
                "processing_trainResult",
                JSON.stringify(result),
              );
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
        finetune_epochs: 0,
        finetune_lr: 2e-5,
        finetune_batch_size: 16,
        weight_decay: 0.01,
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
      if (
        key &&
        (key.startsWith("processing_") ||
          key.startsWith("preproc_") ||
          key === "global_process_active")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
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
        <h1 style={{ fontSize: "2.2rem", marginBottom: 8 }}>Processing</h1>
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
                      marginBottom: isActive || isDone ? 20 : 0,
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
                            {/* FULL-WIDTH 2-COLUMN LAYOUT WITH TABS */}
                            <div className="row mb-4">
                              {/* COL 1: DATA SPLIT & GENERAL */}
                              <div
                                className="col-lg-4 col-md-12 mb-4 mb-lg-0"
                                style={{ marginBottom: "16px" }}
                              >
                                <div
                                  style={{
                                    background: "var(--app-surface)",
                                    padding: 24,
                                    borderRadius: 12,
                                    border: "1px solid var(--app-border)",
                                    height: "100%",
                                  }}
                                >
                                  <h4
                                    style={{
                                      fontSize: "1.1rem",
                                      fontWeight: 700,
                                      marginBottom: 24,
                                      color: "var(--gray-800)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                    }}
                                  >
                                    <Settings
                                      size={20}
                                      style={{ color: "var(--gmail-blue)" }}
                                    />{" "}
                                    General Settings
                                  </h4>

                                  <div style={{ marginBottom: 24 }}>
                                    <label
                                      className="form-label"
                                      style={{
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Nama Model
                                    </label>
                                    <input
                                      className="form-input"
                                      value={modelName}
                                      onChange={(e) =>
                                        setModelName(e.target.value)
                                      }
                                      required
                                      disabled={training}
                                      placeholder="Contoh: Model_Spam_01"
                                      style={{ height: 42, borderRadius: 8 }}
                                    />
                                  </div>

                                  <div style={{ marginBottom: 24 }}>
                                    <label
                                      className="form-label"
                                      style={{
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Pilih Dataset
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
                                        height: 46,
                                        borderRadius: 8,
                                        fontSize: "0.95rem",
                                      }}
                                    >
                                      {datasets.length === 0 ? (
                                        <option value="">
                                          -- Belum ada dataset --
                                        </option>
                                      ) : (
                                        <>
                                          <option value="" disabled>
                                            -- Pilih Dataset --
                                          </option>
                                          {datasets.map((ds) => (
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
                                  </div>

                                  <hr
                                    style={{
                                      margin: "24px 0",
                                      borderColor: "var(--gray-200)",
                                    }}
                                  />

                                  <h4
                                    style={{
                                      fontSize: "1.1rem",
                                      fontWeight: 700,
                                      marginBottom: 24,
                                      color: "var(--gray-800)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                    }}
                                  >
                                    <Database
                                      size={20}
                                      style={{ color: "var(--gmail-blue)" }}
                                    />{" "}
                                    Data Split Configuration
                                  </h4>

                                  <label
                                    className="form-label"
                                    style={{
                                      fontSize: "0.9rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Train-Validation-Test Split Ratio
                                  </label>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "16px",
                                      marginBottom: 16,
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          color: "var(--gray-500)",
                                          marginBottom: 6,
                                          display: "block",
                                        }}
                                      >
                                        Train (%)
                                      </span>
                                      <input
                                        className="form-input"
                                        type="number"
                                        value={trainRatio}
                                        onChange={(e) =>
                                          setTrainRatio(e.target.value)
                                        }
                                        disabled={training}
                                        style={{ height: 42, borderRadius: 8 }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          color: "var(--gray-500)",
                                          marginBottom: 6,
                                          display: "block",
                                        }}
                                      >
                                        Validation (%)
                                      </span>
                                      <input
                                        className="form-input"
                                        type="number"
                                        value={valRatio}
                                        onChange={(e) =>
                                          setValRatio(e.target.value)
                                        }
                                        disabled={training}
                                        style={{ height: 42, borderRadius: 8 }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          color: "var(--gray-500)",
                                          marginBottom: 6,
                                          display: "block",
                                        }}
                                      >
                                        Test (%)
                                      </span>
                                      <input
                                        className="form-input"
                                        type="number"
                                        value={testRatio}
                                        onChange={(e) =>
                                          setTestRatio(e.target.value)
                                        }
                                        disabled={training}
                                        style={{ height: 42, borderRadius: 8 }}
                                      />
                                    </div>
                                  </div>

                                  {/* Visual Progress Bar */}
                                  <div
                                    style={{
                                      height: 10,
                                      borderRadius: 5,
                                      display: "flex",
                                      overflow: "hidden",
                                      marginBottom: 12,
                                      background: "var(--gray-100)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${trainRatio}%`,
                                        background: "var(--gmail-blue)",
                                      }}
                                    ></div>
                                    <div
                                      style={{
                                        width: `${valRatio}%`,
                                        background: "var(--gmail-blue-light)",
                                      }}
                                    ></div>
                                    <div
                                      style={{
                                        width: `${testRatio}%`,
                                        background: "var(--gray-300)",
                                      }}
                                    ></div>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: "0.8rem",
                                      color: "var(--gray-500)",
                                      fontWeight: 600,
                                      marginBottom: 28,
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: 16 }}>
                                      <span
                                        style={{ color: "var(--gmail-blue)" }}
                                      >
                                        ● Train: {trainRatio}%
                                      </span>
                                      <span
                                        style={{
                                          color: "var(--gmail-blue-dark)",
                                        }}
                                      >
                                        ● Validation: {valRatio}%
                                      </span>
                                      <span>● Test: {testRatio}%</span>
                                    </div>
                                    <span
                                      style={{
                                        color:
                                          parseInt(trainRatio) +
                                            parseInt(valRatio) +
                                            parseInt(testRatio) ===
                                          100
                                            ? "var(--gmail-green)"
                                            : "var(--gmail-red)",
                                      }}
                                    >
                                      Total:{" "}
                                      {parseInt(trainRatio) +
                                        parseInt(valRatio) +
                                        parseInt(testRatio)}
                                      %
                                    </span>
                                  </div>

                                </div>
                              </div>

                              {/* COL 2: PARAMETERS WITH TABS */}
                              <div
                                className="col-lg-8 col-md-12"
                                style={{ marginBottom: "16px" }}
                              >
                                <div
                                  style={{
                                    background: "var(--app-surface)",
                                    padding: 24,
                                    borderRadius: 12,
                                    border: "1px solid var(--app-border)",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  {/* INFO PARAMETER */}
                                  <div
                                    style={{
                                      padding: "16px",
                                      background: "var(--gray-50)",
                                      border: "1px solid var(--gray-200)",
                                      borderRadius: 8,
                                      marginBottom: 20,
                                      fontSize: "0.85rem",
                                      color: "var(--gray-600)",
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 12,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    <Lock
                                      size={18}
                                      style={{
                                        color: "var(--gray-500)",
                                        flexShrink: 0,
                                        marginTop: 2,
                                      }}
                                    />
                                    <div>
                                      <strong
                                        style={{
                                          display: "block",
                                          marginBottom: 4,
                                          color: "var(--gray-800)",
                                        }}
                                      >
                                        Informasi Arsitektur Model:
                                      </strong>
                                      Menggunakan pre-trained model{" "}
                                      <strong>
                                        indobenchmark/indobert-base-p1
                                      </strong>{" "}
                                      sebagai feature extractor statis (tidak dilatih ulang). Parameter IndoBERT dikunci karena
                                      merupakan arsitektur asli bawaan model.
                                      Mengubah dimensi ini akan merusak
                                      kompatibilitas bobot (<i>weights</i>) asli
                                      dan lapisan GAT.
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      borderLeft: "4px solid #f59e0b",
                                      paddingLeft: 16,
                                      marginTop: 8,
                                      flex: 1,
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: "0 0 12px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#f59e0b",
                                      }}
                                    >
                                      Parameter Training GAT
                                    </p>
                                    <div className="row g-3">
                                        <ParamField
                                          label="Learning Rate (GAT)"
                                          paramKey="gatLR"
                                          value={gatLR}
                                          onChange={setGatLR}
                                          disabled={training}
                                          isScientific
                                        />
                                      <div className="col-md-3">
                                        <label
                                          className="form-label"
                                          style={{
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            marginBottom: 2,
                                          }}
                                        >
                                          Epochs
                                        </label>
                                        <input
                                          className="form-input"
                                          type="number"
                                          value={gatEpochs}
                                          onChange={(e) =>
                                            setGatEpochs(e.target.value)
                                          }
                                          disabled={training}
                                          style={{
                                            height: 36,
                                            borderRadius: 6,
                                            fontSize: "0.85rem",
                                          }}
                                        />
                                      </div>
                                        <ParamField
                                          label="Weight Decay (GAT)"
                                          paramKey="gatWeightDecay"
                                          value={gatWeightDecay}
                                          onChange={setGatWeightDecay}
                                          disabled={training}
                                          isScientific
                                        />
                                      <div className="col-md-3">
                                        <label
                                          className="form-label"
                                          style={{
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            marginBottom: 2,
                                          }}
                                        >
                                          Early Stopping
                                        </label>
                                        <input
                                          className="form-input"
                                          value="25"
                                          disabled
                                          style={{
                                            height: 36,
                                            borderRadius: 6,
                                            background:
                                              "var(--gray-100)",
                                            color: "var(--gray-500)",
                                            fontSize: "0.85rem",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </div>
                            {/* ACTION BAR */}
                            <div style={{ display: "flex", gap: "12px" }}>
                              {/* <button
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
                              </button> */}

                              {/* <button
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
                              </button> */}

                              <button
                                type="submit"
                                className="btn"
                                disabled={
                                  training ||
                                  !!globalLock ||
                                  (dbStats?.total_processed === 0 &&
                                    !activeDatasetId)
                                }
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 1,
                                  background: "#10b981",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                }}
                              >
                                {training ? (
                                  <>
                                    <div
                                      className="spinner"
                                      style={{
                                        width: 18,
                                        height: 18,
                                        borderTopColor: "white",
                                        borderLeftColor: "white",
                                      }}
                                    ></div>
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
                                  * (bisa 5-15 menit tergantung spesifikasi
                                  hardware).
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

                              <div style={{ display: "flex", gap: 12 }}>
                                <button
                                  className="btn btn-outline-dark btn-lg w-100 py-3"
                                  onClick={clearPersistence}
                                >
                                  Latih Model Baru
                                </button>
                                <button
                                  className="btn btn-dark btn-lg w-100 py-3"
                                  onClick={() =>
                                    (window.location.href = "/testing")
                                  }
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

// ════════════════════════════════════════════════════
// PARAM FIELD COMPONENT
// ════════════════════════════════════════════════════

const PARAM_CONFIG = {
  indoLR: {
    label: "Learning Rate",
    desc: "Mengontrol seberapa besar model memperbarui bobotnya setiap iterasi pelatihan. Nilai terlalu besar = model tidak stabil; terlalu kecil = pelatihan sangat lambat.",
    ideal: "2e-5 hingga 5e-5 untuk fine-tuning IndoBERT",
    evaluate: (v) => {
      if (v > 1e-3) return { type: "danger", msg: "⛔ Terlalu tinggi! Loss akan melonjak-lonjak dan model gagal belajar. Turunkan ke rentang 2e-5–5e-5." };
      if (v > 1e-4) return { type: "warn", msg: "⚠️ Cukup tinggi. Bisa menyebabkan instabilitas pelatihan. Disarankan turunkan ke ≤ 5e-5." };
      if (v > 0 && v < 1e-6) return { type: "warn", msg: "⚠️ Terlalu rendah. Pelatihan akan sangat lambat dan bisa terjebak di local minima. Naikkan ke minimal 1e-6." };
      return { type: "ok", msg: "✅ Nilai ideal untuk fine-tuning BERT. Model dapat belajar dengan stabil." };
    },
  },
  batchSize: {
    label: "Batch Size",
    desc: "Jumlah sampel email yang diproses sekaligus sebelum model memperbarui bobotnya. Nilai kecil = lebih sering update tapi tidak stabil; nilai besar = lebih stabil tapi butuh memori GPU lebih besar.",
    ideal: "16 atau 32",
    evaluate: (v) => {
      if (v > 128) return { type: "danger", msg: "⛔ Sangat besar! Kemungkinan besar akan menyebabkan Out of Memory (OOM) pada GPU." };
      if (v > 64) return { type: "warn", msg: "⚠️ Cukup besar. Bisa memakan banyak memori GPU. Monitor penggunaan VRAM Anda." };
      if (v < 4) return { type: "warn", msg: "⚠️ Terlalu kecil. Estimasi gradien menjadi sangat bising (noisy) dan training tidak stabil." };
      return { type: "ok", msg: "✅ Ukuran batch ideal. Keseimbangan baik antara kecepatan dan stabilitas pelatihan." };
    },
  },
  indoEpochs: {
    label: "Epochs",
    desc: "Berapa kali model melihat seluruh dataset pelatihan dari awal hingga akhir. Lebih banyak tidak selalu lebih baik karena model bisa 'menghafal' data (overfitting).",
    ideal: "3–5 untuk fine-tuning BERT",
    evaluate: (v) => {
      if (v > 15) return { type: "danger", msg: "⛔ Terlalu banyak! Model hampir pasti akan overfitting dan performanya buruk pada data baru." };
      if (v > 8) return { type: "warn", msg: "⚠️ Cukup tinggi. Pantau validation loss—jika naik, hentikan lebih awal (gunakan early stopping)." };
      if (v < 2) return { type: "warn", msg: "⚠️ Terlalu sedikit. Model mungkin belum sempat belajar pola yang cukup (underfitting)." };
      return { type: "ok", msg: "✅ Jumlah epoch ideal untuk fine-tuning model berbasis BERT." };
    },
  },
  weightDecay: {
    label: "Weight Decay",
    desc: "Regularisasi L2 yang secara bertahap 'menyusutkan' bobot model agar tidak terlalu besar. Membantu mencegah overfitting, terutama pada dataset kecil.",
    ideal: "1e-2 (0.01)",
    evaluate: (v) => {
      if (v > 0.5) return { type: "danger", msg: "⛔ Terlalu tinggi! Regularisasi terlalu kuat—model tidak dapat belajar dengan baik (underfitting)." };
      if (v > 0.1) return { type: "warn", msg: "⚠️ Agak tinggi. Bisa membatasi kapasitas belajar model. Coba turunkan ke 0.01." };
      if (v === 0) return { type: "warn", msg: "⚠️ Nilai 0 = tidak ada regularisasi. Model rentan overfitting, terutama dengan dataset kecil." };
      return { type: "ok", msg: "✅ Nilai weight decay yang sesuai untuk mencegah overfitting." };
    },
  },
  gatLR: {
    label: "Learning Rate (GAT)",
    desc: "Learning rate khusus untuk lapisan Graph Attention Network (GAT). Mengontrol seberapa cepat GAT memperbarui cara memperhatikan (attend) node-node dalam graf email.",
    ideal: "1e-3 hingga 5e-3",
    evaluate: (v) => {
      if (v > 0.1) return { type: "danger", msg: "⛔ Terlalu tinggi! GAT tidak akan konvergen dan akan menghasilkan output acak." };
      if (v > 0.01) return { type: "warn", msg: "⚠️ Agak tinggi untuk GAT. Coba turunkan ke rentang 1e-3–5e-3 untuk hasil yang lebih stabil." };
      if (v < 1e-5) return { type: "warn", msg: "⚠️ Terlalu rendah. GAT akan belajar sangat lambat dan butuh epoch sangat banyak untuk konvergen." };
      return { type: "ok", msg: "✅ Learning rate GAT dalam rentang ideal." };
    },
  },
  gatWeightDecay: {
    label: "Weight Decay (GAT)",
    desc: "Regularisasi L2 khusus untuk lapisan GAT. Mencegah bobot attention menjadi terlalu ekstrem yang bisa membuat model hanya fokus pada satu node saja.",
    ideal: "1e-4 hingga 1e-3",
    evaluate: (v) => {
      if (v > 0.1) return { type: "danger", msg: "⛔ Terlalu tinggi! GAT tidak dapat mempelajari pola keterhubungan antar node secara efektif." };
      if (v > 0.01) return { type: "warn", msg: "⚠️ Agak tinggi. Bisa melemahkan kemampuan GAT memodelkan hubungan antar kata/entitas." };
      return { type: "ok", msg: "✅ Weight decay GAT dalam rentang ideal untuk regularisasi yang seimbang." };
    },
  },
};

function ParamField({ label, paramKey, value, onChange, disabled, isScientific }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = PARAM_CONFIG[paramKey] || {};
  const numVal = parseFloat(value);
  const isValid = !isNaN(numVal);
  const evalResult = isValid && config.evaluate ? config.evaluate(numVal) : null;

  const statusColor = {
    ok: "#10b981",
    warn: "#f59e0b",
    danger: "#ef4444",
  };
  const statusBg = {
    ok: "#f0fdf4",
    warn: "#fffbeb",
    danger: "#fef2f2",
  };
  const statusBorder = {
    ok: "#a7f3d0",
    warn: "#fde68a",
    danger: "#fecaca",
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Label + Info Icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <label
          className="form-label"
          style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 0, color: "var(--app-text)" }}
        >
          {config.label || label}
        </label>
        {config.desc && (
          <div
            style={{ position: "relative", display: "inline-flex", cursor: "help" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <HelpCircle size={13} color="#94a3b8" />
            {showTooltip && (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: -4,
                  zIndex: 9999,
                  background: "#1e293b",
                  color: "#f8fafc",
                  borderRadius: 8,
                  padding: "10px 14px",
                  width: 260,
                  fontSize: "0.75rem",
                  lineHeight: 1.6,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, color: "#93c5fd" }}>{config.label || label}</div>
                <div>{config.desc}</div>
                {config.ideal && (
                  <div style={{ marginTop: 6, color: "#86efac", fontWeight: 600 }}>✅ Ideal: {config.ideal}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <input
        className="form-input"
        type={isScientific ? "text" : "number"}
        placeholder={isScientific ? `cth: ${value}` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          height: 36,
          borderRadius: 6,
          fontSize: "0.85rem",
          width: "100%",
          borderColor: evalResult ? statusColor[evalResult.type] : undefined,
        }}
      />

      {/* Decimal hint for scientific notation */}
      {isScientific && isValid && (
        <div style={{ fontSize: "0.65rem", color: "var(--app-text-muted)", marginTop: 2 }}>
          = {numVal.toFixed(10).replace(/\.?0+$/, "")}
        </div>
      )}

      {/* Warning / Feedback Panel */}
      {evalResult && evalResult.type !== "ok" && (
        <div
          style={{
            marginTop: 4,
            borderLeft: `2px solid ${statusColor[evalResult.type]}`,
            paddingLeft: 6,
            fontSize: "0.65rem",
            color: statusColor[evalResult.type],
            opacity: 0.8,
            lineHeight: 1.5,
          }}
        >
          {evalResult.msg}
        </div>
      )}
    </div>
  );
}
