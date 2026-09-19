import re
import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import get_settings
from app.services.ai_tools import AI_TOOLS_SPEC, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

def _convert_spec_for_gemini(tools_spec: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert OpenAI tool spec to Gemini function declarations format."""
    declarations = []
    for t in tools_spec:
        fn = t.get("function", {})
        params = fn.get("parameters", {})
        props = {}
        for p_name, p_val in params.get("properties", {}).items():
            raw_type = str(p_val.get("type", "string")).upper()
            if raw_type in ["NUMBER", "FLOAT"]:
                gemini_type = "NUMBER"
            elif raw_type in ["INTEGER", "INT"]:
                gemini_type = "INTEGER"
            elif raw_type == "BOOLEAN":
                gemini_type = "BOOLEAN"
            elif raw_type == "ARRAY":
                gemini_type = "ARRAY"
            else:
                gemini_type = "STRING"

            prop_def: Dict[str, Any] = {
                "type": gemini_type,
                "description": p_val.get("description", "")
            }
            if "enum" in p_val:
                prop_def["enum"] = p_val["enum"]
            props[p_name] = prop_def

        declarations.append({
            "name": fn.get("name"),
            "description": fn.get("description"),
            "parameters": {
                "type": "OBJECT",
                "properties": props,
                "required": params.get("required", [])
            }
        })
    return [{"function_declarations": declarations}]

def _sanitize_messages_for_gemini(messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Ensure messages strictly alternate user <-> model turns and are non-empty."""
    cleaned: List[Dict[str, Any]] = []
    for m in messages:
        text = (m.get("content") or "").strip()
        if not text:
            continue
        role = "user" if m.get("role") in ["user", "system"] else "model"
        if cleaned and cleaned[-1]["role"] == role:
            cleaned[-1]["parts"][0]["text"] += f"\n{text}"
        else:
            cleaned.append({"role": role, "parts": [{"text": text}]})

    if not cleaned:
        cleaned.append({"role": "user", "parts": [{"text": "Hello"}]})
    elif cleaned[0]["role"] != "user":
        cleaned.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})

    if cleaned[-1]["role"] != "user":
        cleaned.append({"role": "user", "parts": [{"text": "Please assist me."}]})

    return cleaned

class LLMProvider:
    def __init__(self):
        self.settings = get_settings()

    async def generate_response(
        self,
        messages: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Sends conversation with chained failover:
        1. Groq (llama-3.3-70b / llama-3.1-8b)
        2. Gemini (gemini-2.0-flash / gemini-1.5-flash)
        3. Local intelligent heuristic rule engine
        """
        # 1. Try Groq if key is present
        groq_api_key = getattr(self.settings, "GROQ_API_KEY", None)
        if groq_api_key and groq_api_key.strip():
            try:
                res = await self._call_groq(messages, groq_api_key.strip())
                if res is not None:
                    return res
            except Exception as e:
                logger.error(f"[JARVIS] Groq request failed with exception: {e}", exc_info=True)

        # 2. Try Gemini if key is present
        gemini_api_key = getattr(self.settings, "GEMINI_API_KEY", None)
        if gemini_api_key and gemini_api_key.strip():
            try:
                res = await self._call_gemini(messages, gemini_api_key.strip())
                if res is not None:
                    return res
            except Exception as e:
                logger.error(f"[JARVIS] Gemini request failed with exception: {e}", exc_info=True)

        # 3. Intelligent local fallback heuristic parser
        logger.info("[JARVIS] Falling back to intelligent heuristic parser")
        return self._heuristic_fallback(messages)

    async def _call_groq(
        self,
        messages: List[Dict[str, str]],
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in messages:
            content = (m.get("content") or "").strip()
            if content:
                formatted_messages.append({"role": m["role"], "content": content})

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # Try 70B versatile, fallback to 8B instant if needed
        models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in models_to_try:
                payload = {
                    "model": model,
                    "messages": formatted_messages,
                    "tools": AI_TOOLS_SPEC,
                    "tool_choice": "auto",
                    "temperature": 0.2
                }
                try:
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

                        content_text = msg.get("content") or ""
                        if not content_text and tool_calls:
                            content_text = "Processing your request..."

                        logger.info(f"[JARVIS] Successfully responded via Groq ({model})")
                        return {
                            "content": content_text,
                            "tool_calls": tool_calls if tool_calls else None
                        }
                    else:
                        logger.warning(f"[JARVIS] Groq {model} returned HTTP {resp.status_code}: {resp.text}")
                except Exception as e:
                    logger.warning(f"[JARVIS] Groq {model} call failed: {e}")

        return None

    async def _call_gemini(
        self,
        messages: List[Dict[str, str]],
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        gemini_tools = _convert_spec_for_gemini(AI_TOOLS_SPEC)
        contents = _sanitize_messages_for_gemini(messages)

        models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash"]

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                payload = {
                    "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                    "contents": contents,
                    "tools": gemini_tools
                }
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            continue
                        candidate = candidates[0].get("content", {})
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

                        if not text_content and tool_calls:
                            text_content = "Processing your financial action..."

                        logger.info(f"[JARVIS] Successfully responded via Gemini ({model})")
                        return {
                            "content": text_content,
                            "tool_calls": tool_calls if tool_calls else None
                        }
                    else:
                        logger.warning(f"[JARVIS] Gemini {model} returned HTTP {resp.status_code}: {resp.text}")
                except Exception as e:
                    logger.warning(f"[JARVIS] Gemini {model} call failed: {e}")

        return None

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
            "content": "Greetings! I am JARVIS, your AI assistant for ARCOS — Your Personal Financial Intelligence System.\n\nYou can ask me things like:\n• 'I bought chai for 20'\n• 'Spent 1200 on petrol'\n• 'How much did I spend today?'\n• 'Am I on budget this month?'",
            "tool_calls": None
        }
