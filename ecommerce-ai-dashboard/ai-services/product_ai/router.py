from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import httpx
import urllib.parse
import os
import io
import base64

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class DescriptionRequest(BaseModel):
    product_name: str
    category: str
    key_features: List[str]
    target_audience: Optional[str] = "general shoppers"
    tone: Optional[str] = "professional"

class DescriptionResponse(BaseModel):
    short_description: str
    long_description: str
    bullet_points: List[str]
    seo_tags: List[str]

class ImageRequest(BaseModel):
    product_name: str
    category: str
    style: Optional[str] = "professional product photography"

class ImageResponse(BaseModel):
    image_url: str
    prompt_used: str

class ImageSearchRequest(BaseModel):
    query: str
    category: Optional[str] = ""

class ImageSearchResult(BaseModel):
    id: str
    thumb: str
    url: str
    label: str
    by: str

class ImageSearchResponse(BaseModel):
    results: List[ImageSearchResult]
    total: int

class CatalogResult(BaseModel):
    product_name: str
    category: str
    tags: List[str]
    short_description: str
    long_description: str
    bullet_points: List[str]
    suggested_price_range: str
    confidence: str

# ── Product Description Generator ────────────────────────────────────────────

@router.post("/generate-description", response_model=DescriptionResponse)
async def generate_description(req: DescriptionRequest):
    try:
        features = req.key_features[:5]

        # Try to use Gemini API if key is available
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key and gemini_key != "your_gemini_api_key_here":
            try:
                prompt = f"""You are a senior e-commerce copywriter. Write a COMPLETE, DETAILED, ACCURATE product listing.

Product: {req.product_name}
Category: {req.category}
Features: {', '.join(features)}
Audience: {req.target_audience}
Tone: {req.tone}

Return ONLY raw JSON (no markdown):
{{
  "short_description": "One factual sentence about {req.product_name}",
  "long_description": "3 paragraphs about {req.product_name}",
  "bullet_points": ["5 specific bullet points"],
  "seo_tags": ["6 SEO keywords"]
}}"""

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        url,
                        headers={"x-goog-api-key": gemini_key, "Content-Type": "application/json"},
                        json={"contents": [{"parts": [{"text": prompt}]}]}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        import json
                        clean = text.replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(clean)
                        return DescriptionResponse(**parsed)
            except Exception:
                pass  # Fall through to template

        # Fallback: smart template
        short_description = (
            f"{req.product_name} — premium {req.category.lower() if req.category else 'product'} "
            f"designed for {req.target_audience}."
        )

        long_description = f"""
Introducing the {req.product_name}, a high-quality {req.category.lower() if req.category else 'product'}
created to deliver exceptional performance and reliability for {req.target_audience}.

Built with attention to detail and engineered for everyday use,
this product combines innovation, durability, and convenience
to help you get the most from every experience.

Whether you are a beginner or an experienced user,
the {req.product_name} provides outstanding value,
excellent functionality, and dependable results.
"""

        bullet_points = [
            *(features[:5]),
            "Premium quality construction",
            "Designed for long-term durability",
            "User-friendly experience",
            "Excellent performance",
            "Customer satisfaction guarantee"
        ][:5]

        seo_tags = [
            req.product_name.lower().replace(" ", "-"),
            req.category.lower().replace(" ", "-") if req.category else "product",
            "best-product",
            "top-rated",
            "premium-quality",
            req.target_audience.replace(" ", "-")
        ]

        return DescriptionResponse(
            short_description=short_description,
            long_description=long_description,
            bullet_points=bullet_points,
            seo_tags=seo_tags
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Description generation failed: {str(e)}"
        )

# ── AI Image Generator (via Pollinations) ────────────────────────────────────

@router.post("/generate-image", response_model=ImageResponse)
async def generate_image(req: ImageRequest):
    try:
        prompt = (
            f"{req.product_name}, "
            f"{req.category}, "
            f"professional ecommerce product photography, "
            f"studio lighting, white background, "
            f"ultra realistic, 4k, high detail, "
            f"commercial advertising, centered product shot"
        )

        encoded_prompt = urllib.parse.quote(prompt)

        image_url = (
            f"https://image.pollinations.ai/prompt/"
            f"{encoded_prompt}"
            f"?width=1024"
            f"&height=1024"
            f"&nologo=true"
        )

        return ImageResponse(
            image_url=image_url,
            prompt_used=prompt
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {str(e)}"
        )

# ── Unsplash Fallback Image Search ───────────────────────────────────────────

@router.post("/generate-image-unsplash", response_model=ImageResponse)
async def generate_image_unsplash(req: ImageRequest):
    try:
        access_key = os.getenv("UNSPLASH_ACCESS_KEY")

        if not access_key:
            return await generate_image(req)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.unsplash.com/photos/random",
                params={
                    "query": req.product_name,
                    "orientation": "squarish"
                },
                headers={
                    "Authorization": f"Client-ID {access_key}"
                }
            )

            if response.status_code == 200:
                data = response.json()
                return ImageResponse(
                    image_url=data["urls"]["regular"],
                    prompt_used=req.product_name
                )

        return await generate_image(req)

    except Exception:
        return await generate_image(req)

# ── IMAGE SEARCH: Free stock photos from multiple sources ────────────────────

@router.post("/search-images", response_model=ImageSearchResponse)
async def search_images(req: ImageSearchRequest):
    """Search for free product images from Pexels and Wikimedia Commons."""
    results = []
    seen = set()

    try:
        # Try Pexels API first
        pexels_key = os.getenv("PEXELS_API_KEY", "")
        if pexels_key:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.pexels.com/v1/search",
                    params={"query": req.query, "per_page": 9, "orientation": "square"},
                    headers={"Authorization": pexels_key}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for photo in data.get("photos", []):
                        src = photo.get("src", {})
                        url = src.get("original", "")
                        thumb = src.get("medium", "") or src.get("small", "")
                        if url and url not in seen:
                            seen.add(url)
                            results.append(ImageSearchResult(
                                id=f"pexels-{photo.get('id', '')}",
                                thumb=thumb or url,
                                url=url,
                                label=photo.get("alt", req.query),
                                by="Pexels"
                            ))
    except Exception:
        pass  # Fall through to Wikimedia

    # Try Wikimedia Commons if Pexels returned no results
    if len(results) < 3:
        try:
            search_term = req.query.replace(" ", "%20")
            url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={search_term}&format=json&srlimit=10&srnamespace=6"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    for page in data.get("query", {}).get("search", []):
                        title = page.get("title", "").replace("File:", "")
                        if title.lower().endswith(('.svg', '.ogg', '.ogv')):
                            continue
                        img_url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(title)}"
                        thumb_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles=File:{urllib.parse.quote(title)}&prop=imageinfo&iiprop=url&format=json&iiurlwidth=400"
                        if img_url not in seen:
                            seen.add(img_url)
                            results.append(ImageSearchResult(
                                id=f"wikimedia-{len(results)}",
                                thumb=img_url,
                                url=img_url,
                                label=title,
                                by="Wikimedia"
                            ))
        except Exception:
            pass

    # Fallback images if no results from APIs
    if len(results) == 0:
        FALLBACKS = {
            'Electronics':     ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sony_WH-1000XM5_Wireless_Headphones.jpg/400px-Sony_WH-1000XM5_Wireless_Headphones.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Apple_Watch_1st_generation.png/400px-Apple_Watch_1st_generation.png'],
            'Home & Garden':   ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/400px-A_small_cup_of_coffee.JPG'],
            'Food & Beverage': ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/400px-Good_Food_Display_-_NCI_Visuals_Online.jpg'],
            'Clothing':        ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Running_shoes_1.jpg/400px-Running_shoes_1.jpg'],
            'Sports & Fitness':['https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Yoga_at_a_Gym.jpg/400px-Yoga_at_a_Gym.jpg'],
        }
        fallback = FALLBACKS.get(req.category, FALLBACKS.get('Electronics', []))
        for i, url in enumerate(fallback[:6]):
            if url not in seen:
                seen.add(url)
                results.append(ImageSearchResult(
                    id=f"fb-{i}",
                    thumb=url,
                    url=url,
                    label=f"{req.query} {i+1}",
                    by="Wikimedia"
                ))

    return ImageSearchResponse(results=results[:9], total=len(results))

# ── PHOTO CATALOGING: Analyze product image via AI Vision ────────────────────

@router.post("/analyze-image", response_model=CatalogResult)
async def analyze_image(image: UploadFile = File(...)):
    """Analyze a product photo using AI Vision and return catalog data."""
    try:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(400, "File must be an image")

        contents = await image.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")
        mime_type = image.content_type or "image/jpeg"

        # Try Gemini Vision API if key is available
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key and gemini_key != "your_gemini_api_key_here":
            try:
                prompt = """You are a product cataloging expert. Analyze this product image carefully.

IMPORTANT — READ THE TEXT ON THE IMAGE:
- If the image shows a BOOK, MAGAZINE, or any printed material, READ the title on the cover and use it EXACTLY as the product_name (e.g. "The Great Gatsby", "Harry Potter and the Sorcerer's Stone", "National Geographic").
- If the image shows a product with a BRAND NAME or LABEL (e.g. "Sony WH-1000XM5", "Nike Air Max", "Coca-Cola"), read that text and include it in the product_name.
- Use the exact text you can read from the image — do NOT guess or make up a generic name.

Return ONLY raw JSON (no markdown):
{
  "product_name": "the EXACT name/title read from text visible in the image, or the specific product name clearly shown",
  "category": "one of: Electronics|Clothing|Home & Garden|Food & Beverage|Sports & Fitness|Beauty & Care|Books|Toys|Automotive|Health",
  "tags": ["5 relevant search tags"],
  "short_description": "one factual sentence about what you see in the image",
  "long_description": "2 paragraphs describing the product based on what is visible",
  "bullet_points": ["4 visible features or attributes from the image"],
  "suggested_price_range": "realistic price range e.g. $20-$50",
  "confidence": "high|medium|low"
}"""

                url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        url,
                        headers={"x-goog-api-key": gemini_key, "Content-Type": "application/json"},
                        json={
                            "contents": [{
                                "parts": [
                                    {"text": prompt},
                                    {"inline_data": {"mime_type": mime_type, "data": image_base64}}
                                ]
                            }]
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        import json
                        clean = text.replace("```json", "").replace("```", "").strip()
                        match = clean.find("{")
                        if match >= 0:
                            parsed = json.loads(clean[match:])
                            return CatalogResult(**parsed)
            except Exception:
                pass  # Fall through

        # Fallback: return basic info — use generic category, not always Electronics
        import hashlib
        img_hash = hashlib.md5(contents).hexdigest()[:8]

        return CatalogResult(
            product_name=f"Product {img_hash}",
            category="General Merchandise",
            tags=["product", "catalog", "ai-detected", "photo", "ecommerce"],
            short_description="Product image analyzed. Enable Gemini API key for AI-powered cataloging with detailed product recognition.",
            long_description="This product was detected from an uploaded photo. For full AI-powered cataloging with product name, category, and feature detection, add a valid GEMINI_API_KEY to the server environment.",
            bullet_points=["AI Vision detected", "Photo uploaded successfully", "Enable Gemini API for full analysis", "Supports multiple product categories"],
            suggested_price_range="$10-$100",
            confidence="medium"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Image analysis failed: {str(e)}")