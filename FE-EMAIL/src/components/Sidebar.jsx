import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Database, FileText, Type, SplitSquareHorizontal,
  Scissors, Hash, Filter, CheckSquare, Settings, Brain, ShieldCheck,
  FlaskConical, BarChart3, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react';

function NavSection({ title }) {
  return <div className="sidebar-section">{title}</div>;
}

function NavItem({ to, icon: Icon, label, indent = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${indent ? 'nav-indent' : ''}`}
    >
      <Icon size={indent ? 14 : 18} /> {label}
    </NavLink>
  );
}

function NavGroup({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button className="nav-link" onClick={() => setOpen(!open)}>
        <Icon size={18} />
        <span style={{ flex: 1 }}>{label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="nav-group-children">{children}</div>}
    </div>
  );
}

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
        {/* Beranda */}
        <NavItem to="/beranda" icon={LayoutDashboard} label="Beranda" />

        {user?.role === 'admin' && (
          <>
            {/* Data Collection */}
            <NavItem to="/data-collection" icon={Database} label="Data Collection" />

            {/* Pre-Processing */}
            <NavSection title="Pre-Processing" />
            <NavItem to="/preprocessing/dataset-baru" icon={FileText} label="Dataset Baru" indent />
            <NavItem to="/preprocessing/case-folding" icon={Type} label="Case Folding" indent />
            <NavItem to="/preprocessing/tokenisasi" icon={SplitSquareHorizontal} label="Tokenisasi" indent />
            <NavItem to="/preprocessing/stemming" icon={Scissors} label="Stemming" indent />
            <NavItem to="/preprocessing/stopword" icon={Filter} label="Stopword Removal" indent />
            <NavItem to="/preprocessing/hasil" icon={CheckSquare} label="Hasil Pre-processing" indent />

            {/* Processing */}
            <NavSection title="Processing" />
            <NavItem to="/processing/pengaturan" icon={Settings} label="Pengaturan" indent />
            <NavItem to="/processing/pelatihan" icon={Brain} label="Pelatihan" indent />
            <NavItem to="/processing/validasi" icon={ShieldCheck} label="Validasi" indent />
          </>
        )}

        {/* Testing */}
        <NavSection title="" />
        <NavItem to="/testing" icon={FlaskConical} label="Testing" />

        {/* Evaluasi */}
        <NavItem to="/evaluasi" icon={BarChart3} label="Evaluasi Performa" />
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
