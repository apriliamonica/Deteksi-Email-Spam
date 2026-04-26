from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# === Input Schemas ===

class EmailInput(BaseModel):
    """Schema input untuk klasifikasi email."""

    subject: Optional[str] = Field(None, max_length=500, description="Subjek email")
    body: str = Field(..., min_length=1, description="Isi/body email")
    sender: Optional[str] = Field(None, max_length=255, description="Pengirim email")


class EmailBatchInput(BaseModel):
    """Schema input untuk klasifikasi batch email."""

    emails: List[EmailInput] = Field(..., min_length=1, description="Daftar email untuk diklasifikasi")


class TrainingRequest(BaseModel):
    """Schema request untuk training model."""

    epochs: int = Field(default=10, ge=1, le=100, description="Jumlah epoch training")
    learning_rate: float = Field(default=2e-5, gt=0, description="Learning rate")
    batch_size: int = Field(default=16, ge=1, le=128, description="Batch size")
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
        None, description="Detail proses: tokenisasi, embedding, GAT output"
    )


class TrainingResponse(BaseModel):
    """Schema response untuk hasil training."""

    status: str
    message: str
    metrics: Optional[dict] = None


class ModelStatusResponse(BaseModel):
    """Schema response untuk status model."""

    is_loaded: bool = Field(..., description="Apakah model sudah loaded")
    model_type: str = Field(default="IndoBERT + GAT", description="Tipe model")
    indobert_model: str = Field(..., description="Nama model IndoBERT")
    last_training: Optional[datetime] = None
    metrics: Optional[dict] = None


class DashboardStats(BaseModel):
    """Schema response untuk statistik dashboard."""

    total_emails: int
    total_spam: int
    total_ham: int
    spam_percentage: float
    recent_predictions: List[EmailResponse]
    model_status: ModelStatusResponse
