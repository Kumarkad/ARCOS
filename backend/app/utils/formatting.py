def format_inr(amount: float) -> str:
    s = str(int(amount))
    if len(s) <= 3:
        return s
    res = s[-3:]
    s = s[:-3]
    while len(s) > 2:
        res = s[-2:] + "," + res
        s = s[:-2]
    res = s + "," + res
    return res

def format_currency(amount: float, currency: str = "INR") -> str:
    if currency.upper() == "INR":
        return f"₹{format_inr(amount)}"
    return f"{currency} {amount:,.2f}"
