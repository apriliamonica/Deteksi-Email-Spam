import re
import string
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory


# Inisialisasi Sastrawi (singleton)
_stemmer_factory = StemmerFactory()
_stemmer = _stemmer_factory.create_stemmer()

_stopword_factory = StopWordRemoverFactory()
_stopword_remover = _stopword_factory.create_stop_word_remover()

# Daftar stopwords tambahan khusus email
EMAIL_STOPWORDS = {
    "dari", "ke", "cc", "bcc", "subject", "re", "fw", "fwd",
    "sent", "received", "mailto", "http", "https", "www",
}


def clean_html(text: str) -> str:
    """Hapus HTML tags dari teks."""
    return re.sub(r"<[^>]+>", " ", text)


def clean_urls(text: str) -> str:
    """Hapus URL dari teks."""
    return re.sub(r"http\S+|www\.\S+", " ", text)


def clean_email_addresses(text: str) -> str:
    """Hapus alamat email dari teks."""
    return re.sub(r"\S+@\S+", " ", text)


def normalize_whitespace(text: str) -> str:
    """Normalisasi whitespace."""
    return re.sub(r"\s+", " ", text).strip()


def remove_punctuation(text: str) -> str:
    """Hapus tanda baca."""
    return text.translate(str.maketrans("", "", string.punctuation))


def remove_numbers(text: str) -> str:
    """Hapus angka."""
    return re.sub(r"\d+", " ", text)


def stem_text(text: str) -> str:
    """Stemming teks Bahasa Indonesia menggunakan Sastrawi."""
    return _stemmer.stem(text)


def remove_stopwords(text: str) -> str:
    """Hapus stopwords Bahasa Indonesia menggunakan Sastrawi."""
    result = _stopword_remover.remove(text)
    # Hapus juga stopwords email
    words = result.split()
    words = [w for w in words if w.lower() not in EMAIL_STOPWORDS]
    return " ".join(words)


def preprocess_email(
    text: str,
    do_stem: bool = True,
    do_remove_stopwords: bool = True,
) -> str:
    """
    Pipeline preprocessing lengkap untuk teks email Bahasa Indonesia.

    Langkah-langkah:
    1. Lowercase
    2. Hapus HTML tags
    3. Hapus URL
    4. Hapus alamat email
    5. Hapus angka
    6. Hapus tanda baca
    7. Normalisasi whitespace
    8. Hapus stopwords (opsional)
    9. Stemming (opsional)

    Args:
        text: Teks email mentah
        do_stem: Apakah melakukan stemming
        do_remove_stopwords: Apakah menghapus stopwords

    Returns:
        Teks yang sudah diproses
    """
    if not text or not text.strip():
        return ""

    # Lowercase
    text = text.lower()

    # Cleaning
    text = clean_html(text)
    text = clean_urls(text)
    text = clean_email_addresses(text)
    text = remove_numbers(text)
    text = remove_punctuation(text)
    text = normalize_whitespace(text)

    # NLP processing
    if do_remove_stopwords:
        text = remove_stopwords(text)

    if do_stem:
        text = stem_text(text)

    return normalize_whitespace(text)
