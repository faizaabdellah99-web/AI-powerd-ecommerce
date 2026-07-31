from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from demand_forecast.router import router as demand_router
from demand_forecast.reorder_router import router as reorder_router
from smart_pricing.router import router as pricing_router
from product_ai.router import router as product_ai_router
from visual_search.router import router as visual_search_router

app = FastAPI(
    title="E-Commerce AI Services",
    description="AI microservices: Demand Forecast, Smart Pricing, Product AI, Visual Search",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(demand_router,        prefix="/ai", tags=["Demand Forecast"])
app.include_router(reorder_router,       prefix="/ai", tags=["Reorder Prediction"])
app.include_router(pricing_router,       prefix="/ai", tags=["Smart Pricing"])
app.include_router(product_ai_router,    prefix="/ai", tags=["Product AI"])
app.include_router(visual_search_router, prefix="/ai", tags=["Visual Search"])

@app.get("/health")
def health():
    return {"status": "OK", "services": ["demand-forecast","reorder","smart-pricing","product-ai","visual-search"]}
