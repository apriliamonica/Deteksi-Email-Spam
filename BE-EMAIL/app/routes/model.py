from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.config.database import get_db
from app.schemas.email import TrainingRequest, TrainingResponse, ModelStatusResponse
from app.services.email_service import EmailService
from app.services.prediction_service import prediction_service

router = APIRouter()


@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status(db: Session = Depends(get_db)):
    """Cek status model (loaded/not loaded)."""
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


@router.post("/train", response_model=TrainingResponse)
async def train_model(
    request: TrainingRequest,
    db: Session = Depends(get_db),
):
    """
    Training model IndoBERT + GAT dengan data dari database.

    Pastikan sudah ada data training di database sebelum menjalankan.
    """
    try:
        # Ambil data training dari database
        training_data = EmailService.get_training_data(db)

        if len(training_data) < 10:
            raise HTTPException(
                status_code=400,
                detail=f"Data training tidak cukup ({len(training_data)} data). Minimal 10 data.",
            )

        texts = [e.body for e in training_data]
        labels = [1 if e.label == "spam" else 0 for e in training_data]

        # Training
        metrics = prediction_service.train(
            texts=texts,
            labels=labels,
            epochs=request.epochs,
            learning_rate=request.learning_rate,
            batch_size=request.batch_size,
            test_split=request.test_split,
        )

        # Simpan history
        EmailService.save_training_history(db, {
            "model_name": "IndoBERT + GAT",
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "total_data": metrics["total_data"],
            "train_size": metrics["train_size"],
            "test_size": metrics["test_size"],
            "epochs": metrics["epochs"],
            "learning_rate": metrics["learning_rate"],
        })

        return TrainingResponse(
            status="success",
            message="Training model selesai",
            metrics=metrics,
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
        df = pd.read_csv(io.BytesIO(content))

        # Validasi kolom
        text_col = "text" if "text" in df.columns else "body" if "body" in df.columns else None
        if text_col is None or "label" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="CSV harus memiliki kolom 'text'/'body' dan 'label'",
            )

        # Simpan ke database
        count = 0
        for _, row in df.iterrows():
            label = row["label"].strip().lower()
            if label not in ("spam", "ham"):
                continue

            EmailService.create_email(db, {
                "body": str(row[text_col]),
                "subject": str(row.get("subject", "")) if "subject" in df.columns else None,
                "label": label,
                "is_prediction": False,
            })
            count += 1

        return TrainingResponse(
            status="success",
            message=f"Berhasil mengupload {count} data email",
            metrics={"total_uploaded": count},
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal upload dataset: {str(e)}")


@router.post("/load")
async def load_model():
    """Load model yang sudah di-training sebelumnya."""
    try:
        prediction_service.load_models()
        return {"status": "success", "message": "Model berhasil di-load"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal load model: {str(e)}")
