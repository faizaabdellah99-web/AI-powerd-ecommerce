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
        comp_avg = np.mean([c.price for c in req.competitor_prices]) if req.competitor_prices else base

        # Demand adjustment
        demand_mult = {"increasing": 1.08, "decreasing": 0.93, "stable": 1.0}.get(req.demand_trend, 1.0)

        # Stock adjustment (low stock → slight raise)
        stock_mult = 1.05 if req.stock_level < 10 else (0.97 if req.stock_level > 100 else 1.0)

        # Rating adjustment
        rating_mult = 1.03 if req.avg_rating >= 4.5 else (0.97 if req.avg_rating < 3.5 else 1.0)

        # Blend signals: 40% competitor, 30% demand, 20% stock, 10% rating
        suggested = (
            comp_avg  * 0.40 +
            base * demand_mult * 0.30 +
            base * stock_mult  * 0.20 +
            base * rating_mult * 0.10
        )

        # Ensure minimum margin of 15%
        min_price = cost * 1.15
        suggested = max(suggested, min_price)

        # Cap at 40% above cost
        max_price = cost * 1.40
        suggested = min(suggested, max_price)

        change_pct = ((suggested - base) / base) * 100

        reasoning = (
            f"Raise price by {abs(change_pct):.1f}% — demand is growing and stock is limited."
            if change_pct > 2 else
            f"Lower price by {abs(change_pct):.1f}% — demand is soft; matching competitor average of ${comp_avg:.2f}."
            if change_pct < -2 else
            f"Current price is optimal. Competitor avg: ${comp_avg:.2f}, margin: {margin*100:.1f}%."
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
