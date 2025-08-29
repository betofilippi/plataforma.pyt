"""
API Routes for Module
Defines all REST API endpoints for the module
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from ..models.schemas import (
    ModuleItemCreate,
    ModuleItemUpdate,
    ModuleItemResponse,
    ModuleItemList
)
from ..services.module_service import ModuleService
from app.core.auth import get_current_user
from app.models.users import User

router = APIRouter(
    prefix="/api/modules/module-name",
    tags=["module-name"]
)

@router.get("/", response_model=ModuleItemList)
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    List all module items with optional filtering
    """
    items = await service.list_items(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search=search,
        status=status
    )
    return items

@router.get("/{item_id}", response_model=ModuleItemResponse)
async def get_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    Get a specific module item by ID
    """
    item = await service.get_item(item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/", response_model=ModuleItemResponse)
async def create_item(
    item_data: ModuleItemCreate,
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    Create a new module item
    """
    item = await service.create_item(item_data, current_user.id)
    return item

@router.put("/{item_id}", response_model=ModuleItemResponse)
async def update_item(
    item_id: UUID,
    item_data: ModuleItemUpdate,
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    Update an existing module item
    """
    item = await service.update_item(item_id, item_data, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.delete("/{item_id}")
async def delete_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    Delete a module item
    """
    success = await service.delete_item(item_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@router.get("/stats/summary")
async def get_stats(
    current_user: User = Depends(get_current_user),
    service: ModuleService = Depends()
):
    """
    Get module statistics and summary
    """
    stats = await service.get_stats(current_user.id)
    return stats