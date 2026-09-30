from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter()

class CompetitorPrice(BaseModel):
    competitor_name: str
    price: float

class SmartPricingRequest(BaseModel):
    product_id: str
    current_price: float
    cost_price: float
    category: str
    stock_level: int
    demand_trend: str = "stable"       # "increasing" | "decreasing" | "stable"
    competitor_prices: Optional[List[CompetitorPrice]] = []
    avg_rating: Optional[float] = 4.0
    days_in_stock: Optional[int] = 30

class SmartPricingResponse(BaseModel):
    product_id: str
    current_price: float
    suggested_price: float
    min_price: float
    max_price: float
    price_change_pct: float
    reasoning: str
    confidence: float

@router.post("/smart-pricing", response_model=SmartPricingResponse)
async def smart_pricing(req: SmartPricingRequest):
    try:
        base   = req.current_price
        cost   = req.cost_price
        margin = (base - cost) / base if base > 0 else 0.3

        # Competitor price signal
        comp_prices = [c.price for c in req.competitor_prices if c.price > 0] if req.competitor_prices else []
        comp_avg = np.mean(comp_prices) if comp_prices else base
        comp_high = max(comp_prices) if comp_prices else base

        # Safe Price Range:
        #   Min = Cost × 1.15  (or slightly above purchase price)
        #   Max = Competitor High × 1.20  (or above competitor prices)
        min_price = cost * 1.15
        max_price = max(comp_high * 1.20, min_price)

        # Suggested price = midpoint of the safe range
        suggested = (min_price + max_price) / 2

        change_pct = ((suggested - base) / base) * 100

        reasoning = (
            f"Safe price range: ${min_price:.2f} – ${max_price:.2f} "
            f"(min = cost × 1.15, max = competitor high × 1.20). "
            f"Suggested price is the midpoint of the safe range. "
            f"Competitor avg: ${comp_avg:.2f}, margin: {margin*100:.1f}%."
        )

        return SmartPricingResponse(
            product_id=req.product_id,
            current_price=base,
            suggested_price=round(suggested, 2),
            min_price=round(min_price, 2),
            max_price=round(max_price, 2),
            price_change_pct=round(change_pct, 1),
            reasoning=reasoning,
            confidence=round(min(0.95, 0.6 + len(req.competitor_prices) * 0.05), 2),
        )

    except Exception as e:
        raise HTTPException(500, str(e))
