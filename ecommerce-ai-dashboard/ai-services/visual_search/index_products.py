"""
index_products.py — Populate the FAISS visual search index from MongoDB products.

This script:
1. Connects to MongoDB
2. Loads all active products
3. Uses CLIP text embeddings (product name + description + category) as image vectors
4. Stores the vectors in the product documents (imageVector field)
5. Adds them to the FAISS index in the running AI service

Usage:
  cd ai-services
  python -m visual_search.index_products
"""
import os
import sys
import numpy as np
from PIL import Image

# ── Load CLIP model ────────────────────────────────────────────────────────────
_model = None
_processor = None

def get_clip_model():
    global _model, _processor
    if _model is None:
        from transformers import CLIPProcessor, CLIPModel
        _model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    return _model, _processor

def embed_text(text: str) -> np.ndarray:
    """Embed a product's text description into a CLIP vector."""
    model, processor = get_clip_model()
    import torch
    inputs = processor(text=[text], return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        features = model.get_text_features(**inputs)
    vec = features.numpy()[0]
    return vec / np.linalg.norm(vec)

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    try:
        import pymongo
    except ImportError:
        print("❌ pymongo not installed. Run: pip install pymongo")
        sys.exit(1)

    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ecommerce_ai")
    print(f"🔌 Connecting to MongoDB: {mongo_uri}")
    client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    products_col = db.products

    # Load all active products
    products = list(products_col.find({"isActive": True}))
    print(f"📦 Found {len(products)} active products")

    if len(products) == 0:
        print("⚠️  No active products found. Run seedProducts.js first.")
        client.close()
        sys.exit(0)

    # Load CLIP model
    print("🧠 Loading CLIP model (first time may take a while)...")
    get_clip_model()
    print("✅ CLIP model loaded")

    # Embed each product
    indexed = 0
    for p in products:
        name = p.get("name", "")
        desc = p.get("description", "")
        category = p.get("category", "")
        tags = p.get("tags", [])
        tags_str = " ".join(tags) if tags else ""

        # Build a rich text description for embedding
        text = f"{name}. {category}. {desc} {tags_str}".strip()
        if not text:
            continue

        try:
            vec = embed_text(text)
            vector_list = vec.astype("float32").tolist()

            # Store in MongoDB
            products_col.update_one(
                {"_id": p["_id"]},
                {"$set": {"imageVector": vector_list}}
            )
            indexed += 1
            if indexed % 10 == 0 or indexed == len(products):
                print(f"  ⏳ Indexed {indexed}/{len(products)} products...")
        except Exception as e:
            print(f"  ⚠️  Failed to embed '{name}': {e}")

    print(f"\n✅ Successfully indexed {indexed} products with CLIP vectors")
    print("   Restart the AI service (uvicorn main:app) to load the index.")
    client.close()

if __name__ == "__main__":
    main()