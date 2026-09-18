from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field

class PendingAction(BaseModel):
    action_id: str
    action_type: str  # "create_expense"
    preview_title: str
    preview_text: str
    amount: Decimal
    category_name: str
    category_id: Optional[UUID] = None
    expense_date: str
    payment_method: str = "UPI"
    merchant: Optional[str] = None
    description: str

class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    session_id: Optional[UUID] = None

class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    pending_action: Optional[PendingAction] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ActionConfirmRequest(BaseModel):
    session_id: UUID
    action_id: str
    confirm: bool  # True to execute, False to cancel

class ActionConfirmResponse(BaseModel):
    success: bool
    message: str
    expense_id: Optional[UUID] = None
