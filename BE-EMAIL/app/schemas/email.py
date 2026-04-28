from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# === Input Schemas ===

class EmailInput(BaseModel):
    """Schema input untuk klasifikasi email."""
    subject: Optional[str] = Field(None, max_length=500, description="Subjek email")
    body: str = Field(..., min_length=1, description="Isi/body email")
    sender: Optional[str] = Field(None, max_length=255, description="Pengirim email")


class TrainingRequest(BaseModel):
    """Schema request untuk training model hybrid IndoBERT + GAT."""

    # IndoBERT Fine-tune params
    finetune_epochs: int = Field(default=5, ge=1, le=20, description="Epoch fine-tune IndoBERT")
    finetune_lr: float = Field(default=2e-5, gt=0, description="Learning rate IndoBERT (2e-5 ~ 5e-5)")
    finetune_batch_size: int = Field(default=16, ge=1, le=64, description="Batch size IndoBERT")
    weight_decay: float = Field(default=0.01, ge=0, description="Weight decay AdamW")

    # UMAP params
    umap_components: int = Field(default=128, ge=2, le=512, description="Dimensi output UMAP")

    # GAT params
    gat_epochs: int = Field(default=30, ge=1, le=200, description="Epoch training GAT")
    gat_lr: float = Field(default=5e-3, gt=0, description="Learning rate GAT")
    gat_weight_decay: float = Field(default=5e-4, ge=0, description="Weight decay GAT")

    # General
    test_split: float = Field(default=0.2, gt=0, lt=1, description="Rasio data test")


# === Response Schemas ===

class EmailResponse(BaseModel):
    """Schema response untuk data email."""
    id: int
    subject: Optional[str]
    body: str
    sender: Optional[str]
    label: str
    confidence: Optional[float]
    is_prediction: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionResponse(BaseModel):
    """Schema response untuk hasil prediksi."""
    label: str = Field(..., description="Hasil klasifikasi: 'spam' atau 'ham'")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    subject: Optional[str] = None
    body: str
    processing_detail: Optional[dict] = Field(
        None, description="Detail proses: embedding, UMAP, GAT"
    )


class TrainingResponse(BaseModel):
    """Schema response untuk hasil training."""
    status: str
    message: str
    metrics: Optional[dict] = None
    visualization: Optional[dict] = None


class ModelStatusResponse(BaseModel):
    """Schema response untuk status model."""
    is_loaded: bool
    model_type: str = "IndoBERT + GAT + UMAP"
    indobert_model: str
    last_training: Optional[datetime] = None
    metrics: Optional[dict] = None


class TrainingMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    
    # Advanced Metrics
    macro_avg: dict[str, float]
    weighted_avg: dict[str, float]
    mcc: float
    roc_auc: float
    mean_loss: float
    std_loss: float
    
    confusion_matrix: List[List[int]]
    total_data: int
    train_size: int
    test_size: int
    
    # SMOTE info
    applied_smote: bool
    original_counts: dict[str, int]
    oversampled_counts: dict[str, int]
    
    finetune_loss_history: List[float]
    gat_loss_history: List[float]


class DashboardStats(BaseModel):
    """Schema response untuk statistik dashboard."""
    total_emails: int
    total_spam: int
    total_ham: int
    spam_percentage: float
    recent_predictions: List[EmailResponse]
    model_status: ModelStatusResponse
