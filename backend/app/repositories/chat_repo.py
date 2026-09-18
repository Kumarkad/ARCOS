from typing import List, Optional, Any, Dict
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.chat import ChatSession, ChatMessage

class ChatRepository(BaseRepository[ChatSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(ChatSession, session)

    async def create_session(self, user_id: UUID, title: str = "New Chat") -> ChatSession:
        chat_sess = ChatSession(user_id=user_id, title=title)
        chat_sess.messages = []
        self.session.add(chat_sess)
        await self.session.flush()
        return chat_sess

    async def get_user_session(self, session_id: UUID, user_id: UUID) -> Optional[ChatSession]:
        query = (
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(
                and_(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_user_sessions(self, user_id: UUID) -> List[ChatSession]:
        query = (
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().unique().all())

    async def add_message(
        self,
        session_id: UUID,
        role: str,
        content: str,
        tool_calls: Optional[Any] = None,
        tool_results: Optional[Any] = None,
        metadata_json: Optional[Any] = None
    ) -> ChatMessage:
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_results=tool_results,
            metadata_json=metadata_json
        )
        self.session.add(msg)
        await self.session.flush()
        return msg

    async def delete_user_session(self, session_id: UUID, user_id: UUID) -> bool:
        sess = await self.get_user_session(session_id, user_id)
        if not sess:
            return False
        await self.session.delete(sess)
        await self.session.flush()
        return True
