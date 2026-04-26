from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.models.email import Email, TrainingHistory


class EmailService:
    """Service untuk operasi CRUD email."""

    @staticmethod
    def create_email(db: Session, email_data: dict) -> Email:
        """Simpan email baru ke database."""
        email = Email(**email_data)
        db.add(email)
        db.commit()
        db.refresh(email)
        return email

    @staticmethod
    def get_emails(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        label: Optional[str] = None,
        is_prediction: Optional[bool] = None,
    ) -> list[Email]:
        """Ambil daftar email dengan filter opsional."""
        query = db.query(Email)

        if label:
            query = query.filter(Email.label == label)
        if is_prediction is not None:
            query = query.filter(Email.is_prediction == is_prediction)

        return query.order_by(Email.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_email_by_id(db: Session, email_id: int) -> Optional[Email]:
        """Ambil email berdasarkan ID."""
        return db.query(Email).filter(Email.id == email_id).first()

    @staticmethod
    def get_training_data(db: Session) -> list[Email]:
        """Ambil semua data training (bukan prediksi)."""
        return (
            db.query(Email)
            .filter(Email.is_prediction == False)
            .all()
        )

    @staticmethod
    def get_stats(db: Session) -> dict:
        """Hitung statistik email."""
        total = db.query(func.count(Email.id)).scalar()
        total_spam = (
            db.query(func.count(Email.id)).filter(Email.label == "spam").scalar()
        )
        total_ham = (
            db.query(func.count(Email.id)).filter(Email.label == "ham").scalar()
        )

        return {
            "total_emails": total or 0,
            "total_spam": total_spam or 0,
            "total_ham": total_ham or 0,
            "spam_percentage": round((total_spam / total * 100), 2) if total > 0 else 0,
        }

    @staticmethod
    def save_training_history(db: Session, history_data: dict) -> TrainingHistory:
        """Simpan riwayat training."""
        history = TrainingHistory(**history_data)
        db.add(history)
        db.commit()
        db.refresh(history)
        return history

    @staticmethod
    def get_latest_training(db: Session) -> Optional[TrainingHistory]:
        """Ambil riwayat training terakhir."""
        return (
            db.query(TrainingHistory)
            .order_by(TrainingHistory.created_at.desc())
            .first()
        )
