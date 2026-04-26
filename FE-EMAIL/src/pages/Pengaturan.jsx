import { useState } from 'react';
import { Settings, Save, Info } from 'lucide-react';

export default function Pengaturan() {
  const [params, setParams] = useState({
    finetune_epochs: 5, finetune_lr: 0.00002, batch_size: 16, weight_decay: 0.01,
    max_length: 256, umap_components: 128, umap_neighbors: 15, umap_min_dist: 0.1,
    gat_epochs: 30, gat_lr: 0.005, gat_weight_decay: 0.0005,
    gat_heads: 8, gat_hidden: 128, gat_dropout: 0.3, gat_attn_dropout: 0.3,
    test_split: 0.2, similarity_threshold: 0.5,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Field = ({ label, paramKey, step, hint }) => (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label">{label}</label>
      <input type="number" className="form-input" step={step || 1} value={params[paramKey]}
        onChange={e => setParams({ ...params, [paramKey]: +e.target.value })} />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );

  return (
    <div>
      <div className="page-header"><h1>Pengaturan Parameter</h1><p>Konfigurasi parameter IndoBERT, UMAP, dan GAT.</p></div>

      <div className="grid-2">
        {/* IndoBERT */}
        <div className="card">
          <h3 style={{ marginBottom: 16, color: 'var(--primary-400)' }}>🔤 IndoBERT (Fine-Tuning)</h3>
          <Field label="Epochs" paramKey="finetune_epochs" hint="Rekomendasi: 3-5" />
          <Field label="Learning Rate" paramKey="finetune_lr" step={0.00001} hint="Rekomendasi: 2e-5 ~ 5e-5" />
          <Field label="Batch Size" paramKey="batch_size" hint="Rekomendasi: 8 / 16 / 32" />
          <Field label="Weight Decay" paramKey="weight_decay" step={0.001} hint="Default: 0.01" />
          <Field label="Max Sequence Length" paramKey="max_length" hint="Default: 256" />
        </div>

        {/* UMAP */}
        <div className="card">
          <h3 style={{ marginBottom: 16, color: 'var(--accent-400)' }}>📐 UMAP (Dimensionality Reduction)</h3>
          <Field label="Output Dimensions" paramKey="umap_components" hint="Rekomendasi: 64-256" />
          <Field label="N Neighbors" paramKey="umap_neighbors" hint="Default: 15" />
          <Field label="Min Distance" paramKey="umap_min_dist" step={0.01} hint="Default: 0.1" />

          <h3 style={{ marginBottom: 16, marginTop: 24, color: 'var(--warning-400)' }}>📊 GAT (Graph Attention Network)</h3>
          <Field label="Epochs" paramKey="gat_epochs" hint="Rekomendasi: 20-50" />
          <Field label="Learning Rate" paramKey="gat_lr" step={0.001} hint="Default: 5e-3" />
          <Field label="Num Heads" paramKey="gat_heads" hint="Default: 8" />
          <Field label="Hidden Channels" paramKey="gat_hidden" hint="Default: 128" />
          <Field label="Dropout" paramKey="gat_dropout" step={0.05} hint="Default: 0.3" />
          <Field label="Attention Dropout" paramKey="gat_attn_dropout" step={0.05} hint="Default: 0.3" />
        </div>
      </div>

      {/* General & Save */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">Test Split Ratio</label>
            <input type="number" className="form-input" step={0.05} value={params.test_split}
              onChange={e => setParams({ ...params, test_split: +e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">Similarity Threshold (Graph)</label>
            <input type="number" className="form-input" step={0.05} value={params.similarity_threshold}
              onChange={e => setParams({ ...params, similarity_threshold: +e.target.value })} />
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleSave}>
            {saved ? <><Save size={18} /> Tersimpan!</> : <><Save size={18} /> Simpan Pengaturan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
