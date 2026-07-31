from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import io, os, numpy as np
from PIL import Image

router = APIRouter()

# Lazy-load heavy models only on first request
_model = None
_processor = None
_index = None
_product_ids = []

def get_clip_model():
    global _model, _processor
    if _model is None:
        from transformers import CLIPProcessor, CLIPModel
        _model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    return _model, _processor

def embed_image(pil_image) -> np.ndarray:
    model, processor = get_clip_model()
    import torch
    inputs = processor(images=pil_image, return_tensors="pt")
    with torch.no_grad():
        features = model.get_image_features(**inputs)
    vec = features.numpy()[0]
    return vec / np.linalg.norm(vec)

# ── Schemas ──────────────────────────────────────────────────────────────────
class VisualSearchResult(BaseModel):
    product_id: str
    similarity_score: float

class VisualSearchResponse(BaseModel):
    results: List[VisualSearchResult]
    total_found: int

# ── Index management (called by Node.js when products are added) ──────────────
class IndexUpdateRequest(BaseModel):
    product_id: str
    image_vector: List[float]

@router.post("/visual-search/index")
async def update_index(req: IndexUpdateRequest):
    """Add a product's image vector to the FAISS index."""
    global _index, _product_ids
    try:
        import faiss
        vec = np.array(req.image_vector, dtype="float32").reshape(1, -1)
        if _index is None:
            _index = faiss.IndexFlatIP(vec.shape[1])  # Inner product (cosine)
        _index.add(vec)
        _product_ids.append(req.product_id)
        return {"indexed": True, "total": len(_product_ids)}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── Visual Search ─────────────────────────────────────────────────────────────
@router.post("/visual-search", response_model=VisualSearchResponse)
async def visual_search(image: UploadFile = File(...), top_k: int = 6):
    global _index, _product_ids
    try:
        if _index is None or len(_product_ids) == 0:
            return VisualSearchResponse(results=[], total_found=0)

        # Read and embed uploaded image
        contents = await image.read()
        pil_img  = Image.open(io.BytesIO(contents)).convert("RGB")
        query_vec = embed_image(pil_img).reshape(1, -1).astype("float32")

        # Search FAISS
        scores, indices = _index.search(query_vec, min(top_k, len(_product_ids)))

        results = [
            VisualSearchResult(
                product_id=_product_ids[idx],
                similarity_score=round(float(score), 4)
            )
            for score, idx in zip(scores[0], indices[0])
            if idx >= 0
        ]

        return VisualSearchResponse(results=results, total_found=len(results))

    except Exception as e:
        raise HTTPException(500, str(e))
