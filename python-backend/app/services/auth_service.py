"""
Authentication Service using Supabase Auth
Serviço de autenticação usando Supabase Auth integrado
"""

from typing import Optional, Dict, Any
from supabase import create_client, Client
import os
import logging
from datetime import datetime, timedelta
import secrets

logger = logging.getLogger(__name__)

class AuthService:
    """Serviço de autenticação com Supabase Auth"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios")
        
        # Cliente com anon key para operações públicas
        self.client: Client = create_client(self.url, self.anon_key)
        
        # Cliente admin com service key
        if self.service_key:
            self.admin_client: Client = create_client(self.url, self.service_key)
        else:
            self.admin_client = self.client
            
        logger.info("Auth service initialized")
    
    async def sign_up(self, email: str, password: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Registra novo usuário"""
        try:
            # Dados do usuário
            user_data = {
                "email": email,
                "password": password
            }
            
            # Adiciona metadata se fornecido
            if metadata:
                user_data["options"] = {
                    "data": metadata
                }
            
            # Cria usuário no Supabase Auth
            response = self.client.auth.sign_up(user_data)
            
            if response.user:
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "created_at": response.user.created_at,
                        "metadata": response.user.user_metadata
                    },
                    "session": {
                        "access_token": response.session.access_token if response.session else None,
                        "refresh_token": response.session.refresh_token if response.session else None
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to create user"
                }
                
        except Exception as e:
            logger.error(f"Sign up error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Faz login do usuário"""
        try:
            # Faz login
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user:
                # Gera session token customizado
                session_token = secrets.token_urlsafe(32)
                
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "created_at": response.user.created_at,
                        "last_sign_in": response.user.last_sign_in_at,
                        "metadata": response.user.user_metadata
                    },
                    "session": {
                        "session_token": session_token,
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Invalid credentials"
                }
                
        except Exception as e:
            logger.error(f"Sign in error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def sign_out(self) -> Dict[str, Any]:
        """Faz logout do usuário"""
        try:
            self.client.auth.sign_out()
            return {
                "success": True,
                "message": "Logged out successfully"
            }
        except Exception as e:
            logger.error(f"Sign out error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Obtém usuário pelo token"""
        try:
            # Obtém usuário do token
            response = self.client.auth.get_user(access_token)
            
            if response.user:
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "created_at": response.user.created_at,
                    "metadata": response.user.user_metadata
                }
            return None
            
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Renova o token de acesso"""
        try:
            response = self.client.auth.refresh_session(refresh_token)
            
            if response.session:
                return {
                    "success": True,
                    "session": {
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to refresh token"
                }
                
        except Exception as e:
            logger.error(f"Refresh token error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_user_metadata(self, user_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Atualiza metadata do usuário"""
        try:
            # Usa admin client para atualizar metadata
            response = self.admin_client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": metadata}
            )
            
            if response.user:
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "metadata": response.user.user_metadata
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to update user"
                }
                
        except Exception as e:
            logger.error(f"Update user error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def delete_user(self, user_id: str) -> Dict[str, Any]:
        """Deleta usuário (admin only)"""
        try:
            # Usa admin client para deletar usuário
            self.admin_client.auth.admin.delete_user(user_id)
            
            return {
                "success": True,
                "message": "User deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Delete user error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def list_users(self, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        """Lista usuários (admin only)"""
        try:
            # Usa admin client para listar usuários
            response = self.admin_client.auth.admin.list_users(
                page=page,
                per_page=per_page
            )
            
            users = []
            for user in response.users:
                users.append({
                    "id": user.id,
                    "email": user.email,
                    "created_at": user.created_at,
                    "last_sign_in": user.last_sign_in_at,
                    "metadata": user.user_metadata
                })
            
            return {
                "success": True,
                "users": users,
                "total": response.total,
                "page": page,
                "per_page": per_page
            }
            
        except Exception as e:
            logger.error(f"List users error: {e}")
            return {
                "success": False,
                "error": str(e),
                "users": []
            }
    
    async def create_demo_user(self) -> Dict[str, Any]:
        """Cria usuário demo para testes"""
        demo_email = "demo@example.com"
        demo_password = "Demo123456!"
        
        # Tenta fazer login primeiro
        result = await self.sign_in(demo_email, demo_password)
        
        if not result["success"]:
            # Se falhar, cria o usuário
            result = await self.sign_up(
                demo_email, 
                demo_password,
                metadata={
                    "name": "Demo User",
                    "role": "admin"
                }
            )
        
        return result

# Singleton instance
_auth_service: Optional[AuthService] = None

def get_auth_service() -> AuthService:
    """Retorna instância singleton do serviço de autenticação"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service