// components/DeleteConfirmModal.jsx
import { AlertTriangle, X, Trash2 } from "lucide-react";

export default function DeleteConfirmModal({
  item,
  datasetName,
  isActive,
  onConfirm,
  onClose,
  loading,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 20,
        animation: "fadeIn .15s ease",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 0,
          animation: "slideUp .2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--gray-100)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={18} color="#dc2626" />
            </div>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>
              Hapus Riwayat Model?
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              border: "none",
              background: "transparent",
              cursor: loading ? "not-allowed" : "pointer",
              padding: 4,
              opacity: loading ? 0.4 : 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: "var(--gray-500)",
              lineHeight: 1.5,
            }}
          >
            Tindakan ini tidak dapat dibatalkan. Riwayat pelatihan model berikut
            akan dihapus permanen dari sistem.
          </p>

          {/* Item preview */}
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "var(--gray-50)",
              borderRadius: 8,
              border: "1px solid var(--gray-100)",
            }}
          >
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {datasetName}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--gray-400)",
              }}
            >
              {item.model_name || "—"} · Akurasi{" "}
              {(item.accuracy * 100).toFixed(2)}% ·{" "}
              {item.total_data?.toLocaleString() || 0} email
            </div>
          </div>

          {/* Active warning */}
          {isActive && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                fontSize: "0.78rem",
                color: "#92400e",
                display: "flex",
                gap: 8,
              }}
            >
              <AlertTriangle
                size={14}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>
                Model ini sedang <b>Aktif</b>. Setelah dihapus, sistem tidak
                memiliki model aktif sampai model lain diaktifkan.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--gray-100)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            background: "var(--gray-50)",
            borderRadius: "0 0 12px 12px",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              border: "none",
              background: loading ? "#fca5a5" : "#dc2626",
              color: "white",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? (
              <>Menghapus...</>
            ) : (
              <>
                <Trash2 size={13} /> Ya, Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
