import re
import torch
import time
from transformers import BertTokenizer

# 1. SETUP PARAMETER
MAX_LEN = 128
MODEL_NAME = "indobenchmark/indobert-base-p1"
# Gunakan offline/local jika ada, tapi untuk tes ini kita asumsikan internet ok atau sudah ter-cache
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)

def preprocess_spam(text):
    # --- TAHAP 1: CLEANING ---
    text = re.sub(r'<.*?>', '', text) # Hapus HTML
    text = re.sub(r'http\S+|www\S+', '[URL]', text) # Masking URL
    text = re.sub(r'\S+@\S+', '[EMAIL]', text) # Masking Email
    text = re.sub(r'[^\w\s\?\.!]', '', text) # Hapus simbol aneh
    text = " ".join(text.split()) # Rapikan spasi
    
    # --- TAHAP 2: TOKENIZATION (IndoBERT Input Layer) ---
    inputs = tokenizer(
        text,
        add_special_tokens=True,
        max_length=MAX_LEN,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )
    
    input_ids = inputs['input_ids'].squeeze(0)
    attention_mask = inputs['attention_mask'].squeeze(0)
    
    # --- TAHAP 3: GRAPH CONSTRUCTION (Untuk GAT) ---
    edge_sources = []
    edge_targets = []
    
    valid_len = attention_mask.sum().item()
    
    for i in range(valid_len - 1):
        src = i
        dst = i + 1
        edge_sources.extend([src, dst])
        edge_targets.extend([dst, src])
        
    edge_index = torch.tensor([edge_sources, edge_targets], dtype=torch.long)
    
    return {
        'input_ids': input_ids,
        'attention_mask': attention_mask,
        'edge_index': edge_index,
        'text_cleaned': text
    }

# Simulasi 1000 email untuk estimasi
print("Memulai pengujian kecepatan untuk 1000 email...")
start_time = time.time()
sample_text = "HADIAH GRATIS 100JT!! Cek link: http://menang.com sekarang! " * 5 # Teks agak panjang
for i in range(1000):
    preprocess_spam(sample_text)
end_time = time.time()

duration = end_time - start_time
print(f"Waktu untuk 1000 email: {duration:.2f} detik")
print(f"Estimasi untuk 20.000 email: {duration * 20 / 60:.2f} menit")
