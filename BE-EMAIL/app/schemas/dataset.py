from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class DatasetBase(BaseModel):
    name: str
    total_rows: int
    spam_count: int
    ham_count: int
    status: str = "Uploaded"

class DatasetCreate(DatasetBase):
    pass

class DatasetResponse(DatasetBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
