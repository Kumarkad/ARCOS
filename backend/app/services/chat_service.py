import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.chat_repo import ChatRepository
from app.repositories.category_repo import CategoryRepository
from app.services.expense_service import ExpenseService
from app.services.budget_service import BudgetService
from app.services.analytics_service import AnalyticsService
from app.providers.llm_provider import LLMProvider
from app.schemas.chat import (
    ChatMessageResponse, ChatSessionResponse, PendingAction,
    ActionConfirmResponse
)
from app.schemas.expense import ExpenseCreate
from app.core.exceptions import NotFoundError, ValidationError

class ChatService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        category_repo: CategoryRepository,
        expense_service: ExpenseService,
        budget_service: BudgetService,
        analytics_service: AnalyticsService,
        llm_provider: LLMProvider,
        session: AsyncSession = None
    ):
        self.chat_repo = chat_repo
        self.category_repo = category_repo
        self.expense_service = expense_service
        self.budget_service = budget_service
        self.analytics_service = analytics_service
        self.llm_provider = llm_provider
        self.session = session

    async def list_sessions(self, user_id: UUID) -> List[ChatSessionResponse]:
        sessions = await self.chat_repo.list_user_sessions(user_id)
        return [ChatSessionResponse.model_validate(s) for s in sessions]

    async def get_session(self, user_id: UUID, session_id: UUID) -> ChatSessionResponse:
        sess = await self.chat_repo.get_user_session(session_id, user_id)
        if not sess:
            raise NotFoundError("Chat session not found")
        return ChatSessionResponse.model_validate(sess)

    async def send_message(
        self,
        user_id: UUID,
        content: str,
        session_id: Optional[UUID] = None
    ) -> ChatMessageResponse:
        # 1. Ensure chat session
        if session_id:
            sess = await self.chat_repo.get_user_session(session_id, user_id)
            if not sess:
                raise NotFoundError("Chat session not found")
        else:
            title = content[:30] + ("..." if len(content) > 30 else "")
            sess = await self.chat_repo.create_session(user_id, title)
            session_id = sess.id

        # 2. Record user message
        await self.chat_repo.add_message(session_id, role="user", content=content)

        # 3. Build message history for LLM
        history = []
        for m in (sess.messages or [])[-6:]:
            if m.content and m.content.strip():
                history.append({"role": m.role, "content": m.content.strip()})
        if not history or history[-1].get("content") != content.strip() or history[-1].get("role") != "user":
            history.append({"role": "user", "content": content.strip()})

        # 4. Call LLM
        llm_output = await self.llm_provider.generate_response(history)
        tool_calls = llm_output.get("tool_calls")
        reply_text = llm_output.get("content", "")
        pending_action_obj: Optional[PendingAction] = None

        # 5. Handle Tool Calls
        if tool_calls and len(tool_calls) > 0:
            tc = tool_calls[0]
            name = tc.get("name")
            args = tc.get("arguments", {})

            if name == "create_expense":
                amt = Decimal(str(args.get("amount", 0)))
                cat_name = args.get("category", "Other")
                desc = args.get("description", "Expense")
                dt_str = args.get("date", "today")
                pm = args.get("payment_method", "UPI")
                merchant = args.get("merchant")

                # Resolve category
                cat = await self.category_repo.get_by_name(cat_name, user_id)
                if not cat:
                    cat = await self.category_repo.get_by_name("Other", user_id)

                action_id = str(uuid.uuid4())
                preview = (
                    f"💳 Adding ₹{amt:,.0f} expense\n\n"
                    f"• Category: {cat.name if cat else cat_name}\n"
                    f"• Description: {desc}\n"
                    f"• Date: {dt_str.title()}\n"
                    f"• Payment Method: {pm}"
                )
                if merchant:
                    preview += f"\n• Merchant: {merchant}"

                pending_action_obj = PendingAction(
                    action_id=action_id,
                    action_type="create_expense",
                    preview_title=f"Add ₹{amt:,.0f} Expense",
                    preview_text=preview,
                    amount=amt,
                    category_name=cat.name if cat else cat_name,
                    category_id=cat.id if cat else None,
                    expense_date=date.today().isoformat() if dt_str == "today" else (
                        (date.today() - timedelta(days=1)).isoformat() if dt_str == "yesterday" else dt_str
                    ),
                    payment_method=pm,
                    merchant=merchant,
                    description=desc
                )

                reply_text = f"I've prepared this expense for you. Please confirm to add it:"

            elif name == "get_spending_summary":
                period = args.get("period", "today")
                summary = await self.expense_service.get_summary(user_id)
                if period == "today":
                    reply_text = f"You have spent ₹{summary.today_total:,.0f} today across {summary.total_expenses_count} transactions."
                else:
                    reply_text = f"Your total spending this month is ₹{summary.this_month_total:,.0f}."
                    if summary.category_breakdown:
                        top = summary.category_breakdown[0]
                        reply_text += f"\nYour biggest category is {top.category_name} at ₹{top.total_amount:,.0f} ({top.percentage}%)."

            elif name == "get_budget_status":
                budgets = await self.budget_service.list_budgets(user_id, active_only=True)
                if not budgets:
                    reply_text = "You don't have any active budgets set up yet. You can create one from the Budgets tab!"
                else:
                    b = budgets[0]
                    reply_text = (
                        f"📊 Budget Status for '{b.name}':\n"
                        f"• Total Limit: ₹{b.total_amount:,.0f}\n"
                        f"• Spent so far: ₹{b.total_spent:,.0f} ({b.total_utilization_pct}% used)\n"
                        f"• Remaining: ₹{max(Decimal('0'), b.total_remaining):,.0f}\n"
                    )
                    if b.overall_status == "WARNING":
                        reply_text += "⚠️ Warning: You have used over 80% of your budget!"
                    elif b.overall_status == "EXCEEDED":
                        reply_text += "🚨 Alert: You have exceeded your budget limit!"
                    else:
                        reply_text += "✅ You're well within your spending limit."

            elif name == "can_i_afford":
                amt = Decimal(str(args.get("amount", 0)))
                budgets = await self.budget_service.list_budgets(user_id, active_only=True)
                if not budgets:
                    reply_text = f"₹{amt:,.0f} is within reasonable spending, but setting up a monthly budget will help make exact checks."
                else:
                    b = budgets[0]
                    rem = b.total_remaining
                    if rem >= amt:
                        reply_text = f"Yes, you have ₹{rem:,.0f} remaining in your '{b.name}' budget. After this purchase, you will still have ₹{rem - amt:,.0f} left! 👍"
                    else:
                        reply_text = f"⚠️ Spending ₹{amt:,.0f} will exceed your remaining budget of ₹{max(Decimal('0'), rem):,.0f} by ₹{amt - rem:,.0f}."

        # 6. Save assistant message
        metadata = None
        if pending_action_obj:
            metadata = {
                "pending_action": pending_action_obj.model_dump(mode="json"),
                "status": "PENDING"
            }

        saved_msg = await self.chat_repo.add_message(
            session_id=session_id,
            role="assistant",
            content=reply_text,
            tool_calls=tool_calls,
            metadata_json=metadata
        )

        if self.session:
            await self.session.commit()

        resp = ChatMessageResponse(
            id=saved_msg.id,
            session_id=session_id,
            role="assistant",
            content=reply_text,
            pending_action=pending_action_obj,
            created_at=saved_msg.created_at
        )
        return resp

    async def confirm_action(
        self,
        user_id: UUID,
        session_id: UUID,
        action_id: str,
        confirm: bool
    ) -> ActionConfirmResponse:
        sess = await self.chat_repo.get_user_session(session_id, user_id)
        if not sess:
            raise NotFoundError("Chat session not found")

        # Locate message with this pending action
        target_msg = None
        for m in sess.messages:
            if m.metadata_json and m.metadata_json.get("pending_action", {}).get("action_id") == action_id:
                target_msg = m
                break

        if not target_msg:
            raise NotFoundError("Pending action not found or already processed")

        action_data = target_msg.metadata_json["pending_action"]

        if not confirm:
            target_msg.metadata_json["status"] = "CANCELLED"
            await self.chat_repo.add_message(
                session_id=session_id,
                role="assistant",
                content="❌ Expense cancelled."
            )
            if self.session:
                await self.session.commit()
            return ActionConfirmResponse(success=False, message="Expense cancelled")

        # Execute write action safely via service layer
        cat_id = action_data.get("category_id")
        if not cat_id:
            cat = await self.category_repo.get_by_name(action_data["category_name"], user_id)
            cat_id = cat.id if cat else None

        created = await self.expense_service.create_expense(
            user_id=user_id,
            data=ExpenseCreate(
                amount=Decimal(str(action_data["amount"])),
                currency="INR",
                category_id=UUID(str(cat_id)),
                description=action_data["description"],
                expense_date=date.fromisoformat(action_data["expense_date"]),
                payment_method=action_data.get("payment_method", "UPI"),
                merchant=action_data.get("merchant"),
                idempotency_key=uuid.uuid4()
            )
        )

        target_msg.metadata_json["status"] = "CONFIRMED"
        await self.chat_repo.add_message(
            session_id=session_id,
            role="assistant",
            content=f"✅ Added ₹{created.amount:,.0f} for {created.description} ({action_data['category_name']})! ☕"
        )
        if self.session:
            await self.session.commit()

        return ActionConfirmResponse(
            success=True,
            message=f"Added ₹{created.amount:,.0f} successfully",
            expense_id=created.id
        )
