import pandas as pd
import sys
import os
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

# Tambahkan path ke sistem agar bisa import modul app
sys.path.append(os.getcwd())

from app.config.database import SessionLocal, init_db
from app.models.email import Email
from app.models.dataset import Dataset
from app.utils.preprocessing import preprocess_email, extract_domain
from app.services.email_service import EmailService

def process_chunk_parallel(rows_data):
    """Fungsi pembantu untuk memproses satu chunk data secara paralel."""
    results = []
    
    for row in rows_data:
        # Gunakan text_id (translated body) dan subject_id (translated subject)
        subject_raw = str(row.get('subject_id', ''))
        body_raw = str(row.get('text_id', ''))
        
        # Gabungkan untuk preprocessing (seperti di notebook)
        full_text_raw = f"{subject_raw} [SEP] {body_raw}" if subject_raw else body_raw
        
        processed_text = preprocess_email(full_text_raw)
        
        label_val = row.get('label', 0)
        label_str = "spam" if str(label_val) in ("1", "1.0", "spam") else "ham"
        
        results.append({
            "subject": subject_raw[:500],
            "body": body_raw,
            "processed_body": processed_text,
            "sender": str(row.get("sender", "unknown@unknown.com")),
            "label": label_str,
            "is_prediction": False
        })
    return results

def seed_data():
    xlsx_path = "app/data/indonesian_phishing_dataset.xlsx"
    
    if not os.path.exists(xlsx_path):
        print(f"Error: File {xlsx_path} tidak ditemukan!")
        return

    print(f"\n" + "="*60)
    print(f"🚀 MEMULAI PROSES SEEDING & PREPROCESSING (EXCEL MODE)")
    print(f"="*60)
    
    try:
        print(f"📂 Membaca dataset: {xlsx_path}...")
        df = pd.read_excel(xlsx_path)
        
        total_rows = len(df)
        print(f"📊 Ditemukan {total_rows} data.")
        
        # Inisialisasi DB
        init_db()
        
        # Pengaturan Paralel
        num_workers = os.cpu_count() or 4
        chunk_size = 100 
        
        # Membagi dataframe menjadi list of chunks
        data_chunks = []
        for i in range(0, total_rows, chunk_size):
            data_chunks.append(df.iloc[i:i+chunk_size].to_dict('records'))

        print(f"⚙️  Menggunakan {num_workers} CPU Core untuk preprocessing...")
        print(f"⏱️  Memulai pemrosesan...\n")

        start_time = time.time()
        processed_count = 0
        spam_total = 0
        ham_total = 0
        
        db = SessionLocal()
        
        # Kosongkan data lama jika perlu (Opsional, tapi biasanya seed itu fresh)
        # db.query(Email).delete()
        # db.commit()
        
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(process_chunk_parallel, chunk) for chunk in data_chunks]
            
            for future in as_completed(futures):
                try:
                    chunk_results = future.result()
                    
                    for item in chunk_results:
                        if item['label'] == 'spam':
                            spam_total += 1
                        else:
                            ham_total += 1
                    
                    # Bulk Insert
                    EmailService.bulk_create_emails(db, chunk_results)
                    processed_count += len(chunk_results)
                    
                    if processed_count % 500 == 0 or processed_count == total_rows:
                        elapsed = time.time() - start_time
                        speed = processed_count / elapsed
                        print(f"   [PROGRES] {processed_count:>5}/{total_rows} ({processed_count/total_rows*100:>5.1f}%) | Speed: {speed:.1f} data/s")
                
                except Exception as e:
                    print(f"❌ Error pada chunk: {str(e)}")

        # Simpan Metadata Dataset
        new_dataset = Dataset(
            name="indonesian_phishing_dataset.xlsx",
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
        print(f"🚀 Sekarang Anda bisa lanjut ke tahap Training di Dashboard.")
        print(f"="*60 + "\n")
            
    except Exception as e:
        print(f"❌ Error Fatal: {str(e)}")

if __name__ == "__main__":
    seed_data()
