import re
import string
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

class PreprocessingService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PreprocessingService, cls).__new__(cls)
            # Sastrawi tidak lagi digunakan (IndoBERT butuh konteks utuh)
        return cls._instance

    def preprocess_email(self, text: str) -> str:
        """
        Pipeline preprocessing untuk IndoBERT + GAT.
        - Hapus HTML
        - Masking URL & Email
        - Case Folding
        - Membersihkan simbol aneh tapi tetap menjaga tanda baca dasar
        """
        if not text or not isinstance(text, str):
            return ""

        # 1. Hapus HTML Tags
        text = re.sub(r'<.*?>', ' ', text)

        # 2. Masking URL & Email
        text = re.sub(r'http\S+|www\S+|https\S+', '[URL]', text)
        text = re.sub(r'\S+@\S+', '[EMAIL]', text)

        # 3. Case Folding
        text = text.lower()

        # 4. Hapus Karakter Spesial (Kecuali tanda baca dasar ? . ! dan masking)
        # Menjaga agar [URL] dan [EMAIL] tidak terhapus
        # Kita hapus karakter yang bukan alphanumeric, spasi, atau ? . ! [ ]
        text = re.sub(r'[^a-z0-9\s\?\.!\[\]]', ' ', text)
        
        # 5. Rapikan Whitespace
        text = " ".join(text.split())

        return text

# Singleton instance untuk digunakan di seluruh aplikasi
_service = PreprocessingService()

def preprocess_email(text: str, do_stem: bool = True) -> str:
    """Fungsi wrapper agar kompatibel dengan kode lama."""
    # Parameter do_stem diabaikan karena sekarang tidak menggunakan stemming
    return _service.preprocess_email(text)
