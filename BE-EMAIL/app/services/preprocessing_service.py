import re
import string
import pandas as pd
from sqlalchemy.orm import Session
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

class PreprocessingService:
    def __init__(self):
        # Sastrawi tidak lagi digunakan sesuai instruksi (IndoBERT butuh konteks utuh)
        # self.stemmer_factory = StemmerFactory()
        # self.stemmer = self.stemmer_factory.create_stemmer()
        # self.stopword_factory = StopWordRemoverFactory()
        # self.stopword_remover = self.stopword_factory.create_stop_word_remover()
        
        # Cache untuk mempercepat stemming (karena Sastrawi sangat lambat)
        self.stem_cache = {}
        
        # Status Progres
        self.status = {
            "is_running": False,
            "progress": 0,
            "current_item": 0,
            "total_items": 0,
            "message": "Idle",
            "is_force": False
        }
        self._stop_requested = False

    def stop_processing(self):
        self._stop_requested = True

    def clean_text(self, text: str) -> str:
        """Pipeline preprocessing (Forward to central utility)."""
        from app.utils.preprocessing import preprocess_email
        return preprocess_email(text)

    def process_emails(self, db: Session, dataset_id: int, emails: list, force: bool = False):
        """Proses list objek Email dari SQLAlchemy."""
        from app.services.prediction_service import prediction_service
        from app.models.dataset import Dataset
        
        # 1. Cek Lock Backend (Apakah Training sedang berjalan?)
        if prediction_service.training_status["status"] == "training":
            self.status.update({
                "is_running": False,
                "message": "Error: Proses Training sedang berjalan. Harap tunggu."
            })
            return

        total = len(emails)
        self.status.update({
            "is_running": True,
            "progress": 0,
            "current_item": 0,
            "total_items": total,
            "message": "Memulai Pre-processing...",
            "is_force": force
        })

        try:
            self._stop_requested = False
            # Update status dataset ke "Processing"
            db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Processing"})
            db.commit()

            for i, email in enumerate(emails):
                if self._stop_requested:
                    db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Uploaded"})
                    db.commit()
                    self.status.update({"is_running": False, "message": "Proses dibatalkan oleh pengguna."})
                    return
                if not email.processed_body or force:
                    # Gabungkan subjek dan body untuk hasil terbaik
                    full_text = f"{email.subject} {email.body}" if email.subject else email.body
                    cleaned = self.clean_text(full_text)
                    email.processed_body = cleaned
                
                # Update status setiap 10 item agar tidak terlalu berat
                if (i + 1) % 10 == 0 or (i + 1) == total:
                    self.status.update({
                        "progress": int(((i + 1) / total) * 100),
                        "current_item": i + 1,
                        "message": f"Memproses email {i+1} dari {total}..."
                    })
                
                # Commit berkala untuk persistensi
                if (i + 1) % 100 == 0:
                    db.commit()
            
            # Tandai dataset sebagai Preprocessed
            db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Preprocessed"})
            db.commit()

            self.status.update({
                "is_running": False,
                "progress": 100,
                "message": "Pre-processing Selesai!"
            })
        except Exception as e:
            # Revert status jika error
            db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Uploaded"})
            db.commit()
            self.status.update({
                "is_running": False,
                "message": f"Error: {str(e)}"
            })
            raise e

preprocessing_service = PreprocessingService()
