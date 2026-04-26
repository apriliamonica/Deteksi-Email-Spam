import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataCollection from './pages/DataCollection';
import PreprocessingPage from './pages/Preprocessing';
import ProcessingPage from './pages/Processing';
import Testing from './pages/Testing';
import Evaluasi from './pages/Evaluasi';
import './index.css';

function Guard({ user, children, admin = false }) {
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/beranda" replace />;
  return <div className="app-layout"><Sidebar user={user} onLogout={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} /><main className="main-content">{children}</main></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { const s = localStorage.getItem('user'); if (s) setUser(JSON.parse(s)); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/beranda" replace /> : <LoginPage onLogin={u => setUser(u)} />} />
        <Route path="/beranda" element={<Guard user={user}><Dashboard user={user} /></Guard>} />
        <Route path="/data-collection" element={<Guard user={user} admin><DataCollection /></Guard>} />
        <Route path="/preprocessing" element={<Guard user={user} admin><PreprocessingPage /></Guard>} />
        <Route path="/processing" element={<Guard user={user} admin><ProcessingPage /></Guard>} />
        <Route path="/testing" element={<Guard user={user}><Testing /></Guard>} />
        <Route path="/evaluasi" element={<Guard user={user}><Evaluasi /></Guard>} />
        <Route path="*" element={<Navigate to={user ? '/beranda' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
