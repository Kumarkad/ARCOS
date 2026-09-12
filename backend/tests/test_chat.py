import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.analytics_repo import AnalyticsRepository
from app.repositories.chat_repo import ChatRepository
from app.services.category_service import CategoryService
from app.services.expense_service import ExpenseService
from app.services.budget_service import BudgetService
from app.services.analytics_service import AnalyticsService
from app.services.chat_service import ChatService
from app.providers.llm_provider import LLMProvider

@pytest.mark.asyncio
async def test_chat_natural_language_expense_proposal_and_confirm(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    budget_repo = BudgetRepository(db_session)
    analytics_repo = AnalyticsRepository(db_session)
    chat_repo = ChatRepository(db_session)

    cat_service = CategoryService(cat_repo, session=db_session)
    await cat_service.list_categories(test_user.id)  # seeds categories

    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)
    budget_service = BudgetService(budget_repo, cat_repo, session=db_session)
    analytics_service = AnalyticsService(analytics_repo, budget_repo, session=db_session)
    llm_provider = LLMProvider()

    chat_service = ChatService(
        chat_repo=chat_repo,
        category_repo=cat_repo,
        expense_service=exp_service,
        budget_service=budget_service,
        analytics_service=analytics_service,
        llm_provider=llm_provider,
        session=db_session
    )

    # 1. User says: "I bought chai for 20"
    response = await chat_service.send_message(test_user.id, "I bought chai for 20")
    assert response.pending_action is not None
    action = response.pending_action
    assert action.amount == Decimal("20")
    assert action.category_name == "Food"
    assert "Chai" in action.description

    # Ensure expense is NOT created before user confirmation!
    expenses, total = await exp_service.list_expenses(test_user.id)
    assert total == 0

    # 2. Confirm the pending action
    confirm_res = await chat_service.confirm_action(
        user_id=test_user.id,
        session_id=response.session_id,
        action_id=action.action_id,
        confirm=True
    )
    assert confirm_res.success is True
    assert confirm_res.expense_id is not None

    # Now verify the expense exists in the database
    expenses, total = await exp_service.list_expenses(test_user.id)
    assert total == 1
    assert expenses[0].amount == Decimal("20.00")
    assert "Chai" in expenses[0].description

@pytest.mark.asyncio
async def test_chat_cancel_proposal(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    budget_repo = BudgetRepository(db_session)
    analytics_repo = AnalyticsRepository(db_session)
    chat_repo = ChatRepository(db_session)

    cat_service = CategoryService(cat_repo, session=db_session)
    await cat_service.list_categories(test_user.id)

    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)
    budget_service = BudgetService(budget_repo, cat_repo, session=db_session)
    analytics_service = AnalyticsService(analytics_repo, budget_repo, session=db_session)
    llm_provider = LLMProvider()

    chat_service = ChatService(
        chat_repo=chat_repo,
        category_repo=cat_repo,
        expense_service=exp_service,
        budget_service=budget_service,
        analytics_service=analytics_service,
        llm_provider=llm_provider,
        session=db_session
    )

    # User proposes expense
    response = await chat_service.send_message(test_user.id, "Bought a helmet for 2500")
    assert response.pending_action is not None

    # Cancel action
    cancel_res = await chat_service.confirm_action(
        user_id=test_user.id,
        session_id=response.session_id,
        action_id=response.pending_action.action_id,
        confirm=False
    )
    assert cancel_res.success is False

    # Confirm no expense in DB
    expenses, total = await exp_service.list_expenses(test_user.id)
    assert total == 0

@pytest.mark.asyncio
async def test_chat_financial_query(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    budget_repo = BudgetRepository(db_session)
    analytics_repo = AnalyticsRepository(db_session)
    chat_repo = ChatRepository(db_session)

    cat_service = CategoryService(cat_repo, session=db_session)
    await cat_service.list_categories(test_user.id)

    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)
    budget_service = BudgetService(budget_repo, cat_repo, session=db_session)
    analytics_service = AnalyticsService(analytics_repo, budget_repo, session=db_session)
    llm_provider = LLMProvider()

    chat_service = ChatService(
        chat_repo=chat_repo,
        category_repo=cat_repo,
        expense_service=exp_service,
        budget_service=budget_service,
        analytics_service=analytics_service,
        llm_provider=llm_provider,
        session=db_session
    )

    # Ask query: "How much did I spend today?"
    resp = await chat_service.send_message(test_user.id, "How much did I spend today?")
    assert resp.pending_action is None
    assert "spent" in resp.content.lower() or "today" in resp.content.lower()
