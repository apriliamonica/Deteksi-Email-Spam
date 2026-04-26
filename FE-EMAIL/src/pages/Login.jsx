import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const DEMO_USERS = [
    { email: 'admin@spamguard.com', password: 'admin123', name: 'Admin SpamGuard', role: 'admin' },
    { email: 'user@spamguard.com', password: 'user123', name: 'Pengguna Biasa', role: 'user' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (user) {
      const userData = { name: user.name, email: user.email, role: user.role };
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData); navigate('/beranda');
    } else { setError('Email atau password salah'); }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <div className="logo-icon">SG</div>
          <h1>SpamGuard</h1>
          <p>Deteksi Email Spam — IndoBERT + GAT</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="Masukkan email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Masukkan password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><div className="spinner" /> Memproses...</> : 'Masuk'}
          </button>
        </form>
        <div style={{ marginTop: 20, padding: 12, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--gray-500)' }}>
          <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--gray-700)' }}>Demo Login:</p>
          <p>Admin: admin@spamguard.com / admin123</p>
          <p>User: user@spamguard.com / user123</p>
        </div>
      </div>
    </div>
  );
}
