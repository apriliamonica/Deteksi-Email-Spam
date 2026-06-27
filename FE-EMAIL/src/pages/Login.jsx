import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, GitCommit } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorations */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
      }} />

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        zIndex: 1
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
            }}>
              <ShieldCheck size={32} color="white" />
            </div>
            <h1 style={{ 
              fontSize: '1.8rem', fontWeight: 800, color: 'white', margin: '0 0 8px 0',
              letterSpacing: '-0.02em'
            }}>SpamGuard</h1>
            <p style={{ 
              color: '#94a3b8', fontSize: '0.9rem', margin: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <Activity size={14} /> IndoBERT <GitCommit size={14} /> GAT
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171', padding: '12px 16px', borderRadius: '12px',
              fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@spamguard.com"
                  required
                  style={{
                    width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white', padding: '14px 14px 14px 42px', borderRadius: '12px', fontSize: '0.9rem',
                    outline: 'none', transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white', padding: '14px 14px 14px 42px', borderRadius: '12px', fontSize: '0.9rem',
                    outline: 'none', transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white', border: 'none', padding: '14px', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '8px', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? (
                <>Memproses...</>
              ) : (
                <>Masuk ke Sistem <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ 
            marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Admin Demo</div>
              admin@spamguard.com<br/>admin123
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>User Demo</div>
              user@spamguard.com<br/>user123
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
