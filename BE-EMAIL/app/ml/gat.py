import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool
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

        # Global Pooling (Mean Pool) - Hanya untuk Klasifikasi Graf (Word Graph)
        # Jika melakukan Klasifikasi Node (Sample Graph), kita lewati pooling
        if hasattr(data, 'batch') and data.batch is not None:
            x = global_mean_pool(x, data.batch)
        elif hasattr(data, 'y') and data.y is not None and data.y.size(0) > 1:
            # Jika ada banyak label untuk satu graf, ini adalah Klasifikasi Node
            # Jangan lakukan pooling agar output tetap (num_nodes, classes)
            pass
        else:
            # Untuk prediksi tunggal atau word graph tunggal
            x = x.mean(dim=0, keepdim=True)

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


def build_word_graph(
    tokens: list[str],
    embeddings: torch.Tensor,
    window_size: int = 2,
) -> Data:
    """
    Membangun Graph of Words (Word Graph) sesuai metodologi user.
    """
    unique_tokens = []
    token_to_idx = {}
    for token in tokens:
        if token not in token_to_idx:
            token_to_idx[token] = len(unique_tokens)
            unique_tokens.append(token)
    
    edges_src = []
    edges_dst = []
    for i in range(len(tokens)):
        for j in range(i + 1, min(i + 1 + window_size, len(tokens))):
            u = token_to_idx[tokens[i]]
            v = token_to_idx[tokens[j]]
            if u != v:
                edges_src.extend([u, v])
                edges_dst.extend([v, u])
    
    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
    if edge_index.numel() > 0:
        from torch_geometric.utils import coalesce
        edge_index = coalesce(edge_index)
    
    return Data(x=embeddings, edge_index=edge_index)

def build_sample_graph(
    embeddings: torch.Tensor,
    k: int = 20,
) -> Data:
    """
    Membangun graph antar sampel menggunakan Top-K Neighbors untuk stabilitas memori.
    Setiap node hanya terhubung dengan K tetangga terdekatnya.
    """
    n = embeddings.size(0)
    print(f"  [Graph] Building Top-K graph (K={k}) for {n} nodes...")
    
    # Normalize embeddings
    emb_norm = F.normalize(embeddings, p=2, dim=1)
    
    # Hitung Cosine Similarity Matrix
    sim_matrix = torch.mm(emb_norm, emb_norm.t())
    
    # Ambil Top-K indices untuk setiap baris
    # k+1 karena node itu sendiri pasti paling mirip (diagonal), kita akan buang nanti
    topk_values, topk_indices = torch.topk(sim_matrix, k + 1, dim=1)
    
    # Buat edge_index
    # Row indices: [0,0,0, 1,1,1, ...]
    row = torch.arange(n).view(-1, 1).repeat(1, k).view(-1).to(embeddings.device)
    
    # Col indices: ambil dari topk_indices (abaikan kolom pertama jika itu self-loop)
    # Untuk amannya, kita ambil kolom 1 sampai k+1
    col = topk_indices[:, 1:].reshape(-1).to(embeddings.device)
    
    edge_index = torch.stack([row, col], dim=0)
    
    print(f"  [Graph] Done. Nodes: {n}, Edges: {edge_index.size(1)}")
    return Data(x=embeddings, edge_index=edge_index)

# Alias untuk kompatibilitas
def build_graph(*args, **kwargs):
    if len(args) > 0 and isinstance(args[0], list):
        return build_word_graph(*args, **kwargs)
    return build_sample_graph(*args, **kwargs)


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
