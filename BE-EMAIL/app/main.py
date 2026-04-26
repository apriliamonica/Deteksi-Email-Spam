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

    # Register routes
    app.include_router(email_router, prefix="/api/email", tags=["Email"])
    app.include_router(model_router, prefix="/api/model", tags=["Model"])

    @app.on_event("startup")
    async def startup():
        """Inisialisasi saat aplikasi dimulai."""
        init_db()

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
