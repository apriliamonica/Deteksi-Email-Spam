import { useState } from 'react';
import { Brain, Calendar, Trash2, CheckCircle, ExternalLink, Settings2, BarChart2 } from 'lucide-react';

export default function RiwayatModelPage() {
  const [history, setHistory] = useState([
    { 
      id: 1, 
      date: "28/04/26", 
      name: "Model_Spam_IndoBERT_8020", 
      epoch: 30, 
      lr: 0.001,
      ratio: "80:20", 
      acc: "96.42%", 
      pre: "95.20%",
      rec: "96.10%",
      f1: "95.80%", 
      mcc: "0.8942",
      auc: "0.9782",
      std: "0.012",
      active: true 
    },
    { 
      id: 2, 
      date: "27/04/26", 
      name: "Model_GAT_Trial_01", 
      epoch: 20, 
      lr: 0.002,
      ratio: "70:30", 
      acc: "92.15%", 
      pre: "91.10%",
      rec: "92.00%",
      f1: "91.45%", 
      mcc: "0.8412",
      auc: "0.9321",
      std: "0.015",
      active: false 
    },
    { 
      id: 3, 
      date: "25/04/26", 
      name: "Model_Baseline_6040", 
      epoch: 10, 
      lr: 0.005,
      ratio: "60:40", 
      acc: "88.90%", 
      pre: "87.50%",
      rec: "86.80%",
      f1: "87.12%", 
      mcc: "0.7821",
      auc: "0.8945",
      std: "0.022",
      active: false 
    },
  ]);

  const handleDelete = (id) => {
    if (window.confirm("Hapus riwayat model ini?")) {
      setHistory(history.filter(h => h.id !== id));
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Riwayat Pelatihan Model</h1>
        <p style={{ color: 'var(--gray-500)' }}>Daftar detail performa dan hyperparameter model IndoBERT + GAT yang telah dilatih.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={18} /> <span style={{ fontWeight: 600 }}>Tabel Parameter & Metrik Evaluasi</span>
        </div>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ margin: 0, minWidth: 1400 }}>
            <thead>
              <tr style={{ background: 'white' }}>
                <th style={{ width: 100 }}><Calendar size={14} /> Tanggal</th>
                <th>Nama Model</th>
                <th style={{ textAlign: 'center' }}>Epoch</th>
                <th style={{ textAlign: 'center' }}>LR</th>
                <th style={{ textAlign: 'center' }}>Rasio</th>
                <th style={{ background: 'rgba(0,0,0,0.02)' }}>Akurasi</th>
                <th>Presisi</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>MCC</th>
                <th>ROC-AUC</th>
                <th>Std Dev</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id} style={{ background: item.active ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                  <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{item.date}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: 'var(--gray-100)' }}>{item.epoch}</span></td>
                  <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.lr}</td>
                  <td style={{ textAlign: 'center' }}>{item.ratio}</td>
                  <td style={{ fontWeight: 800, color: 'var(--black)', background: 'rgba(0,0,0,0.02)' }}>{item.acc}</td>
                  <td>{item.pre}</td>
                  <td>{item.rec}</td>
                  <td style={{ fontWeight: 600 }}>{item.f1}</td>
                  <td>{item.mcc}</td>
                  <td>{item.auc}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{item.std}</td>
                  <td style={{ textAlign: 'center' }}>
                    {item.active ? (
                      <span className="badge badge-ham" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--gray-200)', color: 'var(--gray-600)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn-outline btn-sm" title="Lihat Detail"><BarChart2 size={14} /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', borderColor: '#ef4444' }} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
        * Geser tabel ke kanan untuk melihat metrik evaluasi lengkap (MCC, ROC-AUC, Std Dev).
      </p>
    </div>
  );
}
