import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle, Settings2, BarChart2, X, Activity, Info, Database } from 'lucide-react';
import { modelAPI } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

export default function RiwayatModelPage() {
  const [history, setHistory] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchActiveModel();
  }, []);

  const fetchActiveModel = async () => {
    try {
      const activeRes = await modelAPI.getActiveModel();
      if (activeRes.data && activeRes.data.id) {
        setActiveId(activeRes.data.id);
      }
    } catch (error) {
      console.error("Gagal mengambil model aktif:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [historyRes, datasetsRes] = await Promise.all([
        modelAPI.getHistory(),
        modelAPI.listDatasets().catch(() => ({ data: [] }))
      ]);
      setHistory(historyRes.data);
      setDatasets(datasetsRes.data || []);
    } catch (error) {
      console.error("Gagal mengambil riwayat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateModel = async (id) => {
    try {
      setActivatingId(id);
      const res = await modelAPI.activateModel(id);
      if (res.data.status === 'success') {
        alert(`Model #${id} berhasil diaktifkan!`);
        setActiveId(id);
      } else {
        alert("Gagal mengaktifkan model: " + (res.data.message || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error("Gagal mengaktifkan model:", error);
      alert("Gagal mengaktifkan model: " + (error.response?.data?.detail || error.message));
    } finally {
      setActivatingId(null);
    }
  };

  const handleShowDetail = (item) => {
    // Parse JSON strings if they exist
    let metrics = {};
    let visualization = null;
    
    try {
      if (item.metrics_json) metrics = JSON.parse(item.metrics_json);
      if (item.visualization_json) visualization = JSON.parse(item.visualization_json);
    } catch (e) {
      console.error("Error parsing detail data", e);
    }

    setSelectedItem({ ...item, metrics, visualization });
    setIsModalOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Riwayat Pelatihan Model</h1>
        <p style={{ color: 'var(--gray-500)' }}>Daftar detail performa dan hyperparameter model IndoBERT + GAT yang telah dilatih.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={18} /> <span style={{ fontWeight: 600 }}>Tabel Parameter & Metrik Evaluasi</span>
        </div>
        
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Belum ada riwayat pelatihan.</div>
          ) : (
            <table style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'white' }}>
                  <th style={{ width: 140 }}><Calendar size={14} /> Tanggal</th>
                  <th>Dataset</th>
                  <th>Nama Model</th>
                  <th style={{ textAlign: 'center' }}>Jumlah Email</th>
                  <th style={{ textAlign: 'center' }}>Spam</th>
                  <th style={{ textAlign: 'center' }}>Ham</th>
                  <th style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'center' }}>Akurasi</th>
                  <th style={{ textAlign: 'center' }}>F1-Score</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  // Get dataset details from map
                  const ds = datasets.find(d => d.id === item.dataset_id);
                  
                  // Fallback calculation from confusion matrix if dataset not found
                  let spamCount = ds ? ds.spam_count : null;
                  let hamCount = ds ? ds.ham_count : null;
                  
                  if (spamCount === null || hamCount === null) {
                    try {
                      if (item.metrics_json) {
                        const m = JSON.parse(item.metrics_json);
                        const cm = m.confusion_matrix || [[0,0], [0,0]];
                        const testHam = cm[0][0] + cm[0][1];
                        const testSpam = cm[1][0] + cm[1][1];
                        const testTotal = testHam + testSpam;
                        if (testTotal > 0) {
                          spamCount = Math.round((testSpam / testTotal) * item.total_data);
                          hamCount = item.total_data - spamCount;
                        }
                      }
                    } catch (e) {
                      console.error("Error parsing metrics json for counts:", e);
                    }
                  }
                  
                  // Double fallback
                  if (spamCount === null) spamCount = "-";
                  if (hamCount === null) hamCount = "-";
                  
                  const isActive = item.id === activeId;

                  return (
                    <tr key={item.id} style={isActive ? { borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.02)' } : {}}>
                      <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{formatDate(item.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {ds ? ds.name : `Dataset #${item.dataset_id}`}
                          {isActive && (
                            <span className="badge badge-ham" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}>
                              Aktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                        {item.model_name || <span style={{ color: 'var(--gray-400)' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.total_data?.toLocaleString() || 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-spam" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {typeof spamCount === 'number' ? spamCount.toLocaleString() : spamCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-ham" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {typeof hamCount === 'number' ? hamCount.toLocaleString() : hamCount}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--black)', background: 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                        {(item.accuracy * 100).toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{(item.f1_score * 100).toFixed(2)}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleShowDetail(item)}
                            title="Lihat Detail"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <BarChart2 size={14} /> Detail
                          </button>
                          {!isActive && (
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => handleActivateModel(item.id)}
                              disabled={activatingId !== null}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              <CheckCircle size={14} /> Aktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && selectedItem && (
        <DetailModal 
          item={selectedItem} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function DetailModal({ item, onClose }) {
  // Extract data for charts
  const lossData = item.metrics.gat_loss_history?.map((loss, idx) => ({
    epoch: idx + 1,
    loss: parseFloat(loss.toFixed(4))
  })) || [];

  const cm = item.metrics.confusion_matrix || [[0,0], [0,0]];
  
  // CM for display: [[TN, FP], [FN, TP]]
  // Metrics usually: 0=ham, 1=spam
  const tn = cm[0][0];
  const fp = cm[0][1];
  const fn = cm[1][0];
  const tp = cm[1][1];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div className="card" style={{ 
        width: '100%', maxWidth: 1000, maxHeight: '90vh', 
        overflowY: 'auto', padding: 0, position: 'relative' 
      }}>
        <div style={{ 
          padding: '20px 24px', borderBottom: '1px solid var(--gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'white', zIndex: 10
        }}>
          <div>
            <h2 style={{ margin: 0 }}>Detail Pelatihan - {new Date(item.created_at).toLocaleDateString()}</h2>
            <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>Dataset ID: #{item.dataset_id} | Model: {item.model_name}</p>
          </div>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: 8, borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatBox label="Akurasi" value={`${(item.accuracy * 100).toFixed(2)}%`} icon={<CheckCircle size={16} color="#10b981" />} />
            <StatBox label="F1-Score" value={`${(item.f1_score * 100).toFixed(2)}%`} icon={<Activity size={16} color="#3b82f6" />} />
            <StatBox label="Precision" value={`${(item.precision * 100).toFixed(2)}%`} icon={<BarChart2 size={16} color="#8b5cf6" />} />
            <StatBox label="Recall" value={`${(item.recall * 100).toFixed(2)}%`} icon={<Activity size={16} color="#f59e0b" />} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
            {/* Loss Chart */}
            <div className="card shadow-sm">
              <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} /> GAT Loss History
              </h4>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={lossData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="loss" stroke="#171717" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="card shadow-sm">
              <h4 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={18} /> Confusion Matrix
              </h4>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 2, background: 'var(--gray-200)', border: '2px solid var(--gray-200)',
                borderRadius: 8, overflow: 'hidden'
              }}>
                <CMCell label="True Ham (TN)" value={tn} color="#ecfdf5" textColor="#065f46" />
                <CMCell label="False Spam (FP)" value={fp} color="#fef2f2" textColor="#991b1b" />
                <CMCell label="False Ham (FN)" value={fn} color="#fef2f2" textColor="#991b1b" />
                <CMCell label="True Spam (TP)" value={tp} color="#eff6ff" textColor="#1e40af" />
              </div>
              <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                <p>• <b>TN/TP:</b> Prediksi benar</p>
                <p>• <b>FP/FN:</b> Prediksi salah</p>
              </div>
            </div>
          </div>

          {/* Parameters Detail */}
          <div className="card shadow-sm" style={{ marginTop: 24, background: 'var(--gray-50)' }}>
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={18} /> Hyperparameters & Configuration
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <ParamItem label="Learning Rate" value={item.learning_rate} />
              <ParamItem label="Epochs" value={item.epochs} />
              <ParamItem label="Weight Decay" value={item.weight_decay} />
              <ParamItem label="GAT Weight Decay" value={item.gat_weight_decay} />
              <ParamItem label="Train/Val/Test" value={
                item.metrics.req_val_split != null 
                  ? `${(100 - (item.metrics.req_val_split + item.metrics.req_test_split)*100).toFixed(0)}/${(item.metrics.req_val_split*100).toFixed(0)}/${(item.metrics.req_test_split*100).toFixed(0)}`
                  : (item.metrics.val_size != null
                    ? `${(item.train_size/item.total_data*100).toFixed(0)}/${(item.metrics.val_size/item.total_data*100).toFixed(0)}/${(item.test_size/item.total_data*100).toFixed(0)}`
                    : `${(100 - item.test_size/item.total_data*100).toFixed(0)}/0/${(item.test_size/item.total_data*100).toFixed(0)}`)
              } />
              <ParamItem label="MCC Score" value={item.metrics.mcc?.toFixed(4)} />
              <ParamItem label="ROC-AUC" value={item.metrics.roc_auc?.toFixed(4)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div className="card shadow-sm" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function CMCell({ label, value, color, textColor }) {
  return (
    <div style={{ 
      background: color, padding: 20, textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textColor, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: textColor }}>{value}</div>
    </div>
  );
}

function ParamItem({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)', paddingBottom: 8 }}>
      <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}
