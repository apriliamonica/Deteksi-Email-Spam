import { useState } from 'react';
import { Layers, Calendar, Trash2, CheckCircle, FileText, Database } from 'lucide-react';

export default function RiwayatPreprocessingPage() {
  const [history, setHistory] = useState([
    { id: 1, date: "28/04/26", dataset: "dataset_spam_indo.csv", total: 10000, spam: 4200, ham: 5800, status: "Selesai" },
    { id: 2, date: "27/04/26", dataset: "test_email_batch1.csv", total: 1500, spam: 600, ham: 900, status: "Selesai" },
    { id: 3, date: "20/04/26", dataset: "dummy_data.csv", total: 500, spam: 200, ham: 300, status: "Selesai" },
  ]);

  const handleDelete = (id) => {
    if (window.confirm("Hapus riwayat pre-processing ini?")) {
      setHistory(history.filter(h => h.id !== id));
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
              {history.map(item => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{item.date}</td>
                  <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: 'var(--gray-400)' }} /> {item.dataset}
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.total.toLocaleString()}</td>
                  <td style={{ color: '#ef4444' }}>{item.spam.toLocaleString()}</td>
                  <td style={{ color: '#10b981' }}>{item.ham.toLocaleString()}</td>
                  <td>
                    <span className="badge badge-ham" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> {item.status}
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
