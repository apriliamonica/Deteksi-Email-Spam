import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, GitCommit, User, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) return setError('Nama lengkap tidak boleh kosong.');
    if (form.password.length < 6) return setError('Password minimal 6 karakter.');
    if (form.password !== form.confirmPassword) return setError('Password dan konfirmasi password tidak cocok.');

    setLoading(true);
    try {
      const res = await authAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'user',
      });
      if (res.data.status === 'success') {
        setSuccess('Akun berhasil dibuat! Mengarahkan ke halaman login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal mendaftar. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-register auth-page">
      <div className="auth-page__blob auth-page__blob--tl" aria-hidden="true" />
      <div className="auth-page__blob auth-page__blob--br" aria-hidden="true" />

      <div className="auth-page__center">
        <div className={`auth-card ${mounted ? 'auth-card--enter' : 'auth-card--hidden'}`}>
          <div className="auth-card__header">
            <div className="auth-card__logo">
              <ShieldCheck size={32} color="white" />
            </div>
            <h1 className="auth-card__title">Buat Akun Baru</h1>
            <p className="auth-card__subtitle">
              <Activity size={14} />
              SpamGuard
              <GitCommit size={14} />
              IndoBERT + GAT
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert--success" role="status">
              <span aria-hidden="true">✅</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="register-name" className="auth-label">
                Nama Lengkap
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <User size={18} strokeWidth={2} />
                </span>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  className="auth-input"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nama lengkap Anda"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-email" className="auth-label">
                Email
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Mail size={18} strokeWidth={2} />
                </span>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  className="auth-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@contoh.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Lock size={18} strokeWidth={2} />
                </span>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="auth-input auth-input--toggle"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 karakter"
                  autoComplete="new-password"
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

            <div className="auth-field">
              <label htmlFor="register-confirm" className="auth-label">
                Konfirmasi Password
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Lock size={18} strokeWidth={2} />
                </span>
                <input
                  id="register-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  className="auth-input auth-input--toggle"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                'Memproses...'
              ) : (
                <>
                  Buat Akun
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Sudah punya akun?
            <Link to="/login">Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
