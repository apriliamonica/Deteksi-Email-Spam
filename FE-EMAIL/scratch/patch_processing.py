import re

with open('src/pages/Processing.jsx', 'r') as f:
    content = f.read()

# We want to replace the whole `index === 0 && (` block.
# The block starts at `                      {index === 0 && (`
# and ends right before `                      {index === 1 && (`

start_marker = "                      {index === 0 && ("
end_marker = "                      {index === 1 && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_ui = """                      {index === 0 && (
                        <div style={{ animation: "slideUp 0.4s ease" }}>
                          {error && (
                            <div className="alert alert-danger d-flex align-items-center gap-3 mb-4">
                              <ShieldAlert size={20} />
                              <div>{error}</div>
                            </div>
                          )}
                          <form onSubmit={handleTrain}>
                            
                            {/* MODEL SELECTION TABS */}
                            <div className="d-flex gap-3 mb-4">
                              <div 
                                onClick={() => setActiveModelTab('indobert')}
                                style={{ 
                                  flex: 1, 
                                  cursor: 'pointer', 
                                  border: activeModelTab === 'indobert' ? '2px solid var(--gmail-blue)' : '1px solid var(--gray-200)',
                                  background: activeModelTab === 'indobert' ? 'var(--gmail-blue-light)' : 'white',
                                  borderRadius: 12, 
                                  padding: '16px', 
                                  textAlign: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: activeModelTab === 'indobert' ? 'var(--gmail-blue-dark)' : 'var(--gray-800)' }}>IndoBERT</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Indonesian BERT Model</span>
                              </div>
                              <div 
                                onClick={() => setActiveModelTab('gat')}
                                style={{ 
                                  flex: 1, 
                                  cursor: 'pointer', 
                                  border: activeModelTab === 'gat' ? '2px solid var(--gmail-blue)' : '1px solid var(--gray-200)',
                                  background: activeModelTab === 'gat' ? 'var(--gmail-blue-light)' : 'white',
                                  borderRadius: 12, 
                                  padding: '16px', 
                                  textAlign: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: activeModelTab === 'gat' ? 'var(--gmail-blue-dark)' : 'var(--gray-800)' }}>GAT</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Graph Attention Network</span>
                              </div>
                            </div>

                            <div className="row mb-4">
                              {/* LEFT COLUMN: DATA SPLIT */}
                              <div className="col-md-6 mb-3 mb-md-0">
                                <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", height: '100%' }}>
                                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Database size={18} style={{ color: "var(--gmail-blue)" }} /> Data Split Configuration
                                  </h4>

                                  {/* Dataset Selector */}
                                  <div style={{ marginBottom: 20 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Pilih Dataset</label>
                                    <select
                                      className="form-select"
                                      value={activeDatasetId || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setActiveDatasetId(val);
                                        const ds = datasets.find((d) => d.id.toString() === val);
                                        setActiveDatasetName(ds ? ds.name : "");
                                      }}
                                      disabled={training}
                                      style={{ height: 42, borderRadius: 8, fontSize: "0.9rem" }}
                                    >
                                      {datasets.length === 0 ? (
                                        <option value="">-- Belum ada dataset --</option>
                                      ) : (
                                        <>
                                          <option value="" disabled>-- Pilih Dataset --</option>
                                          {datasets.map((ds) => (
                                            <option key={ds.id} value={ds.id}>
                                              {ds.name} ({(ds.total_rows || 0).toLocaleString()} Email)
                                            </option>
                                          ))}
                                        </>
                                      )}
                                    </select>
                                  </div>

                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Train-Validation-Test Split Ratio</label>
                                  <div style={{ display: 'flex', gap: '12px', marginBottom: 12 }}>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Train (%)</span>
                                      <input className="form-input" type="number" value={trainRatio} onChange={(e) => setTrainRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Validation (%)</span>
                                      <input className="form-input" type="number" value={valRatio} onChange={(e) => setValRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, display: 'block' }}>Test (%)</span>
                                      <input className="form-input" type="number" value={testRatio} onChange={(e) => setTestRatio(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                    </div>
                                  </div>
                                  
                                  {/* Visual Progress Bar */}
                                  <div style={{ height: 8, borderRadius: 4, display: 'flex', overflow: 'hidden', marginBottom: 8, background: 'var(--gray-100)' }}>
                                    <div style={{ width: `${trainRatio}%`, background: 'var(--gmail-blue)' }}></div>
                                    <div style={{ width: `${valRatio}%`, background: 'var(--gmail-blue-light)' }}></div>
                                    <div style={{ width: `${testRatio}%`, background: 'var(--gray-300)' }}></div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 20 }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                      <span style={{ color: 'var(--gmail-blue)' }}>● Train: {trainRatio}%</span>
                                      <span style={{ color: 'var(--gmail-blue-dark)' }}>● Validation: {valRatio}%</span>
                                      <span>● Test: {testRatio}%</span>
                                    </div>
                                    <span style={{ color: (parseInt(trainRatio)+parseInt(valRatio)+parseInt(testRatio)) === 100 ? 'var(--gmail-green)' : 'var(--gmail-red)' }}>
                                      Total: {parseInt(trainRatio)+parseInt(valRatio)+parseInt(testRatio)}%
                                    </span>
                                  </div>

                                  <div style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cross Validation Folds</label>
                                    <input className="form-input" type="number" value={cvFolds} onChange={(e) => setCvFolds(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  </div>
                                  <div style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Random Seed</label>
                                    <input className="form-input" type="number" value={randomSeed} onChange={(e) => setRandomSeed(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <input type="checkbox" id="shuffle" checked={shuffleData} onChange={(e) => setShuffleData(e.target.checked)} disabled={training} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                    <label htmlFor="shuffle" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: 'pointer', margin: 0 }}>Shuffle data sebelum split</label>
                                  </div>
                                </div>
                              </div>

                              {/* RIGHT COLUMN: PARAMETERS */}
                              <div className="col-md-6">
                                <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", height: '100%' }}>
                                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-800)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Settings size={18} style={{ color: "var(--gmail-blue)" }} /> {activeModelTab === 'indobert' ? 'IndoBERT' : 'GAT'} Parameters
                                  </h4>
                                  
                                  {activeModelTab === 'indobert' ? (
                                    <div className="row g-3">
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Learning Rate</label>
                                        <input className="form-input" type="number" step="0.00001" value={indoLR} onChange={(e) => setIndoLR(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 2e-5</span>
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Batch Size</label>
                                        <input className="form-input" type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 16</span>
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Epochs</label>
                                        <input className="form-input" type="number" value={indoEpochs} onChange={(e) => setIndoEpochs(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Max Sequence Length</label>
                                        <input className="form-input" type="number" value={maxSeqLength} onChange={(e) => setMaxSeqLength(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Warmup Steps</label>
                                        <input className="form-input" type="number" value={warmupSteps} onChange={(e) => setWarmupSteps(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Weight Decay</label>
                                        <input className="form-input" type="number" step="0.01" value={weightDecay} onChange={(e) => setWeightDecay(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Dropout Rate</label>
                                        <input className="form-input" type="number" step="0.1" value={dropoutRate} onChange={(e) => setDropoutRate(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Optimizer</label>
                                        <select className="form-select" value={optimizer} onChange={(e) => setOptimizer(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }}>
                                          <option value="AdamW">AdamW</option>
                                          <option value="Adam">Adam</option>
                                          <option value="SGD">SGD</option>
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="row g-3">
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Learning Rate (GAT)</label>
                                        <input className="form-input" type="number" step="0.001" value={gatLR} onChange={(e) => setGatLR(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 0.001</span>
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Epochs (GAT)</label>
                                        <input className="form-input" type="number" value={gatEpochs} onChange={(e) => setGatEpochs(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Default: 100</span>
                                      </div>
                                      <div className="col-6">
                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Weight Decay (GAT)</label>
                                        <input className="form-input" type="number" step="0.0001" value={gatWeightDecay} onChange={(e) => setGatWeightDecay(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* BOTTOM SECTION: TRAINING CONFIGURATION */}
                            <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid var(--gray-200)", marginBottom: 24 }}>
                              <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16, color: "var(--gray-800)" }}>
                                Training Configuration
                              </h4>
                              
                              <div className="row mb-3">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Nama Model</label>
                                  <input className="form-input" value={modelName} onChange={(e) => setModelName(e.target.value)} required disabled={training} placeholder="Contoh: Model_Spam_01" style={{ height: 38, borderRadius: 6 }} />
                                </div>
                              </div>

                              <div className="row">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Validation Split</label>
                                  <input className="form-input" type="number" step="0.1" value={valRatio / 100} disabled style={{ height: 38, borderRadius: 6, background: 'var(--gray-100)' }} />
                                  <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Proportion untuk validasi (diambil otomatis dari atas)</span>
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Early Stopping Patience</label>
                                  <input className="form-input" type="number" value={earlyStopping} onChange={(e) => setEarlyStopping(e.target.value)} disabled={training} style={{ height: 38, borderRadius: 6 }} />
                                  <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>Epochs menunggu sebelum stop</span>
                                </div>
                              </div>
                            </div>

                            {/* ACTION BAR */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button
                                type="button"
                                className="btn"
                                disabled={training}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 2,
                                  background: 'var(--gmail-blue)',
                                  color: 'white',
                                }}
                              >
                                <Save size={18} /> Simpan Parameter
                              </button>

                              <button
                                type="button"
                                className="btn"
                                disabled={training}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 1,
                                  background: 'var(--gray-200)',
                                  color: 'var(--gray-700)',
                                }}
                              >
                                <Activity size={18} /> Reset ke Default
                              </button>

                              <button
                                type="submit"
                                className="btn"
                                disabled={training || !!globalLock || (dbStats?.total_processed === 0 && !activeDatasetId)}
                                style={{
                                  height: 48,
                                  borderRadius: 8,
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  flex: 1,
                                  background: '#10b981',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                }}
                              >
                                {training ? (
                                  <>
                                    <div className="spinner" style={{ width: 18, height: 18, borderTopColor: "white", borderLeftColor: "white" }}></div>
                                    Melatih...
                                  </>
                                ) : (
                                  <>
                                    <Play size={18} /> Mulai Training
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
"""

patched_content = content[:start_idx] + new_ui + content[end_idx:]

with open('src/pages/Processing.jsx', 'w') as f:
    f.write(patched_content)

print("Patch applied!")
