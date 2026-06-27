// Dashboard.jsx
import { useState, useEffect } from "react";
import {
  Database,
  Layers,
  FlaskConical,
  Cpu,
  ChevronRight,
  Calendar,
  Users
} from "lucide-react";
import { modelAPI, usersAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import UserChatDashboard from "./UserChatDashboard";

export default function Dashboard({ user }) {
  const [dbStats, setDbStats] = useState({ totalDataset: 0, totalModel: 0, totalAkun: 0 });
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [dRes, hRes, aRes, uRes] = await Promise.all([
          modelAPI.listDatasets().catch(() => ({ data: [] })),
          modelAPI.getHistory().catch(() => ({ data: [] })),
          modelAPI.getActiveModel().catch(() => ({ data: null })),
          usersAPI.list().catch(() => ({ data: [] })),
        ]);
        const datasets = dRes.data || [];
        const history = hRes.data || [];
        const usersList = uRes.data || [];
        setDbStats({
          totalDataset: datasets.length,
          totalModel: history.length,
          totalAkun: usersList.length,
        });
        setDatasets(datasets);
        setModels(history.slice(0, 4));
        if (aRes?.data?.id) setActiveId(aRes.data.id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (n) => (loading ? "—" : (n || 0).toLocaleString());
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (user?.role !== "admin") {
    return <UserChatDashboard user={user} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ═══ GREETING ═══ */}
      <div
        style={{
          padding: "24px 28px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #1b2459, #4f5fd4)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Halo, {user?.name?.split(" ")[0] || "Admin"} 👋
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              opacity: 0.85,
              margin: 0,
            }}
          >
            SpamGuard · IndoBERT + GAT — Sistem deteksi spam aktif
          </p>
        </div>
        <button
          onClick={() => navigate("/data-collection")}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            background: "white",
            color: "#1b2459",
            border: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Kelola Dataset →
        </button>
      </div>

      {/* ═══ STATS (3 card sejajar) ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {[
          {
            label: "Total Dataset",
            value: dbStats.totalDataset,
            icon: <Database size={18} />,
          },
          {
            label: "Total Model",
            value: dbStats.totalModel,
            icon: <Layers size={18} />,
          },
          {
            label: "Total Akun",
            value: dbStats.totalAkun,
            icon: <Users size={18} />,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: 18,
              borderRadius: 14,
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--lav-ghost)",
                color: "#4f5fd4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--app-text-muted)",
                  marginBottom: 2,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--app-text)",
                }}
              >
                {fmt(s.value)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ MODEL TERBARU ═══ */}
      <div>
        <Header
          title="Model Terbaru"
          onSeeAll={() => navigate("/model-history")}
        />
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: 110,
                  borderRadius: 14,
                  background: "var(--lav-ghost)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : models.length === 0 ? (
          <Empty msg="Belum ada model" />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {models.map((m) => {
              const acc = m.accuracy || 0;
              const isActive = m.id === activeId;
              const ds = datasets.find((d) => d.id === m.dataset_id);
              return (
                <div
                  key={m.id}
                  onClick={() => navigate("/model-history")}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: "var(--app-surface)",
                    border: `1px solid ${isActive ? "#10b981" : "var(--app-border)"}`,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Cpu size={18} color="#4f5fd4" />
                    {isActive && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#ecfdf5",
                          color: "#065f46",
                        }}
                      >
                        Aktif
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--app-text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 2,
                    }}
                    title={m.model_name}
                  >
                    {m.model_name || `Model #${m.id}`}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--app-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 12,
                    }}
                    title={ds?.name}
                  >
                    {ds?.name || `Dataset #${m.dataset_id}`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ color: "var(--app-text-muted)" }}>
                      Akurasi
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: acc >= 0.85 ? "#10b981" : "#4f5fd4",
                      }}
                    >
                      {(acc * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ DATASET ═══ */}
      <div>
        <Header title="Dataset" onSeeAll={() => navigate("/data-collection")} />
        <div
          style={{
            borderRadius: 14,
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--lav-ghost)" }}>
                <th style={th}>Nama Dataset</th>
                <th style={{ ...th, textAlign: "center", width: 100 }}>Spam</th>
                <th style={{ ...th, textAlign: "center", width: 100 }}>Ham</th>
                <th style={{ ...th, textAlign: "right", width: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 30,
                      textAlign: "center",
                      color: "var(--app-text-muted)",
                    }}
                  >
                    Memuat...
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 30,
                      textAlign: "center",
                      color: "var(--app-text-muted)",
                    }}
                  >
                    Belum ada dataset
                  </td>
                </tr>
              ) : (
                datasets.slice(0, 5).map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderTop: "1px solid var(--app-border)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--app-bg)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td style={td}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Database size={15} color="#4f5fd4" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {d.name}
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
                            <Calendar size={10} />
                            {fmtDate(d.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={pill("#fce7f3", "#ec4899")}>
                        {d.spam_count?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={pill("#e8eaff", "#4f5fd4")}>
                        {d.ham_count?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {d.total_rows?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers (di bawah, ringkas) ─────────────────
const th = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const td = {
  padding: "12px 16px",
  fontSize: "0.85rem",
  color: "var(--app-text)",
};
const pill = (bg, color) => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 700,
  background: bg,
  color: color,
  minWidth: 50,
});

function Header({ title, onSeeAll }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--app-text)",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <button
        onClick={onSeeAll}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          background: "none",
          border: "none",
          color: "#4f5fd4",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        See all <ChevronRight size={14} />
      </button>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        color: "var(--app-text-muted)",
        background: "var(--app-surface)",
        border: "1px dashed var(--app-border)",
        borderRadius: 14,
        fontSize: "0.85rem",
      }}
    >
      {msg}
    </div>
  );
}
