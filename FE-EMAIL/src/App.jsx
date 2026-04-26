import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataCollection from './pages/DataCollection';
import PreprocessingPage from './pages/Preprocessing';
import Pengaturan from './pages/Pengaturan';
import Pelatihan from './pages/Pelatihan';
import Validasi from './pages/Validasi';
import Testing from './pages/Testing';
import Evaluasi from './pages/Evaluasi';
import './index.css';

function ProtectedRoute({ user, children, adminOnly = false }) {
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/beranda" replace />;
  return children;
}

function AppLayout({ user, onLogout, children }) {
  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">{children}</main>
    </div>
  );
}

function Wrap({ user, onLogout, children, adminOnly = false }) {
  return (
    <ProtectedRoute user={user} adminOnly={adminOnly}>
      <AppLayout user={user} onLogout={onLogout}>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { localStorage.removeItem('user'); setUser(null); };
  const p = { user, onLogout: handleLogout };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/beranda" replace /> : <LoginPage onLogin={handleLogin} />} />

        {/* Beranda */}
        <Route path="/beranda" element={<Wrap {...p}><Dashboard user={user} /></Wrap>} />

        {/* Data Collection (admin) */}
        <Route path="/data-collection" element={<Wrap {...p} adminOnly><DataCollection /></Wrap>} />

        {/* Pre-Processing (admin) */}
        <Route path="/preprocessing/dataset-baru" element={<Wrap {...p} adminOnly><PreprocessingPage step="dataset-baru" /></Wrap>} />
        <Route path="/preprocessing/case-folding" element={<Wrap {...p} adminOnly><PreprocessingPage step="case-folding" /></Wrap>} />
        <Route path="/preprocessing/tokenisasi" element={<Wrap {...p} adminOnly><PreprocessingPage step="tokenisasi" /></Wrap>} />
        <Route path="/preprocessing/stemming" element={<Wrap {...p} adminOnly><PreprocessingPage step="stemming" /></Wrap>} />
        <Route path="/preprocessing/stopword" element={<Wrap {...p} adminOnly><PreprocessingPage step="stopword" /></Wrap>} />
        <Route path="/preprocessing/hasil" element={<Wrap {...p} adminOnly><PreprocessingPage step="hasil" /></Wrap>} />

        {/* Processing (admin) */}
        <Route path="/processing/pengaturan" element={<Wrap {...p} adminOnly><Pengaturan /></Wrap>} />
        <Route path="/processing/pelatihan" element={<Wrap {...p} adminOnly><Pelatihan /></Wrap>} />
        <Route path="/processing/validasi" element={<Wrap {...p} adminOnly><Validasi /></Wrap>} />

        {/* Testing & Evaluasi (all users) */}
        <Route path="/testing" element={<Wrap {...p}><Testing /></Wrap>} />
        <Route path="/evaluasi" element={<Wrap {...p}><Evaluasi /></Wrap>} />

        <Route path="*" element={<Navigate to={user ? '/beranda' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
