from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.analytics_repo import AnalyticsRepository
from app.repositories.budget_repo import BudgetRepository
from app.schemas.analytics import (
    SpendingAnalyticsResponse, PeriodTrend, MerchantSpend,
    PaymentMethodSpend, SpendingInsight, CategoryBreakdownItem, DailyTrendItem
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

    async def get_analytics(
        self,
        user_id: UUID,
        period: str = "1m",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> SpendingAnalyticsResponse:
        today = date.today()

        # Date range resolution
        if period == "1m":
            filter_start = today - timedelta(days=30)
            filter_end = today
        elif period == "6m":
            filter_start = today - timedelta(days=180)
            filter_end = today
        elif period == "custom" and start_date and end_date:
            filter_start = min(start_date, end_date)
            filter_end = max(start_date, end_date)
        else:
            filter_start = today - timedelta(days=30)
            filter_end = today

        period_days = max((filter_end - filter_start).days, 1)

        # 1. Period totals (total spend and count in this range)
        period_stats = await self.analytics_repo.get_total_spend_and_count(
            user_id, filter_start, filter_end
        )
        period_total = period_stats["total"]
        period_count = period_stats["count"]

        # Comparison period (previous period of identical duration)
        prev_period_end = filter_start - timedelta(days=1)
        prev_period_start = prev_period_end - timedelta(days=period_days)
        prev_period_stats = await self.analytics_repo.get_total_spend_and_count(
            user_id, prev_period_start, prev_period_end
        )
        prev_period_total = prev_period_stats["total"]

        # Period-over-period % change
        pop_change = 0.0
        if prev_period_total > Decimal("0.00"):
            pop_change = round(float((period_total - prev_period_total) / prev_period_total * 100), 1)

        # 2. Daily, weekly, and monthly averages based on selected period
        daily_avg = Decimal(str(round(float(period_total / period_days), 2)))
        weekly_avg = Decimal(str(round(float(daily_avg * 7), 2)))
        monthly_avg = Decimal(str(round(float(daily_avg * 30), 2)))

        # 3. Monthly Trends
        monthly_trends: List[PeriodTrend] = []
        first_of_this_month = today.replace(day=1)
        months_count = 6 if period in ("1m", "6m") else max(min(period_days // 30, 12), 1)
        cur = first_of_this_month
        for _ in range(months_count):
            if cur.month == 12:
                next_month = cur.replace(year=cur.year + 1, month=1, day=1)
            else:
                next_month = cur.replace(month=cur.month + 1, day=1)
            m_end = next_month - timedelta(days=1)
            m_cap = min(today, m_end) if cur == first_of_this_month else m_end

            m_stats = await self.analytics_repo.get_total_spend_and_count(user_id, cur, m_cap)
            monthly_trends.append(
                PeriodTrend(
                    period=cur.strftime("%b %Y"),
                    total_amount=m_stats["total"],
                    expense_count=m_stats["count"]
                )
            )

            prev_m_end = cur - timedelta(days=1)
            cur = prev_m_end.replace(day=1)

        monthly_trends.reverse()

        # 4. Top Merchants (in selected period)
        merchants_data = await self.analytics_repo.get_top_merchants(
            user_id, filter_start, filter_end, limit=5
        )
        top_merchants = [
            MerchantSpend(
                merchant=m["merchant"],
                total_amount=m["total_amount"],
                count=m["count"]
            )
            for m in merchants_data
        ]

        # 5. Payment Methods (in selected period)
        pm_data = await self.analytics_repo.get_payment_methods(
            user_id, filter_start, filter_end
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

        if pop_change > 20.0:
            insights.append(
                SpendingInsight(
                    type="warning",
                    title="Spending Increase Alert",
                    message=f"Spending in this period is {pop_change}% higher than the previous period.",
                    icon="trending-up"
                )
            )
        elif pop_change < -15.0 and prev_period_total > Decimal("0.00"):
            insights.append(
                SpendingInsight(
                    type="milestone",
                    title="Great Savings Pace!",
                    message=f"You spent {abs(pop_change)}% less than the previous period.",
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
                        message=f"You have exceeded your '{b.name}' budget limit of ₹{b.total_amount:,.0f}!",
                        icon="alert-circle"
                    )
                )
            elif pct >= 80.0:
                insights.append(
                    SpendingInsight(
                        type="warning",
                        title=f"Budget Caution: {b.name}",
                        message=f"You have used {round(pct, 1)}% of your '{b.name}' budget.",
                        icon="warning-outline"
                    )
                )

        # Daily Average Insight
        if daily_avg > Decimal("0.00"):
            amt = f"₹{daily_avg:.2f}" if daily_avg < Decimal("1.00") else f"₹{daily_avg:,.0f}"
            insights.append(
                SpendingInsight(
                    type="tip",
                    title="Daily Spending Baseline",
                    message=f"Your average daily spending in this period is {amt} ({period_days} days).",
                    icon="bulb-outline"
                )
            )

        # Category Breakdown for Pie Chart
        cat_data = await self.analytics_repo.get_category_spending(user_id, filter_start, filter_end)
        total_cat_spend = sum((c["total_amount"] for c in cat_data), Decimal("0.00"))
        category_breakdown = [
            CategoryBreakdownItem(
                category_name=c["category_name"],
                total_amount=c["total_amount"],
                percentage=round(float(c["total_amount"] / total_cat_spend * 100), 1) if total_cat_spend > 0 else 0.0,
                color=c["color"],
                icon=c["icon"]
            )
            for c in cat_data
        ]

        # Daily Spending Trend for Graph
        daily_data = await self.analytics_repo.get_daily_spending(user_id, filter_start, filter_end)
        daily_trends = [
            DailyTrendItem(
                date=d["expense_date"].isoformat(),
                day_label=d["expense_date"].strftime("%d %b"),
                total_amount=d["total_amount"]
            )
            for d in daily_data
        ]

        return SpendingAnalyticsResponse(
            daily_average=daily_avg,
            weekly_average=weekly_avg,
            monthly_average=monthly_avg,
            this_month_total=period_total,
            last_month_total=prev_period_total,
            month_over_month_change_pct=pop_change,
            monthly_trends=monthly_trends,
            top_merchants=top_merchants,
            payment_methods=payment_methods,
            insights=insights,
            category_breakdown=category_breakdown,
            daily_trends=daily_trends,
            period=period,
            start_date=filter_start.isoformat(),
            end_date=filter_end.isoformat(),
            period_total=period_total,
            period_days=period_days,
            period_transaction_count=period_count
        )
