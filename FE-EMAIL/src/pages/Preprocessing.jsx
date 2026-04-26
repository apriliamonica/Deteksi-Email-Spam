import { useState } from 'react';
import { FileText, Type, SplitSquareHorizontal, Scissors, Filter, CheckSquare, ArrowRight, Play } from 'lucide-react';

const STEP_INFO = {
  'dataset-baru': {
    title: 'Dataset Baru',
    icon: FileText,
    description: 'Pilih dan tampilkan dataset mentah sebelum preprocessing.',
    detail: 'Menampilkan data email asli dari database sebelum dilakukan tahapan preprocessing apapun.',
  },
  'case-folding': {
    title: 'Case Folding',
    icon: Type,
    description: 'Mengubah semua huruf menjadi huruf kecil (lowercase).',
    detail: 'Case folding memastikan konsistensi teks. Contoh: "SELAMAT Anda MENANG" → "selamat anda menang"',
  },
  'tokenisasi': {
    title: 'Tokenisasi',
    icon: SplitSquareHorizontal,
    description: 'Memecah kalimat menjadi token-token (kata) individual.',
    detail: 'IndoBERT menggunakan WordPiece tokenizer. Contoh: "selamat anda menang" → ["selamat", "anda", "menang"]',
  },
  'stemming': {
    title: 'Stemming',
    icon: Scissors,
    description: 'Mengubah kata berimbuhan ke bentuk dasarnya menggunakan Sastrawi.',
    detail: 'Contoh: "berlari" → "lari", "mempermasalahkan" → "masalah", "pembelajaran" → "ajar"',
  },
  'stopword': {
    title: 'Stopword Removal',
    icon: Filter,
    description: 'Menghapus kata-kata umum yang tidak memiliki makna penting.',
    detail: 'Kata seperti "yang", "di", "dan", "ke", "dari" dihapus karena tidak memberikan informasi untuk klasifikasi.',
  },
  'hasil': {
    title: 'Hasil Pre-processing',
    icon: CheckSquare,
    description: 'Menampilkan hasil akhir setelah semua tahapan preprocessing.',
    detail: 'Data yang sudah bersih dan siap untuk diproses oleh IndoBERT.',
  },
};

const DEMO_DATA = [
  { id: 1, original: 'SELAMAT! Anda telah MEMENANGKAN hadiah Rp 100.000.000. Segera KLIK http://scam.com untuk klaim.', label: 'spam' },
  { id: 2, original: 'Mohon kehadiran Bapak/Ibu pada rapat evaluasi yang akan diadakan besok pukul 09:00 WIB.', label: 'ham' },
  { id: 3, original: 'GRATIS!! Dapatkan iPhone 15 Pro Max dengan mengisi SURVEI di link berikut: bit.ly/free123', label: 'spam' },
  { id: 4, original: 'Terlampir laporan keuangan bulanan untuk periode Maret 2026. Mohon ditinjau.', label: 'ham' },
];

function applyStep(text, step) {
  switch (step) {
    case 'dataset-baru': return text;
    case 'case-folding': return text.toLowerCase();
    case 'tokenisasi': return text.toLowerCase().split(/\s+/).join(' | ');
    case 'stemming': {
      const t = text.toLowerCase();
      return t.replace(/memenangkan/g, 'menang').replace(/kehadiran/g, 'hadir')
        .replace(/mengisi/g, 'isi').replace(/diadakan/g, 'ada').replace(/ditinjau/g, 'tinjau')
        .replace(/dapatkan/g, 'dapat').replace(/terlampir/g, 'lampir');
    }
    case 'stopword': {
      const stops = ['yang', 'di', 'dan', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'telah', 'akan', 'anda', 'ini', 'itu'];
      return text.toLowerCase().split(/\s+/).filter(w => !stops.includes(w)).join(' ');
    }
    case 'hasil': {
      const stops = ['yang', 'di', 'dan', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'telah', 'akan', 'anda', 'ini', 'itu'];
      let t = text.toLowerCase().replace(/http\S+/g, '').replace(/[^\w\s]/g, '').replace(/\d+/g, '');
      t = t.replace(/memenangkan/g, 'menang').replace(/kehadiran/g, 'hadir')
        .replace(/mengisi/g, 'isi').replace(/diadakan/g, 'ada').replace(/ditinjau/g, 'tinjau')
        .replace(/dapatkan/g, 'dapat').replace(/terlampir/g, 'lampir');
      return t.split(/\s+/).filter(w => !stops.includes(w) && w.length > 1).join(' ');
    }
    default: return text;
  }
}

export default function PreprocessingPage({ step = 'dataset-baru' }) {
  const [processed, setProcessed] = useState(false);
  const info = STEP_INFO[step] || STEP_INFO['dataset-baru'];
  const Icon = info.icon;

  const handleProcess = () => setProcessed(true);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={28} /> {info.title}
        </h1>
        <p>{info.description}</p>
      </div>

      {/* Info Card */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary-500)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--surface-300)' }}>{info.detail}</p>
        {step !== 'dataset-baru' && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleProcess}>
            <Play size={16} /> Jalankan {info.title}
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>
          {step === 'dataset-baru' ? 'Data Email Mentah' : processed ? `Hasil ${info.title}` : 'Data Email (sebelum proses)'}
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>No</th>
                <th>Teks {step !== 'dataset-baru' && processed ? '(Setelah)' : '(Sebelum)'}</th>
                <th style={{ width: 80 }}>Label</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DATA.map((d, i) => (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {step === 'dataset-baru' || !processed
                      ? d.original
                      : <span style={{ color: 'var(--accent-400)' }}>{applyStep(d.original, step)}</span>}
                  </td>
                  <td><span className={`badge badge-${d.label}`}>{d.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {step !== 'dataset-baru' && processed && (
          <div className="alert alert-success" style={{ marginTop: 16 }}>
            <CheckSquare size={16} /> {info.title} selesai diterapkan pada {DEMO_DATA.length} data.
          </div>
        )}
      </div>
    </div>
  );
}
