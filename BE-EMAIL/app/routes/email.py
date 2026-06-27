from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import Integer
from typing import Optional, List
import pandas as pd
import io
import uuid
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


def _read_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    """Helper: baca file CSV/Excel ke DataFrame."""
    is_excel = filename.endswith((".xlsx", ".xls"))
    df = None
    if is_excel or content.startswith(b"PK"):
        try:
            df = pd.read_excel(io.BytesIO(content))
        except Exception:
            pass
    if df is None:
        for enc in ['utf-8', 'latin1', 'ISO-8859-1']:
            for sep in [',', ';', '\t']:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=sep, on_bad_lines='skip')
                    break
                except Exception:
                    continue
            if df is not None:
                break
    if df is None:
        raise HTTPException(status_code=400, detail="Gagal membaca file. Pastikan format benar.")
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


@router.post("/preview-columns")
async def preview_columns(
    file: UploadFile = File(..., description="CSV/Excel file untuk dibaca kolomnya"),
):
    """Baca nama-nama kolom dari file yang diupload tanpa memproses data."""
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File harus berformat CSV atau Excel (.xlsx, .xls)")
    try:
        content = await file.read()
        df = _read_dataframe(content, file.filename)
        columns = list(df.columns)
        total_rows = len(df)
        
        # Hitung spam/ham jika ada kolom label
        spam_count = 0
        ham_count = 0
        if "label" in columns:
            try:
                # normalisasi label spam/ham atau 1/0
                labels = df["label"].astype(str).str.lower().str.strip()
                spam_count = int(sum(labels.isin(['spam', '1'])))
                ham_count = int(sum(labels.isin(['ham', '0'])))
            except:
                pass
                
        return {
            "status": "success", 
            "columns": columns, 
            "metrics": {
                "total_rows": total_rows,
                "spam": spam_count,
                "ham": ham_count,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca kolom: {str(e)}")


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
            "user_id": email_input.user_id,
        })

        return PredictionResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengklasifikasi email: {str(e)}")


@router.post("/classify-batch")
async def classify_batch(
    file: UploadFile = File(..., description="CSV file dengan kolom 'text' atau 'body'"),
    text_column: str = Form("", description="Nama kolom teks (text/body) yang akan dipakai"),
    subject_column: str = Form("", description="Nama kolom subject (opsional)"),
    sender_column: str = Form("", description="Nama kolom sender (opsional)"),
    user_id: Optional[int] = Form(None, description="ID user yang melakukan klasifikasi"),
    db: Session = Depends(get_db)
):
    """
    Klasifikasi email sebagai spam atau ham secara batch.
    """
    is_excel = file.filename.endswith((".xlsx", ".xls"))
    is_csv = file.filename.endswith(".csv")

    if not (is_excel or is_csv):
        raise HTTPException(status_code=400, detail="File harus berformat CSV atau Excel (.xlsx, .xls)")

    try:
        content = await file.read()
        original_filename = file.filename
        # Generate batch_id unik untuk mengelompokkan semua email dari file ini
        batch_uid = str(uuid.uuid4())
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
                        if any(c in temp_cols for c in ["text_id", "text", "body", text_column.strip().lower() if text_column else ""]):
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

        text_col = None
        subj_col = None
        sender_col = None
        
        # Text column (wajib ada setidaknya 1 kolom untuk diproses)
        if text_column and text_column.strip():
            target_text = text_column.strip().lower()
            if target_text not in df.columns:
                raise HTTPException(status_code=400, detail=f"Kolom teks '{text_column}' tidak ditemukan dalam file.")
            text_col = target_text
        else:
            text_col = next((c for c in ["text_id", "text", "body"] if c in df.columns), None)
            
        if not text_col and len(df.columns) > 0:
            first_col = df.columns[0]
            df = df.rename(columns={first_col: "text"})
            text_col = "text"

        # Subject column (opsional)
        if subject_column and subject_column.strip():
            target_subj = subject_column.strip().lower()
            if target_subj not in df.columns:
                raise HTTPException(status_code=400, detail=f"Kolom subject '{subject_column}' tidak ditemukan dalam file.")
            subj_col = target_subj

        # Sender column (opsional)
        if sender_column and sender_column.strip():
            target_sender = sender_column.strip().lower()
            if target_sender not in df.columns:
                raise HTTPException(status_code=400, detail=f"Kolom sender '{sender_column}' tidak ditemukan dalam file.")
            sender_col = target_sender

        results = []
        for _, row in df.iterrows():
            text = str(row[text_col])
            if not text.strip(): continue
            
            subject = str(row[subj_col]) if subj_col and pd.notna(row[subj_col]) else None
            sender = str(row.get("sender", "unknown@unknown.com"))
            
            # Predict
            pred_result = prediction_service.predict(text=text, subject=subject, sender=sender)
            
            # Save to db dengan batch_id dan batch_name
            email_record = EmailService.create_email(db, {
                "subject": subject,
                "body": text,
                "sender": sender,
                "label": pred_result["label"],
                "confidence": pred_result["confidence"],
                "is_prediction": True,
                "user_id": user_id,
                "batch_id": batch_uid,
                "batch_name": original_filename,
            })
            
            # Append full result similar to single prediction but with record id
            results.append({
                "id": email_record.id,
                **pred_result
            })
            
        spam_count = sum(1 for r in results if r.get("label") == "spam")
        ham_count = len(results) - spam_count
        return {
            "status": "success",
            "batch_id": batch_uid,
            "batch_name": original_filename,
            "total": len(results),
            "spam_count": spam_count,
            "ham_count": ham_count,
            "results": results
        }
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


@router.get("/classify-history/batches")
async def get_batch_history(
    user_id: Optional[int] = Query(None, description="Filter berdasarkan user_id"),
    db: Session = Depends(get_db),
):
    """Ambil daftar riwayat batch upload yang terkelompok berdasarkan batch_id."""
    from app.models.email import Email
    from sqlalchemy import func as sqlfunc

    query = db.query(
        Email.batch_id,
        Email.batch_name,
        sqlfunc.count(Email.id).label("total"),
        sqlfunc.sum(
            sqlfunc.cast(Email.label == "spam", Integer)
        ).label("spam_count"),
        sqlfunc.min(Email.created_at).label("created_at"),
    ).filter(
        Email.is_prediction == True,
        Email.batch_id != None,
    )

    if user_id is not None:
        query = query.filter(Email.user_id == user_id)

    batches = query.group_by(Email.batch_id, Email.batch_name).order_by(
        sqlfunc.min(Email.created_at).desc()
    ).all()

    return [
        {
            "batch_id": b.batch_id,
            "batch_name": b.batch_name,
            "total": b.total,
            "spam_count": int(b.spam_count or 0),
            "ham_count": int(b.total - (b.spam_count or 0)),
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in batches
    ]


@router.get("/classify-history")
async def get_classify_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    label: Optional[str] = Query(None, pattern="^(spam|ham)$"),
    user_id: Optional[int] = Query(None, description="Filter riwayat berdasarkan user_id"),
    batch_id: Optional[str] = Query(None, description="Filter berdasarkan batch_id tertentu"),
    no_batch: Optional[bool] = Query(None, description="Jika True, hanya tampilkan email manual (tanpa batch_id)"),
    db: Session = Depends(get_db),
):
    """Ambil riwayat klasifikasi (is_prediction=True) dengan paginasi dan pencarian."""
    from app.models.email import Email
    from sqlalchemy import or_

    query = db.query(Email).filter(Email.is_prediction == True)
    if user_id is not None:
        query = query.filter(Email.user_id == user_id)
    if batch_id is not None:
        query = query.filter(Email.batch_id == batch_id)
    if no_batch:
        query = query.filter(Email.batch_id == None)
    if label:
        query = query.filter(Email.label == label)
    if search:
        query = query.filter(
            or_(
                Email.body.ilike(f"%{search}%"),
                Email.subject.ilike(f"%{search}%"),
                Email.sender.ilike(f"%{search}%"),
            )
        )
    total = query.count()
    items = query.order_by(Email.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": e.id,
                "subject": e.subject,
                "body": e.body,
                "sender": e.sender,
                "label": e.label,
                "confidence": e.confidence,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in items
        ],
    }


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


@router.delete("/classify-history/{email_id}")
async def delete_classify_history_item(
    email_id: int,
    db: Session = Depends(get_db),
):
    """Hapus satu item riwayat klasifikasi berdasarkan ID."""
    from app.models.email import Email

    email = db.query(Email).filter(
        Email.id == email_id, Email.is_prediction == True
    ).first()
    if not email:
        raise HTTPException(
            status_code=404,
            detail="Data riwayat klasifikasi tidak ditemukan",
        )
    db.delete(email)
    db.commit()
    return {"status": "success", "message": f"Riwayat klasifikasi ID {email_id} berhasil dihapus."}


@router.delete("/classify-history")
async def delete_all_classify_history(
    db: Session = Depends(get_db),
):
    """Hapus semua riwayat klasifikasi."""
    from app.models.email import Email

    deleted = db.query(Email).filter(Email.is_prediction == True).delete()
    db.commit()
    return {"status": "success", "message": f"Berhasil menghapus {deleted} riwayat klasifikasi."}


@router.delete("/classify-history/batches/{batch_id}")
async def delete_batch_history(
    batch_id: str,
    db: Session = Depends(get_db),
):
    """Hapus semua riwayat klasifikasi dari sebuah batch upload."""
    from app.models.email import Email

    deleted = db.query(Email).filter(Email.batch_id == batch_id).delete()
    db.commit()
    
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Batch tidak ditemukan")
        
    return {"status": "success", "message": f"Berhasil menghapus batch berisi {deleted} email."}
