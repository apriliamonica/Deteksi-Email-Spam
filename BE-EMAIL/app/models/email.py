from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base


class Email(Base):
    """Model database untuk menyimpan data email."""

    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)
    processed_body = Column(Text, nullable=True)
    sender = Column(String(255), nullable=True)
    label = Column(String(10), nullable=False, comment="spam atau ham")
    confidence = Column(Float, nullable=True, comment="Confidence score prediksi")
    is_prediction = Column(
        Boolean, default=False, comment="True jika hasil prediksi, False jika data training"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Email(id={self.id}, dataset_id={self.dataset_id}, label={self.label}, subject={self.subject[:30] if self.subject else 'N/A'})>"


class TrainingHistory(Base):
    """Model database untuk menyimpan riwayat training model."""

    __tablename__ = "training_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    model_name = Column(String(100), nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    total_data = Column(Integer, nullable=True)
    train_size = Column(Integer, nullable=True)
    test_size = Column(Integer, nullable=True)
    epochs = Column(Integer, nullable=True)
    learning_rate = Column(Float, nullable=True)
    umap_components = Column(Integer, nullable=True)
    weight_decay = Column(Float, nullable=True)
    gat_weight_decay = Column(Float, nullable=True)
    metrics_json = Column(Text, nullable=True, comment="Full metrics and loss history in JSON format")
    visualization_json = Column(Text, nullable=True, comment="Visualization coordinates in JSON format")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    req_val_split = Column(Float, nullable=True)
    req_test_split = Column(Float, nullable=True)

    def __repr__(self):
        return f"<TrainingHistory(id={self.id}, model={self.model_name}, acc={self.accuracy})>"
