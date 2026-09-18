from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import AuthenticationError
from app.repositories.user_repo import UserRepository
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise AuthenticationError("Invalid token type")
        user_id = UUID(payload.get("sub"))
    except Exception:
        raise AuthenticationError("Could not validate credentials")

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise AuthenticationError("User not found")
    
    return user
