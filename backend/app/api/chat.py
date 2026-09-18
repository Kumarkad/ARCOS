from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse, ChatSessionResponse,
    ActionConfirmRequest, ActionConfirmResponse
)
from app.schemas.common import APIResponse
from app.repositories.chat_repo import ChatRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.analytics_repo import AnalyticsRepository
from app.services.expense_service import ExpenseService
from app.services.budget_service import BudgetService
from app.services.analytics_service import AnalyticsService
from app.services.category_service import CategoryService
from app.services.chat_service import ChatService
from app.providers.llm_provider import LLMProvider

router = APIRouter(prefix="/chat", tags=["AI Chat"])

def get_chat_service(db: AsyncSession = Depends(get_db)) -> ChatService:
    chat_repo = ChatRepository(db)
    cat_repo = CategoryRepository(db)
    exp_repo = ExpenseRepository(db)
    budget_repo = BudgetRepository(db)
    analytics_repo = AnalyticsRepository(db)

    exp_service = ExpenseService(exp_repo, cat_repo, session=db)
    budget_service = BudgetService(budget_repo, cat_repo, session=db)
    analytics_service = AnalyticsService(analytics_repo, budget_repo, session=db)
    llm_provider = LLMProvider()

    return ChatService(
        chat_repo=chat_repo,
        category_repo=cat_repo,
        expense_service=exp_service,
        budget_service=budget_service,
        analytics_service=analytics_service,
        llm_provider=llm_provider,
        session=db
    )

@router.get("/sessions", response_model=APIResponse[List[ChatSessionResponse]])
async def list_sessions(
    user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    sessions = await service.list_sessions(user.id)
    return APIResponse(data=sessions)

@router.get("/sessions/{session_id}", response_model=APIResponse[ChatSessionResponse])
async def get_session(
    session_id: UUID,
    user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    session = await service.get_session(user.id, session_id)
    return APIResponse(data=session)

@router.post("/message", response_model=APIResponse[ChatMessageResponse])
async def send_message(
    data: ChatMessageCreate,
    user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    msg = await service.send_message(user.id, data.content, data.session_id)
    return APIResponse(data=msg)

@router.post("/confirm", response_model=APIResponse[ActionConfirmResponse])
async def confirm_action(
    data: ActionConfirmRequest,
    user: User = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    result = await service.confirm_action(user.id, data.session_id, data.action_id, data.confirm)
    return APIResponse(data=result, message=result.message)
