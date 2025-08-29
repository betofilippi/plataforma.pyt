"""
Cache Service
In-memory caching with Redis fallback support
"""

from typing import Optional, Any, Dict
from datetime import datetime, timedelta
import json
import hashlib
from functools import wraps
import asyncio

class CacheService:
    """Simple in-memory cache service"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._locks = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self._cache:
            entry = self._cache[key]
            if entry["expires_at"] is None or entry["expires_at"] > datetime.utcnow():
                return entry["value"]
            else:
                # Expired, remove from cache
                del self._cache[key]
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> None:
        """Set value in cache with optional TTL in seconds"""
        expires_at = None
        if ttl:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        
        self._cache[key] = {
            "value": value,
            "expires_at": expires_at,
            "created_at": datetime.utcnow()
        }
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    async def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        return await self.get(key) is not None
    
    def make_key(self, *args) -> str:
        """Create cache key from arguments"""
        key_data = json.dumps(args, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def cached(self, ttl: int = 300):
        """Decorator for caching function results"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Create cache key from function name and arguments
                cache_key = self.make_key(func.__name__, args, kwargs)
                
                # Try to get from cache
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Execute function and cache result
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator

# Global cache instance
cache = CacheService()