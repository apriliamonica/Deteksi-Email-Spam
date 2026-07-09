import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle, FileText, Database, Loader2, X, Info } from 'lucide-react';
import { modelAPI } from '../services/api';
import Pagination from '../components/Pagination';

export default function RiwayatPreprocessingPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // ⚙️ PAGINATION: Ubah angka ini untuk mengatur jumlah dataset per halaman (daftar utama)
  const [detailPage, setDetailPage] = useState(1);
  const detailItemsPerPage = 10; // ⚙️ PAGINATION: Ubah angka ini untuk mengatur jumlah baris data per halaman (di dalam modal detail)

  const fetchHistory = async () => {
    try {
      const res = await modelAPI.listDatasets();
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this dataset from database?")) {
      try {
        await modelAPI.deleteDataset(id);
        setHistory(history.filter(h => h.id !== id));
      } catch (err) {
        alert("Failed to delete dataset: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleShowDetail = async (dataset) => {
    setSelectedDataset(dataset);
    setDetailPage(1);
    setDetailLoading(true);
    try {
      const res = await modelAPI.getDatasetRows(dataset.id);
      setDetailRows(res.data.rows || res.data);
    } catch (err) {
      console.error("Failed to load dataset detail:", err);
      alert("Failed to load dataset detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const renderWithBadges = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[URL\]|\[EMAIL\])/g);
    return parts.map((part, i) => {
      if (part === '[URL]') {
        return <span key={i} style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, margin: '0 2px', display: 'inline-block' }}>[URL]</span>;
      } else if (part === '[EMAIL]') {
        return <span key={i} style={{ background: '#ffedd5', color: '#ea580c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, margin: '0 2px', display: 'inline-block' }}>[EMAIL]</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = history.slice(startIndex, startIndex + itemsPerPage);

  const totalDetailPages = Math.ceil(detailRows.length / detailItemsPerPage);
  const detailStartIndex = (detailPage - 1) * detailItemsPerPage;
  const paginatedDetailRows = detailRows.slice(detailStartIndex, detailStartIndex + detailItemsPerPage);

  return (
    <div className="page-container page-riwayat-preproc w-full animate-in fade-in duration-300">
      <style>{`
        .tooltip-content {
          visibility: hidden;
          opacity: 0;
          transition: all 0.2s ease-in-out;
        }
        .tooltip-container:hover .tooltip-content {
          visibility: visible;
          opacity: 1;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Preprocessing History</h1>
        <p style={{ color: 'var(--gray-500)' }}>List of all datasets that have been cleaned and are ready to be used for model training.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                <th><Calendar size={16} /> Date</th>
                <th>Dataset Name</th>
                <th>Total Data</th>
                <th>Spam</th>
                <th>Ham</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px auto', color: 'var(--gray-400)' }} />
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Loading history...</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No dataset history yet.</p>
                  </td>
                </tr>
              ) : (
                paginatedHistory.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} style={{ color: 'var(--gray-400)' }} /> {item.name}
                    </td>
                    <td style={{ fontWeight: 600 }}>{(item.total_rows || 0).toLocaleString()}</td>
                    <td style={{ color: '#ef4444' }}>{(item.spam_count || 0).toLocaleString()}</td>
                    <td style={{ color: '#10b981' }}>{(item.ham_count || 0).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-ham" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> {item.status || 'Completed'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" title="Use Dataset"><Database size={14} /></button>
                        {(item.status === 'Selesai' || item.status === 'Completed') && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleShowDetail(item)} title="View Preprocessing Detail">
                            <FileText size={14} />
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', borderColor: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--app-border)', display: 'flex', justifyContent: 'center', background: 'var(--app-bg)/10' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {selectedDataset && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ background: 'white', padding: 0, width: '90%', maxWidth: 1200, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> Preprocessing Detail – {selectedDataset.name}</h3>
                <div className="tooltip-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'help' }}>
                  <Info size={16} style={{ color: 'var(--gray-500)' }} />
                  <div className="tooltip-content" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-10%)',
                    width: 320, background: '#1e293b', color: 'white', padding: '16px', borderRadius: '8px', 
                    fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', zIndex: 100, pointerEvents: 'none'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: 6 }}>Preprocessing Rules</h4>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.4 }}>
                      <li><strong>Masking:</strong> Links 🌐 are replaced with <code>[URL]</code> and emails ✉️ with <code>[EMAIL]</code>.</li>
                      <li><strong>Symbol Cleaning:</strong> Special characters (#, @, &, etc.) are removed, only keeping letters, numbers, and basic punctuation (?, !, .).</li>
                      <li><strong>Space Normalization:</strong> Extra spaces are trimmed to a single space.</li>
                      <li><strong>Text Limit:</strong> Text is truncated to a maximum of <strong>512 characters</strong> to fit the token memory capacity of <em>IndoBERT</em>.</li>
                    </ul>
                    <div style={{ position: 'absolute', top: '-4px', left: '10%', transform: 'translateX(-50%)', borderBottom: '5px solid #1e293b', borderLeft: '5px solid transparent', borderRight: '5px solid transparent' }} />
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDataset(null)} className="btn btn-outline btn-sm" style={{ padding: 4, borderRadius: '50%' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>Loading details...</div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <th style={{ width: 50, textAlign: 'center', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>No</th>
                        <th style={{ width: 180, border: '1px solid var(--gray-200)', padding: '12px 16px' }}>Sender</th>
                        <th style={{ width: '35%', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>Before (Original)</th>
                        <th style={{ width: '35%', border: '1px solid var(--gray-200)', padding: '12px 16px' }}>After (Preprocessed)</th>
                        <th style={{ width: 70, textAlign: 'center', border: '1px solid var(--gray-200)', padding: '12px 8px' }}>Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDetailRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem', border: '1px solid var(--gray-200)', padding: '16px 8px', verticalAlign: 'top' }}>
                            {detailStartIndex + idx + 1}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--gray-700)', border: '1px solid var(--gray-200)', padding: '16px', verticalAlign: 'top', wordBreak: 'break-all' }}>
                            {row.sender || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unknown</span>}
                          </td>
                          <td style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--gray-700)', maxWidth: 350, wordBreak: 'break-word', border: '1px solid var(--gray-200)', padding: '16px', verticalAlign: 'top' }}>
                            <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--gray-200)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--black)', display: 'block', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject:</span>
                              {row.subject ? row.subject : <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No subject</span>}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--black)', display: 'block', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message Body:</span>
                              {row.original_text || row.text || row.body || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>-</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 350, wordBreak: 'break-word', border: '1px solid var(--gray-200)', padding: '16px', verticalAlign: 'top' }}>
                            {row.processed_text || row.processed_body ? (
                              <>
                                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--gray-200)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--black)', display: 'block', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject (Cleaned):</span>
                                  {row.subject ? renderWithBadges(row.subject) : <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No subject</span>}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--black)', display: 'block', marginBottom: 4, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message Body (Cleaned Combined):</span>
                                  <span style={{ color: '#334155' }}>{renderWithBadges(row.processed_text || row.processed_body)}</span>
                                </div>
                              </>
                            ) : (
                              <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Not yet processed</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', border: '1px solid var(--gray-200)', padding: '16px 8px', verticalAlign: 'top' }}>
                            <span className={row.label === 'spam' ? 'badge badge-spam' : row.label === 'ham' ? 'badge badge-ham' : 'badge'} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                              {row.label || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalDetailPages > 1 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'center' }}>
                      <Pagination
                        currentPage={detailPage}
                        totalPages={totalDetailPages}
                        onPageChange={(p) => setDetailPage(p)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
