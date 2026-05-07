import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Clock, Sparkles, TrendingUp, ShieldCheck, 
  Target, Zap, Activity, Info, AlertCircle 
} from 'lucide-react';
import { modelAPI } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function Evaluasi() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await modelAPI.getStatus();
      setStatus(res.data);
    } catch (err) {
      console.error("Gagal ambil status model:", err);
      setError("Gagal memuat data evaluasi.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Activity className="spinner" size={40} style={{ color: 'var(--gray-400)' }} />
        <p>Memuat data evaluasi...</p>
      </div>
    );
  }

  if (!status?.metrics) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--gray-300)', marginBottom: 16 }} />
        <h2 style={{ fontWeight: 800 }}>Belum Ada Data Evaluasi</h2>
        <p style={{ color: 'var(--gray-500)' }}>Silakan lakukan pelatihan model terlebih dahulu di menu Training.</p>
      </div>
    );
  }

  const metrics = status.metrics;
  
  // Data dummy untuk grafik jika tidak ada history (bisa ditambahkan di BE nanti)
  const lossData = [
    { name: 'Ep 1', loss: 0.65 },
    { name: 'Ep 5', loss: 0.42 },
    { name: 'Ep 10', loss: 0.28 },
    { name: 'Ep 15', loss: 0.15 },
    { name: 'Ep 20', loss: 0.08 },
    { name: 'Ep 25', loss: 0.04 },
    { name: 'Ep 30', loss: 0.02 },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px 40px' }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Dashboard Evaluasi</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem' }}>
            Analisis performa model Hybrid IndoBERT + GAT
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
          Terakhir Update: {new Date(status.last_training).toLocaleString('id-ID')}
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatCard icon={<Target color="#3b82f6" />} label="Accuracy" value={(metrics.accuracy * 100).toFixed(1) + "%"} color="#3b82f6" />
        <StatCard icon={<ShieldCheck color="#10b981" />} label="Precision" value={(metrics.precision * 100).toFixed(1) + "%"} color="#10b981" />
        <StatCard icon={<Zap color="#8b5cf6" />} label="F1-Score" value={(metrics.f1_score * 100).toFixed(1) + "%"} color="#8b5cf6" />
        <StatCard icon={<TrendingUp color="#f59e0b" />} label="Recall" value={(metrics.recall * 100).toFixed(1) + "%"} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Loss Curve */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Kurva Training Loss</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={12} /> Stabilitas Model
            </div>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lossData}>
                <defs>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--black)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--black)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--gray-100)" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'white', borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="loss" stroke="var(--black)" strokeWidth={3} fillOpacity={1} fill="url(#colorLoss)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-100)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Metrik Rinci</h3>
          </div>
          <table style={{ width: '100%', fontSize: '0.85rem' }}>
            <tbody>
              <MetricRow label="Accuracy" val={metrics.accuracy} />
              <MetricRow label="Precision" val={metrics.precision} />
              <MetricRow label="Recall" val={metrics.recall} />
              <MetricRow label="F1 Score" val={metrics.f1_score} />
              <tr style={{ background: 'var(--gray-50)' }}>
                <td colSpan="2" style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--gray-400)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Detail Lainnya</td>
              </tr>
              <MetricRow label="Total Data" val={metrics.total_data} noPercent />
              <MetricRow label="Train Size" val={metrics.train_size} noPercent />
              <MetricRow label="Test Size" val={metrics.test_size} noPercent />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.05 }}>
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: 8, background: `${color}15`, borderRadius: 10 }}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function MetricRow({ label, val, noPercent = false }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--gray-50)' }}>
      <td style={{ padding: '12px 20px', color: 'var(--gray-600)' }}>{label}</td>
      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700 }}>
        {noPercent ? (val?.toLocaleString() || '-') : (val ? (val * 100).toFixed(2) + "%" : '-')}
      </td>
    </tr>
  );
}
