// UserChatDashboard.jsx — Tampilan Chat AI untuk User Biasa
import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  Settings2,
  X,
  BarChart2,
  Download,
  RefreshCw,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";
import { emailAPI } from "../services/api";

// ── Warna ──────────────────────────────────────────────
const SPAM_COLOR = "#ec4899";
const HAM_COLOR = "#4f5fd4";

// ── Tipe pesan dalam obrolan ───────────────────────────
// { id, role: 'user'|'ai', type: 'text'|'file'|'result'|'batch_result', content, result, batchResult, showDetail }

export default function UserChatDashboard({ user }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("chat_messages");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [body, setBody] = useState(() => sessionStorage.getItem("chat_body") || "");
  const [subject, setSubject] = useState(() => sessionStorage.getItem("chat_subject") || "");
  const [sender, setSender] = useState(() => sessionStorage.getItem("chat_sender") || "");
  const [showOptions, setShowOptions] = useState(() => sessionStorage.getItem("chat_showOptions") === "true");
  const [loading, setLoading] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(() => sessionStorage.getItem("chat_isBatchMode") === "true");

  // Batch
  const [batchFile, setBatchFile] = useState(null);
  const [batchColumns, setBatchColumns] = useState([]);
  const [batchMetrics, setBatchMetrics] = useState(null);
  const [colText, setColText] = useState("");
  const [colSubject, setColSubject] = useState("");
  const [colSender, setColSender] = useState("");
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchStep, setBatchStep] = useState("idle"); // idle | preview | ready

  const fileRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll ke bawah saat pesan baru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist state ke sessionStorage
  useEffect(() => {
    sessionStorage.setItem("chat_messages", JSON.stringify(messages));
  }, [messages]);
  useEffect(() => { sessionStorage.setItem("chat_body", body); }, [body]);
  useEffect(() => { sessionStorage.setItem("chat_subject", subject); }, [subject]);
  useEffect(() => { sessionStorage.setItem("chat_sender", sender); }, [sender]);
  useEffect(() => { sessionStorage.setItem("chat_showOptions", showOptions); }, [showOptions]);
  useEffect(() => { sessionStorage.setItem("chat_isBatchMode", isBatchMode); }, [isBatchMode]);

  // ── Toggle detail grafik pada pesan tertentu ─────────
  const toggleDetail = (msgId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, showDetail: !m.showDetail } : m))
    );
  };

  // ── Reset ke chat baru (untuk batch) ─────────────────
  const startNewChat = () => {
    setMessages([]);
    setBody("");
    setSubject("");
    setSender("");
    setShowOptions(false);
    setBatchFile(null);
    setBatchColumns([]);
    setBatchMetrics(null);
    setColText("");
    setColSubject("");
    setColSender("");
    setBatchStep("idle");
    setIsBatchMode(false);
    
    // Clear session storage
    sessionStorage.removeItem("chat_messages");
    sessionStorage.removeItem("chat_body");
    sessionStorage.removeItem("chat_subject");
    sessionStorage.removeItem("chat_sender");
    sessionStorage.removeItem("chat_showOptions");
    sessionStorage.removeItem("chat_isBatchMode");
  };

  // ── Kirim manual ─────────────────────────────────────
  const handleSend = async () => {
    if (!body.trim() || loading) return;
    const userMsg = {
      id: Date.now(),
      role: "user",
      type: "text",
      content: body.trim(),
      subject: subject.trim() || null,
      sender: sender.trim() || null,
    };
    setMessages((prev) => [...prev, userMsg]);
    setBody("");
    setSubject("");
    setSender("");
    setShowOptions(false);
    setLoading(true);

    // Pesan "AI sedang berpikir"
    const thinkId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: thinkId, role: "ai", type: "thinking" },
    ]);

    try {
      const payload = { body: userMsg.content };
      if (userMsg.subject) payload.subject = userMsg.subject;
      if (userMsg.sender) payload.sender = userMsg.sender;
      if (user?.id) payload.user_id = user.id;
      const { data } = await emailAPI.classify(payload);
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({
            id: Date.now() + 2,
            role: "ai",
            type: "result",
            result: data,
            showDetail: false,
          })
      );
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkId)
          .concat({
            id: Date.now() + 2,
            role: "ai",
            type: "error",
            content: "Maaf, terjadi kesalahan. Pastikan backend aktif dan model sudah dilatih.",
          })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Pilih file ─────────────────────────────────────────
  const handleFilePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Bersihkan chat sebelumnya lalu masuk mode batch
    startNewChat();
    setIsBatchMode(true);
    setBatchFile(f);
    setBatchStep("preview");
    setColumnsLoading(true);
    // Tampilkan pesan user
    setMessages([
      {
        id: Date.now(),
        role: "user",
        type: "file",
        content: f.name,
      },
      { id: Date.now() + 1, role: "ai", type: "thinking" },
    ]);
    try {
      const { data } = await emailAPI.previewColumns(f);
      setBatchColumns(data.columns);
      setBatchMetrics(data.metrics);
      const find = (...names) =>
        data.columns.find((c) => names.includes(c)) || "";
      setColText(find("text_id", "text", "body"));
      setColSubject(find("subject_id", "subject"));
      setColSender(find("sender"));
      setBatchStep("ready");
      setMessages((prev) =>
        prev
          .filter((m) => m.type !== "thinking")
          .concat({
            id: Date.now() + 2,
            role: "ai",
            type: "batch_preview",
            metrics: data.metrics,
            columns: data.columns,
            fileName: f.name,
          })
      );
    } catch (err) {
      setMessages((prev) =>
        prev
          .filter((m) => m.type !== "thinking")
          .concat({
            id: Date.now() + 2,
            role: "ai",
            type: "error",
            content: err.response?.data?.detail || "Gagal membaca file.",
          })
      );
      setBatchFile(null);
      setIsBatchMode(false);
    } finally {
      setColumnsLoading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  // ── Jalankan batch ────────────────────────────────────
  const handleRunBatch = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    // Hapus pesan batch_preview, tambah thinking
    setMessages((prev) =>
      prev.concat({ id: Date.now(), role: "ai", type: "thinking" })
    );
    try {
      const fd = new FormData();
      fd.append("file", batchFile);
      fd.append("text_column", colText);
      fd.append("subject_column", colSubject);
      fd.append("sender_column", colSender);
      if (user?.id) fd.append("user_id", user.id);
      const { data } = await emailAPI.classifyBatch(fd);

      const results = data.results || [];
      const spamCount = results.filter((r) => r.label === "spam").length;
      const hamCount = results.filter((r) => r.label !== "spam").length;

      setMessages((prev) =>
        prev
          .filter((m) => m.type !== "thinking")
          .concat({
            id: Date.now() + 1,
            role: "ai",
            type: "batch_result",
            total: results.length,
            spamCount,
            hamCount,
            results,
            showDetail: false,
            fileName: batchFile.name,
            batchFile,
            rawData: { colText, colSubject, colSender },
          })
      );
      setBatchFile(null);
      setBatchStep("done");
    } catch (err) {
      setMessages((prev) =>
        prev
          .filter((m) => m.type !== "thinking")
          .concat({
            id: Date.now() + 1,
            role: "ai",
            type: "error",
            content: err.response?.data?.detail || "Gagal memproses file.",
          })
      );
    } finally {
      setBatchLoading(false);
    }
  };

  // ── Download hasil batch sebagai CSV ─────────────────
  const downloadBatchCSV = (results, fileName) => {
    const header = "id,label,confidence\n";
    const rows = results
      .map((r) => `${r.id},${r.label},${(r.confidence * 100).toFixed(2)}%`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasil_${fileName || "batch"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="page-container page-user-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 72px)",
        position: "relative",
      }}
    >
      {/* ── HEADER BAR ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 16,
          borderBottom: "1px solid var(--app-border)",
          marginBottom: 4,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--app-text)",
            }}
          >
            <Sparkles
              size={16}
              color="#4f5fd4"
              style={{ marginRight: 6, verticalAlign: "middle" }}
            />
            SpamGuard AI
          </h1>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--app-text-muted)",
              margin: 0,
            }}
          >
            Halo, {user?.name?.split(" ")[0] || "User"}! Tempelkan teks email atau upload file untuk mulai deteksi.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNewChat}
            title="Mulai obrolan baru"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 999,
              border: "1.5px solid var(--app-border)",
              background: "var(--app-surface)",
              color: "var(--app-text-muted)",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} /> Baru
          </button>
        )}
      </div>

      {/* ── AREA CHAT (Scrollable) ──────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {isEmpty && <WelcomeScreen />}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onToggleDetail={toggleDetail}
            onRunBatch={handleRunBatch}
            onDownload={downloadBatchCSV}
            batchLoading={batchLoading}
            colText={colText}
            colSubject={colSubject}
            colSender={colSender}
            setColText={setColText}
            setColSubject={setColSubject}
            setColSender={setColSender}
            batchColumns={batchColumns}
            batchStep={batchStep}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT AREA (Fixed di bawah) ─────────────────── */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: 12,
          borderTop: "1px solid var(--app-border)",
        }}
      >
        {/* Opsi tambahan Subjek & Pengirim */}
        {showOptions && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <input
              type="text"
              placeholder="Pengirim (opsional)"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              style={inputSmall}
            />
            <input
              type="text"
              placeholder="Subjek Email (opsional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputSmall}
            />
          </div>
        )}

        {/* Kotak input utama */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            background: "var(--app-surface)",
            border: "1.5px solid var(--app-border)",
            borderRadius: 16,
            padding: "10px 12px",
            boxShadow: "0 2px 12px rgba(79,95,212,0.07)",
          }}
        >
          {/* Tombol Upload File */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFilePick}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file batch (CSV/Excel)"
            disabled={loading || batchLoading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--app-text-muted)",
              padding: "4px 4px 2px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>

          {/* Textarea isi email */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Masukkan isi email yang ingin dicek…"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={loading || isBatchMode}
            style={{
              flex: 1,
              resize: "none",
              border: "none !important",
              outline: "none",
              background: "transparent",
              fontSize: "0.875rem",
              color: "var(--app-text)",
              lineHeight: 1.5,
              padding: "2px 0",
              width: "100%",
              minHeight: 24,
              maxHeight: 140,
              fontFamily: "Inter, sans-serif",
            }}
          />

          {/* Tombol opsi */}
          <button
            onClick={() => setShowOptions((v) => !v)}
            title="Tambah subjek & pengirim"
            disabled={loading || isBatchMode}
            style={{
              background: showOptions ? "var(--lav-light)" : "none",
              border: "none",
              cursor: "pointer",
              color: showOptions ? "#4f5fd4" : "var(--app-text-muted)",
              padding: "4px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Settings2 size={16} />
          </button>

          {/* Tombol Kirim */}
          <button
            onClick={handleSend}
            disabled={!body.trim() || loading || isBatchMode}
            style={{
              background:
                body.trim() && !loading && !isBatchMode
                  ? "linear-gradient(135deg, #1b2459, #4f5fd4)"
                  : "var(--lav-ghost)",
              border: "none",
              borderRadius: 10,
              padding: "7px 10px",
              cursor:
                body.trim() && !loading && !isBatchMode
                  ? "pointer"
                  : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <Activity
                size={16}
                color="#4f5fd4"
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Send
                size={16}
                color={body.trim() && !isBatchMode ? "white" : "#7b84c0"}
              />
            )}
          </button>
        </div>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--app-text-muted)",
            textAlign: "center",
            marginTop: 6,
          }}
        >
          Tekan <kbd style={{ background: "var(--lav-ghost)", padding: "1px 5px", borderRadius: 4, fontSize: "0.68rem" }}>Enter</kbd> untuk kirim · <kbd style={{ background: "var(--lav-ghost)", padding: "1px 5px", borderRadius: 4, fontSize: "0.68rem" }}>Shift+Enter</kbd> untuk baris baru · 📎 untuk upload file batch
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAMPILAN SELAMAT DATANG (layar kosong)
// ════════════════════════════════════════════════════════
function WelcomeScreen() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "60px 20px",
        textAlign: "center",
        animation: "fadeIn 0.4s ease",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(79,95,212,0.25)",
        }}
      >
        <Sparkles size={28} color="white" />
      </div>
      <div>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "var(--app-text)",
            margin: "0 0 8px",
          }}
        >
          Apa yang ingin Anda periksa?
        </h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--app-text-muted)",
            maxWidth: 420,
            lineHeight: 1.6,
          }}
        >
          Tempelkan isi email di kotak di bawah, atau klik ikon 📎 untuk mengupload file batch (CSV/Excel) berisi banyak email sekaligus.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          "Cek email promo yang mencurigakan",
          "Upload file dataset email",
          "Periksa email dari pengirim asing",
        ].map((hint) => (
          <span
            key={hint}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1.5px solid var(--app-border)",
              background: "var(--app-surface)",
              fontSize: "0.78rem",
              color: "var(--app-text-muted)",
              fontWeight: 500,
            }}
          >
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// KOMPONEN SETIAP PESAN
// ════════════════════════════════════════════════════════
function MessageBubble({
  msg,
  onToggleDetail,
  onRunBatch,
  onDownload,
  batchLoading,
  colText, colSubject, colSender,
  setColText, setColSubject, setColSender,
  batchColumns,
  batchStep,
}) {
  const isUser = msg.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "slideIn 0.25s ease",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      {/* Avatar AI */}
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Sparkles size={14} color="white" />
        </div>
      )}

      <div style={{ maxWidth: "75%", minWidth: 0 }}>
        {/* === Pesan User === */}
        {isUser && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "16px 16px 4px 16px",
              background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
              color: "white",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {msg.type === "file" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                📎 <strong>{msg.content}</strong>
              </span>
            ) : (
              <div>
                {msg.subject && (
                  <div style={{ fontSize: "0.72rem", opacity: 0.75, marginBottom: 2 }}>
                    Subjek: {msg.subject}
                  </div>
                )}
                {msg.sender && (
                  <div style={{ fontSize: "0.72rem", opacity: 0.75, marginBottom: 4 }}>
                    Dari: {msg.sender}
                  </div>
                )}
                <div>{msg.content}</div>
              </div>
            )}
          </div>
        )}

        {/* === AI: Sedang berpikir === */}
        {!isUser && msg.type === "thinking" && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "16px 16px 16px 4px",
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4f5fd4",
                  animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}

        {/* === AI: Error === */}
        {!isUser && msg.type === "error" && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            ⚠️ {msg.content}
          </div>
        )}

        {/* === AI: Hasil Manual === */}
        {!isUser && msg.type === "result" && (
          <ResultBubble msg={msg} onToggleDetail={onToggleDetail} />
        )}

        {/* === AI: Preview Batch === */}
        {!isUser && msg.type === "batch_preview" && (
          <BatchPreviewBubble
            msg={msg}
            onRunBatch={onRunBatch}
            batchLoading={batchLoading}
            colText={colText}
            colSubject={colSubject}
            colSender={colSender}
            setColText={setColText}
            setColSubject={setColSubject}
            setColSender={setColSender}
            batchColumns={batchColumns}
            batchStep={batchStep}
          />
        )}

        {/* === AI: Hasil Batch === */}
        {!isUser && msg.type === "batch_result" && (
          <BatchResultBubble
            msg={msg}
            onToggleDetail={onToggleDetail}
            onDownload={onDownload}
          />
        )}
      </div>
    </div>
  );
}

// ── Hasil Klasifikasi Manual ──────────────────────────
function ResultBubble({ msg, onToggleDetail }) {
  const { result, showDetail, id } = msg;
  const isSpam = result?.label === "spam";
  const conf = result?.confidence ?? 0;

  const pieData = [
    { name: "Spam", value: Math.round(conf * 100) },
    { name: "Aman", value: Math.round((1 - conf) * 100) },
  ];
  const radialData = [{ name: "Keyakinan", value: Math.round(conf * 100), fill: isSpam ? SPAM_COLOR : HAM_COLOR }];

  return (
    <div
      style={{
        borderRadius: "16px 16px 16px 4px",
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        overflow: "hidden",
        maxWidth: 420,
      }}
    >
      {/* Baris Utama */}
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: isSpam ? "#fef2f2" : "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSpam ? (
              <ShieldAlert size={18} color="#991b1b" />
            ) : (
              <ShieldCheck size={18} color="#065f46" />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--app-text-muted)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Hasil Deteksi
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: isSpam ? "#991b1b" : "#065f46",
              }}
            >
              {isSpam ? "⚠️ Ini adalah SPAM" : "✅ Email ini AMAN (Non-Spam)"}
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.72rem",
              color: "var(--app-text-muted)",
              marginBottom: 4,
            }}
          >
            <span>Tingkat keyakinan model</span>
            <span style={{ fontWeight: 700, color: isSpam ? SPAM_COLOR : HAM_COLOR }}>
              {(conf * 100).toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "var(--lav-ghost)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${conf * 100}%`,
                height: "100%",
                background: isSpam
                  ? "linear-gradient(90deg,#f97316,#ec4899)"
                  : "linear-gradient(90deg,#4f5fd4,#10b981)",
                borderRadius: 999,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* Tombol Lihat Grafik */}
        <button
          onClick={() => onToggleDetail(id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 12,
            background: "none",
            border: "none",
            color: "#4f5fd4",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <BarChart2 size={14} />
          {showDetail ? "Sembunyikan Grafik" : "Lihat Grafik Analisis"}
          {showDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Detail Grafik (collapse/expand) */}
      {showDetail && (
        <div
          style={{
            padding: "16px 18px",
            borderTop: "1px solid var(--app-border)",
            background: "var(--lav-ghost)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--app-text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
            Distribusi Probabilitas
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <ResponsiveContainer width="50%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={50} dataKey="value" labelLine={false}>
                  <Cell fill={SPAM_COLOR} />
                  <Cell fill={HAM_COLOR} />
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {pieData.map((d, i) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: i === 0 ? SPAM_COLOR : HAM_COLOR, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: "var(--app-text-muted)" }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: "var(--app-text)", marginLeft: "auto" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Preview Batch ──────────────────────────────────────
function BatchPreviewBubble({
  msg, onRunBatch, batchLoading,
  colText, colSubject, colSender,
  setColText, setColSubject, setColSender,
  batchColumns, batchStep,
}) {
  const { metrics, fileName } = msg;
  const ready = colText && colSubject && colSender;

  return (
    <div
      style={{
        borderRadius: "16px 16px 16px 4px",
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        padding: "14px 18px",
        maxWidth: 400,
      }}
    >
      <div style={{ fontSize: "0.85rem", color: "var(--app-text)", lineHeight: 1.6, marginBottom: 12 }}>
        Saya berhasil membaca file <strong>"{fileName}"</strong>. Terdapat{" "}
        <strong>{metrics?.total_rows?.toLocaleString()}</strong> baris data.
        Silakan konfirmasi kolom yang akan digunakan:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <ColSelect label="Kolom Isi Email *" value={colText} onChange={setColText} options={batchColumns} />
        <ColSelect label="Kolom Subjek *" value={colSubject} onChange={setColSubject} options={batchColumns} />
        <ColSelect label="Kolom Pengirim *" value={colSender} onChange={setColSender} options={batchColumns} />
      </div>

      <button
        onClick={onRunBatch}
        disabled={!ready || batchLoading}
        style={{
          width: "100%",
          padding: "9px 0",
          borderRadius: 10,
          border: "none",
          background: ready && !batchLoading
            ? "linear-gradient(135deg, #1b2459, #4f5fd4)"
            : "var(--lav-ghost)",
          color: ready && !batchLoading ? "white" : "var(--app-text-muted)",
          fontWeight: 700,
          fontSize: "0.85rem",
          cursor: ready && !batchLoading ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {batchLoading ? (
          <><Activity size={14} style={{ animation: "spin 1s linear infinite" }} /> Menganalisis...</>
        ) : (
          <><Send size={14} /> Mulai Analisis File</>
        )}
      </button>
    </div>
  );
}

function ColSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--app-text-muted)", display: "block", marginBottom: 3 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1.5px solid var(--app-border)", fontSize: "0.8rem", background: "var(--app-surface)", color: "var(--app-text)" }}
      >
        <option value="">— Pilih kolom —</option>
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

// ── Hasil Batch ────────────────────────────────────────
function BatchResultBubble({ msg, onToggleDetail, onDownload }) {
  const { total, spamCount, hamCount, showDetail, id, fileName, results } = msg;
  const pieData = [
    { name: "Spam", value: spamCount },
    { name: "Aman", value: hamCount },
  ];

  return (
    <div
      style={{
        borderRadius: "16px 16px 16px 4px",
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        overflow: "hidden",
        maxWidth: 420,
      }}
    >
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--app-text)", lineHeight: 1.7, marginBottom: 12 }}>
          ✅ Saya telah selesai menganalisis <strong>{total.toLocaleString()} email</strong> dari file <strong>"{fileName}"</strong>.<br />
          Hasilnya: <span style={{ color: SPAM_COLOR, fontWeight: 700 }}>{spamCount} Spam</span> dan{" "}
          <span style={{ color: HAM_COLOR, fontWeight: 700 }}>{hamCount} Aman (Non-Spam)</span>.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onDownload(results, fileName)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
              borderRadius: 999, background: "var(--lav-light)", border: "none",
              color: "#1b2459", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            <Download size={13} /> Unduh Hasil (.csv)
          </button>
          <button
            onClick={() => onToggleDetail(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
              borderRadius: 999, background: "none",
              border: "1.5px solid var(--app-border)",
              color: "#4f5fd4", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            <BarChart2 size={13} />
            {showDetail ? "Sembunyikan Grafik" : "Lihat Grafik Distribusi"}
          </button>
        </div>
      </div>

      {showDetail && (
        <div
          style={{
            padding: "16px 18px",
            borderTop: "1px solid var(--app-border)",
            background: "var(--lav-ghost)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--app-text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
            Distribusi Hasil Klasifikasi
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill={SPAM_COLOR} />
                <Cell fill={HAM_COLOR} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────
const inputSmall = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1.5px solid var(--app-border)",
  background: "var(--app-surface)",
  fontSize: "0.82rem",
  color: "var(--app-text)",
  outline: "none",
  width: "100%",
};
