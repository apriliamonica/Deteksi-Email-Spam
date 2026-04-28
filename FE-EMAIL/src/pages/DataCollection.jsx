import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Upload, FileSpreadsheet, CheckCircle, Clock, Trash2, Layers, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { emailAPI } from '../services/api';

export default function DataCollection() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  
  // Mock data for datasets with Status and Pagination
  const [datasets, setDatasets] = useState([
    { id: 1, name: 'Dataset Email 2024.csv', total: 12500, spam: 4100, ham: 8400, date: '29/04/26', status: 'Completed' },
    { id: 2, name: 'Koleksi Spam Lokal.csv', total: 3200, spam: 3200, ham: 0, date: '28/04/26', status: 'Completed' },
    { id: 3, name: 'Email Promosi Market.csv', total: 890, spam: 450, ham: 440, date: '27/04/26', status: 'Pending' },
    { id: 4, name: 'Bahan Training GAT.csv', total: 5600, spam: 2100, ham: 3500, date: '26/04/26', status: 'Pending' },
    { id: 5, name: 'Dataset Dummy.csv', total: 100, spam: 50, ham: 50, date: '25/04/26', status: 'Pending' },
    { id: 6, name: 'Email Baru Mei.csv', total: 1200, spam: 300, ham: 900, date: '01/05/26', status: 'Pending' },
  ]);

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
    await new Promise(r => setTimeout(r, 1500));
    const newDataset = {
      id: Date.now(),
      name: file.name,
      total: 750,
      spam: 300,
      ham: 450,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      status: 'Pending'
    };
    setDatasets(prev => [newDataset, ...prev]);
    setUploadStatus('success');
    setFile(null);
    
    // Auto-prompt for pre-processing after upload
    setSelectedForPre(newDataset);
    setShowConfirm(true);
  };

  const confirmPreProcessing = () => {
    // Update local status to "Processing"
    setDatasets(prev => prev.map(d => d.id === selectedForPre.id ? { ...d, status: 'Processing' } : d));
    setShowConfirm(false);
    // Navigate to preprocessing page
    navigate('/preprocessing', { state: { selectedDatasetId: selectedForPre.id, datasetName: selectedForPre.name } });
  };

  const handleDelete = (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus dataset ini? Data yang dihapus tidak dapat dikembalikan.")) {
      setDatasets(prev => prev.filter(d => d.id !== id));
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

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
        {/* Left: Upload Area */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={18} /> Upload Dataset Baru
            </h3>
            <div className={`file-upload ${file ? 'active' : ''}`}
              onClick={() => document.getElementById('fileInput').click()}
              style={{ padding: '40px 20px', borderStyle: 'dashed' }}>
              <FileSpreadsheet size={48} style={{ color: file ? 'var(--black)' : 'var(--gray-300)', marginBottom: 16, transition: 'all 0.3s ease' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
                {file ? file.name : 'Pilih file CSV'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                Klik untuk mencari file (.csv)
              </p>
              <input id="fileInput" type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
            
            {file && (
              <div style={{ marginTop: 24, display: 'flex', gap: 12, animation: 'fadeIn 0.3s ease' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpload} disabled={uploadStatus === 'uploading'}>
                  {uploadStatus === 'uploading' ? <><Activity size={16} className="spinner" /> Mengirim...</>
                    : <><Upload size={16} /> Upload Sekarang</>}
                </button>
                <button className="btn btn-outline" onClick={() => setFile(null)}>Batal</button>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} /> Berhasil ditambahkan!
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
                        <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>{d.date}</div>
                      </td>
                      <td>
                        <span className="badge badge-spam" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{d.spam.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="badge badge-ham" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{d.ham.toLocaleString()}</span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{d.total.toLocaleString()}</td>
                      <td>
                        {isBalanced(d.spam, d.ham) ? (
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
