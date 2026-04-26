import { useState } from 'react';
import { Database, Search, Filter, Trash2, Download } from 'lucide-react';

export default function DatasetPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Demo data
  const emails = [
    { id: 1, body: 'Selamat! Anda memenangkan hadiah Rp 100 juta. Klik link berikut untuk klaim.', label: 'spam', created_at: '2026-04-26' },
    { id: 2, body: 'Rapat akan diadakan besok pukul 09:00 di ruang meeting lantai 3.', label: 'ham', created_at: '2026-04-26' },
    { id: 3, body: 'GRATIS! Dapatkan iPhone terbaru dengan mengisi survei singkat ini.', label: 'spam', created_at: '2026-04-25' },
    { id: 4, body: 'Mohon kirimkan laporan bulanan sebelum hari Jumat.', label: 'ham', created_at: '2026-04-25' },
    { id: 5, body: 'Transfer Rp 500.000 ke rekening ini untuk verifikasi akun Anda.', label: 'spam', created_at: '2026-04-24' },
    { id: 6, body: 'Jadwal presentasi kelompok Anda minggu depan hari Selasa.', label: 'ham', created_at: '2026-04-24' },
    { id: 7, body: 'Anda terpilih sebagai pemenang undian berhadiah. Hubungi kami segera.', label: 'spam', created_at: '2026-04-23' },
    { id: 8, body: 'Saya ingin membahas proyek yang sedang kita kerjakan.', label: 'ham', created_at: '2026-04-23' },
  ];

  const filtered = emails.filter(e =>
    (filter === 'all' || e.label === filter) &&
    (search === '' || e.body.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header"><h1>Kelola Dataset</h1><p>Data email training untuk model.</p></div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--surface-500)' }} />
            <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Cari email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'spam', 'ham'].map(f => (
              <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setFilter(f)}>
                {f === 'all' ? 'Semua' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>ID</th><th>Isi Email</th><th>Label</th><th>Tanggal</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.body}</td>
                  <td><span className={`badge badge-${e.label}`}>{e.label}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--surface-400)' }}>{e.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--surface-400)' }}>
          Menampilkan {filtered.length} dari {emails.length} data
        </div>
      </div>
    </div>
  );
}
