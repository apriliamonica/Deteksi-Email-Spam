import os
import torch
import torch.nn as nn
from torch_geometric.data import Data
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from app.config import get_settings
from app.ml.indobert import indobert_embedder
from app.ml.gat import GATClassifier, build_graph, build_single_prediction_graph
from app.utils.preprocessing import preprocess_email

settings = get_settings()


class PredictionService:
    """
    Service untuk prediksi dan training model hybrid IndoBERT + GAT.

    Alur prediksi:
    1. Preprocessing teks email (cleaning, stemming)
    2. Ekstraksi fitur menggunakan IndoBERT → embedding (768 dim)
    3. Konstruksi graph berdasarkan cosine similarity
    4. Klasifikasi menggunakan GAT → spam/ham

    Alur training:
    1. Ambil data training dari database
    2. Preprocessing semua teks
    3. Batch embedding menggunakan IndoBERT
    4. Konstruksi graph dari semua embedding
    5. Training GAT classifier
    6. Evaluasi dan simpan model
    """

    def __init__(self):
        self.gat_model: GATClassifier = None
        self.training_embeddings: torch.Tensor = None
        self.training_labels: torch.Tensor = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._is_model_loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._is_model_loaded and indobert_embedder.is_loaded

    def load_models(self):
        """Load IndoBERT dan GAT model (jika tersedia)."""
        # Load IndoBERT
        indobert_embedder.load_model()

        # Load GAT model jika ada saved model
        model_path = os.path.join(settings.MODEL_DIR, "gat_model.pt")
        embeddings_path = os.path.join(settings.MODEL_DIR, "training_embeddings.pt")

        if os.path.exists(model_path):
            print("[GAT] Loading saved model...")
            self.gat_model = GATClassifier()
            self.gat_model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.gat_model.to(self.device)
            self.gat_model.eval()
            self._is_model_loaded = True
            print("[GAT] Model loaded successfully")

            if os.path.exists(embeddings_path):
                saved = torch.load(embeddings_path, map_location=self.device)
                self.training_embeddings = saved["embeddings"]
                self.training_labels = saved["labels"]
        else:
            print("[GAT] No saved model found. Please train the model first.")

    def predict(self, text: str, subject: str = None) -> dict:
        """
        Prediksi apakah email spam atau ham.

        Args:
            text: Body email
            subject: Subject email (opsional)

        Returns:
            Dict berisi label, confidence, dan detail proses
        """
        if not self.is_loaded:
            self.load_models()

        if self.gat_model is None:
            raise ValueError("Model GAT belum di-training. Silakan training model terlebih dahulu.")

        # Gabungkan subject dan body
        full_text = f"{subject} {text}" if subject else text

        # Step 1: Preprocessing
        processed_text = preprocess_email(full_text)

        # Step 2: IndoBERT embedding
        embedding = indobert_embedder.get_embedding(processed_text)

        # Step 3: Build graph (email baru + training data)
        graph_data = build_single_prediction_graph(
            new_embedding=embedding,
            existing_embeddings=self.training_embeddings,
        )
        graph_data = graph_data.to(self.device)

        # Step 4: GAT prediction
        predicted, confidence = self.gat_model.predict(graph_data)

        # Index terakhir = email baru
        pred_label = "spam" if predicted[-1].item() == 1 else "ham"
        pred_confidence = confidence[-1].item()

        return {
            "label": pred_label,
            "confidence": round(pred_confidence, 4),
            "body": text,
            "subject": subject,
            "processing_detail": {
                "preprocessed_text": processed_text,
                "embedding_dim": embedding.shape[0],
                "graph_nodes": graph_data.num_nodes,
                "graph_edges": graph_data.num_edges,
            },
        }

    def train(
        self,
        texts: list[str],
        labels: list[int],
        epochs: int = 10,
        learning_rate: float = 2e-5,
        batch_size: int = 16,
        test_split: float = 0.2,
    ) -> dict:
        """
        Training model hybrid IndoBERT + GAT.

        Args:
            texts: Daftar teks email
            labels: Daftar label (0=ham, 1=spam)
            epochs: Jumlah epoch
            learning_rate: Learning rate
            batch_size: Batch size untuk embedding
            test_split: Rasio data test

        Returns:
            Dict metrik evaluasi
        """
        # Load IndoBERT jika belum
        if not indobert_embedder.is_loaded:
            indobert_embedder.load_model()

        print(f"[Training] Preprocessing {len(texts)} emails...")
        processed_texts = [preprocess_email(t) for t in texts]

        print(f"[Training] Generating IndoBERT embeddings...")
        embeddings = indobert_embedder.get_batch_embeddings(processed_texts, batch_size)
        labels_tensor = torch.tensor(labels, dtype=torch.long)

        # Split train/test
        indices = list(range(len(texts)))
        train_idx, test_idx = train_test_split(
            indices, test_size=test_split, stratify=labels, random_state=42
        )

        train_embeddings = embeddings[train_idx]
        train_labels = labels_tensor[train_idx]
        test_embeddings = embeddings[test_idx]
        test_labels = labels_tensor[test_idx]

        # Build graph dari training data
        print("[Training] Building training graph...")
        train_graph = build_graph(train_embeddings)
        train_graph.y = train_labels
        train_graph = train_graph.to(self.device)

        # Inisialisasi GAT model
        self.gat_model = GATClassifier().to(self.device)
        optimizer = torch.optim.Adam(self.gat_model.parameters(), lr=learning_rate)
        criterion = nn.CrossEntropyLoss()

        # Training loop
        print(f"[Training] Starting training for {epochs} epochs...")
        self.gat_model.train()

        for epoch in range(epochs):
            optimizer.zero_grad()
            out = self.gat_model(train_graph)
            loss = criterion(out, train_graph.y)
            loss.backward()
            optimizer.step()

            if (epoch + 1) % 5 == 0:
                print(f"  Epoch {epoch+1}/{epochs} - Loss: {loss.item():.4f}")

        # Evaluasi pada test set
        print("[Training] Evaluating on test set...")
        test_graph = build_graph(test_embeddings)
        test_graph.y = test_labels
        test_graph = test_graph.to(self.device)

        predicted, _ = self.gat_model.predict(test_graph)
        pred_np = predicted.cpu().numpy()
        true_np = test_labels.cpu().numpy()

        metrics = {
            "accuracy": round(accuracy_score(true_np, pred_np), 4),
            "precision": round(precision_score(true_np, pred_np, average="binary"), 4),
            "recall": round(recall_score(true_np, pred_np, average="binary"), 4),
            "f1_score": round(f1_score(true_np, pred_np, average="binary"), 4),
            "total_data": len(texts),
            "train_size": len(train_idx),
            "test_size": len(test_idx),
            "epochs": epochs,
            "learning_rate": learning_rate,
        }

        # Simpan model dan embeddings
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        torch.save(
            self.gat_model.state_dict(),
            os.path.join(settings.MODEL_DIR, "gat_model.pt"),
        )
        torch.save(
            {"embeddings": embeddings, "labels": labels_tensor},
            os.path.join(settings.MODEL_DIR, "training_embeddings.pt"),
        )

        self.training_embeddings = embeddings
        self.training_labels = labels_tensor
        self._is_model_loaded = True

        print(f"[Training] Complete! Accuracy: {metrics['accuracy']}")
        return metrics


# Singleton instance
prediction_service = PredictionService()
