from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.investment import (
    AccountCreate, AccountResponse, TransactionCreate, TransactionResponse,
    PortfolioSummaryResponse, HoldingResponse, HoldingUpdate,
    WatchlistCreate, WatchlistResponse, StockSuggestion, StockSearchItem,
    IPOPromptCreate, IPOPromptUpdate, IPOPromptResponse,
    IPOAnalyzeRequest, IPOAnalyzeResponse, UpcomingIPOItem
)
from app.schemas.common import APIResponse
from app.repositories.investment_repo import InvestmentRepository
from app.providers.market_data import MarketDataProvider
from app.providers.llm_provider import LLMProvider
from app.services.investment_service import InvestmentService
from app.services.ipo_service import IPOService

router = APIRouter(prefix="/investments", tags=["Investments & IPO"])

def get_investment_service(db: AsyncSession = Depends(get_db)) -> InvestmentService:
    repo = InvestmentRepository(db)
    market_data = MarketDataProvider()
    return InvestmentService(repo, market_data, session=db)

def get_ipo_service(db: AsyncSession = Depends(get_db)) -> IPOService:
    repo = InvestmentRepository(db)
    llm = LLMProvider()
    return IPOService(repo, llm, session=db)

# Accounts
@router.get("/accounts", response_model=APIResponse[List[AccountResponse]])
async def list_accounts(
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    accs = await service.list_accounts(user.id)
    return APIResponse(data=accs)

@router.post("/accounts", response_model=APIResponse[AccountResponse])
async def create_account(
    data: AccountCreate,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    acc = await service.create_account(user.id, data)
    return APIResponse(data=acc, message="Investment account created")

# Portfolio & Holdings
@router.get("/portfolio", response_model=APIResponse[PortfolioSummaryResponse])
async def get_portfolio(
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    summary = await service.get_portfolio_summary(user.id)
    return APIResponse(data=summary)

@router.put("/holdings/{holding_id}", response_model=APIResponse[HoldingResponse])
async def update_holding(
    holding_id: UUID,
    data: HoldingUpdate,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    updated = await service.update_holding(user.id, holding_id, data)
    return APIResponse(data=updated, message="Stock holding updated successfully")

@router.delete("/holdings/{holding_id}", response_model=APIResponse[bool])
async def delete_holding(
    holding_id: UUID,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    success = await service.delete_holding(user.id, holding_id)
    return APIResponse(data=success, message="Stock holding removed")

# Stock Suggestions & Search
@router.get("/suggestions", response_model=APIResponse[List[StockSuggestion]])
async def get_stock_suggestions(
    category: Optional[str] = Query(None, description="Filter by category: NIFTY 50, HIGH GROWTH, GREEN ENERGY, DIVIDEND, DEFENSIVE"),
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    suggestions = await service.get_stock_suggestions(category)
    return APIResponse(data=suggestions)

@router.get("/search", response_model=APIResponse[List[StockSearchItem]])
async def search_stocks(
    query: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    results = await service.search_stocks(query)
    return APIResponse(data=results)

# Transactions
@router.get("/transactions", response_model=APIResponse[List[TransactionResponse]])
async def list_transactions(
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    txs = await service.list_transactions(user.id)
    return APIResponse(data=txs)

@router.post("/transactions", response_model=APIResponse[TransactionResponse])
async def record_transaction(
    data: TransactionCreate,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    tx = await service.record_transaction(user.id, data)
    return APIResponse(data=tx, message=f"{data.transaction_type} transaction recorded")

# Watchlist
@router.get("/watchlist", response_model=APIResponse[List[WatchlistResponse]])
async def list_watchlist(
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    items = await service.list_watchlist(user.id)
    return APIResponse(data=items)

@router.post("/watchlist", response_model=APIResponse[WatchlistResponse])
async def add_to_watchlist(
    data: WatchlistCreate,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    item = await service.add_to_watchlist(user.id, data)
    return APIResponse(data=item, message="Asset added to watchlist")

@router.delete("/watchlist/{item_id}", response_model=APIResponse[bool])
async def remove_from_watchlist(
    item_id: UUID,
    user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    success = await service.remove_from_watchlist(user.id, item_id)
    return APIResponse(data=success, message="Removed from watchlist")

# IPO Custom Prompts (User Request: Add, update, delete, multiple prompts)
@router.get("/ipo/prompts", response_model=APIResponse[List[IPOPromptResponse]])
async def list_ipo_prompts(
    user: User = Depends(get_current_user),
    service: IPOService = Depends(get_ipo_service)
):
    prompts = await service.list_prompts(user.id)
    return APIResponse(data=prompts)

@router.post("/ipo/prompts", response_model=APIResponse[IPOPromptResponse])
async def create_ipo_prompt(
    data: IPOPromptCreate,
    user: User = Depends(get_current_user),
    service: IPOService = Depends(get_ipo_service)
):
    prompt = await service.create_prompt(user.id, data)
    return APIResponse(data=prompt, message="IPO analysis prompt created")

@router.put("/ipo/prompts/{prompt_id}", response_model=APIResponse[IPOPromptResponse])
async def update_ipo_prompt(
    prompt_id: UUID,
    data: IPOPromptUpdate,
    user: User = Depends(get_current_user),
    service: IPOService = Depends(get_ipo_service)
):
    prompt = await service.update_prompt(user.id, prompt_id, data)
    return APIResponse(data=prompt, message="IPO analysis prompt updated")

@router.delete("/ipo/prompts/{prompt_id}", response_model=APIResponse[bool])
async def delete_ipo_prompt(
    prompt_id: UUID,
    user: User = Depends(get_current_user),
    service: IPOService = Depends(get_ipo_service)
):
    success = await service.delete_prompt(user.id, prompt_id)
    return APIResponse(data=success, message="IPO prompt deleted")

# IPO AI Analysis with custom prompt
@router.post("/ipo/analyze", response_model=APIResponse[IPOAnalyzeResponse])
async def analyze_ipo(
    data: IPOAnalyzeRequest,
    user: User = Depends(get_current_user),
    service: IPOService = Depends(get_ipo_service)
):
    result = await service.analyze_ipo(user.id, data)
    return APIResponse(data=result)

@router.get("/ipo/upcoming", response_model=APIResponse[List[UpcomingIPOItem]])
async def get_upcoming_ipos(
    service: IPOService = Depends(get_ipo_service)
):
    ipos = await service.get_upcoming_ipos()
    return APIResponse(data=ipos)

