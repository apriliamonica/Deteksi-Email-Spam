import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Layers,
  Brain,
  FlaskConical,
  BarChart3,
  LogOut,
  Users,
  History,
  Cpu,
  ClipboardList,
} from "lucide-react";

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };
  const initials =
    user?.name && typeof user.name === "string"
      ? user.name
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U";



  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SG</div>
        <div>
          <h1>SpamGuard</h1>
          <span>IndoBERT + GAT</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink
          to="/beranda"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard />{" "}
          {user?.role === "admin" ? "Beranda" : "Deteksi Email"}
        </NavLink>

        {/* Menu khusus user biasa */}
        {user?.role !== "admin" && (
          <NavLink
            to="/riwayat-saya"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <History size={18} /> Riwayat Saya
          </NavLink>
        )}

        {/* Menu khusus admin */}
        {user?.role === "admin" && (
          <>
            <div className="sidebar-section">Kelola</div>
            <NavLink
              to="/data-collection"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Database /> Data Collection
            </NavLink>
            <NavLink
              to="/preprocessing"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Layers size={18} /> Pre-Processing
            </NavLink>

            <NavLink
              to="/processing"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Brain size={18} /> Processing
            </NavLink>
            <NavLink
              to="/riwayat-model"
              className={({ isActive }) =>
                `nav-link sub-link ${isActive ? "active" : ""}`
              }
              style={{ paddingLeft: 40, fontSize: "0.85rem" }}
            >
              <Cpu size={15} /> Model
            </NavLink>
            <NavLink
              to="/evaluasi"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <BarChart3 /> Evaluation
            </NavLink>

            <div className="sidebar-section">Uji</div>
            <NavLink
              to="/testing"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <FlaskConical /> Testing
            </NavLink>

            <div className="sidebar-section">Pengguna</div>
            <NavLink
              to="/manage-accounts"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Users size={18} /> Kelola Akun
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info flex items-center justify-between gap-2">
          <div className="user-info-left flex items-center gap-2">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="name font-bold text-slate-800 leading-tight">
                {user?.name || "User"}
              </div>
              <div className="role text-xs text-slate-500">
                {user?.role === "admin" ? "Admin" : "Pengguna"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
