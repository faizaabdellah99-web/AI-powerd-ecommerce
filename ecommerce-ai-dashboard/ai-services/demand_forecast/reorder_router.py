from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import numpy as np

router = APIRouter()

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    order_date: str   # "2024-01-15"

class ReorderRequest(BaseModel):
    customer_id: str
    order_history: List[OrderItem]

class ReorderSuggestion(BaseModel):
    product_id: str
    product_name: str
    suggested_reorder_date: str
    confidence: float
    avg_days_between_orders: float

class ReorderResponse(BaseModel):
    customer_id: str
    suggestions: List[ReorderSuggestion]

@router.post("/reorder-prediction", response_model=ReorderResponse)
async def reorder_prediction(req: ReorderRequest):
    try:
        from collections import defaultdict

        # Group orders by product
        product_orders = defaultdict(list)
        for item in req.order_history:
            product_orders[item.product_id].append({
                "name": item.product_name,
                "date": datetime.strptime(item.order_date, "%Y-%m-%d"),
                "qty": item.quantity,
            })

        suggestions = []
        today = datetime.now()

        for product_id, orders in product_orders.items():
            if len(orders) < 2:
                continue   # Need at least 2 orders to predict

            orders_sorted = sorted(orders, key=lambda x: x["date"])
            dates = [o["date"] for o in orders_sorted]

            # Calculate average interval between purchases
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = float(np.mean(intervals))
            std_interval  = float(np.std(intervals)) if len(intervals) > 1 else avg_interval * 0.3

            # Predict next order date from last purchase
            last_order_date = dates[-1]
            next_date = last_order_date + timedelta(days=avg_interval)

            # Confidence based on consistency of interval
            confidence = max(0.4, min(0.95, 1 - (std_interval / (avg_interval + 1)) * 0.5))

            # Only suggest if reorder date is soon (within 30 days) or already past
            days_until_reorder = (next_date - today).days
            if days_until_reorder <= 30:
                suggestions.append(ReorderSuggestion(
                    product_id=product_id,
                    product_name=orders_sorted[-1]["name"],
                    suggested_reorder_date=str(next_date.date()),
                    confidence=round(confidence, 2),
                    avg_days_between_orders=round(avg_interval, 1),
                ))

        # Sort by most urgent
        suggestions.sort(key=lambda x: x.suggested_reorder_date)

        return ReorderResponse(customer_id=req.customer_id, suggestions=suggestions)

    except Exception as e:
        raise HTTPException(500, str(e))
