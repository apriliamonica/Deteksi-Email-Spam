import { BarChart3, Clock, Sparkles } from 'lucide-react';

export default function Evaluasi() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ 
        width: 80, height: 80, borderRadius: '50%', background: 'var(--gray-100)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        color: 'var(--black)'
      }}>
        <BarChart3 size={40} />
      </div>
      
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Evaluasi Performa</h1>
      
      <div style={{ 
        display: 'inline-flex', alignItems: 'center', gap: 8, 
        padding: '8px 16px', background: 'var(--black)', color: 'white',
        borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, marginBottom: 24
      }}>
        <Clock size={16} /> Segera Hadir
      </div>
      
      <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem', maxWidth: 500, lineHeight: 1.6 }}>
        Halaman ini sedang dalam pengembangan. Nantinya, Anda akan dapat melihat analisis mendalam mengenai performa model, termasuk Confusion Matrix, kurva ROC-AUC, dan metrik stabilitas pelatihan.
      </p>

      <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
        <div style={{ padding: '12px 20px', background: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          <Sparkles size={14} style={{ color: '#f59e0b' }} /> Visualisasi UMAP
        </div>
        <div style={{ padding: '12px 20px', background: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          <Sparkles size={14} style={{ color: '#f59e0b' }} /> Analisis Confusion Matrix
        </div>
      </div>
    </div>
  );
}
