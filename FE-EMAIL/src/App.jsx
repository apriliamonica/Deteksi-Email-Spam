import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataCollection from './pages/DataCollection';
import PreprocessingPage from './pages/Preprocessing';
import ProcessingPage from './pages/Processing';
import RiwayatModelPage from './pages/RiwayatModel';
import ManageAccountsPage from './pages/ManageAccounts';
import Testing from './pages/Testing';
import Evaluasi from './pages/Evaluasi';
import UserRiwayat from './pages/UserRiwayat';
import './index.css';

function Guard({ user, children, admin = false }) {
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/beranda" replace />;
  return <div className="app-layout"><Sidebar user={user} onLogout={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} /><main className="main-content">{children}</main></div>;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      localStorage.removeItem('user');
      return null;
    }
  });

  useEffect(() => {
    // Initialize theme based on localStorage or system preferences
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Keep sync if needed, though direct state is better for initial load
    const handleStorage = () => {
      const saved = localStorage.getItem('user');
      setUser(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/beranda" replace /> : <LoginPage onLogin={u => setUser(u)} />} />
        <Route path="/beranda" element={<Guard user={user}><Dashboard user={user} /></Guard>} />
        <Route path="/data-collection" element={<Guard user={user} admin><DataCollection /></Guard>} />
        <Route path="/preprocessing" element={<Guard user={user} admin><PreprocessingPage /></Guard>} />
        <Route path="/riwayat-preprocessing" element={<Navigate to="/preprocessing" replace />} />
        <Route path="/processing" element={<Guard user={user} admin><ProcessingPage /></Guard>} />
        <Route path="/riwayat-model" element={<Guard user={user} admin><RiwayatModelPage /></Guard>} />
        <Route path="/testing" element={<Guard user={user}><Testing /></Guard>} />
        <Route path="/evaluasi" element={<Guard user={user}><Evaluasi /></Guard>} />
        <Route path="/manage-accounts" element={<Guard user={user} admin><ManageAccountsPage /></Guard>} />
        <Route path="/riwayat-saya" element={<Guard user={user}><UserRiwayat /></Guard>} />
        <Route path="*" element={<Navigate to={user ? '/beranda' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
