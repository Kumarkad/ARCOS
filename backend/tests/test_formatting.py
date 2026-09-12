from app.utils.formatting import format_inr, format_currency

def test_format_inr():
    assert format_inr(500) == "500"
    assert format_inr(1500) == "1,500"
    assert format_inr(50000) == "50,000"
    assert format_inr(150000) == "1,50,000"
    assert format_inr(10000000) == "1,00,00,000"

def test_format_currency():
    assert format_currency(1500, "INR") == "₹1,500"
    assert format_currency(150000, "INR") == "₹1,50,000"
    assert format_currency(1500, "USD") == "USD 1,500.00"
