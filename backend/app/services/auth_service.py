from app.repositories.user_repo import UserRepository
from app.schemas.auth import UserRegister, UserLogin, AuthResponse, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import ConflictError, AuthenticationError
from app.models.user import User
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

class AuthService:
    def __init__(self, user_repo: UserRepository, session: AsyncSession = None):
        self.user_repo = user_repo
        self.session = session

    def _generate_tokens(self, user: User) -> TokenResponse:
        data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def register(self, data: UserRegister) -> AuthResponse:
        if await self.user_repo.email_exists(data.email):
            raise ConflictError("Email already registered")
        
        hashed_pw = hash_password(data.password)
        user = await self.user_repo.create_user(data.email, hashed_pw, data.full_name)
        if self.session:
            await self.session.commit()
            
        tokens = self._generate_tokens(user)
        return AuthResponse(tokens=tokens, user=UserResponse.model_validate(user))

    async def login(self, data: UserLogin) -> AuthResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
            
        tokens = self._generate_tokens(user)
        return AuthResponse(tokens=tokens, user=UserResponse.model_validate(user))

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")
            
        user_id = UUID(payload.get("sub"))
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")
            
        return self._generate_tokens(user)
