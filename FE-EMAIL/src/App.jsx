import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classify from './pages/Classify';
import Training from './pages/Training';
import DatasetPage from './pages/Dataset';
import './index.css';

function ProtectedRoute({ user, children, adminOnly = false }) {
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
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

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { localStorage.removeItem('user'); setUser(null); };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user}><AppLayout user={user} onLogout={handleLogout}><Dashboard user={user} /></AppLayout></ProtectedRoute>} />
        <Route path="/classify" element={<ProtectedRoute user={user}><AppLayout user={user} onLogout={handleLogout}><Classify /></AppLayout></ProtectedRoute>} />
        <Route path="/training" element={<ProtectedRoute user={user} adminOnly><AppLayout user={user} onLogout={handleLogout}><Training /></AppLayout></ProtectedRoute>} />
        <Route path="/dataset" element={<ProtectedRoute user={user} adminOnly><AppLayout user={user} onLogout={handleLogout}><DatasetPage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
