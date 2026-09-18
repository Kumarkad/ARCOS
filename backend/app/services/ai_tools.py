from typing import List, Dict, Any

AI_TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "create_expense",
            "description": "Log or create a new expense for the user. Call this whenever the user mentions spending money, buying something, or paying for a service.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The amount spent in INR (numeric value only, e.g., 20, 250, 1200)."
                    },
                    "category": {
                        "type": "string",
                        "description": "The most appropriate category: Food, Groceries, Travel, Fuel, Shopping, Entertainment, Bills, Rent, Utilities, Healthcare, Education, Bike, Subscriptions, Investment, Other."
                    },
                    "description": {
                        "type": "string",
                        "description": "Short description of what was purchased (e.g. 'Chai', 'Dinner with friends', 'Petrol')."
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of the expense. Use 'today', 'yesterday', or 'YYYY-MM-DD'. Defaults to 'today'."
                    },
                    "payment_method": {
                        "type": "string",
                        "enum": ["UPI", "CASH", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING"],
                        "description": "Payment method used. Defaults to 'UPI' if not specified."
                    },
                    "merchant": {
                        "type": "string",
                        "description": "Merchant, vendor, or store name if mentioned (e.g. 'Starbucks', 'Uber', 'Amazon')."
                    }
                },
                "required": ["amount", "category", "description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_summary",
            "description": "Get how much money the user has spent today or this month. Use this to answer queries like 'How much did I spend today?' or 'Where did my money go this month?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["today", "this_month"],
                        "description": "The time period to check."
                    }
                },
                "required": ["period"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_status",
            "description": "Check current active budgets, spending limits, utilization percentage, and warnings. Use when user asks 'Am I on budget?', 'How much budget is left?', or 'Did I overspend?'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category name to check a specific budget limit."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "can_i_afford",
            "description": "Check if the user can afford a proposed purchase based on their remaining monthly budget and daily spending average.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The expense amount in INR the user is considering."
                    },
                    "description": {
                        "type": "string",
                        "description": "What the user wants to buy."
                    }
                },
                "required": ["amount"]
            }
        }
    }
]

SYSTEM_PROMPT = """You are JARVIS, the intelligent and sophisticated personal financial intelligence assistant for ARCOS ("Your Personal Financial Intelligence System").
You assist the user with tracking expenses, monitoring budgets, analyzing cash flows, investments, and providing proactive financial intelligence.

Rules & Guidelines:
1. Persona: Maintain a polite, sharp, and helpful persona (as JARVIS, the personal AI assistant). Address financial queries with confidence and precision.
2. Currency: Always use INR (₹) formatting.
3. Expense Actions: If the user mentions spending money (e.g., "I bought chai for 20", "spent 500 on groceries yesterday", "paid 1200 for fuel"), CALL the `create_expense` tool with the appropriate amount, category, and description.
4. Safety & Confirmation: For write actions (like creating an expense), prepare the action for explicit user confirmation.
5. Facts & Queries: For analytical questions (e.g. "How much did I spend today?", "Where am I spending most?", "Can I afford ₹5000?"), CALL the corresponding read tool (`get_spending_summary`, `get_budget_status`, or `can_i_afford`) to retrieve exact database facts. Never hallucinate financial data.
6. Tone: Keep responses concise, insightful, and structured. Distinguish tracking and budgeting calculations from formal registered financial/investment advice.
"""
