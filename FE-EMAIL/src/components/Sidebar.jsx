import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, Layers, Brain, FlaskConical, BarChart3, LogOut } from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const handleLogout = () => { onLogout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SG</div>
        <div><h1>SpamGuard</h1><span>IndoBERT + GAT</span></div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/beranda" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard /> Beranda
        </NavLink>
        {user?.role === 'admin' && (<>
          <div className="sidebar-section">Kelola</div>
          <NavLink to="/data-collection" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database /> Data Collection
          </NavLink>
          <NavLink to="/preprocessing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Layers /> Pre-Processing
          </NavLink>
          <NavLink to="/processing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Brain /> Processing
          </NavLink>
        </>)}
        <div className="sidebar-section">Uji</div>
        <NavLink to="/testing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FlaskConical /> Testing
        </NavLink>
        <NavLink to="/evaluasi" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 /> Evaluasi Performa
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details" style={{ flex: 1 }}>
            <div className="name">{user?.name || 'User'}</div>
            <div className="role">{user?.role === 'admin' ? 'Admin' : 'Pengguna'}</div>
          </div>
          <button className="nav-link" onClick={handleLogout} style={{ width: 'auto', padding: '6px' }} title="Logout"><LogOut /></button>
        </div>
      </div>
    </aside>
  );
}
