import { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Shield, User, X, Activity } from 'lucide-react';
import { usersAPI } from '../services/api';
import Pagination from '../components/Pagination';

export default function ManageAccounts() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.list();
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', email: '', password: '', role: 'user' });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus akun ini?")) return;
    try {
      await usersAPI.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert("Gagal menghapus user: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (modalMode === 'add') {
        if (!formData.password) {
          setError("Password wajib diisi untuk akun baru");
          setSaving(false); return;
        }
        await usersAPI.create(formData);
      } else {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // don't update password if empty
        await usersAPI.update(selectedUser.id, payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container page-manage-accounts">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Kelola Akun</h1>
          <p className="page-subtitle">Manajemen pengguna sistem dan hak akses (Admin/Pengguna).</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
            <Activity className="spinner" size={24} style={{ margin: '0 auto 12px' }} />
            <p>Memuat data pengguna...</p>
          </div>
        ) : (
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
              {paginatedUsers.map(u => (
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
                        {u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
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
                  <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{u.last_login || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openEditModal(u)} style={{ padding: '6px' }} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(u.id)} style={{ padding: '6px', color: '#ef4444', borderColor: '#fee2e2' }} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--app-border)', display: 'flex', justifyContent: 'center', background: 'var(--app-bg)/10', marginBottom: 24 }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
          Tidak ada akun yang ditemukan.
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{modalMode === 'add' ? 'Tambah Akun Baru' : 'Edit Akun'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email</label>
                <input required type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Password {modalMode === 'edit' && <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(Kosongkan jika tidak ingin diubah)</span>}</label>
                <input type="password" placeholder={modalMode === 'edit' ? "Biarkan kosong..." : "Masukkan password baru"} className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
