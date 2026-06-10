import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.status === 'success') {
        const userData = res.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData); navigate('/beranda');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal login. Periksa email atau password.');
    } finally {
      setLoading(false);
    }
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
