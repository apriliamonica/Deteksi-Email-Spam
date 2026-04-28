import os
import torch
import torch.nn as nn
from torch_geometric.data import Data
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, matthews_corrcoef, roc_auc_score,
    precision_recall_fscore_support
)
from imblearn.over_sampling import SMOTE
import numpy as np

from app.config import get_settings
from app.ml.indobert import indobert_embedder
from app.ml.gat import GATClassifier, build_graph, build_single_prediction_graph
from app.ml.umap_reducer import UMAPReducer, create_umap_for_gat, create_umap_for_visualization
from app.utils.preprocessing import preprocess_email

settings = get_settings()


class PredictionService:
    def __init__(self):
        self.gat_model: GATClassifier = None
        self.umap_gat: UMAPReducer = None
        self.umap_viz: UMAPReducer = None
        self.training_embeddings: torch.Tensor = None
        self.training_embeddings_reduced: torch.Tensor = None
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
        # Load IndoBERT
        indobert_embedder.load_model()
        model_dir = settings.MODEL_DIR
        gat_path = os.path.join(model_dir, "gat_model.pt")
        data_path = os.path.join(model_dir, "training_data.pt")
        umap_gat_path = os.path.join(model_dir, "umap_gat.pt")

        if os.path.exists(gat_path):
            if os.path.exists(data_path):
                saved = torch.load(data_path, map_location="cpu")
                self.training_embeddings = saved["embeddings"]
                self.training_labels = saved["labels"]
                if "embeddings_reduced" in saved:
                    self.training_embeddings_reduced = saved["embeddings_reduced"]

            if os.path.exists(umap_gat_path):
                import pickle
                with open(umap_gat_path, "rb") as f:
                    self.umap_gat = pickle.load(f)
                umap_dim = self.umap_gat.n_components
            else:
                umap_dim = 128

            self.gat_model = GATClassifier(in_channels=umap_dim)
            self.gat_model.load_state_dict(torch.load(gat_path, map_location=self.device))
            self.gat_model.to(self.device)
            self.gat_model.eval()
            self._is_model_loaded = True
        else:
            print("[Service] No saved model found. Please train first.")

    def predict(self, text: str, subject: str = None) -> dict:
        if not self.is_loaded:
            self.load_models()
        if self.gat_model is None:
            raise ValueError("Model GAT belum di-training.")

        full_text = f"{subject} {text}" if subject else text
        processed_text = preprocess_email(full_text)
        embedding = indobert_embedder.get_embedding(processed_text)

        if self.umap_gat and self.umap_gat.is_fitted:
            embedding_reduced = self.umap_gat.transform(embedding.unsqueeze(0)).squeeze(0)
            existing_reduced = self.training_embeddings_reduced
        else:
            embedding_reduced = embedding
            existing_reduced = self.training_embeddings

        graph_data = build_single_prediction_graph(
            new_embedding=embedding_reduced,
            existing_embeddings=existing_reduced,
        ).to(self.device)

        predicted, confidence = self.gat_model.predict(graph_data)
        pred_label = "spam" if predicted[-1].item() == 1 else "ham"
        
        return {
            "label": pred_label,
            "confidence": round(confidence[-1].item(), 4),
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

    def train(self, texts: list[str], labels: list[int],
              finetune_epochs: int = 5, finetune_lr: float = 2e-5,
              finetune_batch_size: int = 16, weight_decay: float = 0.01,
              umap_components: int = 128, gat_epochs: int = 30,
              gat_lr: float = 5e-3, gat_weight_decay: float = 5e-4, test_split: float = 0.2) -> dict:
        
        if not indobert_embedder.is_loaded:
            indobert_embedder.load_model()

        # Step 1: Preprocessing & IndoBERT FT
        processed_texts = [preprocess_email(t) for t in texts]
        ft_result = indobert_embedder.fine_tune(
            texts=processed_texts, labels=labels, epochs=finetune_epochs,
            learning_rate=finetune_lr, batch_size=finetune_batch_size, weight_decay=weight_decay,
        )

        # Step 2: Extract Embeddings (768d)
        embeddings = indobert_embedder.get_batch_embeddings(processed_texts, batch_size=finetune_batch_size)
        labels_np = np.array(labels)

        # Step 3: Handle Imbalance with SMOTE (on embeddings)
        spam_count = sum(labels)
        ham_count = len(labels) - spam_count
        imbalance_ratio = max(spam_count, ham_count) / max(min(spam_count, ham_count), 1)
        
        applied_smote = False
        original_counts = {"spam": spam_count, "ham": ham_count}
        oversampled_counts = {"spam": spam_count, "ham": ham_count}

        if imbalance_ratio > 1.2:
            print(f"[SMOTE] Imbalance detected! Ratio: {imbalance_ratio:.2f}. Applying SMOTE oversampling...")
            smote = SMOTE(random_state=42)
            emb_np = embeddings.cpu().numpy()
            emb_resampled, labels_resampled = smote.fit_resample(emb_np, labels_np)
            
            embeddings = torch.tensor(emb_resampled, dtype=torch.float32)
            labels_tensor = torch.tensor(labels_resampled, dtype=torch.long)
            labels_np = labels_resampled
            applied_smote = True
            
            oversampled_spam = sum(labels_resampled)
            oversampled_counts = {"spam": int(oversampled_spam), "ham": int(len(labels_resampled) - oversampled_spam)}
            print(f"[SMOTE] New distribution - Spam: {oversampled_counts['spam']}, Ham: {oversampled_counts['ham']}")
        else:
            labels_tensor = torch.tensor(labels, dtype=torch.long)

        # Step 4: UMAP Reduction
        self.umap_gat = create_umap_for_gat(n_components=umap_components)
        embeddings_reduced = self.umap_gat.fit_transform(embeddings)
        
        self.umap_viz = create_umap_for_visualization()
        embeddings_2d = self.umap_viz.fit_transform(embeddings)

        # Step 5: Split & Graph
        indices = list(range(len(labels_tensor)))
        train_idx, test_idx = train_test_split(indices, test_size=test_split, stratify=labels_np, random_state=42)

        train_emb = embeddings_reduced[train_idx]
        train_labels = labels_tensor[train_idx]
        test_emb = embeddings_reduced[test_idx]
        test_labels = labels_tensor[test_idx]

        train_graph = build_graph(train_emb).to(self.device)
        train_graph.y = train_labels

        # Step 6: Train GAT
        self.gat_model = GATClassifier(in_channels=umap_components).to(self.device)
        optimizer = torch.optim.Adam(self.gat_model.parameters(), lr=gat_lr, weight_decay=gat_weight_decay)
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

        # Step 7: Evaluate
        test_graph = build_graph(test_emb).to(self.device)
        test_graph.y = test_labels

        predicted, conf = self.gat_model.predict(test_graph)
        pred_np = predicted.cpu().numpy()
        true_np = test_labels.cpu().numpy()

        # Advanced Metrics Calculation
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(true_np, pred_np, average='macro', zero_division=0)
        p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(true_np, pred_np, average='weighted', zero_division=0)
        
        try:
            roc_auc = roc_auc_score(true_np, conf.cpu().numpy())
        except ValueError:
            roc_auc = 0.5 # fallback if only one class present in test set
            
        mcc = matthews_corrcoef(true_np, pred_np)

        # Calculate Mean and Std Deviation of GAT validation loss (simulated by last 5 epochs loss stability)
        last_5_loss = gat_loss_history[-5:] if len(gat_loss_history) >= 5 else gat_loss_history
        mean_loss = float(np.mean(last_5_loss))
        std_loss = float(np.std(last_5_loss))

        metrics = {
            "accuracy": float(accuracy_score(true_np, pred_np)),
            "precision": float(precision_score(true_np, pred_np, average="binary", zero_division=0)),
            "recall": float(recall_score(true_np, pred_np, average="binary", zero_division=0)),
            "f1_score": float(f1_score(true_np, pred_np, average="binary", zero_division=0)),
            
            # New Advanced Metrics
            "macro_avg": {"precision": p_macro, "recall": r_macro, "f1": f1_macro},
            "weighted_avg": {"precision": p_weight, "recall": r_weight, "f1": f1_weight},
            "mcc": float(mcc),
            "roc_auc": float(roc_auc),
            "mean_loss": mean_loss,
            "std_loss": std_loss,
            
            "confusion_matrix": confusion_matrix(true_np, pred_np).tolist(),
            "total_data": len(labels_tensor),
            "train_size": len(train_idx),
            "test_size": len(test_idx),
            
            # SMOTE info
            "applied_smote": applied_smote,
            "original_counts": original_counts,
            "oversampled_counts": oversampled_counts,
            
            "finetune_loss_history": ft_result["loss_history"],
            "gat_loss_history": gat_loss_history,
        }

        # Step 8: Save
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        torch.save(self.gat_model.state_dict(), os.path.join(settings.MODEL_DIR, "gat_model.pt"))
        import pickle
        with open(os.path.join(settings.MODEL_DIR, "umap_gat.pt"), "wb") as f: pickle.dump(self.umap_gat, f)
        with open(os.path.join(settings.MODEL_DIR, "umap_viz.pt"), "wb") as f: pickle.dump(self.umap_viz, f)
        torch.save({
            "embeddings": embeddings,
            "embeddings_reduced": embeddings_reduced,
            "labels": labels_tensor,
        }, os.path.join(settings.MODEL_DIR, "training_data.pt"))

        self.training_embeddings = embeddings
        self.training_embeddings_reduced = embeddings_reduced
        self.training_labels = labels_tensor
        self._is_model_loaded = True

        viz_data = {
            "coordinates": embeddings_2d.numpy().tolist(),
            "labels": labels_tensor.tolist()
        }

        # Step 9: Print results to terminal in table format
        self._print_metrics_table(metrics)

        return {"metrics": metrics, "visualization": viz_data}

    def _print_metrics_table(self, metrics: dict):
        """Mencetak hasil evaluasi ke terminal dalam format tabel."""
        print("\n" + "="*50)
        print(" HASIL EVALUASI MODEL (HYBRID INDOBERT + GAT) ")
        print("="*50)
        
        # Header Tabel
        print(f"{'Metric':<25} | {'Value':<15}")
        print("-" * 43)
        
        # Core Metrics
        print(f"{'Accuracy':<25} | {metrics['accuracy']:.4f}")
        print(f"{'Precision (Binary)':<25} | {metrics['precision']:.4f}")
        print(f"{'Recall (Binary)':<25} | {metrics['recall']:.4f}")
        print(f"{'F1-Score (Binary)':<25} | {metrics['f1_score']:.4f}")
        
        # Advanced Metrics
        print(f"{'MCC':<25} | {metrics['mcc']:.4f}")
        print(f"{'ROC-AUC':<25} | {metrics['roc_auc']:.4f}")
        
        # Averages
        print("-" * 43)
        print(f"{'Macro Avg Precision':<25} | {metrics['macro_avg']['precision']:.4f}")
        print(f"{'Macro Avg Recall':<25} | {metrics['macro_avg']['recall']:.4f}")
        print(f"{'Macro Avg F1-Score':<25} | {metrics['macro_avg']['f1']:.4f}")
        print("-" * 43)
        print(f"{'Weighted Avg Precision':<25} | {metrics['weighted_avg']['precision']:.4f}")
        print(f"{'Weighted Avg Recall':<25} | {metrics['weighted_avg']['recall']:.4f}")
        print(f"{'Weighted Avg F1-Score':<25} | {metrics['weighted_avg']['f1']:.4f}")
        
        # Statistics
        print("-" * 43)
        print(f"{'Mean Loss (Stability)':<25} | {metrics['mean_loss']:.6f}")
        print(f"{'Std Dev Loss':<25} | {metrics['std_loss']:.6f}")
        
        # Dataset Info
        print("-" * 43)
        print(f"{'Total Data Training':<25} | {metrics['total_data']}")
        print(f"{'Train/Test Split':<25} | {metrics['train_size']}/{metrics['test_size']}")
        
        print("="*50 + "\n")

prediction_service = PredictionService()
