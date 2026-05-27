from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import io
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
            sender=email_input.sender,
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


@router.post("/classify-batch")
async def classify_batch(
    file: UploadFile = File(..., description="CSV file dengan kolom 'text' atau 'body'"),
    db: Session = Depends(get_db)
):
    """Klasifikasi banyak email sekaligus via upload CSV."""
    is_excel = file.filename.endswith((".xlsx", ".xls"))
    is_csv = file.filename.endswith(".csv")

    if not (is_excel or is_csv):
        raise HTTPException(status_code=400, detail="File harus berformat CSV atau Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        df = None
        # Deteksi otomatis jika file sebenarnya Excel (.xlsx) tapi di-rename jadi .csv (Header PK = ZIP/Excel)
        if is_excel or content.startswith(b"PK"):
            try:
                df = pd.read_excel(io.BytesIO(content))
            except Exception:
                pass
        
        if df is None:
            encodings = ['utf-8', 'latin1', 'ISO-8859-1']
            delimiters = [',', ';', '\t']
            
            for enc in encodings:
                for sep in delimiters:
                    try:
                        temp_df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=sep, on_bad_lines='skip')
                        temp_cols = [str(c).strip().lower() for c in temp_df.columns]
                        
                        # Jika delimiter ini berhasil memisahkan kolom dan menemukan text/body, gunakan!
                        if any(c in temp_cols for c in ["text_id", "text", "body"]):
                            df = temp_df
                            break
                    except Exception:
                        continue
                if df is not None:
                    break
            
            # Fallback ke default jika tidak ada yg cocok
            if df is None:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding='utf-8', on_bad_lines='skip')
                except:
                    pass
        
        if df is None:
            raise HTTPException(status_code=400, detail="Gagal membaca file. Pastikan format benar.")

        # Standarisasi nama kolom ke huruf kecil dan hilangkan spasi
        df.columns = [str(c).strip().lower() for c in df.columns]

        text_col = next((c for c in ["text_id", "text", "body"] if c in df.columns), None)
        subj_col = next((c for c in ["subject_id", "subject"] if c in df.columns), None)

        # Jika tidak ada kolom teks yang dikenali, coba fallback: gunakan kolom pertama sebagai teks
        if text_col is None:
            if df.shape[1] >= 1:
                first_col = df.columns[0]
                df = df.rename(columns={first_col: "text"})
                text_col = "text"
            else:
                raise HTTPException(status_code=400, detail=f"Dataset harus memiliki kolom teks (text/body). Kolom yang terbaca: {list(df.columns)}")

        results = []
        for _, row in df.iterrows():
            text = str(row[text_col])
            if not text.strip(): continue
            
            subject = str(row[subj_col]) if subj_col and pd.notna(row[subj_col]) else None
            sender = str(row.get("sender", "unknown@unknown.com"))
            
            # Predict
            pred_result = prediction_service.predict(text=text, subject=subject, sender=sender)
            
            # Save to db
            email_record = EmailService.create_email(db, {
                "subject": subject,
                "body": text,
                "sender": sender,
                "label": pred_result["label"],
                "confidence": pred_result["confidence"],
                "is_prediction": True,
            })
            
            # Append full result similar to single prediction but with record id
            results.append({
                "id": email_record.id,
                **pred_result
            })
            
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses batch: {str(e)}")


@router.get("/list", response_model=list[EmailResponse])
async def list_emails(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    label: Optional[str] = Query(None, pattern="^(spam|ham)$"),
    is_prediction: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Ambil daftar email dengan filter."""
    emails = EmailService.get_emails(db, skip, limit, label, is_prediction)
    return emails


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Ambil statistik dashboard."""
    stats = EmailService.get_stats(db, dataset_id)
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
