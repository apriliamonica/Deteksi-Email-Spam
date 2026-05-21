import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SpamGAT(nn.Module):
    """
    Arsitektur SpamGAT sesuai notebook penelitian.
    Terdiri dari projection layer dengan BatchNorm1d, 2 layer GATConv, dan classifier head.
    """
    def __init__(self, in_dim=768, hidden_dim=128, num_classes=2, heads=4, dropout=0.4):
        super(SpamGAT, self).__init__()
        self.dropout = dropout

        # 1. Proyeksi dari BERT dim (768) ke hidden dim dengan BatchNorm1d
        self.input_proj = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout)
        )

        # 2. GAT Layer 1: hidden_dim -> hidden_dim * heads (concat=True)
        self.gat1 = GATConv(hidden_dim, hidden_dim, heads=heads, dropout=dropout, concat=True)

        # 3. GAT Layer 2: hidden_dim * heads -> hidden_dim (concat=False)
        self.gat2 = GATConv(hidden_dim * heads, hidden_dim, heads=1, dropout=dropout, concat=False)

        # 4. Classifier head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes)
        )

    def forward(self, x, edge_index, return_attention=False):
        """
        Forward pass model SpamGAT.
        """
        # Proyeksi awal
        x = self.input_proj(x)

        # GAT Layer 1
        if return_attention:
            x, (edge_index1, alpha1) = self.gat1(x, edge_index, return_attention_weights=True)
        else:
            x = self.gat1(x, edge_index)
        
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # GAT Layer 2
        if return_attention:
            x, (edge_index2, alpha2) = self.gat2(x, edge_index, return_attention_weights=True)
        else:
            x = self.gat2(x, edge_index)
            
        x = F.elu(x)

        # Final classification
        out = self.classifier(x)
        
        if return_attention:
            return out, [(edge_index1, alpha1), (edge_index2, alpha2)]
        return out

    def predict(self, x, edge_index):
        """Prediksi label dan confidence."""
        self.eval()
        with torch.no_grad():
            logits = self.forward(x, edge_index)
            probs = F.softmax(logits, dim=1)
            confidence, predicted = torch.max(probs, dim=1)
        return predicted, confidence

def build_sender_graph(df: pd.DataFrame, min_group_size: int = 2) -> torch.Tensor:
    """
    Bangun edge antar email dari sender yang sama (fully connected per group).
    Sesuai dengan logika lama di notebook SpamGAT.
    """
    edge_list = []
    # Kelompokkan index berdasarkan sender
    sender_groups = df.groupby('sender').indices

    for sender, indices in sender_groups.items():
        if len(indices) < min_group_size:
            continue
        
        indices_list = list(indices)
        for i in range(len(indices_list)):
            for j in range(len(indices_list)):
                if i != j:
                    edge_list.append([indices_list[i], indices_list[j]])

    if len(edge_list) == 0:
        # Fallback: self-loops jika tidak ada koneksi
        edge_list = [[i, i] for i in range(len(df))]

    edge_index = torch.tensor(edge_list, dtype=torch.long).T
    return edge_index

def build_sparse_graph(df: pd.DataFrame, node_features: torch.Tensor, max_neighbors: int = 10, sim_threshold: float = 0.90) -> torch.Tensor:
    """
    Bangun graf multi-layer dengan degree cap untuk efisiensi komputasi GAT.
    Layer 1: Pengirim yang sama (sender)
    Layer 2: Domain email pengirim yang sama (sender_domain) - cap grup max 30 node
    Layer 3: Cosine similarity fallback untuk node yang tidak memiliki tetangga sama sekali.
    """
    n_nodes = len(df)
    neighbors = {i: set() for i in range(n_nodes)}

    # Pastikan domain pengirim tersedia
    if 'sender_domain' not in df.columns:
        from app.utils.preprocessing import extract_domain
        df['sender_domain'] = df['sender'].apply(extract_domain)

    # Layer 1: Sender sama
    for sender, indices in df.groupby('sender').indices.items():
        if len(indices) < 2:
            continue
        indices = list(indices)
        for i in indices:
            for j in indices:
                if i != j and len(neighbors[i]) < max_neighbors:
                    neighbors[i].add(j)

    # Layer 2: Domain sama (cap grup size di 30 untuk hindari hub yang terlalu raksasa)
    for domain, indices in df.groupby('sender_domain').indices.items():
        if domain == "unknown" or len(indices) < 2:
            continue
        indices = list(indices[:30])
        for i in indices:
            for j in indices:
                if i != j and len(neighbors[i]) < max_neighbors:
                    neighbors[i].add(j)

    # Cek node terisolasi sebelum fallback
    isolated = [i for i in range(n_nodes) if len(neighbors[i]) == 0]

    # Layer 3: Cosine similarity fallback untuk node terisolasi
    if len(isolated) > 0 and node_features is not None:
        feats = node_features.cpu().numpy()
        iso_feats = feats[isolated]
        sim_matrix = cosine_similarity(iso_feats, feats)

        for idx, iso_node in enumerate(isolated):
            sims = sim_matrix[idx].copy()
            sims[iso_node] = -1.0  # hindari self-loop di level cosine similarity
            
            top_k = np.argsort(sims)[::-1][:5]
            top_k = top_k[sims[top_k] >= sim_threshold]
            
            # Fallback jika tidak ada yang melewati sim_threshold: gunakan top-1 terdekat
            if len(top_k) == 0:
                top_k = np.argsort(sims)[::-1][:1]
                
            for nb in top_k:
                neighbors[iso_node].add(int(nb))
                neighbors[int(nb)].add(iso_node)

    # Buat edge list
    edge_list = []
    for src, dsts in neighbors.items():
        for dst in dsts:
            edge_list.append([src, dst])

    # Jika tidak ada edge sama sekali (misal dataset kosong atau sangat kecil), beri self-loop
    if len(edge_list) == 0:
        edge_list = [[i, i] for i in range(n_nodes)]

    edge_index = torch.tensor(edge_list, dtype=torch.long).T
    return edge_index

