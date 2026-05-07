
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)

new_columns = [
    ('umap_components', 'INTEGER'),
    ('weight_decay', 'DOUBLE PRECISION'),
    ('gat_weight_decay', 'DOUBLE PRECISION'),
    ('metrics_json', 'TEXT'),
    ('visualization_json', 'TEXT')
]

with engine.connect() as conn:
    print(f"Connecting to {settings.DATABASE_URL}...")
    for col_name, col_type in new_columns:
        try:
            conn.execute(text(f'ALTER TABLE training_history ADD COLUMN {col_name} {col_type}'))
            conn.commit()
            print(f"Column {col_name} added successfully.")
        except Exception as e:
            print(f"Column {col_name} error: {e}")
    print("Migration finished.")
