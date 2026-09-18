import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate
from app.core.exceptions import ConflictError, AuthorizationError

@pytest.mark.asyncio
async def test_seed_and_list_categories(db_session: AsyncSession, test_user):
    repo = CategoryRepository(db_session)
    service = CategoryService(repo, session=db_session)

    categories = await service.list_categories(test_user.id)
    assert len(categories) >= 15
    names = [c.name for c in categories]
    assert "Food" in names
    assert "Fuel" in names
    assert "Bike" in names

@pytest.mark.asyncio
async def test_create_custom_category(db_session: AsyncSession, test_user):
    repo = CategoryRepository(db_session)
    service = CategoryService(repo, session=db_session)

    data = CategoryCreate(name="Gadgets", icon="📱", color="#A29BFE", type="expense")
    cat = await service.create_custom_category(test_user.id, data)
    assert cat.name == "Gadgets"
    assert cat.is_system is False
    assert cat.user_id == test_user.id

    # Duplicate should raise ConflictError
    with pytest.raises(ConflictError):
        await service.create_custom_category(test_user.id, data)

@pytest.mark.asyncio
async def test_delete_system_category_forbidden(db_session: AsyncSession, test_user):
    repo = CategoryRepository(db_session)
    service = CategoryService(repo, session=db_session)

    categories = await service.list_categories(test_user.id)
    food_cat = next(c for c in categories if c.name == "Food")

    with pytest.raises(AuthorizationError):
        await service.delete_custom_category(test_user.id, food_cat.id)
