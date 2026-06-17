// RiwayatModelPage.jsx
import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  Settings2,
  BarChart2,
  X,
  Activity,
  Info,
  Database,
  Cpu,
  ChevronRight,
  Layers,
  Inbox,
  Trash2,
} from "lucide-react";
import { modelAPI } from "../services/api";
import Pagination from "../components/Pagination";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function RiwayatModelPage() {
  const [history, setHistory] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // dataset pagination: atur berapa card per halaman
  // Setiap card berisi 1 model, dikelompokkan visual per dataset

  const fetchActiveModel = async () => {
    try {
      const res = await modelAPI.getActiveModel();
      if (res.data?.id) setActiveId(res.data.id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [historyRes, datasetsRes] = await Promise.all([
        modelAPI.getHistory(),
        modelAPI.listDatasets().catch(() => ({ data: [] })),
      ]);
      setHistory(historyRes.data);
      setDatasets(datasetsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchActiveModel();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus riwayat model ini?")) {
      try {
        await modelAPI.deleteHistory(id);
        setHistory((prev) => prev.filter((h) => h.id !== id));
      } catch (err) {
        alert("Gagal menghapus model: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleShowDetail = (item) => {
    let metrics = {},
      visualization = null;
    try {
      if (item.metrics_json) metrics = JSON.parse(item.metrics_json);
      if (item.visualization_json)
        visualization = JSON.parse(item.visualization_json);
    } catch (e) {
      console.error(e);
    }
    setSelectedItem({ ...item, metrics, visualization });
    setIsModalOpen(true);
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateShort = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getSpamHam = (item, ds) => {
    let spam = ds?.spam_count ?? null;
    let ham = ds?.ham_count ?? null;
    if (spam === null || ham === null) {
      try {
        const m = JSON.parse(item.metrics_json || "{}");
        const cm = m.confusion_matrix || [
          [0, 0],
          [0, 0],
        ];
        const testSpam = cm[1][0] + cm[1][1];
        const testTotal = cm[0][0] + cm[0][1] + testSpam;
        if (testTotal > 0) {
          spam = Math.round((testSpam / testTotal) * item.total_data);
          ham = item.total_data - spam;
        }
      } catch {}
    }
    return { spam: spam ?? "-", ham: ham ?? "-" };
  };

  // ─── Grouping per dataset ────────────────────────────
  const groupedByDataset = history.reduce((acc, item) => {
    const key = item.dataset_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedDatasetKeys = Object.keys(groupedByDataset).sort((a, b) => {
    const da = datasets.find((d) => d.id === Number(a));
    const db = datasets.find((d) => d.id === Number(b));
    return (da?.name || "").localeCompare(db?.name || "");
  });

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginated = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // group hanya untuk paginated items
  const paginatedIds = new Set(paginated.map((p) => p.id));
  const visibleGrouped = sortedDatasetKeys
    .map((key) => ({
      datasetId: Number(key),
      dataset: datasets.find((d) => d.id === Number(key)),
      items: groupedByDataset[key].filter((it) => paginatedIds.has(it.id)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="w-full animate-in fade-in duration-300 pb-10">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Model</h1>
        <p style={{ color: "var(--gray-500)" }}>
          Daftar hasil pengujian model IndoBERT + GAT yang telah dilakukan.
        </p>
      </div>

      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          color: "var(--gray-500)",
          fontSize: "0.9rem",
          fontWeight: 600,
        }}
      >
        <Cpu size={16} /> Hasil pelatihan model
      </div>

      {loading ? (
        <div
          style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}
        >
          Memuat data...
        </div>
      ) : history.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}
        >
          Belum ada riwayat pelatihan.
        </div>
      ) : (
        <>
          {/* Grid dikelompokkan per dataset */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            {visibleGrouped.map((group) => (
              <DatasetSection
                key={group.datasetId}
                group={group}
                datasets={datasets}
                activeId={activeId}
                onShowDetail={handleShowDetail}
                onDelete={handleDelete}
                formatDateShort={formatDateShort}
                getSpamHam={getSpamHam}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 28,
              }}
            >
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {isModalOpen && selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Section per Dataset ──────────────────────────────
function DatasetSection({
  group,
  datasets,
  activeId,
  onShowDetail,
  onDelete,
  formatDateShort,
  getSpamHam,
}) {
  const ds = group.dataset;
  const dsName = ds?.name || `Dataset #${group.datasetId}`;
  const totalModels = group.items.length;
  const activeInGroup = group.items.find((it) => it.id === activeId);
  const bestAccuracy = Math.max(...group.items.map((i) => i.accuracy || 0));

  return (
    <section>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#E6F1FB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={16} color="#0C447C" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              {dsName}
            </h3>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--gray-400)",
                marginTop: 2,
              }}
            >
              {totalModels} model · Best akurasi{" "}
              {(bestAccuracy * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {ds && (
          <div
            style={{
              display: "flex",
              gap: 6,
              fontSize: "0.7rem",
            }}
          >
            {ds.spam_count != null && (
              <span
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Spam {ds.spam_count.toLocaleString()}
              </span>
            )}
            {ds.ham_count != null && (
              <span
                style={{
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Ham {ds.ham_count.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {group.items.map((item) => {
          const isActive = item.id === activeId;
          const acc = item.accuracy || 0;
          const f1 = item.f1_score || 0;
          const { spam, ham } = getSpamHam(item, ds);

          return (
            <ModelCard
              key={item.id}
              item={item}
              ds={ds}
              isActive={isActive}
              acc={acc}
              f1={f1}
              spam={spam}
              ham={ham}
              onShowDetail={onShowDetail}
              onDelete={onDelete}
              formatDateShort={formatDateShort}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─── Model Card (style mirip Ongoing Classes / Deadlines) ─────
function ModelCard({
  item,
  ds,
  isActive,
  acc,
  f1,
  spam,
  ham,
  onShowDetail,
  onDelete,
  formatDateShort,
}) {
  const dsName = ds?.name || `Dataset #${item.dataset_id}`;

  // status logic
  let statusText = "";
  let statusColor = "#94a3b8";
  if (isActive) {
    statusText = "Aktif";
    statusColor = "#10b981";
  } else if (acc >= 0.95) {
    statusText = "Excellent";
    statusColor = "#10b981";
  } else if (acc >= 0.85) {
    statusText = "Baik";
    statusColor = "#3b82f6";
  } else if (acc >= 0.7) {
    statusText = "Cukup";
    statusColor = "#f59e0b";
  } else if (acc > 0) {
    statusText = "Rendah";
    statusColor = "#ef4444";
  } else {
    statusText = formatDateShort(item.created_at);
    statusColor = "#94a3b8";
  }

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        border: isActive ? "1px solid #a7f3d0" : undefined,
        background: isActive ? "#fafffe" : undefined,
        transition: "transform .15s ease, box-shadow .15s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Illustration / Icon */}
      <ModelIllustration
        item={item}
        isActive={isActive}
        dsColor={isActive ? "#EAF3DE" : "#E6F1FB"}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: "0.92rem",
            fontWeight: 700,
            color: "var(--black)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={dsName}
        >
          {dsName}
        </div>

        {/* Subtitle - model name */}
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--gray-400)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={item.model_name || ""}
        >
          {item.model_name || "—"}
        </div>

        {/* Progress bar (akurasinya) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 6,
              background: "var(--gray-100)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${acc * 100}%`,
                height: "100%",
                background:
                  acc >= 0.85 ? "#10b981" : acc >= 0.7 ? "#f59e0b" : "#ef4444",
                borderRadius: 999,
                transition: "width .4s ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--gray-500)",
              minWidth: 38,
              textAlign: "right",
            }}
          >
            {(acc * 100).toFixed(0)}%
          </span>
        </div>

        {/* Status row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              color: statusColor,
              fontWeight: 600,
            }}
          >
            {isActive && (
              <CheckCircle
                size={11}
                style={{ marginRight: 3, verticalAlign: "-1px" }}
              />
            )}
            {statusText}
          </span>

          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--gray-400)",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Database size={10} />
            {item.total_data?.toLocaleString() || 0} email
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onShowDetail(item)}
          style={{
            border: "none",
            background: isActive ? "#27500A" : "#4f46e5",
            color: "white",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Detail <ChevronRight size={13} />
        </button>
        
        {!isActive && (
          <button
            onClick={() => onDelete(item.id)}
            style={{
              border: "1px solid #fee2e2",
              background: "#fff",
              color: "#ef4444",
              fontSize: "0.78rem",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
            }}
            title="Hapus Model"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Illustration (kiri) ──────────────────────────────
function ModelIllustration({ item, isActive, dsColor }) {
  // gradient random berdasarkan id biar konsisten
  const palettes = [
    ["#fbbf24", "#f59e0b"], // orange
    ["#60a5fa", "#2563eb"], // blue
    ["#f472b6", "#db2777"], // pink
    ["#34d399", "#059669"], // green
    ["#a78bfa", "#7c3aed"], // purple
    ["#fb923c", "#ea580c"], // orange-red
    ["#22d3ee", "#0891b2"], // cyan
  ];
  const idx = (item.id || 0) % palettes.length;
  const [c1, c2] = palettes[idx];

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 12,
        background: isActive
          ? "linear-gradient(135deg, #bbf7d0, #86efac)"
          : `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Cpu size={26} color="white" strokeWidth={2.2} />
      {/* small dot accent */}
      <div
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.5)",
        }}
      />
    </div>
  );
}

// ─── Detail Modal (tidak diubah) ─────────────────────
function DetailModal({ item, onClose }) {
  const lossData =
    item.metrics.gat_loss_history?.map((loss, idx) => ({
      epoch: idx + 1,
      loss: parseFloat(loss.toFixed(4)),
    })) || [];

  const cm = item.metrics.confusion_matrix || [
    [0, 0],
    [0, 0],
  ];
  const [tn, fp, fn, tp] = [cm[0][0], cm[0][1], cm[1][0], cm[1][1]];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 1000,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 0,
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--gray-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              Detail Pelatihan —{" "}
              {new Date(item.created_at).toLocaleDateString("id-ID")}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--gray-400)",
                marginTop: 2,
              }}
            >
              Dataset #{item.dataset_id} · {item.model_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: 6, borderRadius: "50%" }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* 4 stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "Akurasi",
                val: `${(item.accuracy * 100).toFixed(2)}%`,
                color: "#10b981",
                icon: <CheckCircle size={14} />,
              },
              {
                label: "F1-Score",
                val: `${(item.f1_score * 100).toFixed(2)}%`,
                color: "#3b82f6",
                icon: <Activity size={14} />,
              },
              {
                label: "Precision",
                val: `${(item.precision * 100).toFixed(2)}%`,
                color: "#8b5cf6",
                icon: <BarChart2 size={14} />,
              },
              {
                label: "Recall",
                val: `${(item.recall * 100).toFixed(2)}%`,
                color: "#f59e0b",
                icon: <Activity size={14} />,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="card shadow-sm"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: s.color,
                    fontSize: "0.8rem",
                  }}
                >
                  {s.icon} {s.label}
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: s.color,
                  }}
                >
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Chart + CM */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: 20,
            }}
          >
            <div className="card shadow-sm">
              <h4
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Activity size={16} /> GAT Loss History
              </h4>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="epoch"
                      label={{
                        value: "Epoch",
                        position: "insideBottom",
                        offset: -4,
                      }}
                    />
                    <YAxis
                      label={{
                        value: "Loss",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="loss"
                      stroke="#171717"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card shadow-sm">
              <h4
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={16} /> Confusion Matrix
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid var(--gray-200)",
                }}
              >
                {[
                  {
                    label: "True Ham (TN)",
                    val: tn,
                    bg: "#ecfdf5",
                    color: "#065f46",
                  },
                  {
                    label: "False Spam (FP)",
                    val: fp,
                    bg: "#fef2f2",
                    color: "#991b1b",
                  },
                  {
                    label: "False Ham (FN)",
                    val: fn,
                    bg: "#fef2f2",
                    color: "#991b1b",
                  },
                  {
                    label: "True Spam (TP)",
                    val: tp,
                    bg: "#eff6ff",
                    color: "#1e40af",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{
                      background: c.bg,
                      padding: "16px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: c.color,
                        opacity: 0.8,
                        marginBottom: 4,
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: c.color,
                      }}
                    >
                      {c.val}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: "0.8rem",
                  color: "var(--gray-400)",
                }}
              >
                <p>
                  • <b>TN/TP:</b> Prediksi benar
                </p>
                <p>
                  • <b>FP/FN:</b> Prediksi salah
                </p>
              </div>
            </div>
          </div>

          {/* Hyperparameters */}
          <div
            className="card shadow-sm"
            style={{ background: "var(--gray-50)" }}
          >
            <h4
              style={{
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Settings2 size={16} /> Hyperparameters & Configuration
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {[
                ["Learning Rate", item.learning_rate],
                ["Epochs", item.epochs],
                ["Weight Decay", item.weight_decay],
                ["GAT Weight Decay", item.gat_weight_decay],
                [
                  "Train/Val/Test",
                  item.metrics.req_val_split != null
                    ? `${(100 - (item.metrics.req_val_split + item.metrics.req_test_split) * 100).toFixed(0)}/${(item.metrics.req_val_split * 100).toFixed(0)}/${(item.metrics.req_test_split * 100).toFixed(0)}`
                    : item.metrics.val_size != null
                      ? `${((item.train_size / item.total_data) * 100).toFixed(0)}/${((item.metrics.val_size / item.total_data) * 100).toFixed(0)}/${((item.test_size / item.total_data) * 100).toFixed(0)}`
                      : `${(100 - (item.test_size / item.total_data) * 100).toFixed(0)}/0/${((item.test_size / item.total_data) * 100).toFixed(0)}`,
                ],
                ["MCC Score", item.metrics.mcc?.toFixed(4)],
                ["ROC-AUC", item.metrics.roc_auc?.toFixed(4)],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    borderBottom: "1px solid var(--gray-200)",
                    paddingBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--gray-400)",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {val ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
