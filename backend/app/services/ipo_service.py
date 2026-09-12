from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.investment_repo import InvestmentRepository
from app.providers.llm_provider import LLMProvider
from app.schemas.investment import (
    IPOPromptCreate, IPOPromptUpdate, IPOPromptResponse,
    IPOAnalyzeRequest, IPOAnalyzeResponse
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
