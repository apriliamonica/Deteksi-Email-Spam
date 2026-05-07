import pandas as pd
import sys
import os
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from functools import partial

# Tambahkan path ke sistem agar bisa import modul app
sys.path.append(os.getcwd())

from app.config.database import SessionLocal, init_db
from app.models.email import Email
from app.models.dataset import Dataset
from app.services.preprocessing_service import preprocessing_service
from app.services.email_service import EmailService

def process_chunk_parallel(rows_data):
    """Fungsi pembantu untuk memproses satu chunk data secara paralel."""
    results = []
    # Inisialisasi service lokal per proses untuk menghindari isu thread-safety dengan Sastrawi
    from app.services.preprocessing_service import PreprocessingService
    local_service = PreprocessingService()
    
    for row in rows_data:
        raw_text = str(row['text'])
        label_val = row['label']
        label_str = "spam" if str(label_val) in ("1", "1.0", "spam") else "ham"
        
        # Real Preprocessing
        processed_text = local_service.clean_text(raw_text)
        
        results.append({
            "body": raw_text,
            "processed_body": processed_text,
            "sender": str(row.get("sender", "")),
            "label": label_str,
            "is_prediction": False
        })
    return results

def seed_data():
    csv_path = "app/data/dataset_translated.csv"
    
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} tidak ditemukan!")
        return

    print(f"\n" + "="*60)
    print(f"🚀 MEMULAI PROSES SEEDING & PREPROCESSING (PARALLEL MODE)")
    print(f"="*60)
    
    try:
        print(f"📂 Membaca dataset: {csv_path}...")
        df = pd.read_csv(csv_path)
        
        # Identifikasi kolom teks
        text_col = 'text_id' if 'text_id' in df.columns else 'body' if 'body' in df.columns else 'text' if 'text' in df.columns else None
        if not text_col or 'label' not in df.columns:
            print(f"❌ Error: Kolom teks atau label tidak ditemukan!")
            return

        # Rename column for consistency in parallel function
        df = df.rename(columns={text_col: 'text'})
        total_rows = len(df)
        print(f"📊 Ditemukan {total_rows} data.")
        
        # Inisialisasi DB
        init_db()
        
        # Pengaturan Paralel
        num_workers = os.cpu_count() or 4
        chunk_size = 50 # Jumlah baris per tugas paralel
        
        # Membagi dataframe menjadi list of chunks (list of dicts)
        data_chunks = []
        for i in range(0, total_rows, chunk_size):
            data_chunks.append(df.iloc[i:i+chunk_size].to_dict('records'))

        print(f"⚙️  Menggunakan {num_workers} CPU Core untuk Stemming Sastrawi...")
        print(f"⏱️  Memulai pemrosesan paralel...\n")

        start_time = time.time()
        processed_count = 0
        spam_total = 0
        ham_total = 0
        
        db = SessionLocal()
        
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(process_chunk_parallel, chunk) for chunk in data_chunks]
            
            for future in as_completed(futures):
                try:
                    chunk_results = future.result()
                    
                    # Hitung statistik
                    for item in chunk_results:
                        if item['label'] == 'spam':
                            spam_total += 1
                        else:
                            ham_total += 1
                    
                    # Bulk Insert ke DB
                    EmailService.bulk_create_emails(db, chunk_results)
                    
                    processed_count += len(chunk_results)
                    
                    # Progress Update
                    if processed_count % 250 == 0 or processed_count == total_rows:
                        elapsed = time.time() - start_time
                        speed = processed_count / elapsed
                        eta = (total_rows - processed_count) / speed
                        print(f"   [PROGRES] {processed_count:>5}/{total_rows} ({processed_count/total_rows*100:>5.1f}%) | ETA: {eta:.0f}s | Speed: {speed:.1f} data/s")
                
                except Exception as e:
                    print(f"❌ Error pada chunk: {str(e)}")

        # Simpan Metadata Dataset
        new_dataset = Dataset(
            name="dataset_translated.csv (Parallel Processed)",
            total_rows=processed_count,
            spam_count=spam_total,
            ham_count=ham_total,
            status="Preprocessed"
        )
        db.add(new_dataset)
        db.commit()
        db.close()

        total_time = time.time() - start_time
        print(f"\n" + "="*60)
        print(f"✅ SELESAI!")
        print(f"✨ Total Data Sukses: {processed_count}")
        print(f"🔴 Spam: {spam_total} | 🟢 Ham: {ham_total}")
        print(f"⏱️  Total Waktu: {total_time/60:.2f} menit")
        print(f"🚀 Sekarang Anda bisa lanjut ke tahap Training di Web.")
        print(f"="*60 + "\n")
            
    except Exception as e:
        print(f"❌ Error Fatal: {str(e)}")

if __name__ == "__main__":
    seed_data()
