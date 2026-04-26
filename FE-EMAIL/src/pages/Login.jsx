import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Demo login - di production ganti dengan API call
  const DEMO_USERS = [
    { email: 'admin@spamguard.com', password: 'admin123', name: 'Admin SpamGuard', role: 'admin' },
    { email: 'user@spamguard.com', password: 'user123', name: 'Pengguna Biasa', role: 'user' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulasi delay
    await new Promise(r => setTimeout(r, 800));

    const user = DEMO_USERS.find(u => u.email === email && u.password === password);

    if (user) {
      const userData = { name: user.name, email: user.email, role: user.role };
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
      navigate('/dashboard');
    } else {
      setError('Email atau password salah');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section">
          <div className="logo-icon">🛡️</div>
          <h1>SpamGuard</h1>
          <p>Deteksi Email Spam — IndoBERT + GAT</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--surface-500)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--surface-500)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <><div className="spinner" /> Memproses...</> : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-800)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--surface-400)' }}>
          <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--surface-300)' }}>🔑 Demo Login:</p>
          <p><strong>Admin:</strong> admin@spamguard.com / admin123</p>
          <p><strong>User:</strong> user@spamguard.com / user123</p>
        </div>
      </div>
    </div>
  );
}
