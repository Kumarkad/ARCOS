from datetime import date, timedelta
from decimal import Decimal
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.analytics_repo import AnalyticsRepository
from app.repositories.budget_repo import BudgetRepository
from app.schemas.analytics import (
    SpendingAnalyticsResponse, PeriodTrend, MerchantSpend,
    PaymentMethodSpend, SpendingInsight
)

class AnalyticsService:
    def __init__(
        self,
        analytics_repo: AnalyticsRepository,
        budget_repo: BudgetRepository,
        session: AsyncSession = None
    ):
        self.analytics_repo = analytics_repo
        self.budget_repo = budget_repo
        self.session = session

    async def get_analytics(self, user_id: UUID) -> SpendingAnalyticsResponse:
        today = date.today()
        # This month range
        first_of_this_month = today.replace(day=1)
        
        # Last month range
        last_month_end = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_month_end.replace(day=1)

        # 1. Monthly totals
        this_month_stats = await self.analytics_repo.get_total_spend_and_count(
            user_id, first_of_this_month, today
        )
        last_month_stats = await self.analytics_repo.get_total_spend_and_count(
            user_id, first_of_last_month, last_month_end
        )

        this_month_total = this_month_stats["total"]
        last_month_total = last_month_stats["total"]

        # Month-over-month % change
        mom_change = 0.0
        if last_month_total > Decimal("0.00"):
            mom_change = round(float((this_month_total - last_month_total) / last_month_total * 100), 1)

        # 2. Daily and weekly averages over past 30 days
        past_30_days_start = today - timedelta(days=30)
        past_30_stats = await self.analytics_repo.get_total_spend_and_count(
            user_id, past_30_days_start, today
        )
        daily_avg = Decimal(str(round(float(past_30_stats["total"] / 30), 2)))
        weekly_avg = Decimal(str(round(float(daily_avg * 7), 2)))
        monthly_avg = Decimal(str(round(float(daily_avg * 30), 2)))

        # 3. Monthly Trends (Past 6 months)
        monthly_trends: List[PeriodTrend] = []
        cur = first_of_this_month
        for _ in range(6):
            # start and end of that month
            if cur.month == 12:
                next_month = cur.replace(year=cur.year + 1, month=1, day=1)
            else:
                next_month = cur.replace(month=cur.month + 1, day=1)
            m_end = next_month - timedelta(days=1)
            # If current month, cap at today
            m_cap = min(today, m_end) if cur == first_of_this_month else m_end

            m_stats = await self.analytics_repo.get_total_spend_and_count(user_id, cur, m_cap)
            monthly_trends.append(
                PeriodTrend(
                    period=cur.strftime("%b %Y"),
                    total_amount=m_stats["total"],
                    expense_count=m_stats["count"]
                )
            )

            # Move to previous month
            prev_m_end = cur - timedelta(days=1)
            cur = prev_m_end.replace(day=1)

        monthly_trends.reverse()

        # 4. Top Merchants (past 90 days)
        merchants_data = await self.analytics_repo.get_top_merchants(
            user_id, today - timedelta(days=90), today, limit=5
        )
        top_merchants = [
            MerchantSpend(
                merchant=m["merchant"],
                total_amount=m["total_amount"],
                count=m["count"]
            )
            for m in merchants_data
        ]

        # 5. Payment Methods (this month)
        pm_data = await self.analytics_repo.get_payment_methods(
            user_id, first_of_this_month, today
        )
        payment_methods = [
            PaymentMethodSpend(
                payment_method=p["payment_method"],
                total_amount=p["total_amount"],
                percentage=p["percentage"]
            )
            for p in pm_data
        ]

        # 6. Smart Personalized Insights
        insights: List[SpendingInsight] = []

        # Check for Month-over-month increase
        if mom_change > 20.0:
            insights.append(
                SpendingInsight(
                    type="warning",
                    title="Spending Increase Alert",
                    message=f"📈 Your monthly spending is {mom_change}% higher than this time last month.",
                    icon="trending-up"
                )
            )
        elif mom_change < -15.0 and last_month_total > Decimal("0.00"):
            insights.append(
                SpendingInsight(
                    type="milestone",
                    title="Great Savings Pace!",
                    message=f"🎉 You have spent {abs(mom_change)}% less than last month so far.",
                    icon="trophy-outline"
                )
            )

        # Check Active Budgets for Warnings
        active_budgets = await self.budget_repo.list_user_budgets(user_id, active_only=True)
        for b in active_budgets:
            b_spent = await self.budget_repo.get_total_spent_for_period(user_id, b.start_date, b.end_date)
            pct = float(b_spent / b.total_amount * 100) if b.total_amount > 0 else 0.0
            if pct >= 100.0:
                insights.append(
                    SpendingInsight(
                        type="warning",
                        title=f"Budget Exceeded: {b.name}",
                        message=f"🚨 You have exceeded your '{b.name}' budget limit of ₹{b.total_amount:,.0f}!",
                        icon="alert-circle"
                    )
                )
            elif pct >= 80.0:
                insights.append(
                    SpendingInsight(
                        type="warning",
                        title=f"Budget Caution: {b.name}",
                        message=f"⚠️ You have used {round(pct, 1)}% of your '{b.name}' budget.",
                        icon="warning-outline"
                    )
                )

        # Daily Average Insight
        if daily_avg > Decimal("0.00"):
            insights.append(
                SpendingInsight(
                    type="tip",
                    title="Daily Spending Baseline",
                    message=f"💡 Your average daily spending over the last 30 days is ₹{daily_avg:,.0f}.",
                    icon="information-circle-outline"
                )
            )

        return SpendingAnalyticsResponse(
            daily_average=daily_avg,
            weekly_average=weekly_avg,
            monthly_average=monthly_avg,
            this_month_total=this_month_total,
            last_month_total=last_month_total,
            month_over_month_change_pct=mom_change,
            monthly_trends=monthly_trends,
            top_merchants=top_merchants,
            payment_methods=payment_methods,
            insights=insights
        )
