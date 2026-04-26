import { useState } from 'react';
import { Layers, Play, CheckCircle } from 'lucide-react';

const STEPS = [
  { key: 'raw', label: 'Dataset Baru', desc: 'Data email mentah sebelum preprocessing.' },
  { key: 'case', label: 'Case Folding', desc: 'Mengubah semua huruf menjadi lowercase.' },
  { key: 'token', label: 'Tokenisasi', desc: 'Memecah kalimat menjadi token individual (WordPiece).' },
  { key: 'stem', label: 'Stemming', desc: 'Mengubah kata berimbuhan ke bentuk dasar (Sastrawi).' },
  { key: 'stop', label: 'Stopword', desc: 'Menghapus kata umum yang tidak bermakna.' },
  { key: 'result', label: 'Hasil', desc: 'Data bersih siap diproses IndoBERT.' },
];

const DEMO = [
  { text: 'SELAMAT! Anda telah MEMENANGKAN hadiah Rp 100.000.000. Segera KLIK http://scam.com', label: 'spam' },
  { text: 'Mohon kehadiran Bapak/Ibu pada rapat evaluasi besok pukul 09:00 WIB.', label: 'ham' },
  { text: 'GRATIS!! Dapatkan iPhone 15 Pro Max dengan mengisi SURVEI di link bit.ly/free123', label: 'spam' },
  { text: 'Terlampir laporan keuangan bulanan periode Maret 2026. Mohon ditinjau.', label: 'ham' },
];

function process(text, step) {
  if (step === 'raw') return text;
  let t = text.toLowerCase();
  if (step === 'case') return t;
  if (step === 'token') return t.split(/\s+/).join(' | ');
  t = t.replace(/memenangkan/g, 'menang').replace(/kehadiran/g, 'hadir')
    .replace(/mengisi/g, 'isi').replace(/diadakan/g, 'ada')
    .replace(/ditinjau/g, 'tinjau').replace(/dapatkan/g, 'dapat').replace(/terlampir/g, 'lampir');
  if (step === 'stem') return t;
  const stops = ['yang','di','dan','ke','dari','pada','untuk','dengan','telah','akan','anda','ini','itu'];
  t = t.replace(/http\S+/g, '').replace(/[^\w\s]/g, '').replace(/\d+/g, '');
  t = t.split(/\s+/).filter(w => !stops.includes(w) && w.length > 1).join(' ');
  return t;
}

export default function PreprocessingPage() {
  const [tab, setTab] = useState('raw');
  const [done, setDone] = useState({ raw: true });
  const info = STEPS.find(s => s.key === tab);

  const handleRun = () => setDone(d => ({ ...d, [tab]: true }));

  return (
    <div>
      <div className="page-header"><h1>Pre-Processing</h1><p>Tahapan pembersihan dan normalisasi teks email.</p></div>

      <div className="tabs">
        {STEPS.map(s => (
          <button key={s.key} className={`tab ${tab === s.key ? 'active' : ''}`} onClick={() => setTab(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--black)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}><strong>{info.label}:</strong> {info.desc}</p>
        {tab !== 'raw' && !done[tab] && (
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleRun}>
            <Play size={14} /> Jalankan {info.label}
          </button>
        )}
        {done[tab] && tab !== 'raw' && (
          <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Selesai diterapkan pada {DEMO.length} data
          </div>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th style={{ width: 36 }}>No</th><th>Teks {done[tab] ? '(Setelah)' : '(Sebelum)'}</th><th style={{ width: 70 }}>Label</th></tr></thead>
            <tbody>
              {DEMO.map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{done[tab] ? process(d.text, tab) : d.text}</td>
                  <td><span className={`badge badge-${d.label}`}>{d.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
