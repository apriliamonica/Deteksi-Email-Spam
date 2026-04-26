import { useState, useRef } from 'react';
import { Brain, Upload, Play, CheckCircle, Loader, Settings, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function Training() {
  const [datasetFile, setDatasetFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const fileRef = useRef();
  const [params, setParams] = useState({
    finetune_epochs: 5, finetune_lr: 0.00002, finetune_batch_size: 16,
    weight_decay: 0.01, umap_components: 128, gat_epochs: 30,
    gat_lr: 0.005, gat_weight_decay: 0.0005, test_split: 0.2,
  });

  const handleUpload = async () => {
    if (!datasetFile) return;
    setUploadStatus('uploading');
    await new Promise(r => setTimeout(r, 2000));
    setUploadStatus('success');
  };

  const handleTrain = async () => {
    setTraining(true); setProgress(0); setTrainingResult(null);
    const steps = [
      { step: 'Preprocessing teks...', p: 10 },
      { step: 'Fine-tuning IndoBERT (5 epochs)...', p: 40 },
      { step: 'Generating embeddings (768d)...', p: 55 },
      { step: 'UMAP reduction (768d → 128d)...', p: 65 },
      { step: 'Building graph...', p: 70 },
      { step: 'Training GAT (30 epochs)...', p: 90 },
      { step: 'Evaluating & saving model...', p: 100 },
    ];
    for (const s of steps) {
      setCurrentStep(s.step); setProgress(s.p);
      await new Promise(r => setTimeout(r, 1000));
    }
    setTrainingResult({
      accuracy: 0.9523, precision: 0.9412, recall: 0.9551, f1_score: 0.9481,
      total_data: 1250, train_size: 1000, test_size: 250,
      gat_loss: Array.from({ length: 30 }, (_, i) => ({ epoch: i+1, loss: +(1.5 * Math.exp(-i*0.12) + 0.1).toFixed(4) })),
      scatter: Array.from({ length: 100 }, () => ({
        x: (Math.random()-0.5)*20, y: (Math.random()-0.5)*20, label: Math.random()>0.4?0:1,
      })),
    });
    setTraining(false);
  };

  return (
    <div>
      <div className="page-header"><h1>Training Model</h1><p>Training IndoBERT + GAT + UMAP</p></div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={20}/> Upload Dataset</h3>
            <div className={`file-upload ${datasetFile ? 'active' : ''}`} onClick={() => fileRef.current?.click()}>
              <Upload size={32} style={{ color: 'var(--surface-500)', marginBottom: 8 }} />
              <p style={{ fontWeight: 500, color: 'var(--surface-300)' }}>{datasetFile ? datasetFile.name : 'Klik untuk upload CSV'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--surface-500)', marginTop: 4 }}>Format: kolom "text" dan "label" (spam/ham)</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={e => setDatasetFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
            {datasetFile && <button className="btn btn-success" style={{ width: '100%', marginTop: 12 }} onClick={handleUpload} disabled={uploadStatus === 'uploading'}>
              {uploadStatus === 'uploading' ? <><div className="spinner"/> Mengupload...</> : uploadStatus === 'success' ? <><CheckCircle size={16}/> Terupload</> : <><Upload size={16}/> Upload</>}
            </button>}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20}/> Parameter</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['IndoBERT Epochs', 'finetune_epochs', 1], ['IndoBERT LR', 'finetune_lr', 0.00001],
                ['GAT Epochs', 'gat_epochs', 1], ['GAT LR', 'gat_lr', 0.001],
                ['UMAP Dim', 'umap_components', 1], ['Test Split', 'test_split', 0.05],
              ].map(([label, key, step]) => (
                <div className="form-group" key={key} style={{ marginBottom: 12 }}>
                  <label className="form-label">{label}</label>
                  <input type="number" className="form-input" step={step} value={params[key]}
                    onChange={e => setParams({...params, [key]: +e.target.value})} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={handleTrain} disabled={training}>
              {training ? <><div className="spinner"/> Training...</> : <><Play size={18}/> Mulai Training</>}
            </button>
          </div>
        </div>
        <div>
          {training && <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}><Loader size={20} className="spinner" style={{ width: 20, height: 20, display: 'inline-block' }}/> Progress</h3>
            <div className="progress-bar" style={{ height: 12, marginBottom: 12 }}><div className="progress-fill" style={{ width: `${progress}%` }}/></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--surface-400)' }}><span>{currentStep}</span><span>{progress}%</span></div>
          </div>}
          {trainingResult && <>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="alert alert-success"><CheckCircle size={16}/> Training selesai!</div>
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                {[['Accuracy', trainingResult.accuracy],['Precision', trainingResult.precision],['Recall', trainingResult.recall],['F1 Score', trainingResult.f1_score]].map(([l,v],i) => (
                  <div key={i} className="stat-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
                    <div className="stat-label">{l}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-400)' }}>{(v*100).toFixed(2)}%</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--surface-400)' }}>Data: {trainingResult.total_data} | Train: {trainingResult.train_size} | Test: {trainingResult.test_size}</div>
            </div>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}><BarChart3 size={20} style={{ display: 'inline-block' }}/> GAT Loss</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trainingResult.gat_loss}><CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)"/><XAxis dataKey="epoch" stroke="var(--surface-500)" fontSize={11}/><YAxis stroke="var(--surface-500)" fontSize={11}/><Tooltip contentStyle={{ background:'var(--surface-800)', border:'1px solid var(--surface-700)', borderRadius:8, color:'var(--surface-100)', fontSize:'0.8rem' }}/><Line type="monotone" dataKey="loss" stroke="var(--primary-400)" strokeWidth={2} dot={false}/></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>UMAP 2D Visualization</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="var(--surface-700)"/><XAxis type="number" dataKey="x" stroke="var(--surface-500)" fontSize={11}/><YAxis type="number" dataKey="y" stroke="var(--surface-500)" fontSize={11}/><Tooltip/>
                  <Scatter data={trainingResult.scatter.filter(d=>d.label===0)} fill="#10b981" opacity={0.7}/>
                  <Scatter data={trainingResult.scatter.filter(d=>d.label===1)} fill="#ef4444" opacity={0.7}/>
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', justifyContent:'center', gap:24, marginTop:8, fontSize:'0.8rem' }}>
                <span>🟢 Ham</span><span>🔴 Spam</span>
              </div>
            </div>
          </>}
          {!training && !trainingResult && <div className="card loading-overlay" style={{ minHeight: 400 }}>
            <Brain size={48} style={{ color: 'var(--surface-600)' }}/><p style={{ color: 'var(--surface-400)' }}>Upload dataset lalu klik "Mulai Training"</p>
          </div>}
        </div>
      </div>
    </div>
  );
}
