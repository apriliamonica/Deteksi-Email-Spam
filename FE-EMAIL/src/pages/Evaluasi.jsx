import React, { useState, useEffect } from 'react';
import { createPortal } from "react-dom";
import {
    Activity, Info, X, CheckCircle2, Download, Eye, Trash2,
    ChevronDown, ChevronUp, Loader2, Pencil, Check, BarChart2, Target, ShieldCheck
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend,
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

// ─── Metric Bar Chart (replaces Radar) ──────────────────────────────────────
function MetricBarChart({ compResult }) {
    if (!compResult) return null;

    const metrics = [
        { name: "Accuracy", value: parseFloat(((compResult.accuracy ?? 0) * 100).toFixed(2)), color: "#10b981" },
        { name: "Precision", value: parseFloat(((compResult.precision ?? 0) * 100).toFixed(2)), color: "#3b82f6" },
        { name: "Recall", value: parseFloat(((compResult.recall ?? 0) * 100).toFixed(2)), color: "#f59e0b" },
    ]
}
// ─── CM Info Modal ─────────────────────────────────────────────────────────────
function CMInfoModal({ onClose }) {
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Apa itu Confusion Matrix?</h3>
                        <p className="text-xs text-slate-400 mt-1">Cara membaca tabel evaluasi model</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-600 leading-relaxed">
                    <strong>Confusion Matrix</strong> adalah tabel yang menunjukkan seberapa baik model membuat prediksi.
                    Tabel ini membandingkan antara <em>prediksi model</em> dengan <em>label asli (nyata)</em> dari setiap email.
                </div>

                <div className="space-y-3">
                    <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <span className="font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg text-sm w-12 text-center flex-shrink-0">TN</span>
                        <div>
                            <p className="font-bold text-green-800 text-sm">True Negative (Benar-Negatif)</p>
                            <p className="text-xs text-green-700 mt-0.5">Model memprediksi email sebagai <strong>Ham (bukan spam)</strong>, dan email tersebut memang benar-benar <strong>Ham</strong>. ✅ Prediksi Benar.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <span className="font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg text-sm w-12 text-center flex-shrink-0">FP</span>
                        <div>
                            <p className="font-bold text-red-800 text-sm">False Positive (Salah-Positif)</p>
                            <p className="text-xs text-red-700 mt-0.5">Model memprediksi email sebagai <strong>Spam</strong>, padahal email tersebut sebenarnya adalah <strong>Ham</strong>. ❌ Email penting masuk folder spam.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-lg text-sm w-12 text-center flex-shrink-0">FN</span>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">False Negative (Salah-Negatif)</p>
                            <p className="text-xs text-amber-700 mt-0.5">Model memprediksi email sebagai <strong>Ham</strong>, padahal email tersebut sebenarnya adalah <strong>Spam</strong>. ❌ Email spam lolos ke kotak masuk.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-1 rounded-lg text-sm w-12 text-center flex-shrink-0">TP</span>
                        <div>
                            <p className="font-bold text-indigo-800 text-sm">True Positive (Benar-Positif)</p>
                            <p className="text-xs text-indigo-700 mt-0.5">Model memprediksi email sebagai <strong>Spam</strong>, dan email tersebut memang benar-benar <strong>Spam</strong>. ✅ Prediksi Benar.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                    💡 <strong>Kesimpulan:</strong> Model yang baik memiliki nilai <strong>TN dan TP yang tinggi</strong> (prediksi benar), serta nilai <strong>FP dan FN yang rendah</strong> (prediksi salah).
                </div>

                <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition">Tutup</button>
            </div>
        </div>,
        document.body
    );
}

// ─── Confusion Matrix Panel ───────────────────────────────────────────────────
function ConfusionMatrixPanel({ compResult }) {
    const [infoOpen, setInfoOpen] = useState(false);
    if (!compResult) return null;

    let metricsData = {};
    try { if (compResult.metrics_json) metricsData = JSON.parse(compResult.metrics_json); } catch (e) { }

    let TP = 0, TN = 0, FP = 0, FN = 0;
    let isEstimated = true;

    if (metricsData.confusion_matrix) {
        TN = metricsData.confusion_matrix[0][0];
        FP = metricsData.confusion_matrix[0][1];
        FN = metricsData.confusion_matrix[1][0];
        TP = metricsData.confusion_matrix[1][1];
        isEstimated = false;
    } else {
        const prec = compResult.precision ?? 0;
        const rec = compResult.recall ?? 0;
        const n = compResult.test_size ?? 100;
        const pos = Math.round(n * 0.5);
        const neg = n - pos;
        TP = Math.round(rec * pos);
        FN = pos - TP;
        FP = prec > 0 ? Math.max(0, Math.round(TP * (1 - prec) / prec)) : 0;
        TN = Math.max(0, neg - FP);
    }

    const total = TP + TN + FP + FN;
    if (total === 0) return null;

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-base">Confusion Matrix</h4>
                    {isEstimated && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase">Estimasi</span>}
                </div>
                <button
                    onClick={() => setInfoOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                >
                    <Info className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">Distribusi hasil prediksi model: <span className="font-semibold text-slate-600">{compResult.model_name}</span></p>

            {/* Matrix Grid + Legend side by side */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Matrix Grid */}
                <div className="flex-shrink-0">
                    <div className="text-center mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Prediksi Model</div>
                    <div className="flex">
                        <div className="flex items-center justify-center mr-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Label Nyata</span>
                        </div>
                        <div>
                            <div className="flex mb-1.5">
                                <div className="w-16"></div>
                                <div className="w-28 text-center text-xs font-bold text-slate-500">Ham</div>
                                <div className="w-28 text-center text-xs font-bold text-slate-500">Spam</div>
                            </div>
                            <div className="flex items-center mb-1.5">
                                <div className="w-16 text-right pr-3 text-xs font-bold text-slate-500">Ham</div>
                                <div className="w-28 h-24 border-2 border-green-200 rounded-xl bg-green-50 flex flex-col items-center justify-center mr-1.5">
                                    <span className="text-3xl font-black text-green-800">{TN}</span>
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1">TN ✅</span>
                                </div>
                                <div className="w-28 h-24 border-2 border-red-200 rounded-xl bg-red-50 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-red-800">{FP}</span>
                                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full mt-1">FP ❌</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-16 text-right pr-3 text-xs font-bold text-slate-500">Spam</div>
                                <div className="w-28 h-24 border-2 border-amber-200 rounded-xl bg-amber-50 flex flex-col items-center justify-center mr-1.5">
                                    <span className="text-3xl font-black text-amber-800">{FN}</span>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1">FN ❌</span>
                                </div>
                                <div className="w-28 h-24 border-2 border-indigo-200 rounded-xl bg-indigo-50 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-indigo-800">{TP}</span>
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mt-1">TP ✅</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {infoOpen && <CMInfoModal onClose={() => setInfoOpen(false)} />}
        </div>
    );
}

export default function EvaluationPage() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [compModel, setCompModel] = useState("");

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await modelAPI.getHistory();
            setResults(Array.isArray(res.data) ? res.data : []);
            if (res.data.length && !compModel) setCompModel(res.data[0].id.toString());
        } catch (e) {
            console.error("Gagal load history", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // 1. Grouping Data by Ratio
    const groupedData = {};
    results.forEach(item => {
        let tr = 80, te = 20;
        if (item.req_val_split != null && item.req_test_split != null) {
            tr = Math.round((1 - item.req_val_split - item.req_test_split) * 100);
            te = Math.round(item.req_test_split * 100);
        } else if (item.train_size && item.total_data) {
            tr = Math.round((item.train_size / item.total_data) * 100);
            te = Math.round((item.test_size / item.total_data) * 100);
        }
        const ratioKey = `${tr}/${te}`;
        if (!groupedData[ratioKey]) groupedData[ratioKey] = [];
        groupedData[ratioKey].push(item);
    });

    // 2. Find Best Model Per Ratio
    const bestModels = [];
    Object.keys(groupedData).forEach(ratio => {
        const models = groupedData[ratio];
        const best = models.reduce((prev, current) => (current.accuracy || 0) > (prev.accuracy || 0) ? current : prev);
        bestModels.push({ ratio, count: models.length, ...best });
    });
    bestModels.sort((a, b) => b.accuracy - a.accuracy);

    const compResult = compModel ? results.find(r => r.id?.toString() === compModel) : results[0];

    const handleDeleteTraining = async (id) => {
        if (!confirm("Hapus riwayat training ini?")) return;
        try {
            await modelAPI.getHistoryDetail(id); // placeholder for delete if API exists
            setResults(results.filter(r => r.id !== id));
        } catch (e) { }
    };

    const handleActivate = async (id) => {
        try {
            await modelAPI.activateModel(id);
            alert("Model berhasil diaktifkan!");
        } catch (e) {
            alert("Gagal mengaktifkan model");
        }
    }

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <Activity className="spinner" size={40} style={{ color: 'var(--gray-400)', margin: '0 auto 16px' }} />
            <p>Memuat data evaluasi...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5" style={{ padding: '0 20px 40px' }}>
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
                    <span className="text-sm font-semibold text-slate-500 px-2">Compare Model:</span>
                    <select
                        value={compModel}
                        onChange={e => setCompModel(e.target.value)}
                        className="bg-slate-50 border-none outline-none rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-700 cursor-pointer"
                    >
                        {results.map(r => <option key={r.id} value={r.id}>{r.model_name || `Model #${r.id}`}</option>)}
                    </select>
                </div>
            </div>

            {/* Confusion Matrix - Full width */}
            <ConfusionMatrixPanel compResult={compResult} />

            {/* TAB: Training History & Best per Ratio */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-500" /> Ringkasan Model Terbaik (per Rasio Dataset)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rasio Split</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Total Run</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Model Terbaik</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Accuracy <InfoBtn metricKey="accuracy" /></th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">F1-Score <InfoBtn metricKey="f1_score" /></th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {bestModels.map((bm, idx) => (
                                <tr key={bm.id} className={idx === 0 ? "bg-green-50" : "hover:bg-slate-50"}>
                                    <td className="px-6 py-3 font-black text-slate-700">{bm.ratio}</td>
                                    <td className="px-6 py-3 text-center text-slate-500 font-bold">{bm.count}x</td>
                                    <td className="px-6 py-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            {bm.model_name}
                                            {idx === 0 && <span className="px-2 py-0.5 bg-green-500 text-white rounded text-[10px] font-black uppercase">Overall Best</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center font-black text-green-600">{(bm.accuracy * 100).toFixed(2)}%</td>
                                    <td className="px-6 py-3 text-center font-bold text-indigo-600">{(bm.f1_score * 100).toFixed(2)}%</td>
                                    <td className="px-6 py-3 text-center">
                                        <button onClick={() => setCompModel(bm.id.toString())} className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-bold">
                                            Bandingkan
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FULL HISTORY TABLE */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-lg">Semua Riwayat Pelatihan ({results.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">#</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Model Name</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Rasio</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Accuracy</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">F1-Score</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">MCC</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {results.map((r, i) => {
                                let tr = 80, te = 20;
                                if (r.req_val_split != null && r.req_test_split != null) {
                                    tr = Math.round((1 - r.req_val_split - r.req_test_split) * 100);
                                    te = Math.round(r.req_test_split * 100);
                                } else if (r.train_size && r.total_data) {
                                    tr = Math.round((r.train_size / r.total_data) * 100);
                                    te = Math.round((r.test_size / r.total_data) * 100);
                                }
                                const isBest = bestModels.find(bm => bm.id === r.id);

                                return (
                                    <tr key={r.id} className={r.id.toString() === compModel ? "bg-indigo-50/50" : "hover:bg-slate-50"}>
                                        <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            {r.model_name}
                                            {isBest && <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-black uppercase">🏆 Best</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{tr}/{te}</td>
                                        <td className="px-4 py-3 font-bold text-green-600">{((r.accuracy ?? 0) * 100).toFixed(2)}%</td>
                                        <td className="px-4 py-3 font-bold text-indigo-600">{((r.f1_score ?? 0) * 100).toFixed(2)}%</td>
                                        <td className="px-4 py-3 font-bold text-slate-600">{((r.mcc ?? 0) * 100).toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => setCompModel(r.id.toString())} title="Bandingkan" className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => handleActivate(r.id)} title="Jadikan Model Aktif" className="p-1.5 text-slate-400 hover:text-green-600 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
