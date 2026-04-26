import numpy as np
import torch
from umap import UMAP


class UMAPReducer:
    """
    UMAP Dimensionality Reduction untuk embedding IndoBERT.

    Digunakan untuk:
    1. Reduksi dimensi 768 → n_components sebelum input ke GAT
       → Meningkatkan akurasi karena menghilangkan noise
       → Mempercepat graph construction & GAT training
    2. Reduksi ke 2D untuk visualisasi scatter plot
       → Menampilkan cluster spam vs ham secara visual

    Pipeline:
    IndoBERT (768d) → UMAP (128d) → GAT → spam/ham
                    → UMAP (2d)   → Visualisasi
    """

    def __init__(
        self,
        n_components: int = 128,
        n_neighbors: int = 15,
        min_dist: float = 0.1,
        metric: str = "cosine",
        random_state: int = 42,
    ):
        """
        Args:
            n_components: Dimensi output (default 128 untuk GAT, 2 untuk visualisasi)
            n_neighbors: Jumlah tetangga terdekat (kontrol lokal vs global)
            min_dist: Jarak minimum antar titik di output
            metric: Metrik jarak (cosine cocok untuk teks)
            random_state: Seed untuk reproducibility
        """
        self.n_components = n_components
        self.reducer = UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=random_state,
        )
        self._is_fitted = False

    @property
    def is_fitted(self) -> bool:
        return self._is_fitted

    def fit(self, embeddings: torch.Tensor) -> "UMAPReducer":
        """
        Fit UMAP pada data embedding training.

        Args:
            embeddings: Tensor (n_samples, 768)

        Returns:
            self
        """
        emb_np = embeddings.cpu().numpy()
        self.reducer.fit(emb_np)
        self._is_fitted = True
        print(f"[UMAP] Fitted: {emb_np.shape[1]}d → {self.n_components}d "
              f"({emb_np.shape[0]} samples)")
        return self

    def transform(self, embeddings: torch.Tensor) -> torch.Tensor:
        """
        Transform embedding ke dimensi rendah.

        Args:
            embeddings: Tensor (n_samples, 768)

        Returns:
            Tensor (n_samples, n_components)
        """
        if not self._is_fitted:
            raise ValueError("UMAP belum di-fit. Panggil fit() terlebih dahulu.")

        emb_np = embeddings.cpu().numpy()
        reduced = self.reducer.transform(emb_np)
        return torch.tensor(reduced, dtype=torch.float32)

    def fit_transform(self, embeddings: torch.Tensor) -> torch.Tensor:
        """
        Fit dan transform sekaligus.

        Args:
            embeddings: Tensor (n_samples, 768)

        Returns:
            Tensor (n_samples, n_components)
        """
        emb_np = embeddings.cpu().numpy()
        reduced = self.reducer.fit_transform(emb_np)
        self._is_fitted = True
        print(f"[UMAP] Fit-transform: {emb_np.shape[1]}d → {self.n_components}d "
              f"({emb_np.shape[0]} samples)")
        return torch.tensor(reduced, dtype=torch.float32)


def create_umap_for_gat(n_components: int = 128) -> UMAPReducer:
    """Buat UMAP reducer untuk input ke GAT (default 128d)."""
    return UMAPReducer(n_components=n_components, metric="cosine")


def create_umap_for_visualization() -> UMAPReducer:
    """Buat UMAP reducer untuk visualisasi 2D scatter plot."""
    return UMAPReducer(n_components=2, min_dist=0.3, metric="cosine")
