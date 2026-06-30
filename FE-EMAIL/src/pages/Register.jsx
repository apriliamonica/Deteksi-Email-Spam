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

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        role: 'user'
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

  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid var(--app-border)',
    color: 'var(--app-text)',
    padding: '13px 14px 13px 42px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    color: 'var(--app-text)',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '8px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--page-bg-login)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(79, 95, 212, 0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
      }} />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '2rem', zIndex: 1
      }}>
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px var(--glass-shadow)',
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(79, 95, 212, 0.4)'
            }}>
              <ShieldCheck size={32} color="white" />
            </div>
            <h1 style={{
              fontSize: '1.7rem', fontWeight: 800, color: 'var(--app-text)', margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}>Buat Akun Baru</h1>
            <p style={{
              color: 'var(--app-text-muted)', fontSize: '0.85rem', margin: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <Activity size={13} /> SpamGuard <GitCommit size={13} /> IndoBERT + GAT
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444', padding: '12px 16px', borderRadius: '12px',
              fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#22c55e', padding: '12px 16px', borderRadius: '12px',
              fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Nama */}
            <div>
              <label style={labelStyle}>Nama Lengkap</label>
              <div style={{ position: 'relative' }}>
                <User size={17} color="var(--app-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text" name="name" value={form.name}
                  onChange={handleChange} placeholder="Nama Lengkap Anda" required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--app-border)'; e.target.style.background = 'rgba(255, 255, 255, 0.7)'; }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} color="var(--app-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="email@contoh.com" required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--app-border)'; e.target.style.background = 'rgba(255, 255, 255, 0.7)'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="var(--app-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="Min. 6 karakter" required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--app-border)'; e.target.style.background = 'rgba(255, 255, 255, 0.7)'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: 0
                }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label style={labelStyle}>Konfirmasi Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="var(--app-text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                  onChange={handleChange} placeholder="Ulangi password" required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--app-border)'; e.target.style.background = 'rgba(255, 255, 255, 0.7)'; }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: 0
                }}>
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Tombol Daftar */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', background: 'var(--primary)',
                color: 'white', border: 'none', padding: '14px', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '4px', boxShadow: '0 4px 14px 0 rgba(79, 95, 212, 0.39)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'Memproses...' : <><span>Buat Akun</span><ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Link ke Login */}
          <div style={{
            marginTop: '24px', textAlign: 'center',
            paddingTop: '20px', borderTop: '1px solid var(--app-border)'
          }}>
            <span style={{ color: 'var(--app-text-muted)', fontSize: '0.85rem' }}>Sudah punya akun? </span>
            <Link to="/login" style={{
              color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
              textDecoration: 'none', transition: 'color 0.2s'
            }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--primary)'}
            >
              Masuk di sini
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
