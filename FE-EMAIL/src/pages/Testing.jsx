// Testing.jsx
import { useState, useEffect, useRef } from "react";
import {
  Send,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Upload,
  Search,
  FileText,
  Calendar,
  Activity,
  Trash2,
} from "lucide-react";
import { modelAPI, emailAPI } from "../services/api";
import Pagination from "../components/Pagination";

export default function Testing() {
  // ── State ────────────────────────
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [activeResult, setActiveResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [modelList, setModelList] = useState([]);
  const [isActivating, setIsActivating] = useState(false);
  const [testHistory, setTestHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  // Batch upload state
  const [batchFile, setBatchFile] = useState(null);
  const [batchColumns, setBatchColumns] = useState([]);
  const [batchMetrics, setBatchMetrics] = useState(null);
  const [colText, setColText] = useState("");
  const [colSubject, setColSubject] = useState("");
  const [colSender, setColSender] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const fileRef = useRef(null);

  // History pagination & search
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 10;

  // ── Fetch active model ───────────
  useEffect(() => {
    (async () => {
      try {
        const [a, h] = await Promise.all([
          modelAPI.getActiveModel(),
          modelAPI.getHistory(),
        ]);
        setActiveModel(a.data);
        setModelList(h.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setModelLoading(false);
      }
    })();
  }, []);

  // ── Fetch riwayat klasifikasi dari backend ───────────
  const fetchHistory = async (p = page, s = search) => {
    setHistoryLoading(true);
    try {
      const params = { skip: (p - 1) * perPage, limit: perPage };
      if (s.trim()) params.search = s.trim();
      const { data } = await emailAPI.getClassifyHistory(params);
      // Map backend items to local format
      const mapped = (data.items || []).map((e) => ({
        id: e.id,
        type: "manual",
        date: e.created_at
          ? new Date(e.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "-",
        text: e.body || "-",
        subject: e.subject,
        sender: e.sender,
        label: e.label,
        conf: e.confidence,
      }));
      setTestHistory(mapped);
      setHistoryTotal(data.total || 0);
    } catch (err) {
      console.error("Gagal memuat riwayat:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);


  const refreshModel = async () => {
    const [a, h] = await Promise.all([
      modelAPI.getActiveModel(),
      modelAPI.getHistory(),
    ]);
    setActiveModel(a.data);
    setModelList(h.data || []);
  };

  // ── Handlers ─────────────────────
  const handleModelChange = async (e) => {
    const id = e.target.value;
    if (!id || id === activeModel?.id?.toString()) return;
    setIsActivating(true);
    try {
      await modelAPI.activateModel(id);
      await refreshModel();
    } catch {
      alert("Gagal mengubah model aktif.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleManualTest = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const payload = { body };
      if (subject.trim()) payload.subject = subject.trim();
      if (sender.trim()) payload.sender = sender.trim();

      const { data } = await emailAPI.classify(payload);
      const entry = {
        id: data.id || Date.now(),
        type: "manual",
        date: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        text: data.body || body,
        subject: data.subject || subject,
        sender: data.sender || sender,
        label: data.label,
        conf: data.confidence,
        detail: data.processing_detail,
      };
      setActiveResult(entry);
      setBody("");
      setSubject("");
      setSender("");
      // Reset ke page 1 & reload history dari backend
      setPage(1);
      await fetchHistory(1, search);
    } catch {
      alert("Gagal prediksi. Pastikan backend aktif & model sudah dilatih.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBatchFile(f);
    setBatchColumns([]);
    setColumnsLoading(true);
    try {
      const { data } = await emailAPI.previewColumns(f);
      setBatchColumns(data.columns);
      setBatchMetrics(data.metrics);
      // Auto-detect columns
      const find = (...names) =>
        data.columns.find((c) => names.includes(c)) || "";
      setColText(find("text_id", "text", "body"));
      setColSubject(find("subject_id", "subject"));
      setColSender(find("sender"));
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal membaca file.");
      setBatchFile(null);
    } finally {
      setColumnsLoading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  const handleRunBatch = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", batchFile);
      fd.append("text_column", colText);
      fd.append("subject_column", colSubject);
      fd.append("sender_column", colSender);

      const { data } = await emailAPI.classifyBatch(fd);
      resetBatch();
      alert(`Berhasil mengklasifikasi ${data.results?.length || 0} email!`);
      // Reload history dari backend
      setPage(1);
      await fetchHistory(1, search);
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || "Gagal menguji file"}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const resetBatch = () => {
    setBatchFile(null);
    setBatchColumns([]);
    setBatchMetrics(null);
    setColText("");
    setColSubject("");
    setColSender("");
  };

  // ── Delete handlers ──────────────
  const handleDeleteItem = async (e, itemId) => {
    e.stopPropagation();
    if (!window.confirm("Hapus riwayat klasifikasi ini?")) return;
    try {
      await emailAPI.deleteClassifyItem(itemId);
      if (activeResult?.id === itemId) setActiveResult(null);
      await fetchHistory(page, search);
    } catch {
      alert("Gagal menghapus riwayat.");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Hapus semua ${historyTotal} riwayat klasifikasi? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await emailAPI.deleteAllClassifyHistory();
      setActiveResult(null);
      setPage(1);
      await fetchHistory(1, search);
    } catch {
      alert("Gagal menghapus semua riwayat.");
    }
  };

  // ── Helpers ──────────────────────
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Pagination total dari backend
  const totalPages = Math.ceil(historyTotal / perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── HEADER ── */}
      <div>
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            margin: 0,
            color: "var(--app-text)",
          }}
        >
          Testing
        </h1>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--app-text-muted)",
            margin: 0,
          }}
        >
          Uji model IndoBERT + GAT dengan teks manual atau file batch.
        </p>
      </div>

      {/* ── MODEL SELECTOR ── */}
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--app-text-muted)",
          }}
        >
          Pilih Model:
        </span>
        <select
          value={activeModel?.id || ""}
          onChange={handleModelChange}
          disabled={isActivating || modelLoading}
          style={selectStyle}
        >
          {modelList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.model_name} (Acc: {(m.accuracy * 100).toFixed(1)}%)
            </option>
          ))}
        </select>
        {isActivating && (
          <Activity
            size={14}
            color="#4f5fd4"
            style={{ animation: "spin 1s linear infinite" }}
          />
        )}
      </div>

      {/* ── ACTIVE MODEL BANNER ── */}
      {/* {modelLoading ? (
        <Banner type="loading" />
      ) : activeModel ? (
        <Banner type="active" model={activeModel} />
      ) : (
        <Banner type="empty" />
      )} */}

      {/* ── MAIN GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT: Inputs + History */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
          }}
        >
          {/* Manual Test */}
          <Card
            title="Uji Teks Manual"
            icon={<FileText size={16} color="#4f5fd4" />}
          >
            <form
              onSubmit={handleManualTest}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="Pengirim (opsional)"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Subjek (opsional)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <textarea
                rows={4}
                placeholder="Isi email... (wajib)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
              />
              <button
                type="submit"
                disabled={loading || !body.trim()}
                style={{
                  ...btnPrimary,
                  opacity: loading || !body.trim() ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Activity
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Periksa Email
                  </>
                )}
              </button>
            </form>
          </Card>

          {/* Batch Upload */}
          <Card
            title="Pengujian Batch (CSV/Excel)"
            icon={<Upload size={16} color="#4f5fd4" />}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFilePick}
              style={{ display: "none" }}
            />

            {!batchFile && !columnsLoading && (
              <>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--app-text-muted)",
                    marginBottom: 10,
                  }}
                >
                  Upload file berisi daftar email, lalu pilih kolom yang
                  digunakan.
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={btnOutline}
                >
                  <Upload size={14} /> Pilih File Dataset
                </button>
              </>
            )}

            {columnsLoading && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--app-text-muted)",
                }}
              >
                <Activity
                  size={20}
                  color="#4f5fd4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
                  Membaca kolom...
                </div>
              </div>
            )}

            {batchFile &&
              batchColumns.length > 0 &&
              batchMetrics &&
              !batchLoading && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div
                    style={{
                      padding: 10,
                      background: "var(--lav-ghost)",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 2,
                        color: "var(--app-text)",
                      }}
                    >
                      {batchFile.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--app-text-muted)",
                      }}
                    >
                      {batchMetrics.total_rows?.toLocaleString()} baris
                    </div>
                  </div>

                  <ColumnSelect
                    label="Kolom Isi Email"
                    required
                    value={colText}
                    onChange={setColText}
                    options={batchColumns}
                  />
                  <ColumnSelect
                    label="Kolom Subject"
                    required
                    value={colSubject}
                    onChange={setColSubject}
                    options={batchColumns}
                  />
                  <ColumnSelect
                    label="Kolom Pengirim"
                    required
                    value={colSender}
                    onChange={setColSender}
                    options={batchColumns}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={resetBatch}
                      style={{ ...btnOutline, flex: 1 }}
                    >
                      Ganti File
                    </button>
                    <button
                      disabled={!colText || !colSubject || !colSender}
                      onClick={handleRunBatch}
                      style={{
                        ...btnPrimary,
                        flex: 2,
                        opacity:
                          !colText || !colSubject || !colSender ? 0.5 : 1,
                      }}
                    >
                      <Send size={13} /> Mulai Testing
                    </button>
                  </div>
                </div>
              )}

            {batchLoading && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--app-text-muted)",
                }}
              >
                <Activity
                  size={20}
                  color="#4f5fd4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
                  Memproses & mengklasifikasi...
                </div>
              </div>
            )}
          </Card>

          {/* History */}
          <Card
            title="Hasil Pengujian"
            right={
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--app-text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "6px 10px 6px 28px",
                    borderRadius: 999,
                    border: "1px solid var(--app-border)",
                    background: "white",
                    fontSize: "0.75rem",
                    outline: "none",
                    width: 160,
                  }}
                />
              </div>
            }
            bodyPadding={0}
          >
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
                    <th style={{ ...th, width: 40 }}>No</th>
                    <th style={{ ...th, width: 100 }}>Tanggal</th>
                    <th style={th}>Konten</th>
                    <th style={{ ...th, textAlign: "center", width: 90 }}>
                      Label
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: 30,
                          textAlign: "center",
                          color: "var(--app-text-muted)",
                        }}
                      >
                        Belum ada data
                      </td>
                    </tr>
                  ) : (
                    paginated.map((it, i) => (
                      <tr
                        key={it.id}
                        onClick={() => setActiveResult(it)}
                        style={{
                          cursor: "pointer",
                          borderTop: "1px solid var(--app-border)",
                          background:
                            activeResult?.id === it.id
                              ? "var(--lav-light)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            activeResult?.id === it.id
                              ? "var(--lav-light)"
                              : "var(--app-bg)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            activeResult?.id === it.id
                              ? "var(--lav-light)"
                              : "transparent")
                        }
                      >
                        <td
                          style={{
                            ...td,
                            textAlign: "center",
                            color: "var(--app-text-muted)",
                          }}
                        >
                          {(page - 1) * perPage + i + 1}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: "var(--app-text-muted)",
                            fontSize: "0.72rem",
                          }}
                        >
                          {it.date}
                        </td>
                        <td
                          style={{
                            ...td,
                            maxWidth: 280,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={it.text}
                        >
                          {it.text}
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>
                          {it.type === "batch" ? (
                            <Pill bg="var(--lav-light)" color="#4f5fd4">
                              BATCH
                            </Pill>
                          ) : (
                            <Pill
                              bg={it.label === "spam" ? "#fef2f2" : "#ecfdf5"}
                              color={
                                it.label === "spam" ? "#991b1b" : "#065f46"
                              }
                            >
                              {it.label}
                            </Pill>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div
                style={{
                  padding: 12,
                  borderTop: "1px solid var(--app-border)",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Detail Panel (sticky) */}
        <div style={{ position: "sticky", top: 16, minWidth: 0 }}>
          {activeResult ? (
            activeResult.type === "batch" ? (
              <BatchDetail result={activeResult} />
            ) : (
              <ManualDetail result={activeResult} />
            )
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DETAIL COMPONENTS
// ════════════════════════════════════════════════════

function ManualDetail({ result }) {
  const isSpam = result.label === "spam";
  return (
    <DetailCard>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px solid var(--app-border)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: isSpam ? "#fef2f2" : "#ecfdf5",
            color: isSpam ? "#991b1b" : "#065f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSpam ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
        </div>
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--app-text-muted)",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Prediksi
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: isSpam ? "#991b1b" : "#065f46",
            }}
          >
            {isSpam ? "TERDETEKSI SPAM" : "EMAIL AMAN"}
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            marginBottom: 6,
          }}
        >
          <span style={{ color: "var(--app-text-muted)" }}>Confidence</span>
          <strong style={{ color: "var(--app-text)" }}>
            {(result.conf * 100).toFixed(2)}%
          </strong>
        </div>
        <div
          style={{
            height: 6,
            background: "var(--lav-ghost)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${result.conf * 100}%`,
              height: "100%",
              background: isSpam ? "#ef4444" : "#10b981",
              transition: "width .6s",
            }}
          />
        </div>
      </div>

      {/* GAT Visualization (simple SVG) */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--app-text-muted)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          GAT Visualization
        </div>
        <div
          style={{
            height: 160,
            borderRadius: 10,
            background: "white",
            border: "1px solid var(--app-border)",
            padding: 8,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 300 144">
            <line
              x1="150"
              y1="72"
              x2="80"
              y2="30"
              stroke="#ef4444"
              strokeWidth={isSpam ? 3 : 0.5}
              opacity={isSpam ? 0.7 : 0.1}
            />
            <line
              x1="150"
              y1="72"
              x2="220"
              y2="40"
              stroke="#ef4444"
              strokeWidth={isSpam ? 2 : 0.5}
              opacity={isSpam ? 0.6 : 0.1}
            />
            <line
              x1="150"
              y1="72"
              x2="90"
              y2="115"
              stroke="#10b981"
              strokeWidth={!isSpam ? 3 : 0.5}
              opacity={!isSpam ? 0.7 : 0.1}
            />
            <line
              x1="150"
              y1="72"
              x2="210"
              y2="110"
              stroke="#10b981"
              strokeWidth={!isSpam ? 2.5 : 0.5}
              opacity={!isSpam ? 0.6 : 0.1}
            />
            <circle cx="80" cy="30" r="7" fill="#ef4444" />
            <circle cx="220" cy="40" r="9" fill="#ef4444" />
            <circle cx="90" cy="115" r="11" fill="#10b981" />
            <circle cx="210" cy="110" r="8" fill="#10b981" />
            <circle
              cx="150"
              cy="72"
              r="13"
              fill="white"
              stroke="#4f5fd4"
              strokeWidth="2.5"
            />
            <circle cx="150" cy="72" r="4" fill="#4f5fd4" />
          </svg>
        </div>
      </div>

      {/* Email body */}
      <div
        style={{
          padding: 10,
          background: "var(--lav-ghost)",
          borderRadius: 8,
          fontSize: "0.8rem",
          fontStyle: "italic",
          color: "var(--app-text)",
          lineHeight: 1.5,
        }}
      >
        "{result.text}"
      </div>
    </DetailCard>
  );
}

function BatchDetail({ result }) {
  const spamCount = result.results.filter((r) => r.label === "spam").length;
  const hamCount = result.results.filter((r) => r.label === "ham").length;

  return (
    <DetailCard>
      <div
        style={{
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px solid var(--app-border)",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--app-text-muted)",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Detail Batch
        </div>
        <div
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "var(--app-text)",
            wordBreak: "break-all",
          }}
        >
          {result.filename}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <SummaryRow
          label="Total Diuji"
          value={result.results.length}
          color="#4f5fd4"
        />
        <SummaryRow label="Spam" value={spamCount} color="#ef4444" />
        <SummaryRow label="Ham" value={hamCount} color="#10b981" />
      </div>

      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--app-text-muted)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Daftar Hasil
      </div>
      <div
        style={{
          maxHeight: 280,
          overflowY: "auto",
          border: "1px solid var(--app-border)",
          borderRadius: 8,
          padding: 6,
          background: "var(--lav-ghost)",
        }}
      >
        {result.results.map((r, i) => (
          <div
            key={r.id || i}
            style={{
              padding: 8,
              marginBottom: 4,
              background: "white",
              borderRadius: 6,
              border: "1px solid var(--app-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Pill
                bg={r.label === "spam" ? "#fef2f2" : "#ecfdf5"}
                color={r.label === "spam" ? "#991b1b" : "#065f46"}
              >
                {r.label}
              </Pill>
              <span
                style={{ fontSize: "0.7rem", color: "var(--app-text-muted)" }}
              >
                {(r.conf * 100).toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--app-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {r.text}
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}

function EmptyDetail() {
  return (
    <div
      style={{
        padding: 40,
        borderRadius: 14,
        background: "var(--app-surface)",
        border: "1px dashed var(--app-border)",
        textAlign: "center",
      }}
    >
      <Mail
        size={36}
        color="var(--app-text-muted)"
        style={{ opacity: 0.4, marginBottom: 10 }}
      />
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--app-text-muted)",
          maxWidth: 240,
          margin: "0 auto",
        }}
      >
        Pilih hasil dari tabel atau lakukan uji manual/batch untuk melihat
        detail.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════

function Banner({ type, model }) {
  if (type === "loading") {
    return (
      <div style={bannerStyle}>
        <Activity
          size={16}
          color="#4f5fd4"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span style={{ fontSize: "0.82rem", color: "var(--app-text-muted)" }}>
          Memeriksa model aktif...
        </span>
      </div>
    );
  }
  if (type === "empty") {
    return (
      <div
        style={{
          ...bannerStyle,
          borderLeft: "3px solid #f59e0b",
          background: "#fffbeb",
        }}
      >
        <ShieldAlert size={20} color="#92400e" />
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            Tidak Ada Model Aktif
          </div>
          <div style={{ fontSize: "0.72rem", color: "#92400e" }}>
            Latih model baru atau aktifkan model di halaman Riwayat Model.
          </div>
        </div>
      </div>
    );
  }
  // active
  return (
    <div
      style={{
        ...bannerStyle,
        borderLeft: "3px solid #10b981",
        background: "#ecfdf5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#10b981",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            Model Aktif
          </div>
          <div style={{ fontSize: "0.72rem", color: "#065f46" }}>
            {model?.model_name}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: "0.72rem" }}>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "#065f46",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Akurasi
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>
            {(model?.accuracy * 100).toFixed(2)}%
          </div>
        </div>
        <div style={{ width: 1, background: "#a7f3d0" }} />
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: "#065f46",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            F1-Score
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>
            {(model?.f1_score * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, right, children, bodyPadding = 18 }) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: right ? "1px solid var(--app-border)" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--lav-ghost)",
        }}
      >
        <h3
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            margin: 0,
            color: "var(--app-text)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {icon} {title}
        </h3>
        {right}
      </div>
      <div style={{ padding: bodyPadding }}>{children}</div>
    </div>
  );
}

function DetailCard({ children }) {
  return (
    <div
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function ColumnSelect({ label, value, onChange, options, required }) {
  return (
    <div>
      <label
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "var(--app-text-muted)",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label} {required && <span style={{ color: "#f59e0b" }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">-- Pilih kolom --</option>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function Pill({ children, bg, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color: color,
        fontSize: "0.7rem",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 10px",
        background: "white",
        borderRadius: 6,
        fontSize: "0.78rem",
        border: "1px solid var(--app-border)",
      }}
    >
      <span style={{ color: "var(--app-text-muted)" }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

// ── Styles ──────────────────────────
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

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--primary-light)",
  fontSize: "0.82rem",
  outline: "none",
  background: "white",
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "white",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#4f5fd4",
  cursor: "pointer",
  outline: "none",
};

const btnPrimary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
  color: "white",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
};

const btnOutline = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "white",
  color: "var(--app-text)",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
};

const bannerStyle = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  display: "flex",
  alignItems: "center",
  gap: 10,
};
