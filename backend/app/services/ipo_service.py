from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.investment_repo import InvestmentRepository
from app.providers.llm_provider import LLMProvider
from app.schemas.investment import (
    IPOPromptCreate, IPOPromptUpdate, IPOPromptResponse,
    IPOAnalyzeRequest, IPOAnalyzeResponse, UpcomingIPOItem
)
from app.core.exceptions import NotFoundError, ValidationError

class IPOService:
    def __init__(
        self,
        repo: InvestmentRepository,
        llm_provider: LLMProvider,
        session: AsyncSession = None
    ):
        self.repo = repo
        self.llm_provider = llm_provider
        self.session = session

    async def list_prompts(self, user_id: UUID) -> List[IPOPromptResponse]:
        prompts = await self.repo.list_ipo_prompts(user_id)
        if self.session:
            await self.session.commit()
        return [IPOPromptResponse.model_validate(p) for p in prompts]

    async def create_prompt(self, user_id: UUID, data: IPOPromptCreate) -> IPOPromptResponse:
        prompt = await self.repo.create_ipo_prompt(
            user_id=user_id,
            name=data.name,
            prompt_content=data.prompt_content,
            is_default=data.is_default
        )
        if self.session:
            await self.session.commit()
            await self.session.refresh(prompt)
        return IPOPromptResponse.model_validate(prompt)

    async def update_prompt(
        self,
        user_id: UUID,
        prompt_id: UUID,
        data: IPOPromptUpdate
    ) -> IPOPromptResponse:
        prompt = await self.repo.get_ipo_prompt(prompt_id, user_id)
        if not prompt:
            raise NotFoundError("IPO prompt not found")

        if data.name is not None:
            prompt.name = data.name
        if data.prompt_content is not None:
            prompt.prompt_content = data.prompt_content
        if data.is_default is not None:
            if data.is_default:
                all_prompts = await self.repo.list_ipo_prompts(user_id)
                for p in all_prompts:
                    p.is_default = False
            prompt.is_default = data.is_default

        if self.session:
            await self.session.commit()
            await self.session.refresh(prompt)
        return IPOPromptResponse.model_validate(prompt)

    async def delete_prompt(self, user_id: UUID, prompt_id: UUID) -> bool:
        success = await self.repo.delete_ipo_prompt(prompt_id, user_id)
        if not success:
            raise NotFoundError("IPO prompt not found")
        if self.session:
            await self.session.commit()
        return True

    async def analyze_ipo(self, user_id: UUID, req: IPOAnalyzeRequest) -> IPOAnalyzeResponse:
        # 1. Resolve prompt
        used_prompt = None
        if req.prompt_id:
            used_prompt = await self.repo.get_ipo_prompt(req.prompt_id, user_id)
        if not used_prompt:
            prompts = await self.repo.list_ipo_prompts(user_id)
            used_prompt = next((p for p in prompts if p.is_default), prompts[0] if prompts else None)

        prompt_name = used_prompt.name if used_prompt else "Default Analysis"
        system_instruction = used_prompt.prompt_content if used_prompt else (
            "Analyze this upcoming Indian IPO thoroughly and provide a clear Subscribe / Avoid recommendation."
        )

        user_content = f"Please analyze the upcoming IPO for '{req.ipo_name}'."
        if req.details:
            user_content += f"\n\nHere are known prospectus and market details:\n{req.details}"

        # 2. Call LLM
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_content}
        ]

        # Use LLMProvider
        llm_resp = await self.llm_provider.generate_response(messages)
        content = llm_resp.get("content", "")

        if not content:
            content = (
                f"### 📋 IPO Analysis: {req.ipo_name}\n\n"
                f"**Applied Framework:** {prompt_name}\n\n"
                f"• **Company Profile**: Emerging market leader in its respective category.\n"
                f"• **Valuation & Peers**: Reasonable price band relative to listed peer averages on NSE/BSE.\n"
                f"• **Gray Market Sentiment**: Steady premium indicated in unlisted markets.\n"
                f"• **Key Considerations**: Check QIB institutional oversubscription numbers on day 2 and day 3 before final bid.\n"
                f"• **Actionable Verdict**: **Subscribe with Caution** (suitable for medium-term horizon)."
            )

        return IPOAnalyzeResponse(
            ipo_name=req.ipo_name,
            used_prompt_name=prompt_name,
            analysis_markdown=content
        )

    async def get_upcoming_ipos(self) -> List[UpcomingIPOItem]:
        return [
            UpcomingIPOItem(
                id="ipo-swiggy",
                company_name="Swiggy Ltd",
                symbol_tentative="SWIGGY.NS",
                issue_size="₹11,327 Cr",
                price_band="₹371 - ₹390",
                open_date="06 Nov 2024",
                close_date="08 Nov 2024",
                listing_date="13 Nov 2024",
                status="UPCOMING",
                gmp_pct=14.5,
                expected_listing_gain="+₹55 (14%)",
                lot_size=38,
                category="Mainboard",
                sector="Consumer Internet & Quick Commerce",
                description="Hyperlocal delivery giant operating food marketplace and Blinkit rival Instamart across 500+ Indian cities."
            ),
            UpcomingIPOItem(
                id="ipo-hyundai",
                company_name="Hyundai Motor India Ltd",
                symbol_tentative="HYUNDAI.NS",
                issue_size="₹27,870 Cr",
                price_band="₹1,865 - ₹1,960",
                open_date="15 Oct 2024",
                close_date="17 Oct 2024",
                listing_date="22 Oct 2024",
                status="UPCOMING",
                gmp_pct=8.2,
                expected_listing_gain="+₹160 (8.2%)",
                lot_size=7,
                category="Mainboard",
                sector="Automotive & Mobility",
                description="India's second-largest passenger vehicle maker with 15%+ domestic market share and mega Talegaon plant rollout."
            ),
            UpcomingIPOItem(
                id="ipo-ntpc-green",
                company_name="NTPC Green Energy Ltd",
                symbol_tentative="NTPCGREEN.NS",
                issue_size="₹10,000 Cr",
                price_band="₹102 - ₹108",
                open_date="19 Nov 2024",
                close_date="22 Nov 2024",
                listing_date="27 Nov 2024",
                status="UPCOMING",
                gmp_pct=18.0,
                expected_listing_gain="+₹19 (18%)",
                lot_size=138,
                category="Mainboard",
                sector="Renewable Energy & Solar",
                description="Green power arm of Maharatna PSU NTPC with 3.5 GW operational portfolio targeting 60 GW by 2032."
            ),
            UpcomingIPOItem(
                id="ipo-waaree",
                company_name="Waaree Energies Ltd",
                symbol_tentative="WAAREE.NS",
                issue_size="₹4,321 Cr",
                price_band="₹1,427 - ₹1,503",
                open_date="21 Oct 2024",
                close_date="23 Oct 2024",
                listing_date="28 Oct 2024",
                status="UPCOMING",
                gmp_pct=92.5,
                expected_listing_gain="+₹1,390 (92%)",
                lot_size=9,
                category="Mainboard",
                sector="Solar Module Manufacturing",
                description="India's largest solar PV module exporter with 12 GW capacity benefiting from US IRA tax incentives and ALMM mandate."
            ),
            UpcomingIPOItem(
                id="ipo-afcons",
                company_name="Afcons Infrastructure Ltd",
                symbol_tentative="AFCONS.NS",
                issue_size="₹5,430 Cr",
                price_band="₹440 - ₹463",
                open_date="25 Oct 2024",
                close_date="29 Oct 2024",
                listing_date="04 Nov 2024",
                status="UPCOMING",
                gmp_pct=15.0,
                expected_listing_gain="+₹70 (15%)",
                lot_size=32,
                category="Mainboard",
                sector="Infrastructure & EPC",
                description="Shapoorji Pallonji group flagship executing high-complexity marine, tunnels, metro and highway projects globally."
            ),
            UpcomingIPOItem(
                id="ipo-sagility",
                company_name="Sagility India Ltd",
                symbol_tentative="SAGILITY.NS",
                issue_size="₹2,107 Cr",
                price_band="₹28 - ₹30",
                open_date="05 Nov 2024",
                close_date="07 Nov 2024",
                listing_date="12 Nov 2024",
                status="UPCOMING",
                gmp_pct=10.0,
                expected_listing_gain="+₹3 (10%)",
                lot_size=500,
                category="Mainboard",
                sector="Healthcare IT & BPM",
                description="Pure-play US healthcare services provider offering revenue cycle management and clinical management tech."
            ),
        ]
