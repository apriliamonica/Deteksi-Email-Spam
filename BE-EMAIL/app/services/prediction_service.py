import os
import torch
import torch.nn as nn
from torch_geometric.data import Data
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)

from app.config import get_settings
from app.ml.indobert import indobert_embedder
from app.ml.gat import GATClassifier, build_graph, build_single_prediction_graph
from app.ml.umap_reducer import UMAPReducer, create_umap_for_gat, create_umap_for_visualization
from app.utils.preprocessing import preprocess_email

settings = get_settings()


class PredictionService:
    """
    Service untuk prediksi dan training model hybrid IndoBERT + GAT.

    Pipeline Lengkap:
    ┌──────────────────────────────────────────────────────────────────┐
    │ 1. Preprocessing    : Teks → clean, stem, stopword removal     │
    │ 2. Fine-tune IndoBERT: Teks → IndoBERT (fine-tune 5 epoch)     │
    │ 3. Embedding        : Teks → IndoBERT → vektor 768d            │
    │ 4. UMAP             : 768d → 128d (reduksi dimensi)            │
    │ 5. Graph Construction: Cosine similarity → edge_index           │
    │ 6. GAT Training     : Graph → GAT (30 epoch) → klasifikasi     │
    │ 7. Evaluasi         : Accuracy, Precision, Recall, F1          │
    └──────────────────────────────────────────────────────────────────┘
    """

    def __init__(self):
        self.gat_model: GATClassifier = None
        self.umap_gat: UMAPReducer = None
        self.umap_viz: UMAPReducer = None
        self.training_embeddings: torch.Tensor = None  # Embedding asli (768d)
        self.training_embeddings_reduced: torch.Tensor = None  # Setelah UMAP (128d)
        self.training_labels: torch.Tensor = None
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available()
            else "cuda" if torch.cuda.is_available()
            else "cpu"
        )
        self._is_model_loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._is_model_loaded and indobert_embedder.is_loaded

    def load_models(self):
        """Load semua model (IndoBERT, UMAP, GAT) jika tersedia."""
        # Load IndoBERT
        indobert_embedder.load_model()

        model_dir = settings.MODEL_DIR
        gat_path = os.path.join(model_dir, "gat_model.pt")
        data_path = os.path.join(model_dir, "training_data.pt")
        umap_gat_path = os.path.join(model_dir, "umap_gat.pt")

        if os.path.exists(gat_path):
            print("[Service] Loading saved models...")

            # Load saved data
            if os.path.exists(data_path):
                saved = torch.load(data_path, map_location="cpu")
                self.training_embeddings = saved["embeddings"]
                self.training_labels = saved["labels"]
                umap_dim = saved.get("umap_dim", 128)

                if "embeddings_reduced" in saved:
                    self.training_embeddings_reduced = saved["embeddings_reduced"]

            # Load UMAP
            if os.path.exists(umap_gat_path):
                import pickle
                with open(umap_gat_path, "rb") as f:
                    self.umap_gat = pickle.load(f)
                umap_dim = self.umap_gat.n_components
            else:
                umap_dim = 128

            # Load GAT model
            self.gat_model = GATClassifier(in_channels=umap_dim)
            self.gat_model.load_state_dict(
                torch.load(gat_path, map_location=self.device)
            )
            self.gat_model.to(self.device)
            self.gat_model.eval()
            self._is_model_loaded = True

            print("[Service] All models loaded successfully")
        else:
            print("[Service] No saved model found. Please train first.")

    def predict(self, text: str, subject: str = None) -> dict:
        """
        Prediksi email spam atau ham.

        Alur:
        1. Preprocessing → 2. IndoBERT embedding (768d)
        3. UMAP (128d)   → 4. Build graph → 5. GAT predict

        Args:
            text: Body email
            subject: Subject email (opsional)

        Returns:
            Dict: label, confidence, processing_detail
        """
        if not self.is_loaded:
            self.load_models()

        if self.gat_model is None:
            raise ValueError(
                "Model GAT belum di-training. Silakan training model terlebih dahulu."
            )

        # Gabungkan subject dan body
        full_text = f"{subject} {text}" if subject else text

        # Step 1: Preprocessing
        processed_text = preprocess_email(full_text)

        # Step 2: IndoBERT embedding (768d)
        embedding = indobert_embedder.get_embedding(processed_text)

        # Step 3: UMAP reduction
        if self.umap_gat and self.umap_gat.is_fitted:
            embedding_reduced = self.umap_gat.transform(embedding.unsqueeze(0)).squeeze(0)
            existing_reduced = self.training_embeddings_reduced
        else:
            embedding_reduced = embedding
            existing_reduced = self.training_embeddings

        # Step 4: Build graph
        graph_data = build_single_prediction_graph(
            new_embedding=embedding_reduced,
            existing_embeddings=existing_reduced,
        )
        graph_data = graph_data.to(self.device)

        # Step 5: GAT prediction
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
                "original_embedding_dim": 768,
                "reduced_embedding_dim": embedding_reduced.shape[0],
                "graph_nodes": graph_data.num_nodes,
                "graph_edges": graph_data.num_edges,
            },
        }

    def train(
        self,
        texts: list[str],
        labels: list[int],
        # IndoBERT fine-tune params
        finetune_epochs: int = 5,
        finetune_lr: float = 2e-5,
        finetune_batch_size: int = 16,
        weight_decay: float = 0.01,
        # UMAP params
        umap_components: int = 128,
        # GAT params
        gat_epochs: int = 30,
        gat_lr: float = 5e-3,
        gat_weight_decay: float = 5e-4,
        gat_batch_size: int = 16,
        # General
        test_split: float = 0.2,
    ) -> dict:
        """
        Training pipeline lengkap: IndoBERT Fine-tune → UMAP → GAT.

        Args:
            texts: Daftar teks email
            labels: Daftar label (0=ham, 1=spam)

            IndoBERT Fine-tune:
                finetune_epochs: Epoch fine-tune IndoBERT (default 5)
                finetune_lr: Learning rate IndoBERT (default 2e-5)
                finetune_batch_size: Batch size (default 16)
                weight_decay: Weight decay AdamW (default 0.01)

            UMAP:
                umap_components: Dimensi output UMAP (default 128)

            GAT:
                gat_epochs: Epoch training GAT (default 30)
                gat_lr: Learning rate GAT (default 5e-3)
                gat_weight_decay: Weight decay GAT (default 5e-4)

        Returns:
            Dict metrik evaluasi lengkap
        """
        # Load IndoBERT jika belum
        if not indobert_embedder.is_loaded:
            indobert_embedder.load_model()

        # === STEP 1: Preprocessing ===
        print(f"\n{'='*60}")
        print(f"STEP 1: Preprocessing {len(texts)} emails...")
        print(f"{'='*60}")
        processed_texts = [preprocess_email(t) for t in texts]

        # === STEP 2: Fine-tune IndoBERT ===
        print(f"\n{'='*60}")
        print(f"STEP 2: Fine-tuning IndoBERT ({finetune_epochs} epochs)")
        print(f"  - learning_rate: {finetune_lr}")
        print(f"  - batch_size: {finetune_batch_size}")
        print(f"  - weight_decay: {weight_decay}")
        print(f"  - optimizer: AdamW")
        print(f"  - loss: CrossEntropyLoss")
        print(f"{'='*60}")

        ft_result = indobert_embedder.fine_tune(
            texts=processed_texts,
            labels=labels,
            epochs=finetune_epochs,
            learning_rate=finetune_lr,
            batch_size=finetune_batch_size,
            weight_decay=weight_decay,
        )

        # === STEP 3: Generate Embeddings ===
        print(f"\n{'='*60}")
        print(f"STEP 3: Generating IndoBERT embeddings (768d)...")
        print(f"{'='*60}")
        embeddings = indobert_embedder.get_batch_embeddings(
            processed_texts, batch_size=finetune_batch_size
        )
        labels_tensor = torch.tensor(labels, dtype=torch.long)
        print(f"  Embeddings shape: {embeddings.shape}")

        # === STEP 4: UMAP Dimensionality Reduction ===
        print(f"\n{'='*60}")
        print(f"STEP 4: UMAP reduction (768d → {umap_components}d)...")
        print(f"{'='*60}")
        self.umap_gat = create_umap_for_gat(n_components=umap_components)
        embeddings_reduced = self.umap_gat.fit_transform(embeddings)
        print(f"  Reduced shape: {embeddings_reduced.shape}")

        # Buat juga UMAP 2D untuk visualisasi
        self.umap_viz = create_umap_for_visualization()
        embeddings_2d = self.umap_viz.fit_transform(embeddings)

        # === STEP 5: Split Train/Test ===
        indices = list(range(len(texts)))
        train_idx, test_idx = train_test_split(
            indices, test_size=test_split, stratify=labels, random_state=42
        )

        train_emb = embeddings_reduced[train_idx]
        train_labels = labels_tensor[train_idx]
        test_emb = embeddings_reduced[test_idx]
        test_labels = labels_tensor[test_idx]

        # === STEP 6: Build Graph ===
        print(f"\n{'='*60}")
        print(f"STEP 5: Building graphs...")
        print(f"{'='*60}")
        train_graph = build_graph(train_emb)
        train_graph.y = train_labels
        train_graph = train_graph.to(self.device)
        print(f"  Train graph: {train_graph.num_nodes} nodes, {train_graph.num_edges} edges")

        # === STEP 7: Train GAT ===
        print(f"\n{'='*60}")
        print(f"STEP 6: Training GAT ({gat_epochs} epochs)")
        print(f"  - learning_rate: {gat_lr}")
        print(f"  - weight_decay: {gat_weight_decay}")
        print(f"  - optimizer: Adam")
        print(f"  - loss: CrossEntropyLoss")
        print(f"  - activation: ELU")
        print(f"  - num_heads: 8 (layer 1), 1 (layer 2)")
        print(f"  - dropout: 0.3")
        print(f"  - attention_dropout: 0.3")
        print(f"  - negative_slope: 0.2")
        print(f"{'='*60}")

        self.gat_model = GATClassifier(in_channels=umap_components).to(self.device)
        optimizer = torch.optim.Adam(
            self.gat_model.parameters(),
            lr=gat_lr,
            weight_decay=gat_weight_decay,
        )
        criterion = nn.CrossEntropyLoss()

        self.gat_model.train()
        gat_loss_history = []

        for epoch in range(gat_epochs):
            optimizer.zero_grad()
            out = self.gat_model(train_graph)
            loss = criterion(out, train_graph.y)
            loss.backward()
            optimizer.step()

            gat_loss_history.append(loss.item())
            if (epoch + 1) % 5 == 0 or epoch == 0:
                print(f"  Epoch {epoch+1}/{gat_epochs} - Loss: {loss.item():.4f}")

        # === STEP 8: Evaluasi ===
        print(f"\n{'='*60}")
        print(f"STEP 7: Evaluating on test set...")
        print(f"{'='*60}")
        test_graph = build_graph(test_emb)
        test_graph.y = test_labels
        test_graph = test_graph.to(self.device)

        predicted, conf = self.gat_model.predict(test_graph)
        pred_np = predicted.cpu().numpy()
        true_np = test_labels.cpu().numpy()

        metrics = {
            "accuracy": round(accuracy_score(true_np, pred_np), 4),
            "precision": round(precision_score(true_np, pred_np, average="binary", zero_division=0), 4),
            "recall": round(recall_score(true_np, pred_np, average="binary", zero_division=0), 4),
            "f1_score": round(f1_score(true_np, pred_np, average="binary", zero_division=0), 4),
            "confusion_matrix": confusion_matrix(true_np, pred_np).tolist(),
            "total_data": len(texts),
            "train_size": len(train_idx),
            "test_size": len(test_idx),
            "finetune_epochs": finetune_epochs,
            "gat_epochs": gat_epochs,
            "umap_components": umap_components,
            "finetune_loss_history": ft_result["loss_history"],
            "gat_loss_history": gat_loss_history,
        }

        # Visualisasi data (2D UMAP coordinates)
        viz_data = {
            "coordinates": embeddings_2d.numpy().tolist(),
            "labels": labels,
            "texts": [t[:100] for t in texts],  # Potong 100 char
        }

        print(f"\n{'='*60}")
        print(f"RESULTS:")
        print(f"  Accuracy:  {metrics['accuracy']}")
        print(f"  Precision: {metrics['precision']}")
        print(f"  Recall:    {metrics['recall']}")
        print(f"  F1 Score:  {metrics['f1_score']}")
        print(f"{'='*60}\n")

        # === STEP 9: Save Models ===
        os.makedirs(settings.MODEL_DIR, exist_ok=True)

        # Save GAT
        torch.save(
            self.gat_model.state_dict(),
            os.path.join(settings.MODEL_DIR, "gat_model.pt"),
        )

        # Save IndoBERT fine-tuned
        torch.save(
            indobert_embedder.model.state_dict(),
            os.path.join(settings.MODEL_DIR, "indobert_finetuned.pt"),
        )

        # Save UMAP
        import pickle
        with open(os.path.join(settings.MODEL_DIR, "umap_gat.pt"), "wb") as f:
            pickle.dump(self.umap_gat, f)
        with open(os.path.join(settings.MODEL_DIR, "umap_viz.pt"), "wb") as f:
            pickle.dump(self.umap_viz, f)

        # Save embeddings & labels
        torch.save(
            {
                "embeddings": embeddings,
                "embeddings_reduced": embeddings_reduced,
                "labels": labels_tensor,
                "umap_dim": umap_components,
            },
            os.path.join(settings.MODEL_DIR, "training_data.pt"),
        )

        self.training_embeddings = embeddings
        self.training_embeddings_reduced = embeddings_reduced
        self.training_labels = labels_tensor
        self._is_model_loaded = True

        return {"metrics": metrics, "visualization": viz_data}


# Singleton instance
prediction_service = PredictionService()
