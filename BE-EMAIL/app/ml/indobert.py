import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel, AutoConfig
from app.config import get_settings

settings = get_settings()


class IndoBERTClassifier(nn.Module):
    """
    IndoBERT Fine-Tuned Classifier untuk Deteksi Email Spam.

    Arsitektur:
    ┌─────────────────────────────────────────────────────────┐
    │ INPUT LAYER (Tokenizer & Embedding)                     │
    │  - max_sequence_length: 256                             │
    │  - tokenizer: WordPiece (bawaan IndoBERT)               │
    │  - padding: max_length                                  │
    │  - truncation: True                                     │
    │  - output: input_ids, attention_mask, token_type_ids    │
    ├─────────────────────────────────────────────────────────┤
    │ HIDDEN LAYER (Encoder IndoBERT)                         │
    │  - hidden_size: 768                                     │
    │  - num_hidden_layers: 12                                │
    │  - num_attention_heads: 12                              │
    │  - intermediate_size: 3072                              │
    │  - hidden_act: GELU                                     │
    │  - hidden_dropout_prob: 0.1                             │
    │  - attention_probs_dropout_prob: 0.1                    │
    ├─────────────────────────────────────────────────────────┤
    │ OUTPUT LAYER (Classification Head)                      │
    │  - classifier input: 768                                │
    │  - dropout: 0.1                                         │
    │  - num_labels: 2 (spam / ham)                           │
    │  - activation: Softmax                                  │
    │  - loss: CrossEntropyLoss                               │
    └─────────────────────────────────────────────────────────┘

    Parameter Fine-Tuning:
    - learning_rate: 2e-5 – 5e-5
    - batch_size: 8 / 16 / 32
    - epoch: 3 – 5
    - optimizer: AdamW
    - weight_decay: 0.01
    """

    def __init__(
        self,
        model_name: str = None,
        num_labels: int = 2,
        classifier_dropout: float = 0.1,
    ):
        super(IndoBERTClassifier, self).__init__()

        self.model_name = model_name or settings.INDOBERT_MODEL
        self.num_labels = num_labels

        # Load pre-trained IndoBERT with specific configuration
        self.config = AutoConfig.from_pretrained(self.model_name)
        
        # Override hidden layer parameters based on user specification
        self.config.hidden_dropout_prob = 0.1
        self.config.attention_probs_dropout_prob = 0.1
        self.config.hidden_act = "gelu"
        self.config.hidden_size = 768
        self.config.num_hidden_layers = 12
        self.config.num_attention_heads = 12
        self.config.intermediate_size = 3072

        self.bert = AutoModel.from_pretrained(self.model_name, config=self.config)

        # Classification Head (Output Layer)
        # dropout: 0.1 – 0.3
        self.dropout = nn.Dropout(classifier_dropout)
        self.classifier = nn.Linear(self.config.hidden_size, num_labels)  # 768 → 2

    def forward(self, input_ids, attention_mask=None, token_type_ids=None):
        """
        Forward pass IndoBERT + Classification Head.

        Args:
            input_ids: Token IDs dari tokenizer (batch_size, seq_len)
            attention_mask: Mask token valid (batch_size, seq_len)
            token_type_ids: Segment IDs (batch_size, seq_len)

        Returns:
            logits: (batch_size, num_labels)
        """
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        )

        # Ambil [CLS] token (representasi kalimat)
        cls_output = outputs.last_hidden_state[:, 0, :]  # (batch_size, 768)

        # Classification Head
        cls_output = self.dropout(cls_output)
        logits = self.classifier(cls_output)  # (batch_size, 2)

        return logits

    def get_embedding(self, input_ids, attention_mask=None, token_type_ids=None):
        """
        Ambil embedding [CLS] dari IndoBERT (untuk input ke GAT).

        Returns:
            cls_embedding: (batch_size, 768)
        """
        with torch.no_grad():
            outputs = self.bert(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids,
            )
        return outputs.last_hidden_state[:, 0, :]


class IndoBERTEmbedder:
    """
    Manager untuk IndoBERT: tokenisasi, fine-tuning, dan embedding extraction.

    Input Layer Parameters:
    - max_sequence_length: 256
    - tokenizer: WordPiece (IndoBERT bawaan)
    - padding: max_length
    - truncation: True
    """

    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.INDOBERT_MODEL
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available()
            else "cuda" if torch.cuda.is_available()
            else "cpu"
        )
        self.tokenizer = None
        self.model: IndoBERTClassifier = None
        self._is_loaded = False

        # Input Layer Parameters
        self.max_length = 256
        self.padding = "max_length"
        self.truncation = True

    def load_model(self):
        """Load IndoBERT tokenizer dan model."""
        if self._is_loaded:
            return

        print(f"[IndoBERT] Loading model: {self.model_name}")
        print(f"[IndoBERT] Device: {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = IndoBERTClassifier(model_name=self.model_name)
        self.model.to(self.device)
        self._is_loaded = True

        print(f"[IndoBERT] Model loaded successfully")
        print(f"[IndoBERT] Config: hidden_size={self.model.config.hidden_size}, "
              f"num_hidden_layers={self.model.config.num_hidden_layers}, "
              f"num_attention_heads={self.model.config.num_attention_heads}")

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def embedding_dim(self) -> int:
        """Dimensi output embedding (768 untuk BERT base)."""
        return 768

    def tokenize(self, texts: list[str]) -> dict:
        """
        Tokenisasi teks menggunakan IndoBERT WordPiece tokenizer.

        Input Layer:
        - max_sequence_length: 256
        - padding: max_length
        - truncation: True
        - output: input_ids, attention_mask, token_type_ids

        Args:
            texts: List teks yang akan ditokenisasi

        Returns:
            Dict berisi input_ids, attention_mask, token_type_ids
        """
        if not self._is_loaded:
            self.load_model()

        inputs = self.tokenizer(
            texts,
            return_tensors="pt",
            padding=self.padding,
            truncation=self.truncation,
            max_length=self.max_length,
        )
        return {k: v.to(self.device) for k, v in inputs.items()}

    def get_embedding(self, text: str) -> torch.Tensor:
        """
        Mendapatkan [CLS] embedding dari satu teks.

        Args:
            text: Teks email

        Returns:
            Tensor embedding berdimensi (768,)
        """
        if not self._is_loaded:
            self.load_model()

        self.model.eval()
        inputs = self.tokenize([text])

        with torch.no_grad():
            embedding = self.model.get_embedding(**inputs)

        return embedding.squeeze(0).cpu()

    def get_batch_embeddings(
        self, texts: list[str], batch_size: int = 16
    ) -> torch.Tensor:
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

        self.model.eval()
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            inputs = self.tokenize(batch_texts)

            with torch.no_grad():
                embeddings = self.model.get_embedding(**inputs)

            all_embeddings.append(embeddings.cpu())

            if (i // batch_size + 1) % 10 == 0:
                print(f"  [IndoBERT] Batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1}")

        return torch.cat(all_embeddings, dim=0)

    def fine_tune(
        self,
        texts: list[str],
        labels: list[int],
        epochs: int = 5,
        learning_rate: float = 2e-5,
        batch_size: int = 16,
        weight_decay: float = 0.01,
    ) -> dict:
        """
        Fine-tuning IndoBERT dengan data email.

        Fine-Tuning Parameters:
        - optimizer: AdamW
        - learning_rate: 2e-5
        - weight_decay: 0.01
        - epoch: 3-5
        - batch_size: 16
        - loss: CrossEntropyLoss

        Args:
            texts: Daftar teks email
            labels: Daftar label (0=ham, 1=spam)
            epochs: Jumlah epoch fine-tuning (default 5)
            learning_rate: Learning rate (default 2e-5)
            batch_size: Batch size (default 16)
            weight_decay: Weight decay untuk AdamW (default 0.01)

        Returns:
            Dict berisi loss history
        """
        if not self._is_loaded:
            self.load_model()

        self.model.train()
        labels_tensor = torch.tensor(labels, dtype=torch.long).to(self.device)

        # Optimizer: AdamW (sesuai spesifikasi)
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
        )

        # Loss: CrossEntropyLoss (sesuai spesifikasi)
        criterion = nn.CrossEntropyLoss()

        loss_history = []

        for epoch in range(epochs):
            total_loss = 0
            n_batches = 0

            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i : i + batch_size]
                batch_labels = labels_tensor[i : i + batch_size]
                inputs = self.tokenize(batch_texts)

                optimizer.zero_grad()
                logits = self.model(**inputs)
                loss = criterion(logits, batch_labels)
                loss.backward()
                optimizer.step()

                total_loss += loss.item()
                n_batches += 1

            avg_loss = total_loss / n_batches
            loss_history.append(avg_loss)
            print(f"  [IndoBERT Fine-tune] Epoch {epoch + 1}/{epochs} - Loss: {avg_loss:.4f}")

        self.model.eval()
        return {"loss_history": loss_history, "final_loss": loss_history[-1]}


# Singleton instance
indobert_embedder = IndoBERTEmbedder()
