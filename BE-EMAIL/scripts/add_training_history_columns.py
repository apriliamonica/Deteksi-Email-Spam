import os
from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    # Add req_val_split column if it does not exist
    conn.execute(text('ALTER TABLE training_history ADD COLUMN IF NOT EXISTS req_val_split DOUBLE PRECISION;'))
    conn.execute(text('ALTER TABLE training_history ADD COLUMN IF NOT EXISTS req_test_split DOUBLE PRECISION;'))
    conn.commit()
print('Columns added (if they were missing).')
