from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.config.database import get_db
from app.schemas.email import TrainingRequest, TrainingResponse, ModelStatusResponse
from app.schemas.dataset import DatasetResponse
from app.models.dataset import Dataset
from app.services.email_service import EmailService
from app.services.prediction_service import prediction_service
from app.services.preprocessing_service import preprocessing_service

router = APIRouter()


@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status(db: Session = Depends(get_db)):
    """Cek status model (loaded/not loaded) dan metrik terakhir."""
    latest_training = EmailService.get_latest_training(db)

    return ModelStatusResponse(
        is_loaded=prediction_service.is_loaded,
        model_type="IndoBERT + GAT + UMAP",
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
async def start_preprocessing(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Mulai proses pre-processing semua data training di background."""
    if preprocessing_service.status["is_running"]:
        return {"status": "error", "message": "Proses pre-processing sedang berjalan."}
    
    training_data = EmailService.get_training_data(db)
    if not training_data:
        raise HTTPException(status_code=400, detail="Tidak ada data untuk diproses.")
    
    background_tasks.add_task(preprocessing_service.process_emails, db, training_data)
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
    
    db.delete(dataset)
    db.commit()
    return {"status": "success", "message": "Dataset berhasil dihapus"}



@router.post("/train", response_model=TrainingResponse)
async def train_model(
    request: TrainingRequest,
    db: Session = Depends(get_db),
):
    """
    Training model hybrid IndoBERT + GAT + UMAP.

    Pipeline:
    1. Fine-tune IndoBERT (default 5 epoch, lr=2e-5, AdamW)
    2. Generate embeddings (768d)
    3. UMAP reduction (768d → 128d)
    4. Build graph (cosine similarity)
    5. Train GAT (default 30 epoch, lr=5e-3, Adam)
    6. Evaluasi (accuracy, precision, recall, f1)
    """
    try:
        # Ambil data training dari database
        training_data = EmailService.get_training_data(db)

        if len(training_data) < 10:
            raise HTTPException(
                status_code=400,
                detail=f"Data training tidak cukup ({len(training_data)} data). Minimal 10 data.",
            )

        texts = [e.processed_body if e.processed_body else e.body for e in training_data]
        labels = [1 if e.label == "spam" else 0 for e in training_data]
        
        # Tambahan: Pastikan teks bersih dari simbol yang merusak training
        from app.utils.preprocessing import preprocess_email
        texts = [t if e.processed_body else preprocess_email(t) for t, e in zip(texts, training_data)]

        # Training pipeline lengkap
        result = prediction_service.train(
            texts=texts,
            labels=labels,
            finetune_epochs=request.finetune_epochs,
            finetune_lr=request.finetune_lr,
            finetune_batch_size=request.finetune_batch_size,
            weight_decay=request.weight_decay,
            umap_components=request.umap_components,
            gat_epochs=request.gat_epochs,
            gat_lr=request.gat_lr,
            gat_weight_decay=request.gat_weight_decay,
            test_split=request.test_split,
        )

        metrics = result["metrics"]

        # Simpan history
        EmailService.save_training_history(db, {
            "model_name": "IndoBERT + GAT + UMAP",
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "total_data": metrics["total_data"],
            "train_size": metrics["train_size"],
            "test_size": metrics["test_size"],
            "epochs": metrics["gat_epochs"],
            "learning_rate": request.gat_lr,
        })

        return TrainingResponse(
            status="success",
            message="Training model selesai",
            metrics=metrics,
            visualization=result.get("visualization"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training gagal: {str(e)}")


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
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File harus berformat CSV")

    try:
        content = await file.read()
        print(f"--- START UPLOAD: {file.filename} ({len(content)} bytes) ---")
        
        # Try multiple encodings
        encodings = ['utf-8', 'latin1', 'ISO-8859-1']
        df = None
        
        for enc in encodings:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc, on_bad_lines='skip')
                print(f"Using encoding: {enc}")
                break
            except Exception:
                continue
        
        if df is None:
            raise HTTPException(status_code=400, detail="Gagal membaca CSV. Pastikan format benar dan encoding didukung (UTF-8/Latin1).")

        text_col = "text" if "text" in df.columns else "body" if "body" in df.columns else None
        if text_col is None or "label" not in df.columns:
            raise HTTPException(status_code=400, detail="CSV harus memiliki kolom 'text'/'body' dan 'label'.")

        total_count = 0
        spam_count = 0
        ham_count = 0
        emails_to_create = []

        for _, row in df.iterrows():
            label = str(row["label"]).strip().lower()
            if label == "1": label = "spam"
            elif label == "0": label = "ham"
            
            if label not in ("spam", "ham"):
                continue

            emails_to_create.append({
                "body": str(row[text_col])[:5000],
                "subject": str(row.get("subject", "")) if "subject" in df.columns else None,
                "label": label,
                "is_prediction": False,
            })
            
            if label == "spam":
                spam_count += 1
            else:
                ham_count += 1
            
            # Bulk create in batches of 1000 to save memory/db transactions
            if len(emails_to_create) >= 1000:
                EmailService.bulk_create_emails(db, emails_to_create)
                total_count += len(emails_to_create)
                emails_to_create = []
                print(f"Uploaded {total_count} rows...")

        # Final batch
        if emails_to_create:
            EmailService.bulk_create_emails(db, emails_to_create)
            total_count += len(emails_to_create)

        new_dataset = Dataset(
            name=file.filename,
            total_rows=total_count,
            spam_count=spam_count,
            ham_count=ham_count,
            status="Uploaded"
        )
        db.add(new_dataset)
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
                    # Support numeric labels: 1=spam, 0=ham
                    if label == "1":
                        label = "spam"
                    elif label == "0":
                        label = "ham"
                    if label not in ("spam", "ham"):
                        continue

                    emails_chunk.append({
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
                    if (chunk_idx + 1) % 5 == 0 or total_count < 5000:
                        print(f"Chunk {chunk_idx + 1}: Imported {len(emails_chunk)} rows. Total: {total_count}")
            except Exception as e:
                print(f"Error processing local chunk {chunk_idx}: {str(e)}")
                continue

        # Metadata dataset
        new_dataset = Dataset(
            name="dataset_translated.csv (Local)",
            total_rows=total_count,
            spam_count=spam_count,
            ham_count=ham_count,
            status="Uploaded"
        )
        db.add(new_dataset)
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
