from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserResponse
from datetime import datetime
import hashlib

router = APIRouter()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/login")
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_login.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    if user.password != hash_password(user_login.password):
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Akun dinonaktifkan")
        
    # Update last login
    user.last_login = datetime.now().strftime("%d/%m/%y %H:%M")
    db.commit()
    db.refresh(user)
    
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/seed")
def seed_users(db: Session = Depends(get_db)):
    """Seed default users if not exists"""
    admin = db.query(User).filter(User.email == "admin@spamguard.com").first()
    if not admin:
        admin = User(
            name="Admin SpamGuard",
            email="admin@spamguard.com",
            password=hash_password("admin123"),
            role="admin"
        )
        db.add(admin)
        
    user = db.query(User).filter(User.email == "user@spamguard.com").first()
    if not user:
        user = User(
            name="Pengguna Biasa",
            email="user@spamguard.com",
            password=hash_password("user123"),
            role="user"
        )
        db.add(user)
        
    db.commit()
    return {"status": "success", "message": "Default users seeded"}
