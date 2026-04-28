import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
from sklearn.metrics.pairwise import cosine_similarity


class GATClassifier(nn.Module):
    """
    Graph Attention Network (GAT) untuk Klasifikasi Email Spam.

    Arsitektur & Parameter:
    ┌──────────────────────────────────────────────────────────┐
    │ A. GRAPH & INPUT REPRESENTATION                         │
    │  - node features: embedding IndoBERT (768 atau UMAP)    │
    │  - edge_index: adjacency dari cosine similarity         │
    │  - edge weight: similarity score                        │
    ├──────────────────────────────────────────────────────────┤
    │ B. GAT ARCHITECTURE (Attention Mechanism)               │
    │  - num_layers: 2                                        │
    │  - num_heads: 8 (layer 1), 1 (layer 2)                 │
    │  - in_features: 768 / sesuai UMAP                      │
    │  - out_features: 128                                    │
    │  - concat: True (layer 1), False (layer 298)              │
    │  - activation: ELU                                      │
    │  - negative_slope: 0.2                                  │
    ├──────────────────────────────────────────────────────────┤
    │ C. REGULARIZATION & TRAINING                            │
    │  - dropout: 0.3                                         │
    │  - attention_dropout: 0.3                               │
    │  - learning_rate: 5e-3                                  │
    │  - weight_decay: 5e-4                                   │
    │  - optimizer: Adam                                      │
    ├──────────────────────────────────────────────────────────┤
    │ D. OUTPUT LAYER (Classification)                        │
    │  - num_classes: 2 (spam / ham)                          │
    │  - activation: Softmax                                  │
    │  - loss: CrossEntropyLoss                               │
    │  - classifier dropout: 0.3                              │
    └──────────────────────────────────────────────────────────┘
    """

    def __init__(
        self,
        in_channels: int = 768,
        hidden_channels: int = 128,
        out_channels: int = 2,
        num_heads: int = 8,
        num_layers: int = 2,
        dropout: float = 0.3,
        attention_dropout: float = 0.3,
        negative_slope: float = 0.2,
        classifier_dropout: float = 0.3,
    ):
        super(GATClassifier, self).__init__()

        self.dropout = dropout
        self.num_layers = num_layers
        self.negative_slope = negative_slope

        # --- B. GAT Architecture (Attention Mechanism) ---

        # GAT Layer 1: multi-head attention
        self.gat1 = GATConv(
            in_channels=in_channels,
            out_channels=hidden_channels,
            heads=num_heads,
            dropout=attention_dropout,
            negative_slope=negative_slope,
            concat=True,  # Concat multi-head: output = hidden_channels * num_heads
        )

        # GAT Layer 2: single-head attention
        self.gat2 = GATConv(
            in_channels=hidden_channels * num_heads,  # 128 * 8 = 1024
            out_channels=hidden_channels,
            heads=1,
            dropout=attention_dropout,
            negative_slope=negative_slope,
            concat=False,  # Single head: output = hidden_channels
        )

        # Batch normalization
        self.bn1 = nn.BatchNorm1d(hidden_channels * num_heads)
        self.bn2 = nn.BatchNorm1d(hidden_channels)

        # --- D. Output Layer (Classification) ---
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, 64),
            nn.ELU(inplace=True),
            nn.Dropout(classifier_dropout),
            nn.Linear(64, out_channels),
        )

    def forward(self, data: Data) -> torch.Tensor:
        """
        Forward pass GAT.

        Args:
            data: PyG Data object (x: node features, edge_index: adjacency)

        Returns:
            logits: (num_nodes, num_classes=2)
        """
        x, edge_index = data.x, data.edge_index

        # GAT Layer 1 + ELU activation
        x = self.gat1(x, edge_index)
        x = self.bn1(x)
        x = F.elu(x, inplace=True)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # GAT Layer 2 + ELU activation
        x = self.gat2(x, edge_index)
        x = self.bn2(x)
        x = F.elu(x, inplace=True)

        # Classification head
        out = self.classifier(x)
        return out

    def predict(self, data: Data) -> tuple:
        """
        Prediksi label dan confidence score.

        Returns:
            (predicted_labels, confidence_scores)
            - activation: Softmax
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(data)
            probabilities = F.softmax(logits, dim=1)  # Softmax activation
            confidence, predicted = torch.max(probabilities, dim=1)
        return predicted, confidence

    def get_attention_weights(self, data: Data) -> list:
        """
        Ambil attention weights dari setiap GAT layer.
        Berguna untuk visualisasi dan interpretasi model.

        Returns:
            List of (edge_index, attention_weights) per layer
        """
        self.eval()
        attention_weights = []
        x, edge_index = data.x, data.edge_index

        with torch.no_grad():
            # Layer 1
            x1, (edge_index_1, alpha_1) = self.gat1(
                x, edge_index, return_attention_weights=True
            )
            attention_weights.append({
                "layer": 1,
                "edge_index": edge_index_1.cpu(),
                "attention": alpha_1.cpu(),
            })

            x1 = self.bn1(x1)
            x1 = F.elu(x1)

            # Layer 2
            _, (edge_index_2, alpha_2) = self.gat2(
                x1, edge_index, return_attention_weights=True
            )
            attention_weights.append({
                "layer": 2,
                "edge_index": edge_index_2.cpu(),
                "attention": alpha_2.cpu(),
            })

        return attention_weights


def build_graph(
    embeddings: torch.Tensor,
    threshold: float = 0.5,
    include_weights: bool = False,
) -> Data:
    """
    Membangun graph dari embedding email.

    Graph & Input Representation:
    - Node: setiap email = 1 node
    - Node features: embedding (768 atau UMAP-reduced)
    - Edge: koneksi berdasarkan cosine similarity > threshold
    - Edge weight: similarity score (opsional)

    Args:
        embeddings: Tensor (n_emails, embedding_dim)
        threshold: Minimum similarity untuk membuat edge
        include_weights: Apakah menyertakan edge weights

    Returns:
        PyG Data object
    """
    # Hitung cosine similarity matrix
    emb_np = embeddings.cpu().numpy()
    sim_matrix = cosine_similarity(emb_np)

    # Buat edge list berdasarkan threshold
    edges_src = []
    edges_dst = []
    edge_weights = []

    n = sim_matrix.shape[0]
    for i in range(n):
        for j in range(i + 1, n):
            if sim_matrix[i][j] > threshold:
                # Undirected: tambah kedua arah
                edges_src.extend([i, j])
                edges_dst.extend([j, i])
                if include_weights:
                    edge_weights.extend([sim_matrix[i][j], sim_matrix[i][j]])

    # Self-loops
    for i in range(n):
        edges_src.append(i)
        edges_dst.append(i)
        if include_weights:
            edge_weights.append(1.0)

    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)

    data = Data(x=embeddings, edge_index=edge_index)

    if include_weights and edge_weights:
        data.edge_attr = torch.tensor(edge_weights, dtype=torch.float)

    return data


def build_single_prediction_graph(
    new_embedding: torch.Tensor,
    existing_embeddings: torch.Tensor,
    threshold: float = 0.5,
) -> Data:
    """
    Membangun graph untuk prediksi satu email baru.
    Email baru = node terakhir dalam graph.

    Args:
        new_embedding: Embedding email baru (dim,)
        existing_embeddings: Embedding training (n, dim)
        threshold: Minimum similarity

    Returns:
        PyG Data object (email baru = node terakhir)
    """
    all_embeddings = torch.cat(
        [existing_embeddings, new_embedding.unsqueeze(0)], dim=0
    )
    return build_graph(all_embeddings, threshold)
