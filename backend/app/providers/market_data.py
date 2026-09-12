import asyncio
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

class MarketDataProvider:
    def __init__(self):
        # In-memory quote cache: {symbol: (data, timestamp)}
        self._cache: Dict[str, tuple[Dict[str, Any], float]] = {}
        self._cache_ttl = 900  # 15 minutes in seconds

    async def get_quote(self, symbol: str, asset_type: str = "STOCK") -> Optional[Dict[str, Any]]:
        """
        Fetch quote for a Stock or Mutual Fund.
        Returns dict with:
        {
            "current_price": Decimal,
            "previous_close": Decimal,
            "day_change": Decimal,
            "day_change_pct": Decimal,
            "name": str,
            "last_updated": datetime
        }
        """
        now = time.time()
        if symbol in self._cache:
            cached_data, timestamp = self._cache[symbol]
            if now - timestamp < self._cache_ttl:
                return cached_data

        data: Optional[Dict[str, Any]] = None
        if asset_type == "MUTUAL_FUND" or symbol.isdigit():
            data = await self._fetch_mfapi(symbol)
        else:
            data = await self._fetch_yfinance(symbol)

        if data:
            self._cache[symbol] = (data, now)
        return data

    async def _fetch_yfinance(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch stock quote via yfinance in threadpool to keep async loop unblocked."""
        # Append .NS if pure Indian ticker without suffix
        clean_symbol = symbol.strip().upper()
        if not clean_symbol.endswith((".NS", ".BO", ".US", "=")) and not clean_symbol.startswith("^"):
            clean_symbol = f"{clean_symbol}.NS"

        def _sync_fetch():
            try:
                import yfinance as yf
                ticker = yf.Ticker(clean_symbol)
                fast = ticker.fast_info
                price = getattr(fast, "last_price", None)
                prev = getattr(fast, "previous_close", None)

                if price is None or price <= 0:
                    hist = ticker.history(period="2d")
                    if not hist.empty:
                        price = float(hist["Close"].iloc[-1])
                        prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price

                if price is not None:
                    price_dec = Decimal(str(round(price, 2)))
                    prev_dec = Decimal(str(round(prev, 2))) if prev else price_dec
                    change = price_dec - prev_dec
                    change_pct = Decimal(str(round(float(change / prev_dec * 100), 2))) if prev_dec > 0 else Decimal("0.00")
                    return {
                        "current_price": price_dec,
                        "previous_close": prev_dec,
                        "day_change": change,
                        "day_change_pct": change_pct,
                        "name": clean_symbol.replace(".NS", ""),
                        "last_updated": datetime.now(timezone.utc)
                    }
            except Exception:
                return None
            return None

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _sync_fetch)

    async def _fetch_mfapi(self, scheme_code: str) -> Optional[Dict[str, Any]]:
        """Fetch Mutual Fund NAV from official free AMFI endpoint mfapi.in."""
        url = f"https://api.mfapi.in/mf/{scheme_code}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    payload = resp.json()
                    meta = payload.get("meta", {})
                    data = payload.get("data", [])
                    if data:
                        nav = Decimal(str(data[0].get("nav", "0.0")))
                        prev_nav = Decimal(str(data[1].get("nav", str(nav)))) if len(data) > 1 else nav
                        change = nav - prev_nav
                        change_pct = Decimal(str(round(float(change / prev_nav * 100), 2))) if prev_nav > 0 else Decimal("0.00")

                        return {
                            "current_price": nav,
                            "previous_close": prev_nav,
                            "day_change": change,
                            "day_change_pct": change_pct,
                            "name": meta.get("scheme_name", scheme_code),
                            "last_updated": datetime.now(timezone.utc)
                        }
        except Exception:
            return None
        return None
