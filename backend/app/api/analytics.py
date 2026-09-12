from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import SpendingAnalyticsResponse
from app.schemas.common import APIResponse
from app.repositories.analytics_repo import AnalyticsRepository
from app.repositories.budget_repo import BudgetRepository
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def get_analytics_service(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    analytics_repo = AnalyticsRepository(db)
    budget_repo = BudgetRepository(db)
    return AnalyticsService(analytics_repo, budget_repo, session=db)

@router.get("", response_model=APIResponse[SpendingAnalyticsResponse])
async def get_analytics(
    user: User = Depends(get_current_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    analytics = await service.get_analytics(user.id)
    return APIResponse(data=analytics)
