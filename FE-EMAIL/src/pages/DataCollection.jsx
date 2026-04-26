import { useState } from 'react';
import { Database, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function DataCollection() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [datasets, setDatasets] = useState([
    { id: 1, name: 'dataset_email_spam_id.csv', total: 10000, spam: 4200, ham: 5800, date: '2026-04-20' },
  ]);

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    await new Promise(r => setTimeout(r, 2000));
    setDatasets(prev => [...prev, {
      id: prev.length + 1, name: file.name, total: 500, spam: 210, ham: 290, date: new Date().toISOString().split('T')[0],
    }]);
    setUploadStatus('success');
    setFile(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Data Collection</h1>
        <p>Upload dan kelola dataset email untuk training model.</p>
      </div>

      {/* Upload Area */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={20} /> Upload Dataset
        </h3>
        <div className={`file-upload ${file ? 'active' : ''}`}
          onClick={() => document.getElementById('fileInput').click()}>
          <FileSpreadsheet size={40} style={{ color: 'var(--surface-500)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--surface-200)' }}>
            {file ? file.name : 'Klik atau drag file CSV ke sini'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--surface-500)', marginTop: 6 }}>
            Format: CSV dengan kolom <strong>"text"</strong> (isi email) dan <strong>"label"</strong> (spam/ham)
          </p>
          <input id="fileInput" type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
        </div>
        {file && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={handleUpload} disabled={uploadStatus === 'uploading'}>
              {uploadStatus === 'uploading' ? <><div className="spinner" /> Mengupload...</>
                : uploadStatus === 'success' ? <><CheckCircle size={16} /> Berhasil</>
                : <><Upload size={16} /> Upload Dataset</>}
            </button>
            <button className="btn btn-outline" onClick={() => { setFile(null); setUploadStatus(null); }}>Batal</button>
          </div>
        )}
        {uploadStatus === 'success' && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            <CheckCircle size={16} /> Dataset berhasil diupload dan disimpan ke database.
          </div>
        )}
      </div>

      {/* Dataset List */}
      <div className="card">
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={20} /> Dataset Tersimpan
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Nama File</th><th>Total</th><th>Spam</th><th>Ham</th><th>Tanggal</th></tr>
            </thead>
            <tbody>
              {datasets.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td>{d.total.toLocaleString()}</td>
                  <td><span className="badge badge-spam">{d.spam.toLocaleString()}</span></td>
                  <td><span className="badge badge-ham">{d.ham.toLocaleString()}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--surface-400)' }}>{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
