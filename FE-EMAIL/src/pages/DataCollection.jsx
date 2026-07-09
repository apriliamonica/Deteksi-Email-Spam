// DataCollection.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Trash2,
  Layers,
  Activity,
  X,
  FileText,
  Calendar,
} from "lucide-react";
import { modelAPI } from "../services/api";
import Pagination from "../components/Pagination";

export default function DataCollection() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // ─── state ──────────────────────
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 8; // ⚙️ PAGINATION: Ubah angka ini untuk mengatur jumlah dataset per halaman di halaman Data Collection

  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [upload, setUpload] = useState(null); // null | {progress, eta}
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);

  // ─── fetch ──────────────────────
  useEffect(() => {
    modelAPI
      .listDatasets()
      .then((r) => setDatasets(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const reload = async () => {
    const r = await modelAPI.listDatasets();
    setDatasets(r.data || []);
  };

  // ─── aggregate stats ────────────
  const total = {
    ds: datasets.length,
    spam: datasets.reduce((a, b) => a + (b.spam_count || 0), 0),
    ham: datasets.reduce((a, b) => a + (b.ham_count || 0), 0),
  };

  // ─── upload handlers ────────────
  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setDatasetName(f.name);
    setError(null);
    setPreviewing(true);
    try {
      const r = await modelAPI.previewDataset(f);
      setPreview(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to read file");
    } finally {
      setPreviewing(false);
    }
  };

  const handleUpload = async () => {
    setUpload({
      progress: 0,
      eta: Math.max(2, Math.ceil((file.size / 1e6) * 3)),
    });
    try {
      const r = await modelAPI.uploadDataset(file, datasetName);
      const newDs = {
        id: r.data.metrics.dataset_id,
        name: datasetName || file.name,
        total_rows: r.data.metrics.total_uploaded,
        spam_count: r.data.metrics.spam,
        ham_count: r.data.metrics.ham,
        created_at: new Date().toISOString(),
      };
      setDatasets((p) => [newDs, ...p]);
      setUpload({ progress: 100, eta: 0 });
      setSuccess(true);
      setFile(null);
      setPreview(null);
      setShowConfirm(newDs);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed");
    } finally {
      setUpload(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this dataset?")) return;
    await modelAPI.deleteDataset(id);
    setDatasets((p) => p.filter((d) => d.id !== id));
  };

  // ─── pagination ─────────────────
  const totalPages = Math.ceil(datasets.length / perPage) || 1;
  const currentData = datasets.slice((page - 1) * perPage, page * perPage);

  const isBalanced = (s, h) => s && h && Math.abs(s - h) / (s + h) <= 0.2;
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="page-container page-data-collection" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── HEADER ── */}
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
          Data Collection
        </h1>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--app-text-muted)",
            margin: 0,
          }}
        >
          Upload and manage datasets before preprocessing
        </p>
      </div>

      {/* ── STATS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        {[
          {
            label: "Total Dataset",
            value: total.ds,
            icon: <Database size={16} />,
            color: "#4f5fd4",
          },
          {
            label: "Total Spam",
            value: total.spam,
            icon: <Layers size={16} />,
            color: "#ec4899",
          },
          {
            label: "Total Non-Spam",
            value: total.ham,
            icon: <FileSpreadsheet size={16} />,
            color: "#10b981",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: `${s.color}15`,
                color: s.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {s.icon}
            </div>
            <div>
              <div
                style={{ fontSize: "0.7rem", color: "var(--app-text-muted)" }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {s.value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── UPLOAD ── */}
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
        }}
      >
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Upload size={15} color="#4f5fd4" /> Upload Dataset
        </h3>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />

        {!file && !previewing && (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%",
              padding: "28px 16px",
              borderRadius: 10,
              border: "2px dashed var(--primary-light)",
              background: "var(--lav-ghost)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: "var(--app-text-muted)",
              fontSize: "0.85rem",
            }}
          >
            <FileSpreadsheet size={24} color="#4f5fd4" />
            <span style={{ color: "var(--app-text)", fontWeight: 600 }}>
              Click to select file
            </span>
            <span style={{ fontSize: "0.72rem" }}>
              CSV/Excel · must have <code>label</code> & <code>text</code> columns
            </span>
          </button>
        )}

        {previewing && (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--app-text-muted)",
              fontSize: "0.85rem",
            }}
          >
            <Activity
              size={18}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div> reading...</div>
          </div>
        )}

        {file && preview && !upload && (
          <div>
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: "var(--lav-ghost)",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.82rem",
              }}
            >
              <FileText size={15} color="#4f5fd4" />
              <span
                style={{
                  flex: 1,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--app-text-muted)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="Dataset name"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--primary-light)",
                fontSize: "0.82rem",
                marginBottom: 10,
                outline: "none",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {[
                { l: "Total", v: preview.metrics.total, c: "#4f5fd4" },
                { l: "Spam", v: preview.metrics.spam, c: "#ec4899" },
                { l: "Ham", v: preview.metrics.ham, c: "#10b981" },
              ].map((m) => (
                <div
                  key={m.l}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: `${m.c}10`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{ fontSize: "1rem", fontWeight: 800, color: m.c }}
                  >
                    {m.v?.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--app-text-muted)",
                    }}
                  >
                    {m.l}
                  </div>
                </div>
              ))}
            </div>

            {preview.preview_rows?.length > 0 && (
              <div
                style={{
                  maxHeight: 160,
                  overflow: "auto",
                  borderRadius: 8,
                  border: "1px solid var(--app-border)",
                  marginBottom: 10,
                  fontSize: "0.72rem",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--lav-ghost)",
                    }}
                  >
                    <tr>
                      <th style={{ padding: 6, width: 30 }}>#</th>
                      {preview.preview_headers.map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: 6,
                            textAlign: "left",
                            textTransform: "capitalize",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview_rows.map((r, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: "1px solid var(--app-border)" }}
                      >
                        <td
                          style={{
                            padding: 6,
                            textAlign: "center",
                            color: "var(--app-text-muted)",
                          }}
                        >
                          {i + 1}
                        </td>
                        {preview.preview_headers.map((h) => (
                          <td
                            key={h}
                            style={{
                              padding: 6,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r[h] || (
                              <span style={{ color: "var(--app-text-muted)" }}>
                                -
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 8,
                  border: "1px solid var(--app-border)",
                  background: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                style={{
                  flex: 2,
                  padding: 9,
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
                  color: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Dataset
              </button>
            </div>
          </div>
        )}

        {upload && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                fontSize: "0.78rem",
              }}
            >
              <span>Uploading...</span>
              <span>{upload.progress}%</span>
            </div>
            <div
              style={{
                height: 5,
                background: "var(--lav-ghost)",
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${upload.progress}%`,
                  background: "#4f5fd4",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--app-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={10} /> ~{upload.eta}d
            </div>
          </div>
        )}

        {success && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 8,
              background: "#ecfdf5",
              color: "#065f46",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle size={13} /> Added successfully!
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: "0.78rem",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── TABLE ── */}
      <div
        style={{
          borderRadius: 12,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--app-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Database size={15} color="#4f5fd4" /> Dataset List
          </h3>
          <span style={{ fontSize: "0.72rem", color: "var(--app-text-muted)" }}>
            {total.ds} datasets
          </span>
        </div>

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "var(--app-text-muted)",
            }}
          >
            Loading...
          </div>
        ) : datasets.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "var(--app-text-muted)",
            }}
          >
            No datasets yet
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--lav-ghost)" }}>
                  <th style={th}>Name</th>
                  <th style={{ ...th, textAlign: "center", width: 70 }}>
                    Spam
                  </th>
                  <th style={{ ...th, textAlign: "center", width: 70 }}>Ham</th>
                  <th style={{ ...th, textAlign: "right", width: 80 }}>
                    Total
                  </th>
                  <th style={{ ...th, textAlign: "center", width: 90 }}>
                    Status
                  </th>
                  <th style={{ ...th, textAlign: "right", width: 110 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderTop: "1px solid var(--app-border)" }}
                  >
                    <td style={td}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Database size={13} color="#4f5fd4" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                            {d.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--app-text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Calendar size={9} /> {fmtDate(d.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <Pill bg="#fce7f3" color="#ec4899">
                        {d.spam_count?.toLocaleString() || 0}
                      </Pill>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <Pill bg="#e8eaff" color="#4f5fd4">
                        {d.ham_count?.toLocaleString() || 0}
                      </Pill>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                      {d.total_rows?.toLocaleString() || 0}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {isBalanced(d.spam_count, d.ham_count) ? (
                        <Pill bg="#ecfdf5" color="#065f46">
                          Balanced
                        </Pill>
                      ) : (
                        <Pill bg="#fffbeb" color="#92400e">
                          Imbalance
                        </Pill>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <IconBtn
                          title="Preprocessing"
                          primary
                          onClick={() => setShowConfirm(d)}
                        >
                          <Layers size={12} />
                        </IconBtn>
                        <IconBtn
                          title="Delete"
                          danger
                          onClick={() => handleDelete(d.id)}
                        >
                          <Trash2 size={12} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  justifyContent: "center",
                  borderTop: "1px solid var(--app-border)",
                }}
              >
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(27,36,89,.45)",
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
              borderRadius: 14,
              padding: 24,
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--lav-ghost)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Layers size={22} color="#4f5fd4" />
            </div>
            <h3 style={{ margin: 0, marginBottom: 6, fontSize: "0.95rem" }}>
              Proceed to Preprocessing?
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--app-text-muted)",
                marginBottom: 16,
              }}
            >
              Dataset <strong>"{showConfirm.name}"</strong> is ready for preprocessing.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowConfirm(null)}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 8,
                  border: "1px solid var(--app-border)",
                  background: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Later
              </button>
              <button
                onClick={() =>
                  navigate("/preprocessing", {
                    state: {
                      selectedDatasetId: showConfirm.id,
                      datasetName: showConfirm.name,
                    },
                  })
                }
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
                  color: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── mini components (4 baris saja) ──
const th = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
};
const td = {
  padding: "10px 14px",
  fontSize: "0.82rem",
  color: "var(--app-text)",
};

const Pill = ({ children, bg, color }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      background: bg,
      color,
      fontSize: "0.7rem",
      fontWeight: 700,
    }}
  >
    {children}
  </span>
);

const IconBtn = ({ children, onClick, title, primary, danger }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28,
      height: 28,
      borderRadius: 7,
      border: danger ? "1px solid #fee2e2" : "1px solid var(--app-border)",
      background: primary
        ? "linear-gradient(135deg, #1b2459, #4f5fd4)"
        : "white",
      color: primary ? "white" : danger ? "#ef4444" : "var(--app-text-muted)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);
