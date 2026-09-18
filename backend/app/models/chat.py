import uuid
from typing import List, Optional, Any
from sqlalchemy import String, Text, ForeignKey, Uuid, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(255), default="New Chat", nullable=False)

    # Relationships
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at.asc()",
        lazy="selectin"
    )

    __table_args__ = (
        Index("idx_chat_sessions_user", "user_id", "created_at"),
    )

class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    tool_results: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("idx_chat_messages_session", "session_id", "created_at"),
    )
