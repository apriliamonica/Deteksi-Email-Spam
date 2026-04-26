# Aplikasi Deteksi Email Spam Bahasa Indonesia

Aplikasi penerapan metode **Hybrid IndoBERT + GAT (Graph Attention Network)** untuk deteksi email spam dalam Bahasa Indonesia.

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│              Dashboard • Klasifikasi • Training      │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  Backend (FastAPI)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  IndoBERT    │→ │     GAT      │→ │  Prediksi  │  │
│  │  Embedding   │  │  Classifier  │  │  Spam/Ham  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
               ┌───────▼───────┐
               │   PostgreSQL   │
               └───────────────┘
```

## Metode

### IndoBERT
- Model pre-trained NLP untuk Bahasa Indonesia (`indobenchmark/indobert-base-p1`)
- Digunakan untuk ekstraksi fitur teks email menjadi representasi vektor (embedding)

### GAT (Graph Attention Network)
- Model graph neural network dengan mekanisme attention
- Menggunakan relasi antar email untuk meningkatkan akurasi klasifikasi
- Node: email, Edge: kesamaan fitur/pengirim

## Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Backend | Python, FastAPI |
| Frontend | React, Vite |
| ML Framework | PyTorch, Transformers, PyG |
| Database | PostgreSQL, SQLAlchemy |
| Model NLP | IndoBERT |
| Model GNN | GAT (PyTorch Geometric) |

## Struktur Folder

```
Aplikasi-Deteksi-Email-Spam/
├── BE-EMAIL/          # Backend (FastAPI + ML)
├── FE-EMAIL/          # Frontend (React + Vite)
└── README.md
```

## Cara Menjalankan

### Backend
```bash
cd BE-EMAIL
python -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd FE-EMAIL
npm install
npm run dev
```

## Lisensi

Proyek ini dibuat untuk keperluan Tugas Akhir.
