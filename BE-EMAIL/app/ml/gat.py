import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class GATClassifier(nn.Module):
    """
    Graph Attention Network (GAT) untuk klasifikasi email spam.

    Arsitektur:
    1. Input: embedding dari IndoBERT (768 dim)
    2. GAT Layer 1: Multi-head attention (8 heads)
    3. GAT Layer 2: Single-head attention
    4. Linear classifier: output 2 kelas (spam/ham)

    Graph construction:
    - Node: setiap email direpresentasikan sebagai node
    - Edge: koneksi berdasarkan kesamaan kosinus antar embedding
    - Edge dibuat jika similarity > threshold
    """

    def __init__(
        self,
        in_channels: int = 768,
        hidden_channels: int = 128,
        out_channels: int = 2,
        heads: int = 8,
        dropout: float = 0.3,
    ):
        super(GATClassifier, self).__init__()

        self.dropout = dropout

        # GAT Layer 1: multi-head attention
        self.gat1 = GATConv(
            in_channels=in_channels,
            out_channels=hidden_channels,
            heads=heads,
            dropout=dropout,
            concat=True,  # Concat multi-head outputs
        )

        # GAT Layer 2: single-head attention
        self.gat2 = GATConv(
            in_channels=hidden_channels * heads,
            out_channels=hidden_channels,
            heads=1,
            dropout=dropout,
            concat=False,
        )

        # Batch normalization
        self.bn1 = nn.BatchNorm1d(hidden_channels * heads)
        self.bn2 = nn.BatchNorm1d(hidden_channels)

        # Linear classifier
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, out_channels),
        )

    def forward(self, data: Data) -> torch.Tensor:
        """
        Forward pass GAT.

        Args:
            data: PyG Data object dengan x (node features) dan edge_index

        Returns:
            Logits untuk setiap node (email), dimensi (n_nodes, 2)
        """
        x, edge_index = data.x, data.edge_index

        # GAT Layer 1
        x = self.gat1(x, edge_index)
        x = self.bn1(x)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # GAT Layer 2
        x = self.gat2(x, edge_index)
        x = self.bn2(x)
        x = F.elu(x)

        # Classifier
        out = self.classifier(x)
        return out

    def predict(self, data: Data) -> tuple:
        """
        Prediksi label dan confidence.

        Returns:
            (predicted_labels, confidence_scores)
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(data)
            probabilities = F.softmax(logits, dim=1)
            confidence, predicted = torch.max(probabilities, dim=1)
        return predicted, confidence


def build_graph(embeddings: torch.Tensor, threshold: float = 0.5) -> Data:
    """
    Membangun graph dari embedding email.

    Proses:
    1. Hitung cosine similarity antar semua pasangan embedding
    2. Buat edge jika similarity > threshold
    3. Return PyG Data object

    Args:
        embeddings: Tensor (n_emails, embedding_dim)
        threshold: Minimum similarity untuk membuat edge

    Returns:
        PyG Data object dengan node features dan edge_index
    """
    # Hitung cosine similarity matrix
    emb_np = embeddings.cpu().numpy()
    sim_matrix = cosine_similarity(emb_np)

    # Buat edge list berdasarkan threshold
    edges_src = []
    edges_dst = []

    n = sim_matrix.shape[0]
    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i][j] > threshold:
                # Undirected: tambah kedua arah
                edges_src.extend([i, j])
                edges_dst.extend([j, i])

    # Self-loops untuk setiap node
    for i in range(n):
        edges_src.append(i)
        edges_dst.append(i)

    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)

    data = Data(x=embeddings, edge_index=edge_index)
    return data


def build_single_prediction_graph(
    new_embedding: torch.Tensor,
    existing_embeddings: torch.Tensor,
    threshold: float = 0.5,
) -> Data:
    """
    Membangun graph untuk prediksi satu email baru.

    Email baru ditambahkan sebagai node terakhir dalam graph
    yang berisi email-email training sebagai konteks.

    Args:
        new_embedding: Embedding email baru (768,)
        existing_embeddings: Embedding email training (n, 768)
        threshold: Minimum similarity untuk edge

    Returns:
        PyG Data object (email baru = node terakhir)
    """
    # Gabungkan embedding baru dengan existing
    all_embeddings = torch.cat(
        [existing_embeddings, new_embedding.unsqueeze(0)], dim=0
    )

    data = build_graph(all_embeddings, threshold)
    return data
