import sys
import os

# Tambahkan directory BE-EMAIL ke sys.path agar bisa import module app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.config.database import Base, engine
from app.models.email import Email, TrainingHistory
from app.models.dataset import Dataset

def reset_database():
    print("--- Mengatur Ulang Database ---")
    
    # Konfirmasi jika perlu (opsional, tapi aman)
    # print("PERINGATAN: Semua data dalam database akan dihapus.")
    
    try:
        # Hapus semua tabel
        print("Menghapus tabel lama...")
        Base.metadata.drop_all(bind=engine)
        
        # Buat tabel baru
        print("Membuat tabel baru...")
        Base.metadata.create_all(bind=engine)
        
        print("--- Database Berhasil Direset! ---")
        print("Database sekarang kosong dan siap digunakan.")
        
    except Exception as e:
        print(f"Terjadi kesalahan saat reset database: {str(e)}")

if __name__ == "__main__":
    reset_database()
