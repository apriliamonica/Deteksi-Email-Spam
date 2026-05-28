import asyncio
from fastapi import UploadFile
import io
from app.routes.email import classify_batch
from app.config.database import SessionLocal

async def main():
    db = SessionLocal()
    try:
        content = b'text,subject,sender\n"hello world","test","me@test.com"\n'
        file = UploadFile(filename="test.csv", file=io.BytesIO(content))
        await classify_batch(file=file, text_column="text", subject_column="subject", sender_column="sender", db=db)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
