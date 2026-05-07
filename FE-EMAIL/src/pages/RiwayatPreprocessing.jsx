import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle, FileText, Database, Loader2 } from 'lucide-react';
import { modelAPI } from '../services/api';

export default function RiwayatPreprocessingPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <th style={{ textAlign: 'center' }}>Aksi</th>
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
              ) : history.map(item => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                  </td>
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
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', borderColor: '#ef4444' }} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
