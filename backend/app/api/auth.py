from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserRegister, UserLogin, AuthResponse, TokenResponse, RefreshTokenRequest, UserResponse, UserUpdate
from app.services.auth_service import AuthService
from app.repositories.user_repo import UserRepository
from app.models.user import User
from app.schemas.common import APIResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    repo = UserRepository(db)
    return AuthService(repo, session=db)

@router.post("/register", response_model=APIResponse[AuthResponse])
async def register(data: UserRegister, service: AuthService = Depends(get_auth_service)):
    result = await service.register(data)
    return APIResponse(data=result, message="User registered successfully")

@router.post("/login", response_model=APIResponse[AuthResponse])
async def login(data: UserLogin, service: AuthService = Depends(get_auth_service)):
    result = await service.login(data)
    return APIResponse(data=result, message="Login successful")

@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh_token(data: RefreshTokenRequest, service: AuthService = Depends(get_auth_service)):
    result = await service.refresh_token(data.refresh_token)
    return APIResponse(data=result, message="Token refreshed successfully")

@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(user: User = Depends(get_current_user)):
    return APIResponse(data=UserResponse.model_validate(user))

@router.put("/me", response_model=APIResponse[UserResponse])
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.currency is not None:
        user.currency = data.currency
    if data.timezone is not None:
        user.timezone = data.timezone
    await db.commit()
    await db.refresh(user)
    return APIResponse(data=UserResponse.model_validate(user), message="Profile updated")
