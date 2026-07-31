from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()

# ── Request / Response schemas ───────────────────────────────────────────────
class SalesPoint(BaseModel):
    date: str        # "2024-01-15"
    quantity: float

class DemandForecastRequest(BaseModel):
    product_id: str
    sales_history: List[SalesPoint]
    forecast_days: int = 30

class ForecastPoint(BaseModel):
    date: str
    predicted_quantity: float
    lower_bound: float
    upper_bound: float

class DemandForecastResponse(BaseModel):
    product_id: str
    forecast: List[ForecastPoint]
    trend: str           # "increasing" | "decreasing" | "stable"
    recommendation: str

# ── Service ──────────────────────────────────────────────────────────────────
@router.post("/demand-forecast", response_model=DemandForecastResponse)
async def demand_forecast(req: DemandForecastRequest):
    try:
        if len(req.sales_history) < 7:
            raise HTTPException(400, "Need at least 7 days of sales history")

        # Build DataFrame
        df = pd.DataFrame([{"ds": s.date, "y": s.quantity} for s in req.sales_history])
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.sort_values("ds").reset_index(drop=True)

        # Try Prophet first, fallback to simple trend
        try:
            from prophet import Prophet
            model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
            model.fit(df)
            future = model.make_future_dataframe(periods=req.forecast_days)
            forecast_df = model.predict(future).tail(req.forecast_days)
            forecast = [
                ForecastPoint(
                    date=str(row["ds"].date()),
                    predicted_quantity=max(0, round(row["yhat"], 1)),
                    lower_bound=max(0, round(row["yhat_lower"], 1)),
                    upper_bound=max(0, round(row["yhat_upper"], 1)),
                )
                for _, row in forecast_df.iterrows()
            ]
        except ImportError:
            # Simple linear trend fallback
            x = np.arange(len(df))
            coeffs = np.polyfit(x, df["y"].values, 1)
            forecast = []
            for i in range(req.forecast_days):
                pred = max(0, coeffs[0] * (len(df) + i) + coeffs[1])
                forecast.append(ForecastPoint(
                    date=str((df["ds"].iloc[-1] + timedelta(days=i+1)).date()),
                    predicted_quantity=round(pred, 1),
                    lower_bound=round(pred * 0.8, 1),
                    upper_bound=round(pred * 1.2, 1),
                ))

        # Determine trend
        recent_avg = df["y"].tail(7).mean()
        earlier_avg = df["y"].head(7).mean()
        if recent_avg > earlier_avg * 1.1:
            trend = "increasing"
        elif recent_avg < earlier_avg * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"

        # Recommendation
        avg_forecast = np.mean([f.predicted_quantity for f in forecast])
        recommendation = (
            f"Stock up — demand is rising. Suggested reorder: {int(avg_forecast * req.forecast_days * 1.2)} units."
            if trend == "increasing" else
            f"Reduce stock orders. Average daily demand: {avg_forecast:.1f} units."
            if trend == "decreasing" else
            f"Maintain current stock levels. Avg daily demand: {avg_forecast:.1f} units."
        )

        return DemandForecastResponse(
            product_id=req.product_id,
            forecast=forecast,
            trend=trend,
            recommendation=recommendation,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
