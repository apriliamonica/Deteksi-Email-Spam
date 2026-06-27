import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, matthews_corrcoef, roc_auc_score,
    precision_recall_fscore_support
)
import numpy as np
import pandas as pd
import json

from app.config import get_settings
from app.ml.indobert import indobert_embedder
from app.ml.gat import SpamGAT, build_sender_graph, build_sparse_graph
from app.utils.preprocessing import preprocess_email, extract_domain
from sklearn.metrics.pairwise import cosine_similarity

settings = get_settings()

class PredictionService:
    def __init__(self):
        self.gat_model: SpamGAT = None
        self.graph_data: dict = None  # {x, edge_index, y}
        self.emails_df: pd.DataFrame = None
        self.device = torch.device("cpu") 
        self._is_model_loaded = False
        self._stop_training = False
        self.training_status = {
            "status": "idle",
            "current_step": "",
            "progress": 0,
            "epoch": 0,
            "total_epochs": 0,
            "loss": 0.0,
            "metrics": None,
            "visualization": None
        }

    @property
    def is_loaded(self) -> bool:
        return self._is_model_loaded and indobert_embedder.is_loaded

    def load_models(self):
        """Load model weights and graph artifacts."""
        indobert_embedder.load_model()
        model_dir = settings.MODEL_DIR
        weights_path = os.path.join(model_dir, "spamgat_weights.pt")
        graph_path = os.path.join(model_dir, "graph_data.pt")
        df_path = os.path.join(model_dir, "emails.csv")
        config_path = os.path.join(model_dir, "config.json")

        if os.path.exists(weights_path) and os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)

                self.gat_model = SpamGAT(
                    in_dim=config.get('in_dim', 768),
                    hidden_dim=config.get('hidden_dim', 128),
                    heads=config.get('heads', 4),
                    dropout=config.get('dropout', 0.4)
                ).to(self.device)
                
                self.gat_model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.gat_model.eval()

                if os.path.exists(graph_path):
                    self.graph_data = torch.load(graph_path, map_location=self.device)
                
                if os.path.exists(df_path):
                    self.emails_df = pd.read_csv(df_path)

                self._is_model_loaded = True
                print(f"[PredictionService] Model loaded from {model_dir}")
            except Exception as e:
                print(f"[PredictionService] Error loading model: {e}")
        else:
            print("[PredictionService] No saved model found.")

    def stop_training(self):
        self._stop_training = True
        indobert_embedder.stop_training()
        self.training_status["status"] = "cancelled"

    def predict(self, text: str, subject: str = None, sender: str = "unknown@unknown.com") -> dict:
        if not self.is_loaded:
            self.load_models()
        
        if self.gat_model is None or self.graph_data is None:
            raise ValueError("Model GAT atau Graph Data belum tersedia.")

        combined_text = f"{subject} [SEP] {text}" if subject else text
        processed_text = preprocess_email(combined_text)
        new_emb = indobert_embedder.get_embedding(processed_text).cpu()

        x_existing = self.graph_data['x'].cpu()
        edge_index_existing = self.graph_data['edge_index'].cpu()
        x_combined = torch.cat([x_existing, new_emb.unsqueeze(0)], dim=0)
        new_node_idx = x_combined.shape[0] - 1

        sender_clean = sender if sender else "unknown@unknown.com"
        domain_clean = extract_domain(sender_clean)
        
        # Ensure domain column exists
        if self.emails_df is not None:
            if 'sender_domain' not in self.emails_df.columns:
                self.emails_df['sender_domain'] = self.emails_df['sender'].apply(extract_domain)
        
        new_neighbors = set()
        
        # Layer 1: Same sender (cap max 10)
        same_sender_idx = []
        if self.emails_df is not None:
            same_sender_idx = self.emails_df[self.emails_df['sender'] == sender_clean].index.tolist()
            for idx in same_sender_idx:
                if idx < x_existing.shape[0]:
                    if len(new_neighbors) < 10:
                        new_neighbors.add(idx)

        # Layer 2: Same Domain (cap search group size at 30, neighbors at 10, exclude "unknown")
        same_domain_idx = []
        if domain_clean != "unknown" and self.emails_df is not None:
            same_domain_idx = self.emails_df[self.emails_df['sender_domain'] == domain_clean].index.tolist()
            same_domain_idx = same_domain_idx[:30]
            for idx in same_domain_idx:
                if idx < x_existing.shape[0]:
                    if len(new_neighbors) < 10:
                        new_neighbors.add(idx)

        # Layer 3: Cosine Similarity fallback (if no neighbors matched in Layer 1 or 2)
        if len(new_neighbors) == 0:
            feats = x_existing.numpy()
            new_feat = new_emb.unsqueeze(0).numpy()
            sims = cosine_similarity(new_feat, feats)[0]
            
            top_k = np.argsort(sims)[::-1][:5]
            top_k = top_k[sims[top_k] >= 0.90]
            if len(top_k) == 0:
                top_k = np.argsort(sims)[::-1][:1]
                
            for idx in top_k:
                if idx < x_existing.shape[0]:
                    new_neighbors.add(int(idx))

        new_edges = []
        for idx in new_neighbors:
            new_edges.append([idx, new_node_idx])
            new_edges.append([new_node_idx, idx])

        if new_edges:
            new_edge_tensor = torch.tensor(new_edges, dtype=torch.long).T
            edge_combined = torch.cat([edge_index_existing, new_edge_tensor], dim=1)
        else:
            self_loop = torch.tensor([[new_node_idx], [new_node_idx]], dtype=torch.long)
            edge_combined = torch.cat([edge_index_existing, self_loop], dim=1)

        self.gat_model.eval()
        with torch.no_grad():
            logits = self.gat_model(x_combined.to(self.device), edge_combined.to(self.device))
            probs = F.softmax(logits[new_node_idx], dim=0)
            pred = probs.argmax().item()
            conf = probs[pred].item()

        return {
            "label": "spam" if pred == 1 else "ham",
            "confidence": round(conf, 4),
            "body": text,
            "subject": subject,
            "sender": sender,
            "processing_detail": {
                "preprocessed_text": processed_text,
                "graph_nodes": x_combined.shape[0],
                "graph_edges": edge_combined.shape[1],
                "sender_history_count": len(same_sender_idx)
            }
        }

    def train(self, texts: list[str], labels: list[int], senders: list[str] = None, 
              dataset_id: int = None, finetune_epochs: int = 3, 
              finetune_lr: float = 2e-5, finetune_batch_size: int = 16,
              weight_decay: float = 0.01,
              gat_epochs: int = 100, gat_lr: float = 0.001, 
              gat_weight_decay: float = 1e-4, val_split: float = 0.1, test_split: float = 0.2) -> dict:
        print(f"[PredictionService] Starting train with {len(texts)} texts...")
        self._stop_training = False
        self.training_status.update({
            "status": "training",
            "current_step": "Initializing pipeline...",
            "progress": 5,
            "epoch": 0,
            "total_epochs": gat_epochs,
            "loss": 0.0
        })

        # Update dataset status to Training
        if dataset_id:
            from app.config.database import SessionLocal
            from app.models.dataset import Dataset
            with SessionLocal() as db:
                db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Training"})
                db.commit()

        try:
            # 1. BERT Fine-tuning (Notebook uses static extraction, so we bypass fine-tuning)
            # "jangan ikut cara yang di kodingan saya melainkan seperti yg di notebook"
            print("\n⏳ Menggunakan IndoBERT sebagai static feature extractor (seperti di notebook)...")
            
            if self._stop_training: raise Exception("Training cancelled by user")

            self.training_status.update({"current_step": "Extracting Embeddings...", "progress": 35})
            embeddings = indobert_embedder.get_batch_embeddings(texts)
            labels_tensor = torch.tensor(labels, dtype=torch.long)
            
            df = pd.DataFrame({
                'text': texts,
                'label': labels,
                'sender': senders if senders else ["unknown@unknown.com"] * len(texts)
            })
            df['sender_domain'] = df['sender'].apply(extract_domain)
            
            self.training_status.update({"current_step": "Building Graph...", "progress": 45})
            edge_index = build_sparse_graph(df, embeddings)
            
            N = len(df)
            indices = np.arange(N)
            train_idx, test_idx = train_test_split(indices, test_size=test_split, stratify=labels, random_state=42)
            val_ratio_relative = val_split / (1.0 - test_split)
            if val_ratio_relative > 0:
                train_idx, val_idx = train_test_split(train_idx, test_size=val_ratio_relative, stratify=np.array(labels)[train_idx], random_state=42)
            else:
                val_idx = []
            
            train_mask = torch.zeros(N, dtype=torch.bool)
            val_mask = torch.zeros(N, dtype=torch.bool)
            test_mask = torch.zeros(N, dtype=torch.bool)
            train_mask[train_idx] = True
            val_mask[val_idx] = True
            test_mask[test_idx] = True

            n_spam_train = (labels_tensor[train_mask] == 1).sum().float()
            n_ham_train = (labels_tensor[train_mask] == 0).sum().float()
            
            w_ham = (n_spam_train / n_ham_train) * 1.30 if n_ham_train > 0 else 1.30
            w_spam = 1.00
            class_weight = torch.tensor([w_ham, w_spam]).to(self.device)

            self.gat_model = SpamGAT(in_dim=768, hidden_dim=128, heads=4, dropout=0.4).to(self.device)
            optimizer = torch.optim.AdamW(self.gat_model.parameters(), lr=gat_lr, weight_decay=gat_weight_decay)
            scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.3, patience=5, min_lr=1e-6
            )
            criterion = nn.CrossEntropyLoss(weight=class_weight)

            best_val_f1 = 0.0
            best_val_acc = 0.0
            patience_counter = 0
            patience_limit = 25  # Extended early stopping patience
            loss_history = []

            print(f"\n⏳ Mulai training ({gat_epochs} epochs)...\n")
            print(f"   Class weight → Ham: {w_ham:.4f} | Spam: {w_spam:.4f}\n")

            self.training_status.update({"current_step": "Training GAT...", "progress": 50})
            x = embeddings.to(self.device)
            edge_index = edge_index.to(self.device)
            y = labels_tensor.to(self.device)

            for epoch in range(gat_epochs):
                if self._stop_training: raise Exception("Training cancelled by user")
                self.gat_model.train()
                optimizer.zero_grad()
                out = self.gat_model(x, edge_index)
                loss = criterion(out[train_mask], y[train_mask])
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.gat_model.parameters(), max_norm=1.0)
                optimizer.step()
                
                self.gat_model.eval()
                with torch.no_grad():
                    val_out = self.gat_model(x, edge_index)
                    val_loss = criterion(val_out[val_mask], y[val_mask]).item()
                    val_pred = val_out[val_mask].argmax(dim=1)
                    val_acc = (val_pred == y[val_mask]).float().mean().item()
                    val_f1 = f1_score(
                        y[val_mask].cpu().numpy(),
                        val_pred.cpu().numpy(),
                        average='macro',
                        zero_division=0
                    )
                
                print(f"Epoch {epoch+1:3d}/{gat_epochs} | Train Loss: {loss.item():.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")

                scheduler.step(val_f1)
                loss_history.append(loss.item())
                
                if val_f1 > best_val_f1:
                    best_val_f1 = val_f1
                    best_val_acc = val_acc
                    patience_counter = 0
                    best_weights = self.gat_model.state_dict().copy()
                else:
                    patience_counter += 1
                
                self.training_status.update({
                    "epoch": epoch + 1,
                    "loss": round(loss.item(), 4),
                    "progress": 50 + int((epoch + 1) / gat_epochs * 45)
                })
                if patience_counter >= patience_limit: 
                    print(f"\n⏹️  Early stopping di epoch {epoch+1}")
                    break

            if 'best_weights' in locals():
                self.gat_model.load_state_dict(best_weights)

            print(f"\n✅ Training selesai!")
            print(f"   Best Val Acc : {best_val_acc:.4f}")
            print(f"   Best Val F1  : {best_val_f1:.4f}\n")

            self.gat_model.eval()
            with torch.no_grad():
                test_out = self.gat_model(x, edge_index)
                
                # Testing Metrics
                test_probs = F.softmax(test_out[test_mask], dim=1)
                test_pred = test_probs.argmax(dim=1).cpu().numpy()
                test_true = y[test_mask].cpu().numpy()
                test_conf = test_probs.max(dim=1)[0].cpu().numpy()
                
                # Training Metrics
                train_probs = F.softmax(test_out[train_mask], dim=1)
                train_pred = train_probs.argmax(dim=1).cpu().numpy()
                train_true = y[train_mask].cpu().numpy()
                train_conf = train_probs.max(dim=1)[0].cpu().numpy()

            metrics = {
                # Testing metrics sebagai utama
                "accuracy": float(accuracy_score(test_true, test_pred)),
                "precision": float(precision_score(test_true, test_pred, zero_division=0)),
                "recall": float(recall_score(test_true, test_pred, zero_division=0)),
                "f1_score": float(f1_score(test_true, test_pred, zero_division=0)),
                "mcc": float(matthews_corrcoef(test_true, test_pred)),
                "roc_auc": float(roc_auc_score(test_true, test_conf)) if len(np.unique(test_true)) > 1 else 0.5,
                
                # Training metrics untuk perbandingan
                "train_metrics": {
                    "accuracy": float(accuracy_score(train_true, train_pred)),
                    "precision": float(precision_score(train_true, train_pred, zero_division=0)),
                    "recall": float(recall_score(train_true, train_pred, zero_division=0)),
                    "f1_score": float(f1_score(train_true, train_pred, zero_division=0)),
                    "mcc": float(matthews_corrcoef(train_true, train_pred)),
                    "roc_auc": float(roc_auc_score(train_true, train_conf)) if len(np.unique(train_true)) > 1 else 0.5,
                },
                
                "total_data": N,
                "train_size": len(train_idx),
                "val_size": len(val_idx),
                "test_size": len(test_idx),
                "req_val_split": val_split,
                "req_test_split": test_split,
                "gat_loss_history": loss_history,
                "macro_avg": {"f1": float(f1_score(test_true, test_pred, average='macro', zero_division=0))},
                "weighted_avg": {"f1": float(f1_score(test_true, test_pred, average='weighted', zero_division=0))},
                "std_loss": float(np.std(loss_history)) if len(loss_history) > 0 else 0.0,
                "confusion_matrix": confusion_matrix(test_true, test_pred).tolist(),
            }

            os.makedirs(settings.MODEL_DIR, exist_ok=True)
            torch.save(self.gat_model.state_dict(), os.path.join(settings.MODEL_DIR, "spamgat_weights.pt"))
            torch.save({'x': embeddings, 'edge_index': edge_index.cpu(), 'y': labels_tensor}, os.path.join(settings.MODEL_DIR, "graph_data.pt"))
            df.to_csv(os.path.join(settings.MODEL_DIR, "emails.csv"), index=False)
            
            config = {"in_dim": 768, "hidden_dim": 128, "heads": 4, "dropout": 0.4}
            with open(os.path.join(settings.MODEL_DIR, "config.json"), "w") as f: json.dump(config, f)

            self.graph_data = {'x': embeddings, 'edge_index': edge_index.cpu(), 'y': labels_tensor}
            self.emails_df = df
            self._is_model_loaded = True

            self.training_status.update({
                "status": "success",
                "current_step": "Training completed successfully!",
                "progress": 100,
                "metrics": metrics
            })

            # Update dataset status to Trained
            if dataset_id:
                from app.config.database import SessionLocal
                from app.models.dataset import Dataset
                with SessionLocal() as db:
                    db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Trained"})
                    db.commit()

            return {"metrics": metrics}
        except Exception as e:
            if self._stop_training or str(e) == "Training cancelled by user":
                self.training_status.update({"status": "cancelled", "current_step": "Training was cancelled by the user."})
            else:
                self.training_status.update({"status": "error", "current_step": f"Error: {str(e)}"})
            
            if dataset_id:
                from app.config.database import SessionLocal
                from app.models.dataset import Dataset
                with SessionLocal() as db:
                    db.query(Dataset).filter(Dataset.id == dataset_id).update({"status": "Preprocessed"})
                    db.commit()
            raise e

prediction_service = PredictionService()
