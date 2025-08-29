#!/usr/bin/env python3
"""
Development server runner for the Plataforma NXT FastAPI backend.

This script provides a convenient way to run the development server with
proper configuration and error handling.
"""

import sys
import os
from pathlib import Path

# Add the app directory to Python path
current_dir = Path(__file__).parent
app_dir = current_dir / "app"
sys.path.insert(0, str(current_dir))

try:
    import uvicorn
    from app.core.config import get_settings
    
    def main():
        """Run the development server."""
        settings = get_settings()
        
        print(f"Starting {settings.app_name} v{settings.app_version}")
        print(f"Environment: {settings.environment}")
        print(f"Server: http://{settings.server_host}:{settings.server_port}")
        print(f"API Docs: http://{settings.server_host}:{settings.server_port}/api/docs")
        print(f"Health Check: http://{settings.server_host}:{settings.server_port}/health")
        
        # Check if .env file exists
        env_file = current_dir / ".env"
        if not env_file.exists():
            print("WARNING: .env file not found. Using default settings.")
            print(f"Copy .env.example to .env and configure your settings.")
        
        uvicorn.run(
            "app.main:app",
            host=settings.server_host,
            port=settings.server_port,
            reload=settings.debug or settings.auto_reload,
            log_level="info" if not settings.debug else "debug",
            access_log=True,
            reload_dirs=[str(app_dir)] if settings.debug else None,
        )

    if __name__ == "__main__":
        main()
        
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you have installed the required dependencies:")
    print("   pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"Error starting server: {e}")
    sys.exit(1)