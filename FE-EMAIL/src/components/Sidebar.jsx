import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Mail, Brain, Database, LogOut, Shield,
} from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <div>
          <h1>SpamGuard</h1>
          <span>IndoBERT + GAT</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Menu Utama</div>

        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard /> Dashboard
        </NavLink>

        <NavLink to="/classify" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Mail /> Klasifikasi Email
        </NavLink>

        {user?.role === 'admin' && (
          <>
            <div className="sidebar-section">Admin</div>

            <NavLink to="/training" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Brain /> Training Model
            </NavLink>

            <NavLink to="/dataset" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Database /> Dataset
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="name">{user?.name || 'User'}</div>
            <div className="role">
              {user?.role === 'admin' ? '🔑 Admin' : '👤 Pengguna'}
            </div>
          </div>
          <button className="nav-link" onClick={handleLogout} style={{ width: 'auto', padding: '8px' }} title="Logout">
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
