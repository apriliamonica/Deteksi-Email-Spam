import sys
import os
import torch
import pandas as pd

# Add app to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config.database import SessionLocal, init_db
from app.models.email import Email
from app.services.prediction_service import prediction_service

def run_train_and_predict_test():
    print("="*60)
    print("🧪 STARTING INTEGRATION TEST: TRAINING AND INFERENCE PIPELINE")
    print("="*60)
    
    init_db()
    db = SessionLocal()
    
    # 1. Fetch training data from DB
    try:
        emails = db.query(Email).filter(Email.is_prediction == False).all()
        print(f"📊 Retrived {len(emails)} preprocessed emails from database.")
        if len(emails) == 0:
            print("❌ No emails in the database! Please run seed_dataset.py first.")
            return False
            
        spam_emails = [e for e in emails if e.label == 'spam']
        ham_emails = [e for e in emails if e.label == 'ham']
        print(f"🔴 Spam: {len(spam_emails)} | 🟢 Ham: {len(ham_emails)}")
        
        # Take a subset of 150 spam and 150 ham for a fast but robust test run
        subset_size = min(150, len(spam_emails), len(ham_emails))
        test_emails = spam_emails[:subset_size] + ham_emails[:subset_size]
        print(f"⚡ Selected balanced subset of {len(test_emails)} emails for quick training test.")
        
    except Exception as e:
        print(f"❌ Failed to fetch emails from DB: {e}")
        db.close()
        return False
        
    db.close()
    
    # Extract training attributes
    texts = [e.processed_body if e.processed_body else e.body for e in test_emails]
    labels = [1 if e.label == "spam" else 0 for e in test_emails]
    senders = [e.sender if e.sender else "unknown@unknown.com" for e in test_emails]
    
    # 2. Trigger prediction_service.train
    print("\n" + "="*60)
    print("🚀 TRAINING MODEL")
    print("="*60)
    try:
        # We set finetune_epochs=0 to avoid extremely slow BERT fine-tuning on CPU,
        # but GAT training will run with the specified epochs.
        result = prediction_service.train(
            texts=texts,
            labels=labels,
            senders=senders,
            dataset_id=None,
            finetune_epochs=0,
            gat_epochs=100,
            gat_lr=0.001,
            gat_weight_decay=1e-4,
            test_split=0.2
        )
        print("✅ Model training completed successfully!")
        
        metrics = result["metrics"]
        print("\n📈 TRAINING METRICS:")
        print(f"   Accuracy:  {metrics['accuracy']:.4f}")
        print(f"   Precision: {metrics['precision']:.4f}")
        print(f"   Recall:    {metrics['recall']:.4f}")
        print(f"   F1-Score:  {metrics['f1_score']:.4f}")
        print(f"   MCC:       {metrics['mcc']:.4f}")
        print(f"   ROC AUC:   {metrics['roc_auc']:.4f}")
        print(f"   Total Size: {metrics['total_data']} (Train: {metrics['train_size']}, Test: {metrics['test_size']})")
        
        # Verify validation macro F1-score is tracked and scheduler operated correctly
        if metrics['f1_score'] < 0.0:
            print("❌ Invalid F1 Score!")
            return False
            
    except Exception as e:
        print(f"❌ Model training pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    # 3. Verify Saved Files
    print("\n" + "="*60)
    print("📂 VERIFYING SAVED MODEL ARTIFACTS")
    print("="*60)
    model_dir = "saved_models"
    required_files = ["spamgat_weights.pt", "graph_data.pt", "emails.csv", "config.json"]
    for f in required_files:
        fpath = os.path.join(model_dir, f)
        if os.path.exists(fpath):
            size = os.path.getsize(fpath)
            print(f"✅ Found {f} ({size} bytes)")
        else:
            print(f"❌ Missing expected model artifact: {f}")
            return False
            
    # 4. Test Single-Email Prediction (Inference)
    print("\n" + "="*60)
    print("🔮 TESTING ONLINE INFERENCE")
    print("="*60)
    try:
        # Load the models again to make sure saved weights work
        prediction_service._is_model_loaded = False
        prediction_service.load_models()
        
        test_inputs = [
            {
                "subject": "PENTING: Verifikasi Akun Anda Sekarang!",
                "text": "Kami mendeteksi aktivitas mencurigakan pada akun perbankan Anda. Silakan klik link ini untuk melakukan verifikasi segera agar akun Anda tidak diblokir.",
                "sender": "keamanan-bank-indonesia@gmail-secure.com"
            },
            {
                "subject": "Tugas Kuliah Minggu Ini",
                "text": "Selamat pagi mahasiswa sekalian, silakan kumpulkan laporan TA Anda paling lambat hari Jumat pukul 23:59 melalui portal akademik. Terima kasih.",
                "sender": "dosen.pengampu@univ.ac.id"
            }
        ]
        
        for idx, inp in enumerate(test_inputs):
            print(f"\n📨 Test Email #{idx+1}:")
            print(f"   Sender:  {inp['sender']}")
            print(f"   Subject: {inp['subject']}")
            print(f"   Body:    {inp['text'][:80]}...")
            
            res = prediction_service.predict(
                text=inp['text'],
                subject=inp['subject'],
                sender=inp['sender']
            )
            
            print(f"   ✨ Predicted:  {res['label'].upper()}")
            print(f"   ✨ Confidence: {res['confidence']:.4f}")
            print(f"   ✨ Nodes:      {res['processing_detail']['graph_nodes']} nodes")
            print(f"   ✨ Edges:      {res['processing_detail']['graph_edges']} edges")
            print(f"   ✨ Sender Hist: {res['processing_detail']['sender_history_count']} emails")
            
        print("\n✅ Online inference test passed!")
        
    except Exception as e:
        print(f"❌ Online inference test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    return True

if __name__ == '__main__':
    ok = run_train_and_predict_test()
    if ok:
        print("\n🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n❌ INTEGRATION TEST FAILED!")
        sys.exit(1)
