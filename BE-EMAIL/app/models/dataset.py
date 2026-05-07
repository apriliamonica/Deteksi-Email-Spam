from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base

class Dataset(Base):
    """Model database untuk menyimpan metadata dataset yang diupload."""
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    spam_count = Column(Integer, default=0)
    ham_count = Column(Integer, default=0)
    status = Column(String(50), default="Uploaded") # Uploaded, Preprocessed, Training
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to emails
    emails = relationship("Email", backref="dataset", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Dataset(id={self.id}, name={self.name}, total={self.total_rows})>"
