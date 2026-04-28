import { useState } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, Shield, User } from 'lucide-react';

export default function ManageAccounts() {
  const [users, setUsers] = useState([
    { id: 1, name: 'April Monica', email: 'april@gmail.com', role: 'admin', lastLogin: '29/04/26' },
    { id: 2, name: 'User Percobaan', email: 'user@gmail.com', role: 'user', lastLogin: '25/04/26' },
  ]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Kelola Akun</h1>
          <p className="page-subtitle">Manajemen pengguna sistem dan hak akses (Admin/Pengguna).</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={18} /> Tambah Akun Baru
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} size={18} />
          <input 
            className="form-input" 
            placeholder="Cari nama atau email..." 
            style={{ paddingLeft: 40 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Email</th>
              <th>Role</th>
              <th>Login Terakhir</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '50%', 
                      background: u.role === 'admin' ? 'var(--black)' : 'var(--gray-100)',
                      color: u.role === 'admin' ? 'white' : 'var(--gray-600)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-spam' : 'badge-ham'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td>{u.lastLogin}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-sm btn-outline" style={{ padding: '6px' }} title="Edit"><Edit2 size={14} /></button>
                    <button className="btn btn-sm btn-outline" style={{ padding: '6px', color: '#ef4444', borderColor: '#fee2e2' }} title="Hapus"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
          Tidak ada akun yang ditemukan.
        </div>
      )}
    </div>
  );
}
