from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.config.database import get_db
from app.schemas.email import (
    EmailInput,
    EmailResponse,
    PredictionResponse,
    DashboardStats,
)
from app.services.email_service import EmailService
from app.services.prediction_service import prediction_service

router = APIRouter()


@router.post("/classify", response_model=PredictionResponse)
async def classify_email(email_input: EmailInput, db: Session = Depends(get_db)):
    """
    Klasifikasi email sebagai spam atau ham.

    Proses:
    1. Preprocessing teks
    2. Ekstraksi fitur IndoBERT
    3. Konstruksi graph
    4. Prediksi menggunakan GAT
    """
    try:
        result = prediction_service.predict(
            text=email_input.body,
            subject=email_input.subject,
        )

        # Simpan hasil prediksi ke database
        EmailService.create_email(db, {
            "subject": email_input.subject,
            "body": email_input.body,
            "sender": email_input.sender,
            "label": result["label"],
            "confidence": result["confidence"],
            "is_prediction": True,
        })

        return PredictionResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengklasifikasi email: {str(e)}")


@router.get("/list", response_model=list[EmailResponse])
async def list_emails(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    label: Optional[str] = Query(None, regex="^(spam|ham)$"),
    is_prediction: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Ambil daftar email dengan filter."""
    emails = EmailService.get_emails(db, skip, limit, label, is_prediction)
    return emails


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Ambil statistik dashboard."""
    stats = EmailService.get_stats(db)
    recent = EmailService.get_emails(db, skip=0, limit=5, is_prediction=True)
    latest_training = EmailService.get_latest_training(db)

    return DashboardStats(
        **stats,
        recent_predictions=[EmailResponse.model_validate(e) for e in recent],
        model_status={
            "is_loaded": prediction_service.is_loaded,
            "model_type": "IndoBERT + GAT",
            "indobert_model": "indobenchmark/indobert-base-p1",
            "last_training": latest_training.created_at if latest_training else None,
            "metrics": {
                "accuracy": latest_training.accuracy,
                "f1_score": latest_training.f1_score,
            } if latest_training else None,
        },
    )


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(email_id: int, db: Session = Depends(get_db)):
    """Ambil detail email berdasarkan ID."""
    email = EmailService.get_email_by_id(db, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email tidak ditemukan")
    return email
