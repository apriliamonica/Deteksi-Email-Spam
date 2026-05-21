import requests
import json
import os

BASE_URL = "http://localhost:8000/api/model"

def test_select_activate_model():
    print("=== MODEL ACTIVATE END-TO-END INTEGRATION TEST ===")
    
    # 1. Fetch current active model status
    print("\n1. Mengambil info model aktif saat ini...")
    try:
        res = requests.get(f"{BASE_URL}/active")
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            active_model = res.json()
            print(f"Model Aktif: ID #{active_model.get('id')}, Dataset: {active_model.get('dataset_name')}, Akurasi: {active_model.get('accuracy') * 100:.2f}%, F1-Score: {active_model.get('f1_score') * 100:.2f}%")
        else:
            print(f"Gagal mengambil model aktif: {res.text}")
            active_model = None
    except Exception as e:
        print(f"Error calling /active: {e}")
        return

    # 2. Fetch all training history
    print("\n2. Mengambil riwayat pelatihan model...")
    try:
        res = requests.get(f"{BASE_URL}/history")
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            history = res.json()
            print(f"Daftar Riwayat (Total: {len(history)}):")
            for h in history:
                print(f" - ID #{h.get('id')}: Accuracy={h.get('accuracy')*100:.2f}%, F1={h.get('f1_score')*100:.2f}%")
        else:
            print(f"Gagal mengambil riwayat: {res.text}")
            return
    except Exception as e:
        print(f"Error calling /history: {e}")
        return

    if not history:
        print("Tidak ada riwayat pelatihan di database. Harap jalankan training terlebih dahulu.")
        return

    # 3. Test activation of a model
    # We will pick the first model in history
    target_id = history[0].get('id')
    print(f"\n3. Menguji aktivasi model ke ID #{target_id}...")
    try:
        res = requests.post(f"{BASE_URL}/activate/{target_id}")
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")
        if res.status_code != 200:
            print("Gagal mengaktifkan model.")
            return
    except Exception as e:
        print(f"Error calling /activate: {e}")
        return

    # 4. Verify updated active model info
    print("\n4. Memverifikasi model aktif yang baru...")
    try:
        res = requests.get(f"{BASE_URL}/active")
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            new_active = res.json()
            print(f"Model Aktif Baru: ID #{new_active.get('id')}, Dataset: {new_active.get('dataset_name')}, Akurasi: {new_active.get('accuracy') * 100:.2f}%, F1-Score: {new_active.get('f1_score') * 100:.2f}%")
            if new_active.get('id') == target_id:
                print("\n✅ BERHASIL: Model aktif terupdate dengan benar!")
            else:
                print("\n❌ GAGAL: ID model aktif tidak sesuai dengan target aktivasi.")
        else:
            print(f"Gagal mengambil model aktif baru: {res.text}")
    except Exception as e:
        print(f"Error calling /active: {e}")

if __name__ == "__main__":
    test_select_activate_model()
