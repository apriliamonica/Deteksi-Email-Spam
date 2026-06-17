import React, { useState, useEffect } from 'react';
import { createPortal } from "react-dom";
import {
    Activity, Info, X, CheckCircle2, Download, Eye, Trash2,
    ChevronDown, ChevronUp, Loader2, Pencil, Check, BarChart2, Target, ShieldCheck
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, Cell
} from "recharts";
import { cn } from "../lib/utils";
import { modelAPI } from '../services/api';

// ─── Metric Definitions ─────────────────────────────────────────────
const METRIC_DEFS = {
    accuracy: {
        title: "Accuracy",
        def: "Persentase prediksi benar dari seluruh sampel pengujian.",
        formula: "Accuracy = (TP + TN) / (TP + TN + FP + FN)",
        interp: "Nilai tinggi (>90%) berarti model hampir selalu benar. Bisa mengecoh jika dataset tidak seimbang.",
        critical: "Paling bermakna ketika distribusi kelas (Spam vs Ham) seimbang.",
    },
    precision: {
        title: "Precision",
        def: "Dari semua email yang diprediksi sebagai Spam, berapa persen yang benar-benar Spam.",
        formula: "Precision = TP / (TP + FP)",
        interp: "Precision tinggi berarti model jarang salah menandai email penting (Ham) sebagai Spam (sedikit False Positive).",
        critical: "Sangat krusial ketika biaya False Positive tinggi (misal: email pekerjaan masuk ke folder Spam).",
    },
    recall: {
        title: "Recall (Sensitivity)",
        def: "Dari semua email yang benar-benar Spam, berapa persen yang berhasil dideteksi model.",
        formula: "Recall = TP / (TP + FN)",
        interp: "Recall tinggi berarti model jarang meloloskan email Spam ke kotak masuk.",
        critical: "Krusial jika membiarkan Spam masuk (False Negative) sangat mengganggu.",
    },
    f1_score: {
        title: "F1-Score",
        def: "Rata-rata harmonik dari Precision dan Recall.",
        formula: "F1 = 2 × (Precision × Recall) / (Precision + Recall)",
        interp: "F1 mencerminkan keseimbangan antara Precision dan Recall. Metrik terbaik untuk dataset tidak seimbang.",
        critical: "Metrik utama saat dataset tidak seimbang — gunakan ini sebagai patokan performa utama.",
    },
    mcc: {
        title: "MCC (Matthews Correlation Coefficient)",
        def: "Koefisien korelasi antara prediksi dan label aktual. Metrik paling seimbang untuk klasifikasi biner.",
        formula: "MCC = (TP×TN − FP×FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))",
        interp: "+1 = sempurna, 0 = acak, -1 = berlawanan total.",
        critical: "Sangat dapat diandalkan untuk dataset yang sangat imbalanced.",
    },
};

function MetricModal({ metricKey, onClose }) {
    const d = METRIC_DEFS[metricKey];
    if (!d) return null;
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg"><Info className="w-4 h-4 text-blue-600" /></div>
                        <h3 className="font-bold text-slate-800">{d.title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Definisi</p><p className="text-sm text-slate-700">{d.def}</p></div>
                    <div className="bg-slate-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-bold text-slate-500 mb-1">Rumus</p>
                        <code className="text-xs text-indigo-700 font-mono">{d.formula}</code>
                    </div>
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Interpretasi</p><p className="text-sm text-slate-700">{d.interp}</p></div>
                    <div className="bg-amber-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-bold text-amber-700 mb-0.5">Kapan metrik ini krusial?</p>
                        <p className="text-xs text-amber-600">{d.critical}</p>
                    </div>
                </div>
                <button onClick={onClose} className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition">Tutup</button>
            </div>
        </div>,
        document.body
    );
}

function InfoBtn({ metricKey }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="text-slate-300 hover:text-blue-500 transition ml-1 shrink-0">
                <Info className="w-3.5 h-3.5" />
            </button>
            {open && <MetricModal metricKey={metricKey} onClose={() => setOpen(false)} />}
        </>
    );
}

// ─── Metric Bar Chart ────────────────────────────────────────────────────────
function MetricBarChart({ compResult }) {
    if (!compResult) return null;

    let mcc = compResult.mcc;
    let roc_auc = compResult.roc_auc;
    if (compResult.metrics_json) {
        try {
            const mj = JSON.parse(compResult.metrics_json);
            if (mj.mcc != null) mcc = mj.mcc;
            if (mj.roc_auc != null) roc_auc = mj.roc_auc;
        } catch (e) {}
    }

    const metrics = [
        { name: "Accuracy", value: parseFloat(((compResult.accuracy ?? 0) * 100).toFixed(2)), color: "#10b981", key: "accuracy" },
        { name: "Precision", value: parseFloat(((compResult.precision ?? 0) * 100).toFixed(2)), color: "#3b82f6", key: "precision" },
        { name: "Recall", value: parseFloat(((compResult.recall ?? 0) * 100).toFixed(2)), color: "#f59e0b", key: "recall" },
        { name: "F1-Score", value: parseFloat(((compResult.f1_score ?? 0) * 100).toFixed(2)), color: "#8b5cf6", key: "f1_score" },
    ];

    const CustomBar = (props) => {
        const { x, y, width, height, fill } = props;
        const radius = 6;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} fill={fill} rx={radius} ry={radius} />
            </g>
        );
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const def = METRIC_DEFS[metrics.find(m => m.name === label)?.key];
            return (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 220 }}>
                    <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4, fontSize: '0.85rem' }}>{label}</p>
                    <p style={{ color: payload[0].fill, fontWeight: 800, fontSize: '1.1rem' }}>{payload[0].value}%</p>
                    {def && <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 6, lineHeight: 1.4 }}>{def.def}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            {/* Metric Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {metrics.map(m => (
                    <div key={m.name} style={{ background: 'white', border: `1.5px solid ${m.color}22`, borderRadius: 14, padding: '14px 16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            {m.name} <InfoBtn metricKey={metrics.find(x => x.name === m.name)?.key} />
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: m.color }}>{m.value}%</div>
                        {/* Mini progress bar */}
                        <div style={{ marginTop: 8, height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Extra Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            MCC Score <InfoBtn metricKey="mcc" />
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#6366f1', marginTop: 2 }}>
                            {mcc != null ? parseFloat(mcc).toFixed(4) : '-'}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: 120, textAlign: 'right', lineHeight: 1.4 }}>
                        Kisaran -1 hingga +1. Nilai mendekati +1 = sempurna.
                    </div>
                </div>
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ROC-AUC
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', marginTop: 2 }}>
                            {roc_auc != null ? parseFloat(roc_auc).toFixed(4) : '-'}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: 120, textAlign: 'right', lineHeight: 1.4 }}>
                        Area under ROC curve. Nilai 1.0 = sempurna, 0.5 = acak.
                    </div>
                </div>
            </div>

            {/* Bar Chart */}
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                    <BarChart data={metrics} barCategoryGap="30%" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" shape={<CustomBar />} maxBarSize={60}>
                            {metrics.map((m, i) => (
                                <Cell key={i} fill={m.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default function EvaluationPage() {
    const [results, setResults] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selDataset, setSelDataset] = useState("");
    const [selModel, setSelModel] = useState("");

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [historyRes, datasetsRes] = await Promise.all([
                modelAPI.getHistory(),
                modelAPI.listDatasets()
            ]);
            const historyList = Array.isArray(historyRes.data) ? historyRes.data : [];
            const datasetList = Array.isArray(datasetsRes.data) ? datasetsRes.data : [];
            
            setResults(historyList);
            setDatasets(datasetList);
            
            if (datasetList.length > 0 && !selDataset) {
                setSelDataset(datasetList[0].id.toString());
            }
        } catch (e) {
            console.error("Gagal load history dan datasets", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Filter results based on selected dataset
    const filteredResults = selDataset 
        ? results.filter(r => r.dataset_id?.toString() === selDataset) 
        : results;

    // ── Derive ratio key for each result ──
    const getRatio = (item) => {
        let tr = 80, te = 20;
        if (item.req_val_split != null && item.req_test_split != null) {
            tr = Math.round((1 - item.req_val_split - item.req_test_split) * 100);
            te = Math.round(item.req_test_split * 100);
        } else if (item.train_size && item.total_data) {
            tr = Math.round((item.train_size / item.total_data) * 100);
            te = Math.round((item.test_size / item.total_data) * 100);
        }
        return `${tr}:${te}`;
    };

    // ── All available ratios (dynamic) ──
    const allRatios = [...new Set(filteredResults.map(getRatio))].sort();

    // ── Group iterations for each ratio (max 5, sorted by accuracy descending - best first) ──
    const groupedRatioData = {};
    let maxIters = 0;
    allRatios.forEach(ratio => {
        const sorted = [...filteredResults]
            .filter(r => getRatio(r) === ratio)
            .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
            .slice(0, 5);
        groupedRatioData[ratio] = sorted;
        if (sorted.length > maxIters) maxIters = sorted.length;
    });

    // Only render rows up to the maximum available iterations (max 5)
    const iterationRows = Array.from({ length: Math.max(maxIters, 1) }, (_, i) => i);

    // ── All available models for Perbandingan dropdown (best first) ──
    const modelOptions = filteredResults.map(r => ({
        id: r.id,
        label: r.model_name || `Model #${r.id}`,
        accuracy: r.accuracy ?? 0,
    })).sort((a, b) => b.accuracy - a.accuracy);

    // Default to the best model if selModel is empty or not in options
    const activeModelId = selModel && modelOptions.some(m => m.id.toString() === selModel)
        ? selModel
        : (modelOptions[0]?.id?.toString() ?? "");

    const compResult = filteredResults.find(r => r.id?.toString() === activeModelId) || null;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium">Memuat data evaluasi...</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-5 px-6 pb-12 pt-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 pt-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><ShieldCheck className="w-8 h-8" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Spam Evaluation Board</h2>
                        <p className="text-slate-500 mt-1">Performance metrics — IndoBERT + GAT (Spam Detection).</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                    <span className="text-sm font-semibold text-slate-500 px-2">Dataset:</span>
                    <select
                        value={selDataset}
                        onChange={e => {
                            setSelDataset(e.target.value);
                            setSelModel("");
                        }}
                        className="bg-slate-50 border-none outline-none rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-700 cursor-pointer"
                    >
                        {datasets.length === 0 && <option value="">Belum ada dataset</option>}
                        {datasets.map(d => (
                            <option key={d.id} value={d.id.toString()}>{d.name || `Dataset #${d.id}`}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TABLE 1: Data Split Ratio — Tanpa dropdown, dinamis per kolom   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-app-surface border border-app-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-app-bg/60 dark:bg-app-bg/25 px-6 py-4 border-b border-app-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-app-text text-lg">Data Split Ratio</h3>
                        <p className="text-xs text-app-text-muted mt-1">Evaluasi performa Accuracy berdasarkan iterasi training.</p>
                    </div>
                </div>
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-center text-sm md:text-base border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-app-border bg-ocean text-white font-bold px-4 py-3 w-32 align-middle text-left uppercase tracking-wide">ITERASI</th>
                                {allRatios.map(ratio => (
                                    <th key={ratio} className="border border-app-border bg-ocean text-white font-bold p-3 uppercase tracking-wider">
                                        INDOBERT + GAT ({ratio})
                                    </th>
                                ))}
                                {allRatios.length === 0 && (
                                    <th className="border border-app-border bg-ocean text-white font-bold p-3 uppercase tracking-wider">
                                        INDOBERT + GAT
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {iterationRows.map(i => {
                                const rowBg = i % 2 === 1 ? 'bg-app-bg/40 dark:bg-slate-800/10' : 'bg-app-surface dark:bg-slate-900/10';
                                return (
                                    <tr key={i}>
                                        <td className="border border-app-border bg-ocean-light dark:bg-ocean-dark text-ocean dark:text-ocean-dark font-bold px-4 py-3 text-left">{i + 1}</td>
                                        {allRatios.map(ratio => {
                                            const model = groupedRatioData[ratio]?.[i];
                                            return (
                                                <td key={ratio} className={`border border-app-border p-3 text-app-text font-medium ${rowBg}`}>
                                                    {model && model.accuracy != null ? `${(model.accuracy * 100).toFixed(2)}%` : '-'}
                                                </td>
                                            );
                                        })}
                                        {allRatios.length === 0 && (
                                            <td className={`border border-app-border p-3 text-app-text font-medium ${rowBg}`}>-</td>
                                        )}
                                    </tr>
                                );
                            })}
                            {/* Average Row */}
                            <tr>
                                <td className="border border-app-border bg-ocean-light dark:bg-ocean-dark text-ocean dark:text-ocean-dark font-bold px-4 py-3 text-left">Average</td>
                                {allRatios.map(ratio => {
                                    const valid = groupedRatioData[ratio] || [];
                                    const validModels = valid.filter(m => m && m.accuracy != null);
                                    if (validModels.length === 0) {
                                        return <td key={ratio} className="border border-app-border bg-ocean-light/30 dark:bg-slate-800/30 p-3 text-app-text font-medium">-</td>;
                                    }
                                    const avg = validModels.reduce((acc, m) => acc + m.accuracy, 0) / validModels.length;
                                    return (
                                        <td key={ratio} className="border border-app-border bg-ocean-light/50 dark:bg-slate-800/50 p-3 text-app-text font-semibold">
                                            {(avg * 100).toFixed(2)}%
                                        </td>
                                    );
                                })}
                                {allRatios.length === 0 && (
                                    <td className="border border-app-border bg-ocean-light/30 dark:bg-slate-800/30 p-3 text-app-text font-semibold">-</td>
                                )}
                            </tr>
                        </tbody>
                    </table>
                    {allRatios.length === 0 && (
                        <p className="text-center text-app-text-muted mt-4 text-sm">Belum ada data training untuk dataset ini.</p>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TABLE 2: Perbandingan Training dan Testing — dropdown model   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-app-surface border border-app-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-app-bg/60 dark:bg-app-bg/25 px-6 py-4 border-b border-app-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-app-text text-lg">Perbandingan Training dan Testing</h3>
                        <p className="text-xs text-app-text-muted mt-1">Metrik performa model terbaik yang dipilih.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-xl px-3 py-1.5 shadow-sm">
                        <span className="text-xs font-semibold text-app-text-muted">Model:</span>
                        <select
                            value={activeModelId}
                            onChange={e => setSelModel(e.target.value)}
                            className="bg-app-bg/50 dark:bg-slate-800/20 border border-app-border outline-none rounded-lg px-2 py-1 text-xs font-bold text-ocean cursor-pointer"
                        >
                            {modelOptions.length === 0 && <option value="">Belum ada</option>}
                            {modelOptions.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.label} — Acc: {(m.accuracy * 100).toFixed(1)}%
                                </option>
                             ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-sm md:text-base border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-app-border bg-ocean text-white font-bold p-3 px-4 w-64"></th>
                                <th className="border border-app-border bg-ocean text-white font-bold p-3 px-4 text-center">Training</th>
                                <th className="border border-app-border bg-ocean text-white font-bold p-3 px-4 text-center">Testing</th>
                                <th className="border border-app-border bg-ocean text-white font-bold p-3 px-4 text-center">Perbedaan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let pTrain = {};
                                let pTest = {};

                                if (compResult) {
                                    pTest = {
                                        accuracy: compResult.accuracy,
                                        precision: compResult.precision,
                                        recall: compResult.recall,
                                        f1_score: compResult.f1_score,
                                        mcc: compResult.mcc
                                    };

                                    pTrain = { ...pTest };

                                    if (compResult.metrics_json) {
                                        try {
                                            const mj = JSON.parse(compResult.metrics_json);
                                            if (mj.macro_avg) pTest.macro_avg = mj.macro_avg;
                                            if (mj.weighted_avg) pTest.weighted_avg = mj.weighted_avg;
                                            if (mj.roc_auc) pTest.roc_auc = mj.roc_auc;
                                            if (mj.mean_std) pTest.mean_std = mj.mean_std;

                                            if (mj.train_metrics) {
                                                pTrain.accuracy = mj.train_metrics.accuracy ?? pTrain.accuracy;
                                                pTrain.precision = mj.train_metrics.precision ?? pTrain.precision;
                                                pTrain.recall = mj.train_metrics.recall ?? pTrain.recall;
                                                pTrain.f1_score = mj.train_metrics.f1_score ?? pTrain.f1_score;
                                                pTrain.mcc = mj.train_metrics.mcc ?? pTrain.mcc;
                                                if (mj.train_metrics.macro_avg) pTrain.macro_avg = mj.train_metrics.macro_avg;
                                                if (mj.train_metrics.weighted_avg) pTrain.weighted_avg = mj.train_metrics.weighted_avg;
                                                if (mj.train_metrics.roc_auc) pTrain.roc_auc = mj.train_metrics.roc_auc;
                                                if (mj.train_metrics.mean_std) pTrain.mean_std = mj.train_metrics.mean_std;
                                            }
                                        } catch (e) { }
                                    }
                                }

                                const rows = [
                                    { label: 'Accuracy', key: 'accuracy' },
                                    { label: 'Precision', key: 'precision' },
                                    { label: 'Recall', key: 'recall' },
                                    { label: 'F1-score', key: 'f1_score' },
                                    { label: 'Macro Average', key: 'macro_avg' },
                                    { label: 'Weighted Average', key: 'weighted_avg' },
                                    { label: 'MCC', key: 'mcc' },
                                    { label: 'ROC-AUC', key: 'roc_auc' },
                                    { label: 'Mean Std', key: 'mean_std' },
                                ];

                                return rows.map((r, i) => {
                                    const rowBg = i % 2 === 0 ? 'bg-app-bg/40 dark:bg-slate-800/10' : 'bg-app-surface dark:bg-slate-900/10';
                                    let trainVal = pTrain[r.key];
                                    let testVal = pTest[r.key];
                                    let diffVal = null;
                                    if (trainVal != null && testVal != null) {
                                        diffVal = Math.abs(trainVal - testVal);
                                    }

                                    return (
                                        <tr key={i}>
                                            <td className={`border border-app-border p-3 px-4 text-app-text font-medium ${rowBg}`}>{r.label}</td>
                                            <td className={`border border-app-border p-3 px-4 text-app-text text-center ${rowBg}`}>
                                                {trainVal != null ? `${(trainVal * 100).toFixed(2)}%` : '-'}
                                            </td>
                                            <td className={`border border-app-border p-3 px-4 text-app-text text-center ${rowBg}`}>
                                                {testVal != null ? `${(testVal * 100).toFixed(2)}%` : '-'}
                                            </td>
                                            <td className={`border border-app-border p-3 px-4 text-app-text text-center ${rowBg}`}>
                                                {diffVal != null ? `${(diffVal * 100).toFixed(2)}%` : '-'}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                    {!compResult && (
                        <p className="text-center text-app-text-muted mt-4 text-sm">Belum ada model untuk ditampilkan.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
