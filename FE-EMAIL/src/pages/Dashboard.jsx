import { Mail, ShieldAlert, ShieldCheck, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard({ user }) {
  const stats = { total: 10000, spam: 4200, ham: 5800, pct: 42.0 };
  const model = { accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1: 0.9481 };
  const pieData = [{ name: 'Spam', value: stats.spam }, { name: 'Ham', value: stats.ham }];
  const weekData = [
    { d: 'Sen', spam: 12, ham: 28 }, { d: 'Sel', spam: 18, ham: 32 }, { d: 'Rab', spam: 8, ham: 25 },
    { d: 'Kam', spam: 22, ham: 30 }, { d: 'Jum', spam: 15, ham: 35 }, { d: 'Sab', spam: 10, ham: 20 }, { d: 'Min', spam: 5, ham: 15 },
  ];

  return (
    <div>
      <div className="page-header"><h1>Beranda</h1><p>Selamat datang, {user?.name}.</p></div>

      <div className="stats-grid">
        {[
          { l: 'Total Email', v: stats.total.toLocaleString(), i: Mail },
          { l: 'Email Spam', v: stats.spam.toLocaleString(), i: ShieldAlert },
          { l: 'Email Aman', v: stats.ham.toLocaleString(), i: ShieldCheck },
          { l: 'Akurasi Model', v: `${(model.accuracy*100).toFixed(1)}%`, i: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon"><s.i size={20} /></div>
            <div className="stat-content"><div className="stat-label">{s.l}</div><div className="stat-value">{s.v}</div></div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Distribusi Email</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
              <Cell fill="#171717" /><Cell fill="#d4d4d4" />
            </Pie><Tooltip contentStyle={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:6, fontSize:'0.8rem' }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            <span>■ Spam ({stats.pct}%)</span><span style={{ color: 'var(--gray-300)' }}>■ Ham ({(100-stats.pct).toFixed(1)}%)</span>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Aktivitas Minggu Ini</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weekData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="d" stroke="#a3a3a3" fontSize={11} /><YAxis stroke="#a3a3a3" fontSize={11} />
              <Tooltip contentStyle={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:6, fontSize:'0.8rem' }} />
              <Area type="monotone" dataKey="ham" stroke="#a3a3a3" fill="#f5f5f5" strokeWidth={2} />
              <Area type="monotone" dataKey="spam" stroke="#171717" fill="#e5e5e5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Performa Model</h3>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[['Accuracy', model.accuracy], ['Precision', model.precision], ['Recall', model.recall], ['F1 Score', model.f1]].map(([l,v], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{(v*100).toFixed(1)}%</div>
              <div className="progress-bar" style={{ marginTop: 6 }}><div className="progress-fill" style={{ width: `${v*100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
