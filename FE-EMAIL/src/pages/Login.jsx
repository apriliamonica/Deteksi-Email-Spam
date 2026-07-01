import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, GitCommit, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.status === 'success') {
        const userData = res.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/beranda');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal login. Periksa email atau password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-login auth-page">
      <div className="auth-page__blob auth-page__blob--tl" aria-hidden="true" />
      <div className="auth-page__blob auth-page__blob--br" aria-hidden="true" />

      <div className="auth-page__center">
        <div className={`auth-card ${mounted ? 'auth-card--enter' : 'auth-card--hidden'}`}>
          <div className="auth-card__header">
            <div className="auth-card__logo">
              <ShieldCheck size={32} color="white" />
            </div>
            <h1 className="auth-card__title">SpamGuard</h1>
            <p className="auth-card__subtitle">
              <Activity size={14} />
              IndoBERT
              <GitCommit size={14} />
              GAT
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Mail size={18} strokeWidth={2} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@spamguard.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Lock size={18} strokeWidth={2} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input auth-input--toggle"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                'Memproses...'
              ) : (
                <>
                  Masuk ke Sistem
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Belum punya akun?
            <Link to="/register">Daftar sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
