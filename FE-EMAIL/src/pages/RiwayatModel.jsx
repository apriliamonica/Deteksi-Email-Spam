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
  Trash2,
  PieChart as PieIcon,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Download,
  BookOpen,
  ChevronDown,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function RiwayatModelPage() {
  const [history, setHistory] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // ─── Fetchers ─────────────────────────────
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
      setHistory(historyRes.data || []);
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

  // ─── Handlers ─────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus riwayat model ini?")) return;
    try {
      await modelAPI.deleteHistory(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      alert("Gagal menghapus: " + (err.response?.data?.detail || err.message));
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
  };

  // ─── Helpers ──────────────────────────────
  const formatDateShort = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getSpamHam = (item, ds) => {
    if (ds?.spam_count != null && ds?.ham_count != null) {
      return { spam: ds.spam_count, ham: ds.ham_count };
    }
    try {
      const m = JSON.parse(item.metrics_json || "{}");
      const cm = m.confusion_matrix || [
        [0, 0],
        [0, 0],
      ];
      const testSpam = cm[1][0] + cm[1][1];
      const testTotal = cm[0][0] + cm[0][1] + testSpam;
      if (testTotal > 0) {
        const spam = Math.round((testSpam / testTotal) * item.total_data);
        return { spam, ham: item.total_data - spam };
      }
    } catch {}
    return { spam: null, ham: null };
  };

  // ─── Grouping ─────────────────────────────
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

  const totalPages = Math.ceil(history.length / itemsPerPage) || 1;
  const paginated = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const paginatedIds = new Set(paginated.map((p) => p.id));
  const visibleGrouped = sortedDatasetKeys
    .map((key) => ({
      datasetId: Number(key),
      dataset: datasets.find((d) => d.id === Number(key)),
      items: groupedByDataset[key].filter((it) => paginatedIds.has(it.id)),
    }))
    .filter((g) => g.items.length > 0);

  return selectedItem ? (
    <DetailView
      item={selectedItem}
      datasets={datasets}
      onClose={() => setSelectedItem(null)}
      activeId={activeId}
      fetchActiveModel={fetchActiveModel}
    />
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header ── */}
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Model
        </h1>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--app-text-muted)",
            margin: 0,
          }}
        >
          Daftar hasil pengujian model IndoBERT + GAT
        </p>
      </div>

      {loading ? (
        <Center>Memuat data...</Center>
      ) : history.length === 0 ? (
        <Center>Belum ada riwayat pelatihan</Center>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {visibleGrouped.map((group) => (
              <DatasetSection
                key={group.datasetId}
                group={group}
                activeId={activeId}
                onShowDetail={handleShowDetail}
                onDelete={handleDelete}
                formatDateShort={formatDateShort}
                getSpamHam={getSpamHam}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 20,
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
    </div>
  );
}

// ════════════════════════════════════════════════════
// SECTION PER DATASET
// ════════════════════════════════════════════════════

function DatasetSection({
  group,
  activeId,
  onShowDetail,
  onDelete,
  formatDateShort,
  getSpamHam,
}) {
  const ds = group.dataset;
  const dsName = ds?.name || `Dataset #${group.datasetId}`;
  const totalModels = group.items.length;
  const bestAccuracy = Math.max(...group.items.map((i) => i.accuracy || 0));

  return (
    <section className="page-container page-riwayat-model">
      <SectionHeader
        icon={<Layers size={16} color="#0C447C" />}
        title={dsName}
        subtitle={`${totalModels} model · Best akurasi ${(bestAccuracy * 100).toFixed(2)}%`}
        right={
          ds && (
            <div style={{ display: "flex", gap: 6 }}>
              {ds.spam_count != null && (
                <Pill bg="#fef2f2" color="#991b1b" border="#fecaca">
                  Spam {ds.spam_count.toLocaleString()}
                </Pill>
              )}
              {ds.ham_count != null && (
                <Pill bg="#ecfdf5" color="#065f46" border="#a7f3d0">
                  Ham {ds.ham_count.toLocaleString()}
                </Pill>
              )}
            </div>
          )
        }
      />

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
          const { spam, ham } = getSpamHam(item, ds);
          return (
            <ModelCard
              key={item.id}
              item={item}
              ds={ds}
              isActive={isActive}
              acc={acc}
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

// ════════════════════════════════════════════════════
// MODEL CARD
// ════════════════════════════════════════════════════

function ModelCard({
  item,
  ds,
  isActive,
  acc,
  spam,
  ham,
  onShowDetail,
  onDelete,
  formatDateShort,
}) {
  const dsName = ds?.name || `Dataset #${item.dataset_id}`;

  const status = getStatusConfig(
    acc,
    isActive,
    item.created_at,
    formatDateShort,
  );

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
        position: "relative",
      }}
    >
      <ModelIllustration item={item} isActive={isActive} />

      <div style={{ flex: 1, minWidth: 0, paddingRight: isActive ? 0 : 30 }}>
        <div style={titleStyle} title={dsName}>
          {dsName}
        </div>
        <div style={subtitleStyle} title={item.model_name || ""}>
          {item.model_name || "—"}
        </div>

        {/* Progress bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
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
                background: getAccColor(acc),
                transition: "width .4s",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
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
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              color: status.color,
              fontWeight: 600,
            }}
          >
            {isActive && (
              <CheckCircle
                size={11}
                style={{ marginRight: 3, verticalAlign: "-1px" }}
              />
            )}
            {status.text}
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button onClick={() => onShowDetail(item)} style={btnPrimary(isActive)}>
          Detail <ChevronRight size={13} />
        </button>
        {!isActive && (
          <button
            onClick={() => onDelete(item.id)}
            style={btnDelete}
            title="Hapus Model"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// ILLUSTRATION
// ════════════════════════════════════════════════════

const PALETTES = [
  ["#fbbf24", "#f59e0b"],
  ["#60a5fa", "#2563eb"],
  ["#f472b6", "#db2777"],
  ["#34d399", "#059669"],
  ["#a78bfa", "#7c3aed"],
  ["#fb923c", "#ea580c"],
  ["#22d3ee", "#0891b2"],
];

function ModelIllustration({ item, isActive }) {
  const [c1, c2] = PALETTES[(item.id || 0) % PALETTES.length];
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 12,
        flexShrink: 0,
        background: isActive
          ? "linear-gradient(135deg, #bbf7d0, #86efac)"
          : `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Cpu size={26} color="white" strokeWidth={2.2} />
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

// ════════════════════════════════════════════════════
// DETAIL VIEW (Full Page)
// ════════════════════════════════════════════════════

function DetailView({ item, datasets, onClose, activeId, fetchActiveModel }) {
  const ds = datasets.find((d) => d.id === item.dataset_id);
  const isActive = item.id === activeId;
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

  // Train metrics (jika ada di metrics_json)
  const trainM = item.metrics.train_metrics || {};

  // Class distribution
  const spam =
    ds?.spam_count ??
    (item.total_data
      ? Math.round(((tp + fn) / (tn + fp + fn + tp)) * item.total_data)
      : null);
  const ham = ds?.ham_count ?? (spam != null ? item.total_data - spam : null);

  // Classification report
  const clsReport = item.metrics.classification_report || null;

  const handleActivate = async () => {
    try {
      await modelAPI.activateModel(item.id);
      await fetchActiveModel();
    } catch {
      alert("Gagal mengaktifkan model.");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await modelAPI.downloadHistory(item.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      
      const contentDisposition = res.headers["content-disposition"];
      let fileName = `SpamGAT_Model_${item.id}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match.length === 2) fileName = match[1];
      }
      
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Gagal mengunduh model. File model mungkin sudah terhapus.");
    }
  };

  return (
    <div
      className="w-full animate-in fade-in duration-300 pb-10"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--app-text)",
          fontSize: "0.85rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          width: "fit-content",
          padding: 0,
        }}
      >
        <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />{" "}
        Kembali ke daftar model
      </button>

      {/* ── Header Block ── */}
      <div
        className="card"
        style={{
          padding: 20,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Cpu size={28} color="white" />
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
              {item.model_name || "indobert-gat-v2.1"}
            </h2>
            {isActive && (
              <Pill bg="#ecfdf5" color="#065f46" border="#a7f3d0">
                <CheckCircle
                  size={10}
                  style={{ marginRight: 3, verticalAlign: "-1px" }}
                />{" "}
                Model aktif
              </Pill>
            )}
            <Pill bg="#eff6ff" color="#1e40af" border="#bfdbfe">
              Training selesai
            </Pill>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: "0.75rem",
              color: "var(--app-text-muted)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Layers size={12} /> Dataset:{" "}
              {ds?.name || `Dataset #${item.dataset_id}`}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} />{" "}
              {new Date(item.created_at).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Database size={12} /> {item.total_data?.toLocaleString()} email
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleDownload}
            style={{
              ...btnDelete,
              color: "var(--app-text)",
              border: "1px solid var(--app-border)",
            }}
          >
            Unduh model (.zip)
          </button>
          {!isActive && (
            <button
              onClick={handleActivate}
              style={{ ...btnPrimary(true), background: "#10b981" }}
            >
              Jadikan aktif
            </button>
          )}
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <Panel
        title="Metrik Evaluasi"
        icon={<BarChart2 size={15} />}
        infoContent={{
          title: "Apa itu Metrik Evaluasi?",
          definition: "Metrik evaluasi adalah ukuran kuantitatif yang digunakan untuk menilai seberapa baik kinerja model dalam mengklasifikasi email sebagai spam atau bukan spam (ham).",
          howItWorks: [
            "Akurasi — Persentase prediksi yang benar dari seluruh data uji. Semakin tinggi semakin baik, tetapi bisa menyesatkan jika data tidak seimbang.",
            "F1-Score — Rata-rata harmonis dari Precision dan Recall. Metrik ini lebih adil untuk dataset yang tidak seimbang karena memperhitungkan keduanya.",
            "Precision — Dari semua email yang diprediksi sebagai spam, berapa persen yang memang benar-benar spam. Precision tinggi berarti sedikit email normal yang salah ditandai.",
            "Recall — Dari semua email spam yang sebenarnya, berapa persen yang berhasil terdeteksi. Recall tinggi berarti sedikit spam yang lolos ke inbox.",
          ],
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          {[
            {
              label: "Akurasi",
              val: item.accuracy,
              color: "#10b981",
              icon: <CheckCircle size={13} />,
            },
            {
              label: "F1-Score",
              val: item.f1_score,
              color: "#4f5fd4",
              icon: <Activity size={13} />,
            },
            {
              label: "Precision",
              val: item.precision,
              color: "#8b5cf6",
              icon: <BarChart2 size={13} />,
            },
            {
              label: "Recall",
              val: item.recall,
              color: "#f59e0b",
              icon: <Activity size={13} />,
            },
          ].map((s) => (
            <MetricCard key={s.label} {...s} />
          ))}
        </div>
      </Panel>

      {/* ── CONFUSION MATRIX ── */}
      <ConfusionMatrixBlock tn={tn} fp={fp} fn={fn} tp={tp} />

      {/* ── CHART + TRAIN VS TEST COMPARISON ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Panel
          title="GAT Loss History"
          icon={<Activity size={15} />}
          infoContent={{
            title: "Apa itu Grafik Loss?",
            definition: "Loss (kerugian) adalah nilai numerik yang mengukur seberapa jauh prediksi model dari jawaban yang benar. Semakin kecil nilainya, semakin baik model belajar.",
            howItWorks: [
              "Sumbu X (horizontal) menunjukkan jumlah Epoch, yaitu berapa kali model telah melihat seluruh dataset selama pelatihan.",
              "Sumbu Y (vertikal) menunjukkan nilai Loss. Grafik yang menurun menandakan model semakin pandai membedakan spam dan ham.",
              "Jika grafik terus menurun lalu mendatar, itu artinya model sudah konvergen (mencapai titik optimal).",
              "Jika grafik naik-turun tidak stabil, kemungkinan learning rate terlalu tinggi atau data terlalu sedikit.",
            ],
          }}
        >
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="#1b2459"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <TrainVsTestWithInfo test={item} train={trainM} />
      </div>

      {/* ── CLASS DISTRIBUTION ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ClassDistributionWithInfo spam={spam} ham={ham} total={item.total_data} />

        {/* ── ADDITIONAL METRICS ── */}
        <Panel
          title="Metrik Tambahan"
          icon={<Activity size={15} />}
          infoContent={{
            title: "Apa itu MCC & ROC-AUC?",
            definition: "Dua metrik tambahan yang sering diminta dalam penelitian untuk memberikan gambaran lebih lengkap tentang kinerja model.",
            howItWorks: [
              "MCC (Matthews Correlation Coefficient) — Nilainya dari -1 hingga +1. Nilai +1 berarti prediksi sempurna, 0 berarti model sebaik menebak acak, -1 berarti prediksi selalu salah. MCC dianggap metrik paling seimbang untuk klasifikasi biner.",
              "ROC-AUC (Receiver Operating Characteristic - Area Under Curve) — Nilainya dari 0 hingga 1. Semakin mendekati 1, model semakin mampu membedakan antara kelas spam dan ham. Nilai 0.5 berarti model tidak lebih baik dari tebakan acak.",
            ],
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <MetricCard label="MCC Score" val={item.metrics.mcc} color="#0891b2" icon={<Activity size={13} />} isRaw />
            <MetricCard label="ROC-AUC" val={item.metrics.roc_auc} color="#7c3aed" icon={<BarChart2 size={13} />} isRaw />
          </div>
        </Panel>
      </div>

      {/* ── HYPERPARAMETERS ── */}
      <Panel
        title="Hyperparameters & Konfigurasi"
        icon={<Settings2 size={15} />}
        bg="var(--lav-ghost)"
        infoContent={{
          title: "Apa itu Hyperparameters?",
          definition: "Hyperparameters adalah pengaturan yang ditentukan sebelum proses pelatihan dimulai. Mereka mengontrol bagaimana model belajar, bukan apa yang model pelajari.",
          howItWorks: [
            "Learning Rate — Seberapa besar langkah yang diambil model saat memperbarui bobotnya. Terlalu besar = model melompat-lompat. Terlalu kecil = model belajar sangat lambat.",
            "Epochs — Jumlah siklus penuh model melihat seluruh dataset. Terlalu banyak bisa menyebabkan overfitting (model menghafal data).",
            "Weight Decay — Teknik untuk mencegah overfitting dengan membatasi ukuran bobot model.",
            "Data Split — Pembagian dataset menjadi data Training (untuk belajar), Validation (untuk tuning), dan Testing (untuk evaluasi akhir).",
          ],
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <ParamBox label="Learning Rate" value={item.learning_rate} />
          <ParamBox label="Epochs" value={item.epochs} />
          <ParamBox label="Weight Decay" value={item.weight_decay} />
          <ParamBox label="GAT Weight Decay" value={item.gat_weight_decay} />
          <ParamBox label="Batch Size" value={item.batch_size} />
          <ParamBox label="Max Seq Length" value={item.max_seq_length} />
        </div>
        <DataSplitInfo item={item} />
      </Panel>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 🆕 SECTION 1: TRAIN VS TEST (with info)
// ════════════════════════════════════════════════════

function TrainVsTestWithInfo({ test, train }) {
  const hasTrain = Object.keys(train).length > 0;
  const rows = [
    { label: "Akurasi", test: test.accuracy, train: train.accuracy },
    { label: "Precision", test: test.precision, train: train.precision },
    { label: "Recall", test: test.recall, train: train.recall },
    { label: "F1-Score", test: test.f1_score, train: train.f1_score },
  ];

  return (
    <Panel
      title="Perbandingan Training vs Testing"
      icon={<GitCompare size={15} />}
      infoContent={{
        title: "Apa itu Perbandingan Training vs Testing?",
        definition: "Tabel ini membandingkan kinerja model pada data yang digunakan untuk belajar (training) dengan data yang belum pernah dilihat (testing). Perbandingan ini penting untuk mendeteksi overfitting.",
        howItWorks: [
          "Jika nilai Training dan Testing hampir sama (selisih <5%), model belajar dengan baik dan mampu menggeneralisasi ke data baru.",
          "Jika Training jauh lebih tinggi dari Testing (selisih >10%), model kemungkinan mengalami overfitting — artinya model menghafal data latih tapi gagal di data baru.",
          "Status '✓ Bagus' berarti selisih di bawah 5%. '⚠ Watch' berarti selisih 5-10%. '✗ Overfit?' berarti selisih lebih dari 10%.",
        ],
      }}
    >
      {!hasTrain ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--app-text-muted)",
            fontSize: "0.8rem",
          }}
        >
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr style={{ background: "var(--lav-ghost)" }}>
                <th style={thL}>Metrik</th>
                <th style={thC}>Training</th>
                <th style={thC}>Testing</th>
                <th style={thC}>Selisih</th>
                <th style={thC}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const diff =
                  r.train && r.test ? Math.abs(r.train - r.test) : null;
                const status = !diff
                  ? "—"
                  : diff < 0.05
                    ? "✓ Bagus"
                    : diff < 0.1
                      ? "⚠ Watch"
                      : "✗ Overfit?";
                const statusColor = !diff
                  ? "#94a3b8"
                  : diff < 0.05
                    ? "#10b981"
                    : diff < 0.1
                      ? "#f59e0b"
                      : "#ef4444";
                return (
                  <tr
                    key={r.label}
                    style={{ borderTop: "1px solid var(--app-border)" }}
                  >
                    <td style={{ ...tdL, fontWeight: 600 }}>{r.label}</td>
                    <td style={tdC}>
                      {r.train != null ? `${(r.train * 100).toFixed(2)}%` : "—"}
                    </td>
                    <td style={tdC}>
                      {r.test != null ? `${(r.test * 100).toFixed(2)}%` : "—"}
                    </td>
                    <td style={tdC}>
                      {diff != null ? `${(diff * 100).toFixed(2)}%` : "—"}
                    </td>
                    <td style={{ ...tdC, color: statusColor, fontWeight: 700 }}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--app-text-muted)",
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            💡 Selisih kecil (&lt;5%) = model generalisasi baik. Selisih besar
            (&gt;10%) = indikasi <b>overfitting</b>.
          </p>
        </div>
      )}
    </Panel>
  );
}

// ════════════════════════════════════════════════════
// 🆕 SECTION 2: CLASS DISTRIBUTION (with info)
// ════════════════════════════════════════════════════

function ClassDistributionWithInfo({ spam, ham, total }) {
  const data = [
    { name: "Spam", value: spam || 0, color: "#ef4444" },
    { name: "Ham", value: ham || 0, color: "#10b981" },
  ];
  const hasData = spam != null && ham != null;

  return (
    <Panel
      title="Distribusi Kelas"
      icon={<PieIcon size={15} />}
      infoContent={{
        title: "Apa itu Distribusi Kelas?",
        definition: "Distribusi kelas menunjukkan perbandingan jumlah email spam dan ham (bukan spam) di dalam dataset pelatihan. Keseimbangan ini sangat memengaruhi kualitas model.",
        howItWorks: [
          "Dataset yang seimbang (jumlah spam ≈ ham) biasanya menghasilkan model yang lebih adil dan akurat.",
          "Dataset yang tidak seimbang (misalnya spam jauh lebih banyak) bisa membuat model bias — cenderung memprediksi kelas mayoritas.",
          "Jika dataset tidak seimbang, teknik seperti Class Weighting (yang digunakan pada aplikasi ini) diterapkan agar model tidak mengabaikan kelas minoritas.",
        ],
      }}
    >
      {hasData ? (
        <>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              marginTop: 6,
            }}
          >
            {data.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: d.color,
                  }}
                />
                <span style={{ fontWeight: 700 }}>{d.name}</span>
                <span style={{ color: "var(--app-text-muted)" }}>
                  ({d.value.toLocaleString()})
                </span>
              </div>
            ))}
          </div>
          {total && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--app-text-muted)",
                textAlign: "center",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Total: <b>{total.toLocaleString()}</b> email
            </p>
          )}
        </>
      ) : (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--app-text-muted)",
            fontSize: "0.78rem",
          }}
        >
          Data distribusi belum tersedia
        </div>
      )}
    </Panel>
  );
}

// ClassificationReport removed — redundant with MetricCards for TA purposes.

// ════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════

function DataSplitInfo({ item }) {
  let splitText = "—";
  if (
    item.metrics.req_val_split != null &&
    item.metrics.req_test_split != null
  ) {
    const tr = (
      100 -
      (item.metrics.req_val_split + item.metrics.req_test_split) * 100
    ).toFixed(0);
    const va = (item.metrics.req_val_split * 100).toFixed(0);
    const te = (item.metrics.req_test_split * 100).toFixed(0);
    splitText = `${tr} / ${va} / ${te}`;
  } else if (item.train_size && item.total_data) {
    const tr = ((item.train_size / item.total_data) * 100).toFixed(0);
    const te = ((item.test_size / item.total_data) * 100).toFixed(0);
    const va = item.metrics.val_size
      ? ((item.metrics.val_size / item.total_data) * 100).toFixed(0)
      : "0";
    splitText = `${tr} / ${va} / ${te}`;
  }
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "white",
        borderRadius: 8,
        fontSize: "0.78rem",
        border: "1px solid var(--app-border)",
      }}
    >
      <b>Train / Validation / Test Split:</b> {splitText}
    </div>
  );
}

function MetricCard({ label, val, color, icon, isRaw }) {
  const displayVal = val != null
    ? isRaw
      ? (typeof val === 'number' ? val.toFixed(4) : val)
      : `${(val * 100).toFixed(2)}%`
    : "—";
  return (
    <div
      style={{
        padding: 12,
        background: "white",
        border: `1px solid var(--app-border)`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color,
          fontSize: "0.7rem",
          fontWeight: 700,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {icon} {label}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 800, color }}>
        {displayVal}
      </div>
    </div>
  );
}

function ParamBox({ label, value }) {
  let info = "";
  let warning = null;
  let isDanger = false;
  let formatted = value ?? "—";

  const numValue = Number(value);
  if (value !== null && value !== "" && !isNaN(numValue)) {
    if (
      ["Learning Rate", "Weight Decay", "GAT Weight Decay"].includes(label) &&
      numValue !== 0
    ) {
      formatted = numValue.toExponential();
    } else if ((numValue > 0 && numValue < 0.001) || numValue >= 10000) {
      formatted = numValue.toExponential();
    }
  }

  switch (label) {
    case "Learning Rate":
      info =
        "Menentukan seberapa besar model memperbarui bobotnya pada tiap iterasi. Ideal: 1e-5 hingga 5e-5 untuk IndoBERT.";
      if (value > 1e-4) {
        warning =
          "Terlalu tinggi. Model mungkin gagal konvergen (loss melompat-lompat). Sebaiknya turunkan nilainya.";
        isDanger = true;
      } else if (value > 0 && value < 1e-6) {
        warning =
          "Terlalu rendah. Pelatihan akan sangat lambat atau terjebak di local minima.";
        isDanger = true;
      }
      break;
    case "Epochs":
      info =
        "Berapa kali model melihat seluruh dataset selama pelatihan. Ideal: 3 hingga 5 untuk fine-tuning BERT.";
      if (value > 10) {
        warning =
          "Terlalu tinggi. Risiko besar terjadi overfitting (model menghafal data train tapi buruk di data baru).";
        isDanger = true;
      } else if (value > 0 && value < 2) {
        warning =
          "Terlalu rendah. Model mungkin belum cukup belajar pola (underfitting).";
        isDanger = true;
      }
      break;
    case "Weight Decay":
      info =
        "Teknik regularisasi L2 untuk mencegah bobot model menjadi terlalu besar, membantu mengurangi overfitting. Ideal: 0.01 (1e-2).";
      if (value > 0.1) {
        warning =
          "Terlalu tinggi. Membatasi kapasitas model sehingga bisa menyebabkan underfitting.";
        isDanger = true;
      } else if (value === 0) {
        warning =
          "Nilai 0 berarti tidak ada regularisasi, yang membuat model sangat rentan terhadap overfitting.";
      }
      break;
    case "GAT Weight Decay":
      info =
        "Sama seperti weight decay, tetapi khusus untuk layer Graph Attention Network (GAT).";
      if (value > 0.1) {
        warning =
          "Terlalu tinggi. Dapat melemahkan kemampuan GAT menangkap keterhubungan fitur graf email.";
        isDanger = true;
      }
      break;
    case "Batch Size":
      info =
        "Jumlah sampel email yang diproses sebelum model memperbarui bobot. Ideal: 16 atau 32.";
      if (value > 64) {
        warning = "Mungkin memakan terlalu banyak memori GPU (Out of Memory).";
        isDanger = true;
      } else if (value > 0 && value < 8) {
        warning =
          "Terlalu rendah. Estimasi gradien akan sangat bising (noisy) dan proses training menjadi tidak stabil.";
      }
      break;
    case "Max Seq Length":
      info =
        "Panjang maksimal token/kata dalam satu email yang diproses oleh model. Ideal: 128 hingga 512.";
      if (value > 512) {
        warning =
          "Melampaui kapasitas maksimal standar arsitektur BERT (512 token), berpotensi error saat pelatihan.";
        isDanger = true;
      } else if (value > 0 && value < 64) {
        warning =
          "Terlalu pendek. Sangat banyak informasi dan konteks email yang akan terpotong.";
        isDanger = true;
      }
      break;
    default:
      break;
  }

  const tooltipText = warning ? `${info}\n\n⚠️ PERHATIAN: ${warning}` : info;

  return (
    <div
      style={{ borderBottom: "1px solid var(--app-border)", paddingBottom: 6 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.7rem",
          color: "var(--app-text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
        {tooltipText && (
          <div
            title={tooltipText}
            style={{
              cursor: "help",
              display: "flex",
              color: isDanger
                ? "#ef4444"
                : warning
                  ? "#f59e0b"
                  : "var(--gray-400)",
            }}
          >
            {isDanger || warning ? (
              <AlertTriangle size={12} />
            ) : (
              <HelpCircle size={12} />
            )}
          </div>
        )}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.82rem",
          color: isDanger ? "#ef4444" : "var(--app-text)",
        }}
        title={typeof value === "number" ? value.toString() : undefined}
      >
        {formatted}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════

function SectionHeader({ icon, title, subtitle, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        flexWrap: "wrap",
        gap: 8,
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
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
            {title}
          </h3>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--app-text-muted)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      {right}
    </div>
  );
}

function Panel({ title, icon, children, bg, infoContent }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      style={{
        background: bg || "white",
        border: "1px solid var(--app-border)",
        borderRadius: 12,
        padding: 14,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--app-text)",
          }}
        >
          {icon} {title}
        </h4>
        {infoContent && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: showInfo ? "#eff6ff" : "transparent",
              border: showInfo ? "1px solid #bfdbfe" : "1px solid transparent",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              fontWeight: 600,
              color: showInfo ? "#1e40af" : "var(--app-text-muted)",
              transition: "all 0.2s ease",
            }}
            title="Lihat penjelasan"
          >
            <BookOpen size={13} />
            {showInfo ? "Tutup" : "Penjelasan"}
          </button>
        )}
      </div>

      {showInfo && infoContent && (
        <InfoDrawer info={infoContent} onClose={() => setShowInfo(false)} />
      )}

      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════
// 🆕 INFO DRAWER COMPONENT
// ════════════════════════════════════════════════════

function InfoDrawer({ info }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%)",
        border: "1px solid #bfdbfe",
        borderRadius: 10,
        padding: 16,
        marginBottom: 14,
        animation: "slideDown 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 500px; }
        }
      `}</style>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "#1e40af", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <BookOpen size={14} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e3a5f", marginBottom: 2 }}>
            {info.title}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.5 }}>
            {info.definition}
          </div>
        </div>
      </div>

      {info.howItWorks && info.howItWorks.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontWeight: 700, fontSize: "0.75rem", color: "#1e40af",
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
          }}>
            📘 Cara Membaca / Cara Kerja
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {info.howItWorks.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: "0.76rem",
                  color: "#334155",
                  lineHeight: 1.5,
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#1e40af", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>
                  {idx + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalShell({ children, onClose, maxWidth = 900 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(27,36,89,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--app-surface)",
          borderRadius: 16,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--app-border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--app-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        background: "var(--app-surface)",
        zIndex: 10,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--app-text-muted)",
            marginTop: 2,
          }}
        >
          {subtitle}
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "var(--lav-ghost)",
          border: "none",
          borderRadius: 8,
          width: 30,
          height: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--app-text-muted)",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function Pill({ children, bg, color, border }) {
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontWeight: 600,
        fontSize: "0.7rem",
      }}
    >
      {children}
    </span>
  );
}

function Center({ children }) {
  return (
    <div
      style={{
        padding: 60,
        textAlign: "center",
        color: "var(--app-text-muted)",
        fontSize: "0.85rem",
      }}
    >
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function getStatusConfig(acc, isActive, createdAt, formatDateShort) {
  if (isActive) return { text: "Aktif", color: "#10b981" };
  if (acc >= 0.95) return { text: "Excellent", color: "#10b981" };
  if (acc >= 0.85) return { text: "Baik", color: "#3b82f6" };
  if (acc >= 0.7) return { text: "Cukup", color: "#f59e0b" };
  if (acc > 0) return { text: "Rendah", color: "#ef4444" };
  return { text: formatDateShort(createdAt), color: "#94a3b8" };
}

function getAccColor(acc) {
  if (acc >= 0.85) return "#10b981";
  if (acc >= 0.7) return "#f59e0b";
  return "#ef4444";
}

const titleStyle = {
  fontSize: "0.88rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const subtitleStyle = {
  fontSize: "0.72rem",
  color: "var(--app-text-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginTop: 2,
};

const btnPrimary = (active) => ({
  border: "none",
  background: active ? "#27500A" : "linear-gradient(135deg, #1b2459, #4f5fd4)",
  color: "white",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "7px 12px",
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  whiteSpace: "nowrap",
});

const btnDelete = {
  border: "1px solid #fee2e2",
  background: "white",
  color: "#ef4444",
  padding: "7px 10px",
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const thL = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
};
const thC = { ...thL, textAlign: "center" };
const tdL = {
  padding: "8px 12px",
  fontSize: "0.8rem",
  color: "var(--app-text)",
};
const tdC = { ...tdL, textAlign: "center" };

// ════════════════════════════════════════════════════
// 🆕 CONFUSION MATRIX COMPONENT
// ════════════════════════════════════════════════════

function ConfusionMatrixBlock({ tn, fp, fn, tp }) {
  const totalHam = tn + fp;
  const totalSpam = fn + tp;
  const totalEmail = totalHam + totalSpam;

  const tnPct = totalHam ? (tn / totalHam) * 100 : 0;
  const fpPct = totalHam ? (fp / totalHam) * 100 : 0;
  const fnPct = totalSpam ? (fn / totalSpam) * 100 : 0;
  const tpPct = totalSpam ? (tp / totalSpam) * 100 : 0;

  const cards = [
    {
      icon: <CheckCircle2 size={16} />,
      title: "Email ham → diprediksi ham",
      subtitle: "True Negative (TN)",
      value: tn,
      pct: tnPct,
      desc: `${tnPct.toFixed(1)}% dari total ham — model benar mengenali email normal`,
      bg: "#f2f9f2",
      border: "#cce8cc",
      titleColor: "#2e7d32",
      valColor: "#1b5e20",
      barFill: "#81c784",
      barBg: "#c8e6c9",
    },
    {
      icon: <AlertTriangle size={16} />,
      title: "Email ham → diprediksi spam",
      subtitle: "False Positive (FP)",
      value: fp,
      pct: fpPct,
      desc: `${fpPct.toFixed(1)}% email normal salah masuk folder spam`,
      bg: "#fdf2f2",
      border: "#fad4d4",
      titleColor: "#c62828",
      valColor: "#b71c1c",
      barFill: "#e57373",
      barBg: "#ffcdd2",
    },
    {
      icon: <AlertCircle size={16} />,
      title: "Email spam → diprediksi ham",
      subtitle: "False Negative (FN)",
      value: fn,
      pct: fnPct,
      desc: `${fnPct.toFixed(1)}% spam lolos masuk ke inbox — perlu diperhatikan`,
      bg: "#fff8e1",
      border: "#ffecb3",
      titleColor: "#f57f17",
      valColor: "#e65100",
      barFill: "#ffb74d",
      barBg: "#ffe0b2",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Email spam → diprediksi spam",
      subtitle: "True Positive (TP)",
      value: tp,
      pct: tpPct,
      desc: `${tpPct.toFixed(1)}% spam berhasil terdeteksi dan diblokir`,
      bg: "#f0f4ff",
      border: "#d6e4ff",
      titleColor: "#1565c0",
      valColor: "#0d47a1",
      barFill: "#64b5f6",
      barBg: "#bbdefb",
    },
  ];

  return (
    <Panel
      title="Confusion Matrix"
      icon={<Info size={15} />}
      infoContent={{
        title: "Apa itu Confusion Matrix?",
        definition: "Confusion Matrix (Matriks Kebingungan) adalah tabel 2×2 yang meringkas hasil prediksi model terhadap data uji. Tabel ini menunjukkan berapa banyak prediksi yang benar dan salah untuk setiap kelas (spam dan ham).",
        howItWorks: [
          "True Negative (TN) — Email bukan spam yang benar diprediksi bukan spam. Semakin besar, semakin baik.",
          "False Positive (FP) — Email bukan spam yang salah diprediksi sebagai spam. Ini merugikan pengguna karena email penting bisa masuk ke folder spam.",
          "False Negative (FN) — Email spam yang lolos dan diprediksi bukan spam. Ini berbahaya karena email spam sampai ke inbox pengguna.",
          "True Positive (TP) — Email spam yang benar diprediksi sebagai spam. Semakin besar, semakin baik model menangkap spam.",
        ],
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "stretch", marginTop: 8 }}>
          {/* Left Axis Label: AKTUAL */}
          <div
            style={{
              width: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontWeight: 700,
              color: "var(--app-text-muted)",
              letterSpacing: 2,
              fontSize: "0.75rem",
              marginRight: 8,
            }}
          >
            AKTUAL
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Top Axis Label: PREDIKSI */}
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
                color: "var(--app-text-muted)",
                letterSpacing: 2,
                fontSize: "0.75rem",
              }}
            >
              PREDIKSI
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {cards.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: c.barBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: c.titleColor,
                        flexShrink: 0,
                      }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: c.titleColor,
                          marginBottom: 2,
                        }}
                      >
                        {c.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: c.titleColor,
                          opacity: 0.8,
                        }}
                      >
                        {c.subtitle}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: c.valColor,
                      lineHeight: 1,
                    }}
                  >
                    {c.value.toLocaleString()}
                  </div>

                  <div>
                    <div
                      style={{
                        height: 6,
                        background: c.barBg,
                        borderRadius: 4,
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: c.barFill,
                          width: `${c.pct}%`,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: c.titleColor,
                        fontWeight: 600,
                      }}
                    >
                      {c.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.8rem",
            color: "var(--app-text-muted)",
          }}
        >
          <Info size={16} />
          <span>
            Ringkasan: Dari total <b>{totalEmail.toLocaleString()}</b> email
            yang diuji, model berhasil mendeteksi <b>{tpPct.toFixed(0)}%</b>{" "}
            serangan spam. Terdapat <b>{fp.toLocaleString()}</b> email normal
            yang keliru ditandai sebagai spam (<i>False Positive</i>), dan{" "}
            <b>{fn.toLocaleString()}</b> email spam yang lolos ke inbox (
            <i>False Negative</i>).
          </span>
        </div>
      </div>
    </Panel>
  );
}
