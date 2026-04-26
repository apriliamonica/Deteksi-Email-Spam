import { useState, useEffect } from 'react';
import {
  Mail, ShieldAlert, ShieldCheck, Activity, TrendingUp, BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

export default function Dashboard({ user }) {
  // Demo data - di production ambil dari API
  const [stats, setStats] = useState({
    total_emails: 1250,
    total_spam: 487,
    total_ham: 763,
    spam_percentage: 38.96,
  });

  const [modelStatus, setModelStatus] = useState({
    is_loaded: true,
    accuracy: 0.9523,
    f1_score: 0.9481,
    precision: 0.9412,
    recall: 0.9551,
  });

  const pieData = [
    { name: 'Spam', value: stats.total_spam, color: '#ef4444' },
    { name: 'Ham', value: stats.total_ham, color: '#10b981' },
  ];

  const recentData = [
    { date: 'Sen', spam: 12, ham: 28 },
    { date: 'Sel', spam: 18, ham: 32 },
    { date: 'Rab', spam: 8, ham: 25 },
    { date: 'Kam', spam: 22, ham: 30 },
    { date: 'Jum', spam: 15, ham: 35 },
    { date: 'Sab', spam: 10, ham: 20 },
    { date: 'Min', spam: 5, ham: 15 },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Selamat datang, {user?.name}! Berikut ringkasan deteksi email spam.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><Mail size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Total Email</div>
            <div className="stat-value">{stats.total_emails.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger"><ShieldAlert size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Email Spam</div>
            <div className="stat-value">{stats.total_spam.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success"><ShieldCheck size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Email Aman</div>
            <div className="stat-value">{stats.total_ham.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning"><TrendingUp size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Akurasi Model</div>
            <div className="stat-value">{(modelStatus.accuracy * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        {/* Pie Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} /> Distribusi Email
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-800)',
                  border: '1px solid var(--surface-700)',
                  borderRadius: 8,
                  color: 'var(--surface-100)',
                  fontSize: '0.8rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              Spam ({stats.spam_percentage}%)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              Ham ({(100 - stats.spam_percentage).toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Area Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} /> Aktivitas Minggu Ini
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={recentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)" />
              <XAxis dataKey="date" stroke="var(--surface-500)" fontSize={12} />
              <YAxis stroke="var(--surface-500)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-800)',
                  border: '1px solid var(--surface-700)',
                  borderRadius: 8,
                  color: 'var(--surface-100)',
                  fontSize: '0.8rem',
                }}
              />
              <Area type="monotone" dataKey="ham" stroke="#10b981" fill="rgba(16,185,129,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="spam" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Metrics */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} /> Performa Model (IndoBERT + GAT + UMAP)
        </h3>
        <div className="stats-grid">
          {[
            { label: 'Accuracy', value: modelStatus.accuracy, color: 'var(--primary-400)' },
            { label: 'Precision', value: modelStatus.precision, color: 'var(--accent-400)' },
            { label: 'Recall', value: modelStatus.recall, color: 'var(--warning-400)' },
            { label: 'F1 Score', value: modelStatus.f1_score, color: 'var(--danger-400)' },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--surface-400)', marginBottom: 8, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color }}>{(m.value * 100).toFixed(1)}%</div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${m.value * 100}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
