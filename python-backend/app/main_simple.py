"""
FastAPI Simple Test Server
Um servidor simplificado para testar a instalação
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import sys
import os

# Adicionar o diretório ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Create FastAPI app
app = FastAPI(
    title="Plataforma Python Backend",
    description="Sistema Python para substituir o TypeScript",
    version="1.0.0"
)

# Configure CORS - permitir a porta 3333 do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - verificação de saúde"""
    return {
        "message": "Sistema Python FastAPI funcionando!",
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "description": "Backend Python para substituir o sistema TypeScript"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "plataforma-python-backend",
        "timestamp": datetime.now().isoformat()
    }

# API info endpoint
@app.get("/api/v1/info")
async def api_info():
    """Informações sobre a API"""
    return {
        "name": "Plataforma Python API",
        "version": "1.0.0",
        "description": "API FastAPI substituindo o backend TypeScript",
        "features": [
            "FastAPI Framework",
            "Async/Await Support",
            "Auto Documentation",
            "JWT Authentication (em desenvolvimento)",
            "WebSocket Support (em desenvolvimento)",
            "Database Integration (em desenvolvimento)"
        ],
        "endpoints": {
            "root": "/",
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc",
            "api_info": "/api/v1/info"
        }
    }

# Test endpoint para verificar integração com frontend
@app.get("/api/ping")
async def ping():
    """Test endpoint - compatível com o frontend existente"""
    return {"message": "Hello from Python FastAPI server!"}

# User endpoint mockado para testar
@app.get("/api/users")
async def get_users():
    """Mock users endpoint para teste"""
    return {
        "users": [
            {"id": 1, "name": "Admin", "email": "admin@example.com"},
            {"id": 2, "name": "User", "email": "user@example.com"}
        ],
        "total": 2,
        "backend": "Python FastAPI"
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("[STARTUP] Iniciando Servidor Python FastAPI")
    print("="*50)
    print("[URL] Local: http://localhost:8001")
    print("[DOCS] Documentacao: http://localhost:8001/docs")
    print("[REDOC] ReDoc: http://localhost:8001/redoc")
    print("="*50 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)