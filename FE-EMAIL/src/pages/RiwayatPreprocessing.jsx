import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle, FileText, Database, Loader2, X } from 'lucide-react';
import { modelAPI } from '../services/api';

export default function RiwayatPreprocessingPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await modelAPI.listDatasets();
      setHistory(res.data);
    } catch (err) {
      console.error("Gagal mengambil riwayat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Hapus dataset ini dari database?")) {
      try {
        await modelAPI.deleteDataset(id);
        setHistory(history.filter(h => h.id !== id));
      } catch (err) {
        alert("Gagal menghapus dataset: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleShowDetail = async (dataset) => {
    setSelectedDataset(dataset);
    setDetailLoading(true);
    try {
      const res = await modelAPI.getDatasetRows(dataset.id);
      setDetailRows(res.data);
    } catch (err) {
      console.error("Gagal ambil detail dataset:", err);
      alert("Gagal mengambil detail dataset.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Riwayat Pre-Processing</h1>
        <p style={{ color: 'var(--gray-500)' }}>Daftar seluruh dataset yang telah dibersihkan dan siap digunakan untuk pelatihan model.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                <th><Calendar size={16} /> Tanggal</th>
                <th>Nama Dataset</th>
                <th>Total Data</th>
                <th>Spam</th>
                <th>Ham</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px auto', color: 'var(--gray-400)' }} />
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Memuat riwayat...</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Belum ada riwayat dataset.</p>
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} style={{ color: 'var(--gray-400)' }} /> {item.name}
                    </td>
                    <td style={{ fontWeight: 600 }}>{(item.total_rows || 0).toLocaleString()}</td>
                    <td style={{ color: '#ef4444' }}>{(item.spam_count || 0).toLocaleString()}</td>
                    <td style={{ color: '#10b981' }}>{(item.ham_count || 0).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-ham" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> {item.status || 'Selesai'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" title="Gunakan Dataset"><Database size={14} /></button>
                        {item.status === 'Selesai' && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleShowDetail(item)} title="Lihat Detail Preprocessing">
                            <FileText size={14} />
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', borderColor: '#ef4444' }} title="Hapus"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {selectedDataset && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="card" style={{ background: 'white', padding: 20, maxWidth: 800, maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Detail Preprocessing – {selectedDataset.name}</h3>
                  <button onClick={() => setSelectedDataset(null)} className="btn btn-outline" style={{ padding: 4 }}><X size={18} /></button>
                </div>
                {detailLoading ? (
                  <p>Memuat detail...</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: 8, border: '1px solid #ddd' }}>Teks Sebelum</th>
                        <th style={{ padding: 8, border: '1px solid #ddd' }}>Teks Sesudah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: 8, border: '1px solid #ddd' }}>{row.original_text || row.text || ''}</td>
                          <td style={{ padding: 8, border: '1px solid #ddd' }}>{row.processed_text || row.processed_body || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
