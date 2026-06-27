// UserRiwayat.jsx — Halaman Riwayat Deteksi untuk User Biasa
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Calendar,
  Mail,
  Trash2,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  BarChart2,
  X,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { emailAPI } from "../services/api";
import Pagination from "../components/Pagination";

const SPAM_COLOR = "#ec4899";
const HAM_COLOR = "#4f5fd4";

// Helper: ambil user dari localStorage
function getCurrentUser() {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function UserRiwayat() {
  const [tab, setTab] = useState("manual"); // 'manual' | 'batch'
  const currentUser = getCurrentUser();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--app-text)" }}>
          Riwayat Deteksi Saya
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--app-text-muted)", margin: 0 }}>
          Semua email yang pernah Anda periksa sebelumnya.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--app-border)", paddingBottom: 0 }}>
        {[
          { key: "manual", label: "✉️ Email Manual", icon: <Mail size={14} /> },
          { key: "batch", label: "📁 Upload Batch", icon: <FileText size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: "10px 10px 0 0",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #4f5fd4" : "2px solid transparent",
              background: tab === t.key ? "var(--app-surface)" : "transparent",
              color: tab === t.key ? "#4f5fd4" : "var(--app-text-muted)",
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Konten berdasarkan tab */}
      {tab === "manual" ? (
        <ManualTab userId={currentUser?.id} />
      ) : (
        <BatchTab userId={currentUser?.id} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB: Email Manual
// ════════════════════════════════════════════════════
function ManualTab({ userId }) {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const perPage = 12;

  const fetchHistory = async (p = page, s = search) => {
    setLoading(true);
    try {
      const params = { skip: (p - 1) * perPage, limit: perPage };
      if (s.trim()) params.search = s.trim();
      if (userId) params.user_id = userId;
      // Hanya email manual (tanpa batch_id)
      params.no_batch = true;
      const { data } = await emailAPI.getClassifyHistory(params);
      setHistory(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(page, search); }, [page, search]);
  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Hapus riwayat ini?")) return;
    try {
      await emailAPI.deleteClassifyItem(id);
      if (selected?.id === id) setSelected(null);
      await fetchHistory(page, search);
    } catch { alert("Gagal menghapus."); }
  };

  const totalPages = Math.ceil(total / perPage);
  const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
      {/* Daftar */}
      <div>
        {/* Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--app-text-muted)" }} />
            <input
              type="text"
              placeholder="Cari email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, borderRadius: 999, border: "1.5px solid var(--app-border)", padding: "8px 14px 8px 34px", fontSize: "0.82rem", width: "100%", background: "var(--app-surface)", color: "var(--app-text)", outline: "none" }}
            />
          </div>
          <button onClick={() => fetchHistory(page, search)} title="Refresh" style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid var(--app-border)", background: "var(--app-surface)", cursor: "pointer", color: "var(--app-text-muted)", display: "flex", alignItems: "center" }}>
            <RefreshCw size={15} />
          </button>
        </div>

        <div style={{ borderRadius: 14, background: "var(--app-surface)", border: "1px solid var(--app-border)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.85rem" }}>Memuat...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <Mail size={36} color="var(--app-text-muted)" style={{ margin: "0 auto 12px" }} />
              <div style={{ color: "var(--app-text-muted)", fontSize: "0.85rem" }}>
                {search ? "Tidak ada hasil yang cocok." : "Belum ada riwayat deteksi manual."}
              </div>
            </div>
          ) : (
            history.map((item, i) => {
              const isSpam = item.label === "spam";
              const isActive = selected?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={{ padding: "14px 16px", borderTop: i > 0 ? "1px solid var(--app-border)" : "none", cursor: "pointer", background: isActive ? "var(--lav-light)" : "transparent", display: "flex", alignItems: "center", gap: 12 }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--lav-ghost)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "var(--lav-light)" : "transparent"; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: isSpam ? "#fef2f2" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSpam ? <ShieldAlert size={16} color="#991b1b" /> : <ShieldCheck size={16} color="#065f46" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--app-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.subject || item.body?.slice(0, 50) || "(Tanpa subjek)"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--app-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body?.slice(0, 70) || "—"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: "0.68rem", color: "var(--app-text-muted)" }}>
                      <Calendar size={10} />{fmtDate(item.created_at)}
                      <span style={{ marginLeft: 4, padding: "1px 8px", borderRadius: 999, background: isSpam ? "#fce7f3" : "#ecfdf5", color: isSpam ? "#db2777" : "#065f46", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase" }}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    title="Hapus Riwayat Ini"
                    style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", cursor: "pointer", color: "#f87171", padding: 6, borderRadius: 6, flexShrink: 0, opacity: 0.8, display: "flex", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
          {totalPages > 1 && (
            <div style={{ padding: 12, borderTop: "1px solid var(--app-border)", display: "flex", justifyContent: "center" }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>

      {/* Panel Detail */}
      <div style={{ position: "sticky", top: 16 }}>
        {selected ? <DetailPanel item={selected} /> : (
          <div style={{ padding: 32, borderRadius: 14, background: "var(--app-surface)", border: "1px dashed var(--app-border)", textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.82rem" }}>
            Klik salah satu riwayat untuk melihat detailnya.
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// TAB: Upload Batch (Terkelompok)
// ════════════════════════════════════════════════════
function BatchTab({ userId }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [batchEmails, setBatchEmails] = useState({});
  const [batchEmailLoading, setBatchEmailLoading] = useState({});
  const [showChart, setShowChart] = useState({});

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (userId) params.user_id = userId;
      const { data } = await emailAPI.getBatchHistory(params);
      setBatches(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const toggleBatch = async (batchId) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batchId);
    if (!batchEmails[batchId]) {
      setBatchEmailLoading((prev) => ({ ...prev, [batchId]: true }));
      try {
        const params = { batch_id: batchId, limit: 200, skip: 0 };
        const { data } = await emailAPI.getClassifyHistory(params);
        setBatchEmails((prev) => ({ ...prev, [batchId]: data.items || [] }));
      } catch (e) {
        console.error(e);
      } finally {
        setBatchEmailLoading((prev) => ({ ...prev, [batchId]: false }));
      }
    }
  };

  const handleDeleteBatch = async (e, batchId) => {
    e.stopPropagation();
    if (!window.confirm("Hapus seluruh riwayat upload batch ini dari database?")) return;
    try {
      await emailAPI.deleteBatchHistory(batchId);
      if (expandedBatchId === batchId) setExpandedBatchId(null);
      await fetchBatches();
    } catch {
      alert("Gagal menghapus batch.");
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={fetchBatches} style={{ padding: "7px 12px", borderRadius: 10, border: "1.5px solid var(--app-border)", background: "var(--app-surface)", cursor: "pointer", color: "var(--app-text-muted)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.85rem" }}>Memuat...</div>
      ) : batches.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", borderRadius: 14, background: "var(--app-surface)", border: "1px dashed var(--app-border)" }}>
          <FileText size={36} color="var(--app-text-muted)" style={{ margin: "0 auto 12px" }} />
          <div style={{ color: "var(--app-text-muted)", fontSize: "0.85rem" }}>Belum ada riwayat upload batch.</div>
        </div>
      ) : (
        batches.map((batch) => {
          const isExpanded = expandedBatchId === batch.batch_id;
          const isChartVisible = showChart[batch.batch_id];
          const emails = batchEmails[batch.batch_id] || [];
          const isLoadingEmails = batchEmailLoading[batch.batch_id];
          const pieData = [
            { name: "Spam", value: batch.spam_count },
            { name: "Aman", value: batch.ham_count },
          ];

          return (
            <div key={batch.batch_id} style={{ borderRadius: 14, background: "var(--app-surface)", border: "1px solid var(--app-border)", overflow: "hidden" }}>
              {/* Header batch */}
              <div
                onClick={() => toggleBatch(batch.batch_id)}
                style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--lav-ghost)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--lav-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={18} color="#4f5fd4" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--app-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📁 {batch.batch_name || "File Batch"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--app-text-muted)", marginTop: 2 }}>
                    {fmtDate(batch.created_at)} · Total: <strong>{batch.total}</strong> email ·
                    <span style={{ color: SPAM_COLOR, fontWeight: 700 }}> {batch.spam_count} Spam</span> ·
                    <span style={{ color: HAM_COLOR, fontWeight: 700 }}> {batch.ham_count} Aman</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteBatch(e, batch.batch_id)}
                  title="Hapus Seluruh Batch"
                  style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", cursor: "pointer", color: "#f87171", padding: 6, borderRadius: 6, flexShrink: 0, opacity: 0.8, display: "flex", alignItems: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
                >
                  <Trash2 size={16} />
                </button>

                {isExpanded ? <ChevronDown size={16} color="var(--app-text-muted)" /> : <ChevronRight size={16} color="var(--app-text-muted)" />}
              </div>

              {/* Konten yang diperluas */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--app-border)" }}>
                  {/* Tombol tampilkan grafik */}
                  <div style={{ padding: "10px 18px", display: "flex", gap: 8, borderBottom: "1px solid var(--app-border)", background: "var(--lav-ghost)" }}>
                    <button
                      onClick={() => setShowChart((prev) => ({ ...prev, [batch.batch_id]: !prev[batch.batch_id] }))}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 999, background: isChartVisible ? "#4f5fd4" : "var(--app-surface)", border: "1.5px solid var(--app-border)", color: isChartVisible ? "white" : "#4f5fd4", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      <BarChart2 size={13} /> {isChartVisible ? "Sembunyikan Grafik" : "Tampilkan Grafik"}
                    </button>
                  </div>

                  {/* Grafik pie */}
                  {isChartVisible && (
                    <div style={{ padding: "16px 18px", background: "var(--lav-ghost)", borderBottom: "1px solid var(--app-border)" }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            <Cell fill={SPAM_COLOR} />
                            <Cell fill={HAM_COLOR} />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Daftar email */}
                  {isLoadingEmails ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--app-text-muted)", fontSize: "0.82rem" }}>Memuat detail email...</div>
                  ) : (
                    <div style={{ maxHeight: 360, overflowY: "auto" }}>
                      {emails.map((item, i) => {
                        const isSpam = item.label === "spam";
                        return (
                          <div key={item.id} style={{ padding: "10px 18px", borderTop: i > 0 ? "1px solid var(--app-border)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: isSpam ? "#fef2f2" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isSpam ? <ShieldAlert size={13} color="#991b1b" /> : <ShieldCheck size={13} color="#065f46" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--app-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.subject || item.body?.slice(0, 60) || "(Tanpa subjek)"}
                              </div>
                              {item.sender && (
                                <div style={{ fontSize: "0.68rem", color: "var(--app-text-muted)" }}>Dari: {item.sender}</div>
                              )}
                            </div>
                            <span style={{ padding: "2px 10px", borderRadius: 999, background: isSpam ? "#fce7f3" : "#ecfdf5", color: isSpam ? "#db2777" : "#065f46", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", flexShrink: 0 }}>
                              {item.label}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--app-text-muted)", flexShrink: 0, minWidth: 40, textAlign: "right" }}>
                              {((item.confidence || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// PANEL DETAIL (Manual)
// ════════════════════════════════════════════════════
function DetailPanel({ item }) {
  const isSpam = item.label === "spam";
  const conf = item.confidence ?? 0;

  return (
    <div style={{ borderRadius: 14, background: "var(--app-surface)", border: "1px solid var(--app-border)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", background: isSpam ? "#fef2f2" : "#ecfdf5", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--app-border)" }}>
        {isSpam ? <ShieldAlert size={20} color="#991b1b" /> : <ShieldCheck size={20} color="#065f46" />}
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: isSpam ? "#991b1b" : "#065f46" }}>
          {isSpam ? "SPAM" : "AMAN (Non-Spam)"}
        </span>
        <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.85rem", color: isSpam ? "#ec4899" : "#4f5fd4" }}>
          {(conf * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 6, borderRadius: 999, background: "var(--lav-ghost)", overflow: "hidden" }}>
          <div style={{ width: `${conf * 100}%`, height: "100%", background: isSpam ? "linear-gradient(90deg,#f97316,#ec4899)" : "linear-gradient(90deg,#4f5fd4,#10b981)", borderRadius: 999 }} />
        </div>
        {[{ label: "Pengirim", value: item.sender }, { label: "Subjek", value: item.subject }].map(({ label, value }) =>
          value ? (
            <div key={label}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--app-text-muted)", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--app-text)" }}>{value}</div>
            </div>
          ) : null
        )}
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--app-text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Isi Email</div>
          <div style={{ fontSize: "0.82rem", color: "var(--app-text)", background: "var(--lav-ghost)", borderRadius: 10, padding: "10px 12px", lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>
            {item.body || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
