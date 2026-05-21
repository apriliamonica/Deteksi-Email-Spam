from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.config.database import get_db
from app.schemas.email import TrainingRequest, TrainingResponse, ModelStatusResponse, PreprocessRequest
from app.schemas.dataset import DatasetResponse
from app.models.dataset import Dataset
from app.services.email_service import EmailService
from app.services.prediction_service import prediction_service
from app.services.preprocessing_service import preprocessing_service
import os
import shutil
import json
from typing import Optional
from app.config import get_settings

settings = get_settings()

def backup_model_artifacts(history_id: int):
    """Salin file model utama ke folder history_{id} sebagai backup."""
    dest_dir = os.path.join(settings.MODEL_DIR, f"history_{history_id}")
    os.makedirs(dest_dir, exist_ok=True)
    
    files_to_copy = ["spamgat_weights.pt", "graph_data.pt", "emails.csv", "config.json"]
    copied_count = 0
    for filename in files_to_copy:
        src_path = os.path.join(settings.MODEL_DIR, filename)
        dest_path = os.path.join(dest_dir, filename)
        if os.path.exists(src_path):
            shutil.copy2(src_path, dest_path)
            copied_count += 1
    
    print(f"[Backup] Berhasil menyalin {copied_count} file model untuk History ID: {history_id} ke {dest_dir}")

def set_active_model(history_id: int):
    """Set model dengan history_id sebagai model aktif di active_model.json."""
    active_info_path = os.path.join(settings.MODEL_DIR, "active_model.json")
    with open(active_info_path, "w") as f:
        json.dump({"active_history_id": history_id}, f)
    print(f"[Active Model] Mengaktifkan model History ID: {history_id}")

def get_active_model_id() -> Optional[int]:
    """Ambil ID model aktif dari active_model.json."""
    active_info_path = os.path.join(settings.MODEL_DIR, "active_model.json")
    if os.path.exists(active_info_path):
        try:
            with open(active_info_path, "r") as f:
                data = json.load(f)
                return data.get("active_history_id")
        except Exception as e:
            print(f"[Active Model] Gagal membaca active_model.json: {e}")
    return None

router = APIRouter()


@router.post("/cancel-preprocess")
async def cancel_preprocessing():
    """Hentikan proses pre-processing yang sedang berjalan."""
    preprocessing_service.stop_processing()
    return {"message": "Permintaan pembatalan pre-processing telah dikirim."}


@router.post("/cancel-train")
async def cancel_training():
    """Hentikan proses training yang sedang berjalan."""
    prediction_service.stop_training()
    return {"message": "Permintaan pembatalan training telah dikirim."}


@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status(db: Session = Depends(get_db)):
    """Cek status model (loaded/not loaded) dan metrik terakhir."""
    latest_training = EmailService.get_latest_training(db)

    return ModelStatusResponse(
        is_loaded=prediction_service.is_loaded,
        model_type="IndoBERT + GAT",
        indobert_model="indobenchmark/indobert-base-p1",
        last_training=latest_training.created_at if latest_training else None,
        metrics={
            "accuracy": latest_training.accuracy,
            "precision": latest_training.precision,
            "recall": latest_training.recall,
            "f1_score": latest_training.f1_score,
        } if latest_training else None,
    )


@router.get("/progress")
async def get_training_progress():
    """Ambil progres training model secara real-time."""
    return prediction_service.training_status


@router.post("/preprocess")
async def start_preprocessing(
    request: PreprocessRequest,
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Mulai proses pre-processing semua data training di background."""
    if preprocessing_service.status["is_running"]:
        return {"status": "error", "message": "Proses pre-processing sedang berjalan."}
    
    # Check if training is running
    if prediction_service.training_status["status"] == "training":
        raise HTTPException(
            status_code=400, 
            detail="Proses training sedang berjalan. Harap tunggu hingga selesai."
        )
    
    training_data = EmailService.get_training_data(db, request.dataset_id)
    if not training_data:
        raise HTTPException(status_code=400, detail="Tidak ada data untuk diproses pada dataset ini.")
    
    background_tasks.add_task(preprocessing_service.process_emails, db, request.dataset_id, training_data, request.force)
    return {"status": "success", "message": "Proses pre-processing dimulai di background."}


@router.get("/preprocess-status")
async def get_preprocessing_status():
    """Ambil status progres pre-processing."""
    return preprocessing_service.status


@router.get("/datasets", response_model=list[DatasetResponse])
async def list_datasets(db: Session = Depends(get_db)):
    """Ambil daftar dataset yang telah diupload."""
    return db.query(Dataset).order_by(Dataset.created_at.desc()).all()


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Hapus dataset berdasarkan ID."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan")
    
    try:
        from app.models.email import TrainingHistory
        # Hapus/dissociate riwayat training terkait agar tidak memicu kegagalan foreign key constraint
        db.query(TrainingHistory).filter(TrainingHistory.dataset_id == dataset_id).delete()
        
        # Hapus dataset (akan meng-cascade email karena delete-orphan)
        db.delete(dataset)
        db.commit()
        return {"status": "success", "message": "Dataset dan data terkait berhasil dihapus"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menghapus dataset karena masalah integritas data: {str(e)}"
        )



def background_train(request: TrainingRequest, texts: list[str], labels: list[int], senders: list[str]):
    """Fungsi pembungkus untuk menjalankan training di background."""
    print(f"[Background Task] Memulai training untuk dataset {request.dataset_id}...")
    from app.config.database import SessionLocal
    db = SessionLocal()
    try:
        # Training pipeline lengkap
        result = prediction_service.train(
            texts=texts,
            labels=labels,
            senders=senders,
            dataset_id=request.dataset_id,
            finetune_epochs=request.finetune_epochs,
            finetune_lr=request.finetune_lr,
            finetune_batch_size=request.finetune_batch_size,
            weight_decay=request.weight_decay,
            gat_epochs=request.gat_epochs,
            gat_lr=request.gat_lr,
            gat_weight_decay=request.gat_weight_decay,
            val_split=request.val_split,
            test_split=request.test_split,
        )

        metrics = result["metrics"]

        # Simpan history lengkap
        import json
        history = EmailService.save_training_history(db, {
            "dataset_id": request.dataset_id,
            "model_name": request.model_name or "IndoBERT + SpamGAT (Research)",
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "total_data": metrics["total_data"],
            "train_size": metrics["train_size"],
            "test_size": metrics["test_size"],
            "epochs": metrics.get("gat_epochs", request.gat_epochs),
            "learning_rate": request.gat_lr,
            "weight_decay": request.weight_decay,
            "gat_weight_decay": request.gat_weight_decay,
            "req_val_split": request.val_split,
            "req_test_split": request.test_split,
            "metrics_json": json.dumps(metrics)
        })
        
        # Salin file model hasil training ke folder backup history_{id} dan jadikan model aktif
        if history and history.id:
            backup_model_artifacts(history.id)
            set_active_model(history.id)
            
    except Exception as e:
        print(f"[Background Train] Error: {str(e)}")
    finally:
        db.close()


@router.post("/train", response_model=TrainingResponse)
async def train_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Training model hybrid IndoBERT + GAT (Background Task).
    """
    # Ambil data training dari database berdasarkan dataset_id
    training_data = EmailService.get_training_data(db, request.dataset_id)

    if len(training_data) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Data training tidak cukup ({len(training_data)} data). Minimal 10 data.",
        )
    
    # Validasi status dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset or dataset.status not in ["Preprocessed", "Trained"]:
        raise HTTPException(
            status_code=400,
            detail="Dataset belum melewati tahap pre-processing atau tidak ditemukan."
        )
    
    if prediction_service.training_status["status"] == "training":
        raise HTTPException(
            status_code=400,
            detail="Proses training sedang berjalan. Harap tunggu selesai.",
        )

    texts = [e.processed_body if e.processed_body else e.body for e in training_data]
    labels = [1 if e.label == "spam" else 0 for e in training_data]
    senders = [e.sender if e.sender else "unknown@unknown.com" for e in training_data]
    
    # Set status immediately to prevent frontend sync from resetting
    prediction_service.training_status.update({
        "status": "training",
        "current_step": "Memulai pipeline pelatihan...",
        "progress": 5
    })

    # Jalankan di background
    background_tasks.add_task(background_train, request, texts, labels, senders)

    return TrainingResponse(
        status="success",
        message="Proses training dimulai di background. Pantau progres melalui endpoint progress.",
    )


@router.post("/upload-dataset", response_model=TrainingResponse)
async def upload_dataset(
    file: UploadFile = File(..., description="CSV file dengan kolom 'text' dan 'label'"),
    db: Session = Depends(get_db),
):
    """
    Upload dataset CSV untuk data training.

    Format CSV:
    - Kolom 'text' atau 'body': isi email
    - Kolom 'label': 'spam' atau 'ham'
    - Kolom 'subject' (opsional): subjek email
    """
    # 1. Validasi Ekstensi
    is_excel = file.filename.endswith((".xlsx", ".xls"))
    is_csv = file.filename.endswith(".csv")

    if not (is_excel or is_csv):
        raise HTTPException(status_code=400, detail="File harus berformat CSV atau Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        print(f"--- START UPLOAD: {file.filename} ({len(content)} bytes) ---")
        
        df = None
        # Deteksi otomatis jika file sebenarnya Excel (.xlsx) tapi di-rename jadi .csv (Header PK = ZIP/Excel)
        if is_excel or content.startswith(b"PK"):
            try:
                df = pd.read_excel(io.BytesIO(content))
            except Exception:
                pass
                
        if df is None:
            # Try multiple encodings for CSV
            encodings = ['utf-8', 'latin1', 'ISO-8859-1']
            for enc in encodings:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=None, engine='python', on_bad_lines='skip')
                    print(f"Using encoding: {enc}")
                    break
                except Exception:
                    continue
        
        if df is None:
            raise HTTPException(status_code=400, detail="Gagal membaca file. Pastikan format benar.")

        # Standarisasi nama kolom ke huruf kecil dan hilangkan spasi
        df.columns = [str(c).strip().lower() for c in df.columns]

        # 2. Identifikasi Kolom (Flexible untuk dataset riset)
        # Prioritas: text_id > text > body
        text_col = next((c for c in ["text_id", "text", "body"] if c in df.columns), None)
        # Prioritas: subject_id > subject
        subj_col = next((c for c in ["subject_id", "subject"] if c in df.columns), None)
        
        if text_col is None or "label" not in df.columns:
            raise HTTPException(
                status_code=400, 
                detail="Dataset harus memiliki kolom teks (text/body) dan kolom 'label'."
            )

        spam_count = 0
        ham_count = 0
        new_dataset = Dataset(
            name=file.filename,
            total_rows=0, # Will update
            spam_count=spam_count,
            ham_count=ham_count,
            status="Uploaded"
        )
        db.add(new_dataset)
        db.flush() # Get ID
        
        emails_to_create = []
        total_count = 0
        spam_count = 0
        ham_count = 0

        for _, row in df.iterrows():
            label = str(row["label"]).strip().lower()
            if label == "1": label = "spam"
            elif label == "0": label = "ham"
            
            if label not in ("spam", "ham"):
                continue

            emails_to_create.append({
                "dataset_id": new_dataset.id,
                "body": str(row[text_col]),
                "subject": str(row[subj_col])[:500] if subj_col else None,
                "sender": str(row.get("sender", "unknown@unknown.com"))[:255],
                "label": label,
                "is_prediction": False,
            })
            
            if label == "spam":
                spam_count += 1
            else:
                ham_count += 1
            
            if len(emails_to_create) >= 1000:
                EmailService.bulk_create_emails(db, emails_to_create)
                total_count += len(emails_to_create)
                emails_to_create = []

        if emails_to_create:
            EmailService.bulk_create_emails(db, emails_to_create)
            total_count += len(emails_to_create)

        new_dataset.total_rows = total_count
        new_dataset.spam_count = spam_count
        new_dataset.ham_count = ham_count
        db.commit()
        db.refresh(new_dataset)

        print(f"--- UPLOAD COMPLETED: {total_count} rows total ---")
        return TrainingResponse(
            status="success",
            message=f"Berhasil mengupload {total_count} data email",
            metrics={
                "total_uploaded": total_count,
                "spam": spam_count,
                "ham": ham_count,
                "dataset_id": new_dataset.id
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal upload dataset: {str(e)}")


@router.post("/seed-local")
async def seed_local_dataset(db: Session = Depends(get_db)):
    """Seed dataset dari file lokal app/data/dataset_translated.csv (Chunked)."""
    import os
    file_path = "app/data/dataset_translated.csv"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {file_path} tidak ditemukan di server")

    try:
        print(f"--- START SEEDING LOCAL: {file_path} ---")
        
        chunk_size = 1000
        total_count = 0
        spam_count = 0
        ham_count = 0
        
        # Try multiple encodings
        encodings = ['utf-8', 'latin1', 'ISO-8859-1']
        df_iterator = None
        
        for enc in encodings:
            try:
                df_iterator = pd.read_csv(file_path, chunksize=chunk_size, encoding=enc, on_bad_lines='skip')
                # Test read one chunk
                next(df_iterator)
                df_iterator = pd.read_csv(file_path, chunksize=chunk_size, encoding=enc, on_bad_lines='skip')
                print(f"Using encoding: {enc}")
                break
            except Exception:
                continue
        
        if df_iterator is None:
            raise HTTPException(status_code=400, detail="Gagal membaca CSV lokal. Pastikan file ada dan format benar.")

        spam_count = 0
        ham_count = 0
        # Metadata dataset
        new_dataset = Dataset(
            name="dataset_translated.csv (Local)",
            total_rows=0,
            spam_count=0,
            ham_count=0,
            status="Uploaded"
        )
        db.add(new_dataset)
        db.flush()

        # Read in chunks to save memory
        for chunk_idx, df_chunk in enumerate(df_iterator):
            try:
                text_col = "text" if "text" in df_chunk.columns else "body" if "body" in df_chunk.columns else None
                if text_col is None or "label" not in df_chunk.columns:
                    print(f"Error in local chunk {chunk_idx}: Missing columns")
                    continue

                emails_chunk = []
                for _, row in df_chunk.iterrows():
                    label = str(row["label"]).strip().lower()
                    if label == "1": label = "spam"
                    elif label == "0": label = "ham"
                    if label not in ("spam", "ham"):
                        continue

                    emails_chunk.append({
                        "dataset_id": new_dataset.id,
                        "body": str(row[text_col])[:5000],
                        "subject": str(row.get("subject", "")) if "subject" in df_chunk.columns else None,
                        "label": label,
                        "is_prediction": False,
                    })
                    
                    if label == "spam":
                        spam_count += 1
                    else:
                        ham_count += 1
                
                if emails_chunk:
                    EmailService.bulk_create_emails(db, emails_chunk)
                    total_count += len(emails_chunk)
            except Exception as e:
                print(f"Error processing local chunk {chunk_idx}: {str(e)}")
                continue

        new_dataset.total_rows = total_count
        new_dataset.spam_count = spam_count
        new_dataset.ham_count = ham_count
        db.commit()
        db.refresh(new_dataset)

        print(f"--- SEEDING COMPLETED: {total_count} rows total ---")
        return {
            "status": "success",
            "message": f"Berhasil mengimport {total_count} data dari file lokal",
            "metrics": {
                "total_uploaded": total_count,
                "spam": spam_count,
                "ham": ham_count,
                "dataset_id": new_dataset.id
            }
        }

    except Exception as e:
        print(f"Seed Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal seed dataset: {str(e)}")


@router.post("/load")
async def load_model():
    """Load model yang sudah di-training sebelumnya."""
    try:
        prediction_service.load_models()
        return {"status": "success", "message": "Model berhasil di-load"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal load model: {str(e)}")


@router.get("/history")
async def get_training_history(db: Session = Depends(get_db)):
    """Ambil semua riwayat pelatihan model."""
    from app.models.email import TrainingHistory
    return db.query(TrainingHistory).order_by(TrainingHistory.created_at.desc()).all()


@router.get("/history/{history_id}")
async def get_history_detail(history_id: int, db: Session = Depends(get_db)):
    """Ambil detail riwayat pelatihan tertentu."""
    from app.models.email import TrainingHistory
    history = db.query(TrainingHistory).filter(TrainingHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Riwayat tidak ditemukan")
    return history


@router.post("/activate/{history_id}")
async def activate_model(history_id: int, db: Session = Depends(get_db)):
    """Mengaktifkan model berdasarkan ID riwayat pelatihan."""
    from app.models.email import TrainingHistory
    history = db.query(TrainingHistory).filter(TrainingHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="Riwayat pelatihan tidak ditemukan.")
    
    history_dir = os.path.join(settings.MODEL_DIR, f"history_{history_id}")
    files_to_copy = ["spamgat_weights.pt", "graph_data.pt", "emails.csv", "config.json"]
    
    # Periksa apakah folder backup dan semua file model tersedia
    has_subdir_files = os.path.exists(history_dir) and all(
        os.path.exists(os.path.join(history_dir, f)) for f in files_to_copy
    )
    
    if not has_subdir_files:
        # Smart Fallback: Jika folder backup belum ada tetapi file model global tersedia (misal model awal)
        global_has_files = all(
            os.path.exists(os.path.join(settings.MODEL_DIR, f)) for f in files_to_copy
        )
        if global_has_files:
            print(f"[Activate] Folder backup history_{history_id} belum ada. Membuat backup dari file global...")
            backup_model_artifacts(history_id)
            has_subdir_files = True
        else:
            raise HTTPException(
                status_code=400,
                detail="File model untuk riwayat ini tidak ditemukan di server."
            )
            
    # Salin file model dari subfolder history_{id} ke folder global settings.MODEL_DIR
    try:
        for filename in files_to_copy:
            src_path = os.path.join(history_dir, filename)
            dest_path = os.path.join(settings.MODEL_DIR, filename)
            shutil.copy2(src_path, dest_path)
            
        set_active_model(history_id)
        
        # Load kembali model aktif ke dalam memory
        prediction_service.load_models()
        
        return {"status": "success", "message": f"Model #{history_id} berhasil diaktifkan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengaktifkan model: {str(e)}")


@router.get("/active")
async def get_active_model(db: Session = Depends(get_db)):
    """Ambil informasi model yang sedang aktif saat ini."""
    from app.models.email import TrainingHistory
    
    active_id = get_active_model_id()
    
    # Jika belum ada yang aktif di active_model.json, ambil model terakhir sebagai fallback default
    if active_id is None:
        latest = EmailService.get_latest_training(db)
        if latest:
            active_id = latest.id
            set_active_model(active_id)
            
    if active_id is None:
        raise HTTPException(status_code=404, detail="Tidak ada model yang aktif.")
        
    history = db.query(TrainingHistory).filter(TrainingHistory.id == active_id).first()
    if not history:
        raise HTTPException(status_code=404, detail=f"Model aktif dengan ID #{active_id} tidak ditemukan di database.")
        
    # Ambil nama dataset
    dataset_name = "Unknown Dataset"
    if history.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == history.dataset_id).first()
        if dataset:
            dataset_name = dataset.name
            
    return {
        "id": history.id,
        "dataset_id": history.dataset_id,
        "dataset_name": dataset_name,
        "model_name": history.model_name,
        "accuracy": history.accuracy,
        "precision": history.precision,
        "recall": history.recall,
        "f1_score": history.f1_score,
        "total_data": history.total_data,
        "created_at": history.created_at
    }
