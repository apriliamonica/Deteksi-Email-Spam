from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency untuk mendapatkan database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inisialisasi database tables and ensure split columns exist."""
    Base.metadata.create_all(bind=engine)
    # Ensure the new columns exist for PostgreSQL
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE training_history ADD COLUMN IF NOT EXISTS req_val_split DOUBLE PRECISION'))
        conn.execute(text('ALTER TABLE training_history ADD COLUMN IF NOT EXISTS req_test_split DOUBLE PRECISION'))
        # Tambah kolom user_id ke tabel emails jika belum ada
        conn.execute(text('ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'))
        # Tambah kolom batch_id dan batch_name untuk pengelompokan upload batch
        conn.execute(text('ALTER TABLE emails ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64)'))
        conn.execute(text('ALTER TABLE emails ADD COLUMN IF NOT EXISTS batch_name VARCHAR(255)'))
        conn.execute(text('CREATE INDEX IF NOT EXISTS ix_emails_batch_id ON emails(batch_id)'))

