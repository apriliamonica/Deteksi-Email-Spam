from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.config.database import init_db
from app.routes import email_router, model_router

settings = get_settings()


def create_app() -> FastAPI:
    """Factory function untuk membuat FastAPI app."""
    app = FastAPI(
        title="Deteksi Email Spam - IndoBERT + GAT",
        description=(
            "API untuk deteksi email spam Bahasa Indonesia "
            "menggunakan metode hybrid IndoBERT dan Graph Attention Network (GAT)"
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routes.auth import router as auth_router, seed_users
    from app.routes.users import router as users_router

    # Register routes
    app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
    app.include_router(users_router, prefix="/api/users", tags=["Users"])
    app.include_router(email_router, prefix="/api/email", tags=["Email"])
    app.include_router(model_router, prefix="/api/model", tags=["Model"])

    @app.on_event("startup")
    async def startup():
        """Inisialisasi saat aplikasi dimulai."""
        init_db()
        # Seed default users
        from app.config.database import SessionLocal
        db = SessionLocal()
        try:
            seed_users(db)
        finally:
            db.close()

    @app.get("/", tags=["Health"])
    async def root():
        return {
            "status": "ok",
            "message": "API Deteksi Email Spam - IndoBERT + GAT",
            "docs": "/docs",
        }

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy"}

    return app


app = create_app()
