import pandas as pd
import sys
import os
from sqlalchemy.orm import Session

# Tambahkan path ke sistem agar bisa import modul app
sys.path.append(os.getcwd())

from app.config.database import SessionLocal, init_db
from app.models.email import Email

def seed_data():
    csv_path = "app/data/dataset_translated.csv"
    
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} tidak ditemukan!")
        print("Pastikan kamu sudah memindahkan file hasil translate ke folder 'data/dataset_translated.csv'")
        return

    print(f"Membaca dataset dari {csv_path}...")
    try:
        # Load dataset
        df = pd.read_csv(csv_path)
        
        # Validasi kolom sesuai skrip Colab kamu
        # Kolom teks: 'text_id', Label: 'label' (0/1), Sender: 'sender'
        required_cols = ['text_id', 'label']
        for col in required_cols:
            if col not in df.columns:
                print(f"Error: Kolom '{col}' tidak ditemukan di CSV!")
                return

        print(f"Ditemukan {len(df)} data. Memulai proses import ke database...")
        
        # Inisialisasi DB (buat tabel jika belum ada)
        init_db()
        db = SessionLocal()
        
        count = 0
        try:
            for _, row in df.iterrows():
                # Map label 1 -> spam, 0 -> ham
                label_str = "spam" if int(row['label']) == 1 else "ham"
                
                # Buat objek Email
                new_email = Email(
                    body=str(row['text_id']),
                    sender=str(row.get('sender', '')),
                    label=label_str,
                    is_prediction=False  # Tandai sebagai data training
                )
                db.add(new_email)
                count += 1
                
                # Commit setiap 500 data agar tidak terlalu berat
                if count % 500 == 0:
                    db.commit()
                    print(f"  Sudah mengimport {count} data...")
            
            db.commit()
            print(f"\n--- SELESAI! ---")
            print(f"Berhasil mengimport total {count} data ke database.")
            print("Sekarang kamu bisa melakukan training melalui Dashboard Aplikasi.")
            
        except Exception as e:
            db.rollback()
            print(f"Error saat proses insert: {str(e)}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error saat membaca file CSV: {str(e)}")

if __name__ == "__main__":
    seed_data()
