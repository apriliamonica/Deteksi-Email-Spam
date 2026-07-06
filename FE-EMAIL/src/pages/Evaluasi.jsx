// EvaluationPage.jsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X, Loader2, ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { modelAPI } from "../services/api";

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════

const METRIC_DEFS = {
  accuracy: {
    title: "Accuracy",
    def: "Persentase prediksi benar dari seluruh sampel.",
    formula: "(TP + TN) / (TP + TN + FP + FN)",
    critical: "Bermakna saat kelas seimbang.",
  },
  precision: {
    title: "Precision",
    def: "Prediksi Spam yang benar-benar Spam.",
    formula: "TP / (TP + FP)",
    critical: "Krusial saat False Positive merugikan.",
  },
  recall: {
    title: "Recall",
    def: "Spam aktual yang berhasil dideteksi.",
    formula: "TP / (TP + FN)",
    critical: "Krusial saat False Negatif merugikan.",
  },
  f1_score: {
    title: "F1-Score",
    def: "Rata-rata harmonik Precision & Recall.",
    formula: "2 × (P × R) / (P + R)",
    critical: "Metrik utama untuk dataset tidak seimbang.",
  },
  mcc: {
    title: "MCC",
    def: "Korelasi prediksi dengan label aktual.",
    formula: "(TP×TN − FP×FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))",
    critical: "Paling dapat diandalkan untuk data imbalanced.",
  },
};

const METRIC_COLORS = {
  accuracy: "#10b981",
  precision: "#4f5fd4",
  recall: "#f59e0b",
  f1_score: "#8b5cf6",
};

// ════════════════════════════════════════════════════
// METRIC INFO BUTTON + MODAL
// ════════════════════════════════════════════════════

function InfoBtn({ metricKey }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--app-text-muted)",
          padding: 2,
          display: "inline-flex",
        }}
      >
        <Info size={12} />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 style={{ margin: 0, marginBottom: 12, fontSize: "1rem" }}>
            {METRIC_DEFS[metricKey]?.title}
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--app-text)",
              marginBottom: 12,
            }}
          >
            {METRIC_DEFS[metricKey]?.def}
          </p>
          <div
            style={{
              padding: 10,
              background: "var(--lav-ghost)",
              borderRadius: 8,
              marginBottom: 12,
              fontSize: "0.75rem",
              fontFamily: "monospace",
              color: "#4f5fd4",
            }}
          >
            {METRIC_DEFS[metricKey]?.formula}
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#92400e",
              background: "#fffbeb",
              padding: 10,
              borderRadius: 8,
              margin: 0,
            }}
          >
            💡 {METRIC_DEFS[metricKey]?.critical}
          </p>
        </Modal>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════════════

function Modal({ children, onClose, width = 380 }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(27,36,89,.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--app-surface)",
          borderRadius: 14,
          padding: 20,
          maxWidth: width,
          width: "100%",
          position: "relative",
          border: "1px solid var(--app-border)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "var(--lav-ghost)",
            border: "none",
            borderRadius: 7,
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--app-text-muted)",
          }}
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function EvaluationPage() {
  const [results, setResults] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selDataset, setSelDataset] = useState("");
  const [selModel, setSelModel] = useState("");

  // ── Fetch ──
  useEffect(() => {
    (async () => {
      try {
        const [h, d] = await Promise.all([
          modelAPI.getHistory(),
          modelAPI.listDatasets(),
        ]);
        const history = Array.isArray(h.data) ? h.data : [];
        const dsList = Array.isArray(d.data) ? d.data : [];
        setResults(history);
        setDatasets(dsList);
        if (dsList[0]) setSelDataset(dsList[0].id.toString());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived ──
  const filteredResults = selDataset
    ? results.filter((r) => r.dataset_id?.toString() === selDataset)
    : results;

  // Menampilkan rasio sebagai Latih:Uji (gabungan Train+Val sebagai data latih)
  const getRatio = (item) => {
    if (item.req_val_split != null && item.req_test_split != null) {
      const tr = Math.round(
        (1 - item.req_val_split - item.req_test_split) * 100,
      );
      const val = Math.round(item.req_val_split * 100);
      const te = Math.round(item.req_test_split * 100);
      const latih = tr + val; // Train + Validation = total data latih
      return `${latih}:${te}`; // Format: Latih:Uji
    }

    // Fallback jika ambil dari size dan total_data
    if (item.train_size && item.total_data) {
      const te = Math.round((item.test_size / item.total_data) * 100);
      let val = 0;

      try {
        if (item.metrics_json) {
          const mj = JSON.parse(item.metrics_json);
          if (mj.val_size) {
            val = Math.round((mj.val_size / item.total_data) * 100);
          }
        }
      } catch (e) {}

      const tr = Math.round((item.train_size / item.total_data) * 100);
      const latih = tr + val;
      return `${latih}:${te}`;
    }
    return "80:20";
  };

  const allRatios = [...new Set(filteredResults.map(getRatio))].sort();

  const groupedRatio = {};
  let maxIters = 0;
  allRatios.forEach((r) => {
    const top = filteredResults
      .filter((it) => getRatio(it) === r)
      .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
      .slice(0, 5);
    groupedRatio[r] = top;
    if (top.length > maxIters) maxIters = top.length;
  });

  const modelOptions = filteredResults
    .map((r) => ({
      id: r.id,
      label: r.model_name || `Model #${r.id}`,
      accuracy: r.accuracy ?? 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const activeModelId =
    selModel && modelOptions.some((m) => m.id.toString() === selModel)
      ? selModel
      : (modelOptions[0]?.id?.toString() ?? "");

  const compResult =
    filteredResults.find((r) => r.id?.toString() === activeModelId) || null;

  if (loading) {
    return (
      <Center>
        <Loader2
          size={28}
          color="#4f5fd4"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <p style={{ color: "var(--app-text-muted)", fontSize: "0.85rem" }}>
          Memuat data evaluasi...
        </p>
      </Center>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 16,
          borderBottom: "1px solid var(--app-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "var(--lav-light)",
              color: "#4f5fd4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--app-text)",
              }}
            >
              Evaluation Board
            </h1>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--app-text-muted)",
                margin: 0,
                marginTop: 2,
              }}
            >
              Performa model IndoBERT + GAT
            </p>
          </div>
        </div>

        <Select
          label="Dataset:"
          value={selDataset}
          onChange={(v) => {
            setSelDataset(v);
            setSelModel("");
          }}
          options={datasets.map((d) => ({
            value: d.id.toString(),
            label: d.name || `Dataset #${d.id}`,
          }))}
        />
      </div>

      {/* ── TABLE 1: Split Ratio ── */}
      <Card
        title="Data Split Ratio"
        subtitle="Top 5 akurasi per iterasi training"
        right={
          allRatios.length > 0 && (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--app-text-muted)",
                background: "var(--lav-ghost)",
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {allRatios.length} rasio ditemukan
            </span>
          )
        }
      >
        {allRatios.length === 0 ? (
          <Empty msg="Belum ada data training untuk dataset ini." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", width: 100 }}>
                    Iterasi
                  </th>
                  {allRatios.map((r) => (
                    <th key={r} style={th}>
                      IndoBERT + GAT ({r})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(maxIters, 1) }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 700, color: "#4f5fd4" }}>
                      #{i + 1}
                    </td>
                    {allRatios.map((r) => {
                      const m = groupedRatio[r]?.[i];
                      return (
                        <td
                          key={r}
                          style={{
                            ...td,
                            color: m ? "#065f46" : "var(--app-text-muted)",
                            fontWeight: m ? 700 : 400,
                          }}
                        >
                          {m ? `${(m.accuracy * 100).toFixed(2)}%` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Average row */}
                <tr style={{ background: "var(--lav-ghost)" }}>
                  <td style={{ ...td, fontWeight: 700, color: "#4f5fd4" }}>
                    Rata-rata
                  </td>
                  {allRatios.map((r) => {
                    const valid = groupedRatio[r].filter(
                      (m) => m?.accuracy != null,
                    );
                    if (valid.length === 0) {
                      return (
                        <td
                          key={r}
                          style={{ ...td, color: "var(--app-text-muted)" }}
                        >
                          —
                        </td>
                      );
                    }
                    const avg =
                      valid.reduce((a, m) => a + m.accuracy, 0) / valid.length;
                    return (
                      <td
                        key={r}
                        style={{ ...td, fontWeight: 700, color: "#1b2459" }}
                      >
                        {(avg * 100).toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── TABLE 2: Train vs Test + Chart ── */}
      <Card
        title="Perbandingan Training & Testing"
        subtitle="Pilih model untuk melihat detail metrik"
        right={
          <Select
            label="Model:"
            value={activeModelId}
            onChange={setSelModel}
            options={modelOptions.map((m) => ({
              value: m.id.toString(),
              label: `${m.label} — ${(m.accuracy * 100).toFixed(1)}%`,
            }))}
          />
        }
      >
        {!compResult ? (
          <Empty msg="Belum ada model untuk dataset ini." />
        ) : (
          <ComparisonView result={compResult} />
        )}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
// COMPARISON VIEW
// ════════════════════════════════════════════════════

function ComparisonView({ result }) {
  let trainMetrics = {};
  let testMetrics = {
    accuracy: result.accuracy,
    precision: result.precision,
    recall: result.recall,
    f1_score: result.f1_score,
  };
  let extras = { mcc: result.mcc, roc_auc: result.roc_auc };

  try {
    if (result.metrics_json) {
      const mj = JSON.parse(result.metrics_json);
      if (mj.train_metrics) trainMetrics = mj.train_metrics;
      if (mj.mcc != null) extras.mcc = mj.mcc;
      if (mj.roc_auc != null) extras.roc_auc = mj.roc_auc;
    }
  } catch {}

  const rows = [
    { label: "Accuracy", key: "accuracy" },
    { label: "Precision", key: "precision" },
    { label: "Recall", key: "recall" },
    { label: "F1-Score", key: "f1_score" },
    { label: "MCC", key: "mcc" },
    { label: "ROC-AUC", key: "roc_auc" },
  ];

  // Bar chart data
  const chartData = ["accuracy", "precision", "recall", "f1_score"].map(
    (k) => ({
      name: METRIC_DEFS[k].title,
      value: parseFloat(((testMetrics[k] || 0) * 100).toFixed(2)),
      key: k,
      color: METRIC_COLORS[k],
    }),
  );

  return (
    <div
      className="page-container page-evaluasi"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {chartData.map((m) => (
          <div
            key={m.key}
            style={{
              padding: 14,
              borderRadius: 12,
              textAlign: "center",
              background: "var(--app-surface)",
              border: `1.5px solid ${m.color}30`,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--app-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              {m.name} <InfoBtn metricKey={m.key} />
            </div>
            <div
              style={{ fontSize: "1.4rem", fontWeight: 900, color: m.color }}
            >
              {m.value}%
            </div>
            <div
              style={{
                marginTop: 8,
                height: 4,
                background: "var(--lav-ghost)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${m.value}%`,
                  height: "100%",
                  background: m.color,
                  transition: "width .6s",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Train vs Test Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: 200 }}>Metrik</th>
              <th style={th}>Training</th>
              <th style={th}>Testing</th>
              <th style={th}>Selisih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const tr =
                trainMetrics[r.key] ?? testMetrics[r.key] ?? extras[r.key];
              const te = testMetrics[r.key] ?? extras[r.key];
              const diff = tr != null && te != null ? Math.abs(tr - te) : null;
              return (
                <tr
                  key={r.key}
                  style={i % 2 ? { background: "var(--app-bg)" } : {}}
                >
                  <td style={{ ...td, fontWeight: 600 }}>
                    {r.label}
                    {METRIC_DEFS[r.key] && (
                      <span style={{ marginLeft: 4 }}>
                        <InfoBtn metricKey={r.key} />
                      </span>
                    )}
                  </td>
                  <td style={td}>
                    {tr != null ? `${(tr * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>
                    {te != null ? `${(te * 100).toFixed(2)}%` : "—"}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: diff > 0.05 ? "#f59e0b" : "#10b981",
                    }}
                  >
                    {diff != null ? `${(diff * 100).toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bar Chart
      <div style={{ height: 200, width: "100%" }}>
        <ResponsiveContainer>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e8eaff"
            />
            <XAxis
              dataKey="name"
              tick={{
                fontSize: 11,
                fontWeight: 600,
                fill: "var(--app-text-muted)",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--app-text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "white",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--app-border)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div style={{ color: d.color, fontWeight: 800 }}>
                      {d.value}%
                    </div>
                  </div>
                );
              }}
              cursor={{ fill: "var(--lav-ghost)" }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
              {chartData.map((m, i) => (
                <Cell key={i} fill={m.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> */}
    </div>
  );
}

// ════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ════════════════════════════════════════════════════

function Card({ title, subtitle, children, right }) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--app-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "var(--lav-ghost)",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--app-text)",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--app-text-muted)",
                margin: 0,
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "white",
        border: "1px solid var(--app-border)",
        borderRadius: 10,
        padding: "6px 12px",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--app-text-muted)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "#4f5fd4",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {options.length === 0 && <option value="">Belum ada</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Center({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div
      style={{
        padding: 30,
        textAlign: "center",
        color: "var(--app-text-muted)",
        fontSize: "0.85rem",
        border: "1px dashed var(--app-border)",
        borderRadius: 10,
      }}
    >
      {msg}
    </div>
  );
}

// ── Table styles ──
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" };
const th = {
  padding: "10px 14px",
  background: "#1b2459",
  color: "white",
  fontWeight: 700,
  fontSize: "0.72rem",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const td = {
  padding: "10px 14px",
  textAlign: "center",
  borderBottom: "1px solid var(--app-border)",
  color: "var(--app-text)",
};
