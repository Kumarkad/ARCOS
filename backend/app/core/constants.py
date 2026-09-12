from enum import Enum

DEFAULT_CATEGORIES = [
    {"name": "Food", "icon": "🍔", "color": "#FF6B6B"},
    {"name": "Groceries", "icon": "🛒", "color": "#4ECDC4"},
    {"name": "Travel", "icon": "✈️", "color": "#45B7D1"},
    {"name": "Fuel", "icon": "⛽", "color": "#FDCB6E"},
    {"name": "Shopping", "icon": "🛍️", "color": "#6C5CE7"},
    {"name": "Entertainment", "icon": "🎬", "color": "#E84393"},
    {"name": "Bills", "icon": "🧾", "color": "#00B894"},
    {"name": "Rent", "icon": "🏠", "color": "#0984E3"},
    {"name": "Utilities", "icon": "💡", "color": "#D63031"},
    {"name": "Healthcare", "icon": "⚕️", "color": "#FF7675"},
    {"name": "Education", "icon": "🎓", "color": "#A29BFE"},
    {"name": "Bike", "icon": "🏍️", "color": "#2D3436"},
    {"name": "Subscriptions", "icon": "🔁", "color": "#81ECEC"},
    {"name": "Investment", "icon": "📈", "color": "#55EFC4"},
    {"name": "Other", "icon": "📦", "color": "#B2BEC3"},
]

class PaymentMethod(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"
    WALLET = "WALLET"
    OTHER = "OTHER"

class ExpenseType(str, Enum):
    EXPENSE = "EXPENSE"
    INCOME = "INCOME"

class BudgetPeriod(str, Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
