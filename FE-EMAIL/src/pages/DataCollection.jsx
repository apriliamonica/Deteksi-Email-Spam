import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Upload, FileSpreadsheet, CheckCircle, Clock, Trash2, Layers, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { emailAPI, modelAPI } from '../services/api';

export default function DataCollection() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [previewStats, setPreviewStats] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [error, setError] = useState(null);

  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await modelAPI.listDatasets();
      setDatasets(response.data);
    } catch (err) {
      console.error("Gagal mengambil dataset:", err);
      setError("Gagal mengambil daftar dataset dari server.");
    } finally {
      setLoading(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(datasets.length / itemsPerPage);

  const currentData = datasets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedForPre, setSelectedForPre] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setUploadProgress(0);
    setError(null);

    // Basic estimation: 1MB takes about 3-5 seconds to process on average
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedSeconds = Math.max(2, Math.ceil(fileSizeMB * 3));
    setEstimatedTime(estimatedSeconds);

    try {
      const response = await modelAPI.uploadDataset(file, datasetName, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted * 0.7); // 0-70% for actual upload
        } else {
          // If total is not available, just show some progress based on loaded bytes
          // but cap it at 65% until finished
          const loadedMB = progressEvent.loaded / (1024 * 1024);
          setUploadProgress(Math.min(65, loadedMB * 10));
        }
      });

      // Once upload is done (response received), move to 70% and start simulation for backend processing
      setUploadProgress(70);
      let currentProgress = 70;
      const interval = setInterval(() => {
        currentProgress += 2;
        if (currentProgress >= 98) {
          clearInterval(interval);
        } else {
          setUploadProgress(currentProgress);
        }
      }, 500);

      const data = response.data;

      if (data.status === 'success') {
        clearInterval(interval);
        setUploadProgress(100);

        const newDataset = {
          id: data.metrics.dataset_id,
          name: datasetName || file.name,
          total_rows: data.metrics.total_uploaded,
          spam_count: data.metrics.spam,
          ham_count: data.metrics.ham,
          created_at: new Date().toISOString(),
          status: 'Uploaded'
        };

        setTimeout(() => {
          setDatasets(prev => [newDataset, ...prev]);
          setUploadStatus('success');
          setFile(null);
          setPreviewStats(null);
          setSelectedForPre(newDataset);
          setShowConfirm(true);
        }, 500);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.detail || "Gagal mengunggah file. Pastikan format CSV benar dan server aktif.");
      setUploadStatus(null);
    }
  };

  const handleSeedLocal = async () => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setError(null);
    setEstimatedTime(5); // Fast for local files

    try {
      // Simulate some progress since it's server-side
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 90) {
          clearInterval(interval);
        } else {
          setUploadProgress(currentProgress);
        }
      }, 200);

      const response = await modelAPI.seedLocal();
      const data = response.data;

      if (data.status === 'success') {
        clearInterval(interval);
        setUploadProgress(100);

        const newDataset = {
          id: data.metrics.dataset_id,
          name: "dataset_translated.csv (Local Server)",
          total_rows: data.metrics.total_uploaded,
          spam_count: data.metrics.spam,
          ham_count: data.metrics.ham,
          created_at: new Date().toISOString(),
          status: 'Uploaded'
        };

        setTimeout(() => {
          setDatasets(prev => [newDataset, ...prev]);
          setUploadStatus('success');
          setSelectedForPre(newDataset);
          setShowConfirm(true);
        }, 500);
      }
    } catch (err) {
      console.error("Seed error:", err);
      setError(err.response?.data?.detail || "Gagal mengimport dataset lokal. Pastikan file ada di folder 'app/data/'.");
      setUploadStatus(null);
    }
  };

  const confirmPreProcessing = () => {
    setShowConfirm(false);
    // Navigate to preprocessing page
    navigate('/preprocessing', { state: { selectedDatasetId: selectedForPre.id, datasetName: selectedForPre.name } });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus dataset ini? Data yang dihapus tidak dapat dikembalikan.")) {
      try {
        await modelAPI.deleteDataset(id);
        setDatasets(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        console.error("Gagal menghapus dataset:", err);
        alert("Gagal menghapus dataset. Silakan coba lagi.");
      }
    }
  };

  const isBalanced = (spam, ham) => {
    if (spam === 0 || ham === 0) return false;
    const ratio = Math.abs(spam - ham) / (spam + ham);
    return ratio <= 0.2; // Balanced if difference is within 20% of total
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Data Collection</h1>
        <p className="page-subtitle">Upload dan kelola dataset email mentah sebelum masuk ke tahap pembersihan (Pre-processing).</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Left: Upload Area */}
        <div style={{ maxWidth: 500 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={16} /> Upload Dataset Baru
            </h3>
            <button
              className="btn btn-outline"
              style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={18} />
              {file ? file.name : 'Upload Dataset'}
            </button>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--black)' }}>Syarat Format Dataset (CSV/Excel):</div>
              <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Wajib ada kolom <strong>label</strong> (isi: <code>spam</code> / <code>ham</code> atau <code>1</code> / <code>0</code>).</li>
                <li>Wajib ada kolom teks email (nama: <strong>text</strong>, <strong>body</strong>, atau <strong>text_id</strong>).</li>
                <li>(Opsional) Kolom <strong>subject</strong> untuk subjek email.</li>
                <li>(Opsional) Kolom <strong>sender</strong> untuk alamat email pengirim.</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={async e => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  setFile(selectedFile);
                  setDatasetName(selectedFile.name);
                  setError(null);
                  setUploadStatus(null);
                  setPreviewStats(null);
                  setPreviewing(true);
                  try {
                    const res = await modelAPI.previewDataset(selectedFile);
                    setPreviewStats(res.data.metrics);
                  } catch (err) {
                    console.error("Preview error:", err);
                    setError(err.response?.data?.detail || "Gagal membaca preview file dataset.");
                  } finally {
                    setPreviewing(false);
                  }
                }
              }}
              style={{ display: 'none' }}
            />

            {previewing && (
              <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--gray-500)' }}>
                <Activity className="spinner" size={24} style={{ marginBottom: 8 }} />
                <p>Membaca dataset...</p>
              </div>
            )}

            {file && previewStats && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
              <div style={{ marginTop: 20, animation: 'fadeIn 0.3s ease' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'block' }}>Nama Dataset</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={datasetName} 
                    onChange={e => setDatasetName(e.target.value)} 
                  />
                </div>
                
                <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12 }}>Detail Dataset</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--black)' }}>{previewStats.total.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Total Baris</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{previewStats.spam.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Spam</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{previewStats.ham.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Non-Spam</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setFile(null); setPreviewStats(null); }}>Kembali</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpload}>Simpan Dataset</button>
                </div>
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div style={{ marginTop: 24, animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>
                    {uploadProgress < 70 ? 'Mengunggah file...' : 'Memproses dataset di server...'}
                  </span>
                  <span style={{ fontWeight: 800 }}>{Math.round(uploadProgress)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      background: 'var(--black)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                  <Clock size={12} /> Estimasi waktu: ~{estimatedTime} detik
                </div>
              </div>
            )}


            {uploadStatus === 'success' && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} /> Berhasil ditambahkan!
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.75rem', lineHeight: 1.4 }}>
                <strong>Gagal Upload:</strong> {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Dataset List */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={18} /> Daftar Dataset Mentah
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total: {datasets.length} Dataset</div>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Nama Dataset</th>
                    <th>Spam</th>
                    <th>Ham</th>
                    <th>Total</th>
                    <th>Balance</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((d, idx) => (
                    <tr key={d.id}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>
                          {new Date(d.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-spam" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{d.spam_count?.toLocaleString() || 0}</span>
                      </td>
                      <td>
                        <span className="badge badge-ham" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{d.ham_count?.toLocaleString() || 0}</span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{d.total_rows?.toLocaleString() || 0}</td>
                      <td>
                        {isBalanced(d.spam_count, d.ham_count) ? (
                          <span className="badge badge-ham" style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.65rem' }}>
                            Balanced
                          </span>
                        ) : (
                          <span className="badge badge-spam" style={{ background: '#f59e0b', color: 'white', border: 'none', fontSize: '0.65rem' }}>
                            Imbalance
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            className="btn btn-sm btn-primary"
                            title="Lanjut ke Pre-processing"
                            onClick={() => { setSelectedForPre(d); setShowConfirm(true); }}
                            style={{ padding: '6px 10px' }}
                          >
                            <Layers size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ padding: '6px', color: '#ef4444', borderColor: '#fee2e2' }}
                            title="Hapus"
                            onClick={() => handleDelete(d.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{ padding: '16px 20px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                Halaman {currentPage} dari {totalPages}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ maxWidth: 400, width: '90%', textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: 'var(--gray-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto'
            }}>
              <Layers size={30} style={{ color: 'var(--black)' }} />
            </div>
            <h3 style={{ marginBottom: 12 }}>Lanjut ke Pre-processing?</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              Dataset <strong>"{selectedForPre?.name}"</strong> telah siap. Ingin langsung melakukan pembersihan data (Pre-processing) sekarang?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary btn-lg" onClick={confirmPreProcessing}>
                Ya, Lanjut Sekarang
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => { setShowConfirm(false); setUploadStatus(null); }}>
                Tidak, Simpan Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
