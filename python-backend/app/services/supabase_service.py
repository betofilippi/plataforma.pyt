"""
Supabase Service
Serviço para integração com Supabase
"""

import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from supabase.client import ClientOptions
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    """Serviço para interação com Supabase"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY") 
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios")
        
        # Cliente com chave anon para operações regulares
        self.client: Client = create_client(
            self.url, 
            self.anon_key,
            options=ClientOptions(
                auto_refresh_token=False,
                persist_session=False
            )
        )
        
        # Cliente com service_role para operações administrativas
        if self.service_key:
            self.admin_client: Client = create_client(
                self.url,
                self.service_key,
                options=ClientOptions(
                    auto_refresh_token=False,
                    persist_session=False
                )
            )
        else:
            self.admin_client = self.client
            
        logger.info(f"Supabase service initialized for: {self.url}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Verifica conectividade com Supabase"""
        try:
            # Tenta fazer uma query simples
            result = self.client.table("users").select("count", count="exact").limit(0).execute()
            
            return {
                "status": "healthy",
                "url": self.url,
                "connected": True,
                "users_count": result.count if hasattr(result, 'count') else 0
            }
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return {
                "status": "unhealthy", 
                "url": self.url,
                "connected": False,
                "error": str(e)
            }
    
    # ========================================
    # USER OPERATIONS
    # ========================================
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca usuário por email"""
        try:
            result = self.client.table("users").select("*").eq("email", email).single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error fetching user by email {email}: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca usuário por ID"""
        try:
            result = self.client.table("users").select("*").eq("id", user_id).single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error fetching user by ID {user_id}: {e}")
            return None
    
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Cria novo usuário"""
        try:
            result = self.admin_client.table("users").insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atualiza usuário"""
        try:
            result = self.admin_client.table("users").update(updates).eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return None
    
    async def get_user_with_roles(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca usuário com seus roles"""
        try:
            result = self.client.table("user_profiles").select("*").eq("id", user_id).single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {e}")
            return None
    
    # ========================================
    # SESSION OPERATIONS
    # ========================================
    
    async def get_user_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca sessão do usuário"""
        try:
            result = (
                self.client.table("user_sessions")
                .select("*")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching user session {user_id}: {e}")
            return None
    
    async def save_user_session(self, session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Salva sessão do usuário"""
        try:
            # Tenta atualizar sessão existente primeiro
            existing = await self.get_user_session(session_data["user_id"])
            
            if existing:
                result = (
                    self.client.table("user_sessions")
                    .update(session_data)
                    .eq("user_id", session_data["user_id"])
                    .execute()
                )
            else:
                result = self.client.table("user_sessions").insert(session_data).execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error saving user session: {e}")
            return None
    
    async def delete_user_session(self, user_id: str) -> bool:
        """Deleta sessão do usuário"""
        try:
            self.client.table("user_sessions").delete().eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting user session {user_id}: {e}")
            return False
    
    # ========================================
    # MODULE OPERATIONS
    # ========================================
    
    async def get_available_modules(self) -> List[Dict[str, Any]]:
        """Lista módulos disponíveis"""
        try:
            result = (
                self.client.table("modules")
                .select("*")
                .eq("is_active", True)
                .order("display_name")
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching modules: {e}")
            return []
    
    async def get_user_modules(self, user_id: str) -> List[Dict[str, Any]]:
        """Lista módulos do usuário"""
        try:
            result = (
                self.client.table("user_modules")
                .select("*, modules(*)")
                .eq("user_id", user_id)
                .eq("is_enabled", True)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching user modules {user_id}: {e}")
            return []
    
    async def install_user_module(self, user_id: str, module_id: str) -> Optional[Dict[str, Any]]:
        """Instala módulo para usuário"""
        try:
            data = {
                "user_id": user_id,
                "module_id": module_id,
                "is_enabled": True
            }
            result = self.client.table("user_modules").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error installing module {module_id} for user {user_id}: {e}")
            return None
    
    # ========================================
    # NOTIFICATION OPERATIONS
    # ========================================
    
    async def get_user_notifications(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lista notificações do usuário"""
        try:
            result = (
                self.client.table("notifications")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching notifications for user {user_id}: {e}")
            return []
    
    async def create_notification(self, notification_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Cria nova notificação"""
        try:
            result = self.client.table("notifications").insert(notification_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return None
    
    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Marca notificação como lida"""
        try:
            self.client.table("notifications").update({
                "is_read": True,
                "read_at": "NOW()"
            }).eq("id", notification_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error marking notification read {notification_id}: {e}")
            return False
    
    # ========================================
    # ACTIVITY LOG OPERATIONS
    # ========================================
    
    async def log_activity(self, user_id: str, action: str, resource_type: str = None, 
                          resource_id: str = None, description: str = None,
                          metadata: Dict[str, Any] = None) -> bool:
        """Registra atividade do usuário"""
        try:
            activity_data = {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "description": description,
                "metadata": metadata or {}
            }
            
            self.client.table("activity_logs").insert(activity_data).execute()
            return True
        except Exception as e:
            logger.error(f"Error logging activity: {e}")
            return False

# Singleton instance
_supabase_service: Optional[SupabaseService] = None

def get_supabase_service() -> SupabaseService:
    """Retorna instância singleton do serviço Supabase"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service