from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.investment import (
    InvestmentAccount, InvestmentAsset, InvestmentHolding,
    InvestmentTransaction, WatchlistItem, IPOPrompt
)

DEFAULT_IPO_PROMPTS = [
    {
        "name": "Comprehensive Valuation & Business Quality",
        "content": (
            "You are an expert SEBI-registered financial analyst evaluating an upcoming Indian IPO. "
            "Provide a thorough analysis covering:\n"
            "1. Company Overview & Moat: What does the company do and what is its competitive advantage?\n"
            "2. Financial Health: Revenue growth, EBITDA margins, Debt-to-Equity, and ROE/ROCE.\n"
            "3. Valuation Benchmark: Compare its P/E and P/B against listed peers on NSE/BSE.\n"
            "4. Promoters & Governance: Promoter background and post-issue holding.\n"
            "5. Verdict: Clear recommendation (Subscribe for Long Term / Subscribe for Listing Gains / Avoid) with rationale."
        ),
        "is_default": True
    },
    {
        "name": "Listing Gains & GMP Assessment",
        "content": (
            "You are a short-term momentum trader evaluating listing gains potential for this IPO. "
            "Analyze:\n"
            "1. Gray Market Premium (GMP) trend and implied listing price.\n"
            "2. QIB and NII subscription interest.\n"
            "3. Issue size and retail quota dynamics.\n"
            "4. Risk of listing day discount vs upside target.\n"
            "5. Clear actionable call for listing gains flippers."
        ),
        "is_default": False
    },
    {
        "name": "Red Flags & Risk Audit",
        "content": (
            "You are a forensic auditor and risk specialist reviewing this IPO. "
            "Critically scrutinize:\n"
            "1. Offer for Sale (OFS) vs Fresh Issue ratio (are promoters/PE cashing out?).\n"
            "2. Outstanding litigations, regulatory disputes, or tax demands.\n"
            "3. Customer/supplier concentration risks (>30% dependency?).\n"
            "4. Key business threats and vulnerabilities.\n"
            "5. Red flag score (Low / Medium / High Risk)."
        ),
        "is_default": False
    }
]

class InvestmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # Accounts
    async def create_account(self, user_id: UUID, name: str, broker_name: str, account_type: str) -> InvestmentAccount:
        account = InvestmentAccount(
            user_id=user_id,
            name=name,
            broker_name=broker_name,
            account_type=account_type
        )
        self.session.add(account)
        await self.session.flush()
        return account

    async def list_accounts(self, user_id: UUID) -> List[InvestmentAccount]:
        query = select(InvestmentAccount).where(InvestmentAccount.user_id == user_id).order_by(InvestmentAccount.name.asc())
        res = await self.session.execute(query)
        return list(res.scalars().all())

    async def get_account(self, account_id: UUID, user_id: UUID) -> Optional[InvestmentAccount]:
        query = select(InvestmentAccount).where(
            and_(InvestmentAccount.id == account_id, InvestmentAccount.user_id == user_id)
        )
        res = await self.session.execute(query)
        return res.scalars().first()

    # Assets
    async def get_or_create_asset(
        self,
        symbol: str,
        name: str,
        asset_type: str = "STOCK",
        exchange: str = "NSE",
        current_price: Decimal = Decimal("0.00")
    ) -> InvestmentAsset:
        clean_sym = symbol.strip().upper()
        query = select(InvestmentAsset).where(InvestmentAsset.symbol == clean_sym)
        res = await self.session.execute(query)
        asset = res.scalars().first()
        if not asset:
            asset = InvestmentAsset(
                symbol=clean_sym,
                name=name or clean_sym,
                asset_type=asset_type,
                exchange=exchange,
                current_price=current_price
            )
            self.session.add(asset)
            await self.session.flush()
        return asset

    # Holdings
    async def get_holding(self, user_id: UUID, account_id: UUID, asset_id: UUID) -> Optional[InvestmentHolding]:
        query = select(InvestmentHolding).where(
            and_(
                InvestmentHolding.user_id == user_id,
                InvestmentHolding.account_id == account_id,
                InvestmentHolding.asset_id == asset_id
            )
        )
        res = await self.session.execute(query)
        return res.scalars().first()

    async def list_holdings(self, user_id: UUID) -> List[InvestmentHolding]:
        query = (
            select(InvestmentHolding)
            .where(
                and_(
                    InvestmentHolding.user_id == user_id,
                    InvestmentHolding.quantity > Decimal("0")
                )
            )
            .order_by(InvestmentHolding.total_invested.desc())
        )
        res = await self.session.execute(query)
        return list(res.scalars().all())

    async def get_holding_by_id(self, holding_id: UUID, user_id: UUID) -> Optional[InvestmentHolding]:
        query = select(InvestmentHolding).where(
            and_(InvestmentHolding.id == holding_id, InvestmentHolding.user_id == user_id)
        )
        res = await self.session.execute(query)
        return res.scalars().first()

    async def delete_holding(self, holding: InvestmentHolding) -> bool:
        await self.session.delete(holding)
        await self.session.flush()
        return True

    # Transactions
    async def create_transaction(self, tx: InvestmentTransaction) -> InvestmentTransaction:
        self.session.add(tx)
        await self.session.flush()
        return tx

    async def list_transactions(self, user_id: UUID, limit: int = 50) -> List[InvestmentTransaction]:
        query = (
            select(InvestmentTransaction)
            .where(InvestmentTransaction.user_id == user_id)
            .order_by(InvestmentTransaction.transaction_date.desc(), InvestmentTransaction.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(query)
        return list(res.scalars().all())

    # Watchlist
    async def add_to_watchlist(self, user_id: UUID, asset_id: UUID, target_price: Optional[Decimal] = None) -> WatchlistItem:
        query = select(WatchlistItem).where(
            and_(WatchlistItem.user_id == user_id, WatchlistItem.asset_id == asset_id)
        )
        res = await self.session.execute(query)
        item = res.scalars().first()
        if not item:
            item = WatchlistItem(user_id=user_id, asset_id=asset_id, target_price=target_price)
            self.session.add(item)
            await self.session.flush()
        return item

    async def list_watchlist(self, user_id: UUID) -> List[WatchlistItem]:
        query = select(WatchlistItem).where(WatchlistItem.user_id == user_id).order_by(WatchlistItem.created_at.desc())
        res = await self.session.execute(query)
        return list(res.scalars().all())

    async def remove_from_watchlist(self, user_id: UUID, item_id: UUID) -> bool:
        query = select(WatchlistItem).where(
            and_(WatchlistItem.id == item_id, WatchlistItem.user_id == user_id)
        )
        res = await self.session.execute(query)
        item = res.scalars().first()
        if item:
            await self.session.delete(item)
            await self.session.flush()
            return True
        return False

    # IPO Prompts (User Request: CRUD + Default System Prompts)
    async def seed_default_ipo_prompts(self, user_id: UUID) -> None:
        query = select(IPOPrompt).where(IPOPrompt.user_id == user_id)
        res = await self.session.execute(query)
        if not res.scalars().first():
            for idx, p in enumerate(DEFAULT_IPO_PROMPTS):
                prompt = IPOPrompt(
                    user_id=user_id,
                    name=p["name"],
                    prompt_content=p["content"],
                    is_default=p["is_default"],
                    sort_order=idx
                )
                self.session.add(prompt)
            await self.session.flush()

    async def list_ipo_prompts(self, user_id: UUID) -> List[IPOPrompt]:
        await self.seed_default_ipo_prompts(user_id)
        query = select(IPOPrompt).where(IPOPrompt.user_id == user_id).order_by(IPOPrompt.sort_order.asc())
        res = await self.session.execute(query)
        return list(res.scalars().all())

    async def get_ipo_prompt(self, prompt_id: UUID, user_id: UUID) -> Optional[IPOPrompt]:
        query = select(IPOPrompt).where(
            and_(IPOPrompt.id == prompt_id, IPOPrompt.user_id == user_id)
        )
        res = await self.session.execute(query)
        return res.scalars().first()

    async def create_ipo_prompt(self, user_id: UUID, name: str, prompt_content: str, is_default: bool = False) -> IPOPrompt:
        if is_default:
            # reset others
            prompts = await self.list_ipo_prompts(user_id)
            for p in prompts:
                p.is_default = False

        prompt = IPOPrompt(
            user_id=user_id,
            name=name,
            prompt_content=prompt_content,
            is_default=is_default
        )
        self.session.add(prompt)
        await self.session.flush()
        return prompt

    async def delete_ipo_prompt(self, prompt_id: UUID, user_id: UUID) -> bool:
        p = await self.get_ipo_prompt(prompt_id, user_id)
        if p:
            await self.session.delete(p)
            await self.session.flush()
            return True
        return False
