import re
import json
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import get_settings
from app.services.ai_tools import AI_TOOLS_SPEC, SYSTEM_PROMPT

class LLMProvider:
    def __init__(self):
        self.settings = get_settings()

    async def generate_response(
        self,
        messages: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Sends conversation to the configured LLM provider (Groq or Gemini).
        Returns a dict with:
        {
            "content": str,
            "tool_calls": List[{"name": str, "arguments": dict}] | None
        }
        """
        # 1. Try Groq if GROQ_API_KEY is configured
        groq_api_key = getattr(self.settings, "GROQ_API_KEY", None)
        if groq_api_key:
            return await self._call_groq(messages, groq_api_key)

        # 2. Try Gemini if GEMINI_API_KEY is configured
        gemini_api_key = getattr(self.settings, "GEMINI_API_KEY", None)
        if gemini_api_key:
            return await self._call_gemini(messages, gemini_api_key)

        # 3. Intelligent fallback heuristic parser (for local testing/dev without keys)
        return self._heuristic_fallback(messages)

    async def _call_groq(
        self,
        messages: List[Dict[str, str]],
        api_key: str
    ) -> Dict[str, Any]:
        formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in messages:
            formatted_messages.append({"role": m["role"], "content": m["content"]})

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": formatted_messages,
            "tools": AI_TOOLS_SPEC,
            "tool_choice": "auto",
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                msg = data["choices"][0]["message"]
                tool_calls = []
                if "tool_calls" in msg and msg["tool_calls"]:
                    for tc in msg["tool_calls"]:
                        fn = tc.get("function", {})
                        try:
                            args = json.loads(fn.get("arguments", "{}"))
                        except Exception:
                            args = {}
                        tool_calls.append({"name": fn.get("name"), "arguments": args})

                return {
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls if tool_calls else None
                }

        return self._heuristic_fallback(messages)

    async def _call_gemini(
        self,
        messages: List[Dict[str, str]],
        api_key: str
    ) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})

        # Gemini tool declarations
        gemini_tools = [
            {
                "function_declarations": [t["function"] for t in AI_TOOLS_SPEC]
            }
        ]

        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": contents,
            "tools": gemini_tools
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidate = data["candidates"][0]["content"]
                text_content = ""
                tool_calls = []
                for part in candidate.get("parts", []):
                    if "text" in part:
                        text_content += part["text"]
                    if "functionCall" in part:
                        fn = part["functionCall"]
                        tool_calls.append({
                            "name": fn.get("name"),
                            "arguments": fn.get("args", {})
                        })

                return {
                    "content": text_content,
                    "tool_calls": tool_calls if tool_calls else None
                }

        return self._heuristic_fallback(messages)

    def _heuristic_fallback(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        High-accuracy local natural language processor for when no external API key is set.
        Handles expenses, queries, and budgets.
        """
        last_user_msg = ""
        for m in reversed(messages):
            if m["role"] == "user":
                last_user_msg = m["content"].strip()
                break

        msg_lower = last_user_msg.lower()

        # 1. Check queries
        if any(q in msg_lower for q in ["how much did i spend today", "spent today", "today spending", "today's spend"]):
            return {
                "content": "Let me check today's total spending for you.",
                "tool_calls": [{"name": "get_spending_summary", "arguments": {"period": "today"}}]
            }
        if any(q in msg_lower for q in ["how much did i spend this month", "month spend", "monthly spending", "spent this month"]):
            return {
                "content": "Let me calculate your monthly total spending.",
                "tool_calls": [{"name": "get_spending_summary", "arguments": {"period": "this_month"}}]
            }
        if any(q in msg_lower for q in ["budget", "am i on budget", "how much budget"]):
            return {
                "content": "Checking your budget status and limits.",
                "tool_calls": [{"name": "get_budget_status", "arguments": {}}]
            }
        if "afford" in msg_lower:
            nums = re.findall(r"\d+(?:\.\d+)?", msg_lower)
            amt = float(nums[0]) if nums else 1000.0
            return {
                "content": f"Analyzing if you can afford ₹{amt:,.0f}...",
                "tool_calls": [{"name": "can_i_afford", "arguments": {"amount": amt}}]
            }

        # 2. Check expense creation
        # Extract number
        nums = re.findall(r"\d+(?:\.\d+)?", msg_lower)
        if nums:
            amount = float(nums[-1] if len(nums) == 1 else nums[0])

            # Category inference
            category = "Other"
            description = "Expense"

            if any(w in msg_lower for w in ["chai", "coffee", "tea", "starbucks"]):
                category = "Food"
                description = "Chai" if "chai" in msg_lower else "Coffee"
            elif any(w in msg_lower for w in ["dinner", "lunch", "breakfast", "swiggy", "zomato", "restaurant", "food", "burger", "pizza"]):
                category = "Food"
                description = "Dinner" if "dinner" in msg_lower else ("Lunch" if "lunch" in msg_lower else "Food")
            elif any(w in msg_lower for w in ["petrol", "fuel", "diesel", "gas"]):
                category = "Fuel"
                description = "Petrol" if "petrol" in msg_lower else "Fuel"
            elif any(w in msg_lower for w in ["groceries", "grocery", "blinkit", "zepto", "supermarket", "milk"]):
                category = "Groceries"
                description = "Groceries"
            elif any(w in msg_lower for w in ["uber", "ola", "auto", "metro", "cab", "travel", "flight", "train"]):
                category = "Travel"
                description = "Uber" if "uber" in msg_lower else ("Cab" if "cab" in msg_lower else "Travel")
            elif any(w in msg_lower for w in ["amazon", "flipkart", "shopping", "clothes", "shirt"]):
                category = "Shopping"
                description = "Amazon" if "amazon" in msg_lower else "Shopping"
            elif any(w in msg_lower for w in ["bike", "helmet", "service", "motorcycle"]):
                category = "Bike"
                description = "Helmet" if "helmet" in msg_lower else "Bike Service"
            elif any(w in msg_lower for w in ["movie", "netflix", "cinema", "entertainment"]):
                category = "Entertainment"
                description = "Entertainment"
            else:
                # Default description from words
                cleaned = re.sub(r"\b(bought|spent|paid|for|on|i|just|using|upi|rs|inr|\d+)\b", "", msg_lower).strip()
                description = cleaned.title() if cleaned else "Expense"

            date_val = "yesterday" if "yesterday" in msg_lower else "today"
            pm = "UPI"
            if "cash" in msg_lower:
                pm = "CASH"
            elif "card" in msg_lower:
                pm = "CREDIT_CARD"

            return {
                "content": f"I can help log ₹{amount:,.0f} for {description}.",
                "tool_calls": [{
                    "name": "create_expense",
                    "arguments": {
                        "amount": amount,
                        "category": category,
                        "description": description,
                        "date": date_val,
                        "payment_method": pm
                    }
                }]
            }

        # Default conversational reply
        return {
            "content": "I'm your personal finance assistant! You can say things like:\n• 'I bought chai for 20'\n• 'Spent 1200 on petrol'\n• 'How much did I spend today?'\n• 'Am I on budget this month?'",
            "tool_calls": None
        }
