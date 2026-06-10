import re

with open('src/pages/Processing.jsx', 'r') as f:
    content = f.read()

start_marker = "                                  {activeModelTab === 'indobert' ? ("
# find the end of the else block for the tabs
end_marker = "                                  )}\n                                </div>\n                              </div>\n                            </div>\n\n                            "

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print(f"Marker not found! start={start_idx}, end={end_idx}")
    exit(1)

# We replace from start_marker to end of the else block
end_idx_full = end_idx + len(end_marker)

new_params = """                                  {activeModelTab === 'indobert' ? (
                                    <div style={{ overflowY: 'auto' }}>
                                      {/* INPUT LAYER */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: 'var(--gmail-blue)' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input Layer (Tokenizer & Embedding)</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Max Sequence Length</label>
                                            <input className="form-input" type="number" value={maxSeqLength} onChange={(e) => setMaxSeqLength(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Panjang token maks, default: 512</span>
                                          </div>
                                          <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Tokenizer</label>
                                            <input className="form-input" value="WordPiece (IndoBERT)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Bawaan IndoBERT, tidak dapat diubah</span>
                                          </div>
                                          <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Padding</label>
                                            <input className="form-input" value="max_length" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Truncation</label>
                                            <input className="form-input" value="True (otomatis)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* HIDDEN LAYER */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#8b5cf6' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hidden Layer (Encoder IndoBERT)</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Hidden Size</label>
                                            <input className="form-input" value="768" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Hidden Layers</label>
                                            <input className="form-input" value="12" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Attention Heads</label>
                                            <input className="form-input" value="12" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Intermediate Size</label>
                                            <input className="form-input" value="3072" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Hidden Activation</label>
                                            <input className="form-input" value="GELU" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Hidden Dropout</label>
                                            <input className="form-input" value="0.1" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* OUTPUT LAYER */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#10b981' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Output Layer (Classification Head)</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Dropout Rate</label>
                                            <input className="form-input" type="number" step="0.1" value={dropoutRate} onChange={(e) => setDropoutRate(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 0.1</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Num Labels</label>
                                            <input className="form-input" value="2 (Spam / Ham)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Activation</label>
                                            <input className="form-input" value="Softmax" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Loss Function</label>
                                            <input className="form-input" value="CrossEntropyLoss" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Classifier Input</label>
                                            <input className="form-input" value="768 (hidden_size)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* FINE-TUNING */}
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#f59e0b' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parameter Fine-Tuning</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Learning Rate</label>
                                            <input className="form-input" type="number" step="0.00001" value={indoLR} onChange={(e) => setIndoLR(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Rentang: 2e-5 – 5e-5</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Batch Size</label>
                                            <input className="form-input" type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Pilihan: 8 / 16 / 32</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Epochs</label>
                                            <input className="form-input" type="number" value={indoEpochs} onChange={(e) => setIndoEpochs(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Rentang: 3 – 5</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Optimizer</label>
                                            <select className="form-select" value={optimizer} onChange={(e) => setOptimizer(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }}>
                                              <option value="AdamW">AdamW</option>
                                              <option value="Adam">Adam</option>
                                              <option value="SGD">SGD</option>
                                            </select>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Weight Decay</label>
                                            <input className="form-input" type="number" step="0.01" value={weightDecay} onChange={(e) => setWeightDecay(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 0.01</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Warmup Steps</label>
                                            <input className="form-input" type="number" value={warmupSteps} onChange={(e) => setWarmupSteps(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ overflowY: 'auto' }}>
                                      {/* GAT: Input Projection */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: 'var(--gmail-blue)' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input Projection Layer</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Input Dim (BERT)</label>
                                            <input className="form-input" value="768 (dari IndoBERT)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Hidden Dim</label>
                                            <input className="form-input" value="128" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Normalisasi</label>
                                            <input className="form-input" value="BatchNorm1d" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Aktivasi</label>
                                            <input className="form-input" value="ReLU" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Dropout</label>
                                            <input className="form-input" type="number" step="0.1" value={dropoutRate} onChange={(e) => setDropoutRate(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 0.4</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* GAT: Graph Attention Layers */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#8b5cf6' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Graph Attention Layers</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>GAT Layer 1</label>
                                            <input className="form-input" value="128 → 128×heads (concat)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>GAT Layer 2</label>
                                            <input className="form-input" value="128×heads → 128 (avg)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Attention Heads</label>
                                            <input className="form-input" value="4" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Aktivasi antar layer</label>
                                            <input className="form-input" value="ELU" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* GAT: Classifier Head */}
                                      <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#10b981' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Classifier Head</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Layer Tersembunyi</label>
                                            <input className="form-input" value="128 → 64 (ReLU)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Num Classes</label>
                                            <input className="form-input" value="2 (Spam / Ham)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Output Layer</label>
                                            <input className="form-input" value="64 → 2 (num_classes)" disabled style={{ height: 46, borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-600)' }} />
                                          </div>
                                        </div>
                                      </div>

                                      {/* GAT: Training Parameters */}
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                          <div style={{ width: 4, height: 22, borderRadius: 2, background: '#f59e0b' }}></div>
                                          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parameter Training GAT</h5>
                                        </div>
                                        <div className="row g-3">
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Learning Rate (GAT)</label>
                                            <input className="form-input" type="number" step="0.001" value={gatLR} onChange={(e) => setGatLR(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 0.001</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Epochs (GAT)</label>
                                            <input className="form-input" type="number" value={gatEpochs} onChange={(e) => setGatEpochs(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 100</span>
                                          </div>
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Weight Decay (GAT)</label>
                                            <input className="form-input" type="number" step="0.0001" value={gatWeightDecay} onChange={(e) => setGatWeightDecay(e.target.value)} disabled={training} style={{ height: 46, borderRadius: 8 }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Default: 1e-4</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            """

patched_content = content[:start_idx] + new_params + content[end_idx_full:]

with open('src/pages/Processing.jsx', 'w') as f:
    f.write(patched_content)

print("Patch applied: Architecture-based parameter groups!")
