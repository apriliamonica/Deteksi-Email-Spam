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
        Pipeline preprocessing sesuai notebook SpamGAT.
        - Masking URL & Email
        - Membersihkan karakter non-alphanumeric (kecuali tanda baca dasar)
        - Normalisasi whitespace
        - Potong ke 512 karakter
        """
        if not text or not isinstance(text, str):
            return ""

        # 1. Masking URL & Email
        text = re.sub(r"http\S+|www\S+", "[URL]", text)
        text = re.sub(r"\S+@\S+", "[EMAIL]", text)

        # 2. Hapus Karakter Aneh (Kecuali alphanumeric, spasi, [], ., ?, !)
        text = re.sub(r"[^\w\s\[\].,!?]", " ", text)
        
        # 3. Rapikan Whitespace
        text = re.sub(r"\s+", " ", text).strip()

        return text[:512]

    def extract_domain(self, email_addr: str) -> str:
        """Ekstrak domain dari alamat email."""
        if not email_addr:
            return "unknown"
        match = re.search(r"@([\w.-]+)", str(email_addr))
        return match.group(1) if match else "unknown"

# Singleton instance
_service = PreprocessingService()

def preprocess_email(text: str) -> str:
    return _service.preprocess_email(text)

def extract_domain(email: str) -> str:
    return _service.extract_domain(email)
