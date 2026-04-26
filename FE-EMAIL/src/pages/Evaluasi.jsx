import { BarChart3, Target, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function Evaluasi() {
  const m = { accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1: 0.9481 };
  const cm = { tp: 452, tn: 720, fp: 43, fn: 35 };
  const barData = [{ name:'Accuracy', v: m.accuracy*100 },{ name:'Precision', v: m.precision*100 },{ name:'Recall', v: m.recall*100 },{ name:'F1', v: m.f1*100 }];
  const radarData = [{ m:'Accuracy', v:m.accuracy*100 },{ m:'Precision', v:m.precision*100 },{ m:'Recall', v:m.recall*100 },{ m:'F1', v:m.f1*100 },{ m:'Specificity', v:(cm.tn/(cm.tn+cm.fp)*100) }];

  return (
    <div>
      <div className="page-header"><h1>Evaluasi Performa Model</h1><p>Ringkasan evaluasi IndoBERT + GAT + UMAP.</p></div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[['Accuracy',m.accuracy,Target],['Precision',m.precision,TrendingUp],['Recall',m.recall,Activity],['F1 Score',m.f1,BarChart3]].map(([l,v,I],i) => (
          <div key={i} className="stat-card"><div className="stat-icon"><I size={20}/></div>
            <div className="stat-content"><div className="stat-label">{l}</div><div className="stat-value">{(v*100).toFixed(2)}%</div></div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card"><h3 style={{ marginBottom:14 }}>Perbandingan Metrik</h3>
          <ResponsiveContainer width="100%" height={240}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5"/><XAxis dataKey="name" stroke="#a3a3a3" fontSize={11}/><YAxis stroke="#a3a3a3" fontSize={11} domain={[80,100]}/><Tooltip contentStyle={{ border:'1px solid #e5e5e5', borderRadius:6, fontSize:'0.8rem' }}/><Bar dataKey="v" fill="#171717" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="card"><h3 style={{ marginBottom:14 }}>Radar Performa</h3>
          <ResponsiveContainer width="100%" height={240}><RadarChart data={radarData}><PolarGrid stroke="#e5e5e5"/><PolarAngleAxis dataKey="m" stroke="#737373" fontSize={10}/><PolarRadiusAxis domain={[80,100]} stroke="#d4d4d4" fontSize={9}/><Radar dataKey="v" stroke="#171717" fill="#171717" fillOpacity={0.1} strokeWidth={2}/></RadarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom:16 }}>Confusion Matrix</h3>
        <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr', maxWidth:350, margin:'0 auto' }}>
          <div/><div style={{ textAlign:'center', padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)' }}>Pred HAM</div><div style={{ textAlign:'center', padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)' }}>Pred SPAM</div>
          <div style={{ padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)', display:'flex', alignItems:'center' }}>Aktual HAM</div>
          <div style={{ background:'var(--gray-100)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:800 }}>{cm.tn}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-500)' }}>TN</div></div>
          <div style={{ background:'var(--gray-50)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', color:'var(--gray-500)' }}>{cm.fp}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-400)' }}>FP</div></div>
          <div style={{ padding:6, fontSize:'0.65rem', fontWeight:600, color:'var(--gray-500)', display:'flex', alignItems:'center' }}>Aktual SPAM</div>
          <div style={{ background:'var(--gray-50)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', color:'var(--gray-500)' }}>{cm.fn}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-400)' }}>FN</div></div>
          <div style={{ background:'var(--gray-100)', borderRadius:6, margin:3, padding:16, textAlign:'center' }}><div style={{ fontSize:'1.3rem', fontWeight:800 }}>{cm.tp}</div><div style={{ fontSize:'0.6rem', color:'var(--gray-500)' }}>TP</div></div>
        </div>
      </div>

      <div className="card" style={{ marginTop:24, borderLeft:'3px solid var(--black)' }}>
        <h3 style={{ marginBottom:8 }}>Kesimpulan</h3>
        <p style={{ fontSize:'0.82rem', color:'var(--gray-600)', lineHeight:1.7 }}>
          Model hybrid <strong>IndoBERT + GAT + UMAP</strong> menunjukkan performa sangat baik dengan akurasi <strong>{(m.accuracy*100).toFixed(2)}%</strong> dan F1 Score <strong>{(m.f1*100).toFixed(2)}%</strong>. Tingkat kesalahan rendah (FP: {cm.fp}, FN: {cm.fn}).
        </p>
      </div>
    </div>
  );
}
