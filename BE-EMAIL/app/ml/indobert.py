import torch
from transformers import AutoTokenizer, AutoModel
from app.config import get_settings

settings = get_settings()


class IndoBERTEmbedder:
    """
    IndoBERT Feature Extractor.

    Menggunakan model pre-trained IndoBERT (indobenchmark/indobert-base-p1)
    untuk mengekstraksi fitur teks email menjadi representasi vektor (embedding).

    Proses:
    1. Tokenisasi teks menggunakan IndoBERT tokenizer
    2. Forward pass melalui IndoBERT model
    3. Mengambil [CLS] token embedding sebagai representasi kalimat
    """

    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.INDOBERT_MODEL
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self._is_loaded = False

    def load_model(self):
        """Load IndoBERT tokenizer dan model."""
        if self._is_loaded:
            return

        print(f"[IndoBERT] Loading model: {self.model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()
        self._is_loaded = True
        print(f"[IndoBERT] Model loaded on {self.device}")

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def embedding_dim(self) -> int:
        """Dimensi output embedding (768 untuk BERT base)."""
        return 768

    def get_embedding(self, text: str) -> torch.Tensor:
        """
        Mendapatkan embedding dari satu teks.

        Args:
            text: Teks email yang akan di-embed

        Returns:
            Tensor embedding berdimensi (768,)
        """
        if not self._is_loaded:
            self.load_model()

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)

        # Mengambil [CLS] token embedding (index 0)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        return cls_embedding.squeeze(0)

    def get_batch_embeddings(self, texts: list[str], batch_size: int = 16) -> torch.Tensor:
        """
        Mendapatkan embedding dari batch teks.

        Args:
            texts: Daftar teks email
            batch_size: Ukuran batch

        Returns:
            Tensor embedding berdimensi (n_texts, 768)
        """
        if not self._is_loaded:
            self.load_model()

        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            inputs = self.tokenizer(
                batch_texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512,
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)

            cls_embeddings = outputs.last_hidden_state[:, 0, :]
            all_embeddings.append(cls_embeddings)

        return torch.cat(all_embeddings, dim=0)


# Singleton instance
indobert_embedder = IndoBERTEmbedder()
