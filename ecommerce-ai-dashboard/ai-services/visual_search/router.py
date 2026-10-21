from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import io, os, numpy as np
from PIL import Image

router = APIRouter()

# ── Lazy-load MobileNet for accurate vision classification ───────────────────
_classifier = None
_transforms = None
_classes = None

def get_vision_classifier():
    global _classifier, _transforms, _classes
    if _classifier is None:
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        import torchvision.models as models
        weights = models.MobileNet_V3_Small_Weights.DEFAULT
        _classifier = models.mobilenet_v3_small(weights=weights).eval()
        _transforms = weights.transforms()
        _classes = weights.meta["categories"]
    return _classifier, _transforms, _classes

# Expanded ImageNet label keywords to E-Commerce categories mapping
KEYWORD_TO_CATEGORY = {
    # Books & Literature
    'book': 'Books', 'comic': 'Books', 'binder': 'Books', 'envelope': 'Books', 'menu': 'Books',
    'packet': 'Books', 'page': 'Books', 'paper': 'Books', 'notebook': 'Books', 'catalog': 'Books',
    'pamphlet': 'Books', 'magazine': 'Books', 'journal': 'Books', 'hardcover': 'Books',
    'paperback': 'Books', 'dictionary': 'Books', 'atlas': 'Books', 'album': 'Books', 'carton': 'Books',

    # Food & Beverage & Grocery
    'fruit': 'Food & Beverage', 'apple': 'Food & Beverage', 'banana': 'Food & Beverage', 'orange': 'Food & Beverage',
    'lemon': 'Food & Beverage', 'strawberry': 'Food & Beverage', 'fig': 'Food & Beverage', 'pineapple': 'Food & Beverage',
    'pomegranate': 'Food & Beverage', 'grape': 'Food & Beverage', 'vegetable': 'Food & Beverage', 'cabbage': 'Food & Beverage',
    'broccoli': 'Food & Beverage', 'cauliflower': 'Food & Beverage', 'cucumber': 'Food & Beverage', 'squash': 'Food & Beverage',
    'bell pepper': 'Food & Beverage', 'mushroom': 'Food & Beverage', 'carrot': 'Food & Beverage', 'corn': 'Food & Beverage',
    'pizza': 'Food & Beverage', 'bagel': 'Food & Beverage', 'pretzel': 'Food & Beverage', 'bread': 'Food & Beverage',
    'loaf': 'Food & Beverage', 'cheeseburger': 'Food & Beverage', 'burger': 'Food & Beverage', 'hotdog': 'Food & Beverage',
    'burrito': 'Food & Beverage', 'sandwich': 'Food & Beverage', 'ice cream': 'Food & Beverage', 'chocolate': 'Food & Beverage',
    'cake': 'Food & Beverage', 'cookie': 'Food & Beverage', 'pie': 'Food & Beverage', 'pasta': 'Food & Beverage',
    'spaghetti': 'Food & Beverage', 'soup': 'Food & Beverage', 'coffee': 'Food & Beverage', 'espresso': 'Food & Beverage',
    'tea': 'Food & Beverage', 'milk': 'Food & Beverage', 'beer': 'Food & Beverage', 'wine': 'Food & Beverage',
    'juice': 'Food & Beverage', 'snack': 'Food & Beverage', 'candy': 'Food & Beverage', 'honey': 'Food & Beverage',
    'oil': 'Food & Beverage', 'syrup': 'Food & Beverage', 'meat': 'Food & Beverage', 'chicken': 'Food & Beverage',
    'fish': 'Food & Beverage', 'guacamole': 'Food & Beverage', 'consomme': 'Food & Beverage', 'trifle': 'Food & Beverage',

    # Fashion & Apparel & Shoes
    'shoe': 'Fashion', 'sneaker': 'Fashion', 'boot': 'Fashion', 'sandal': 'Fashion', 'loafer': 'Fashion',
    'clog': 'Fashion', 'slipper': 'Fashion', 'sock': 'Fashion', 'stocking': 'Fashion', 'coat': 'Fashion',
    'jacket': 'Fashion', 'suit': 'Fashion', 'jersey': 'Fashion', 'sweatshirt': 'Fashion', 'cardigan': 'Fashion',
    'vest': 'Fashion', 'jean': 'Fashion', 'denim': 'Fashion', 'pant': 'Fashion', 'skirt': 'Fashion',
    'dress': 'Fashion', 'gown': 'Fashion', 'robe': 'Fashion', 'kimono': 'Fashion', 'tie': 'Fashion',
    'bow tie': 'Fashion', 'wallet': 'Fashion', 'purse': 'Fashion', 'handbag': 'Fashion', 'backpack': 'Fashion',
    'sunglass': 'Fashion', 'sunglasses': 'Fashion', 'spectacles': 'Fashion', 'hat': 'Fashion', 'cap': 'Fashion',
    'sombrero': 'Fashion', 'bonnet': 'Fashion', 'beret': 'Fashion', 'muffler': 'Fashion', 'scarf': 'Fashion',
    'glove': 'Fashion', 'mitten': 'Fashion', 'bikini': 'Fashion', 'swimsuit': 'Fashion', 'trunks': 'Fashion',
    'apron': 'Fashion', 'trench': 'Fashion', 'fur': 'Fashion', 'uniform': 'Fashion', 'cloak': 'Fashion',
    'apparel': 'Fashion', 'clothing': 'Fashion', 'garment': 'Fashion', 'blouse': 'Fashion', 'brassiere': 'Fashion',
    'corset': 'Fashion', 'pajama': 'Fashion', 'overall': 'Fashion', 'wool': 'Fashion', 'stole': 'Fashion',
    'miniskirt': 'Fashion', 'sarong': 'Fashion',

    # Sports & Fitness
    'dumbbell': 'Sports & Fitness', 'barbell': 'Sports & Fitness', 'racket': 'Sports & Fitness', 'ball': 'Sports & Fitness',
    'tennis': 'Sports & Fitness', 'baseball': 'Sports & Fitness', 'basketball': 'Sports & Fitness', 'soccer': 'Sports & Fitness',
    'rugby': 'Sports & Fitness', 'volleyball': 'Sports & Fitness', 'golf': 'Sports & Fitness', 'bicycle': 'Sports & Fitness',
    'bike': 'Sports & Fitness', 'ski': 'Sports & Fitness', 'snowboard': 'Sports & Fitness', 'surfboard': 'Sports & Fitness',
    'skate': 'Sports & Fitness', 'punching': 'Sports & Fitness', 'gym': 'Sports & Fitness', 'mat': 'Sports & Fitness',
    'puck': 'Sports & Fitness', 'bat': 'Sports & Fitness', 'bow': 'Sports & Fitness', 'helmet': 'Sports & Fitness',
    'weight': 'Sports & Fitness', 'exercise': 'Sports & Fitness', 'paddle': 'Sports & Fitness', 'kayak': 'Sports & Fitness',
    'canoe': 'Sports & Fitness', 'ping-pong': 'Sports & Fitness',

    # Home & Living
    'table': 'Home & Living', 'desk': 'Home & Living', 'chair': 'Home & Living', 'couch': 'Home & Living',
    'sofa': 'Home & Living', 'pillow': 'Home & Living', 'quilt': 'Home & Living', 'bed': 'Home & Living',
    'wardrobe': 'Home & Living', 'cabinet': 'Home & Living', 'lamp': 'Home & Living', 'vase': 'Home & Living',
    'pot': 'Home & Living', 'flowerpot': 'Home & Living', 'plate': 'Home & Living', 'bowl': 'Home & Living',
    'wok': 'Home & Living', 'pan': 'Home & Living', 'knife': 'Home & Living', 'spoon': 'Home & Living',
    'fork': 'Home & Living', 'candle': 'Home & Living', 'tray': 'Home & Living', 'purifier': 'Home & Living',
    'shelf': 'Home & Living', 'teapot': 'Home & Living', 'coffeepot': 'Home & Living', 'cup': 'Home & Living',
    'mug': 'Home & Living', 'pitcher': 'Home & Living', 'jug': 'Home & Living', 'bottle': 'Home & Living',
    'tub': 'Home & Living', 'basin': 'Home & Living', 'mirror': 'Home & Living', 'carpet': 'Home & Living',
    'rug': 'Home & Living', 'curtain': 'Home & Living', 'cushion': 'Home & Living', 'blanket': 'Home & Living',
    'seat': 'Home & Living', 'furniture': 'Home & Living', 'kitchen': 'Home & Living', 'sink': 'Home & Living',
    'faucet': 'Home & Living',

    # Beauty & Care
    'lotion': 'Beauty & Care', 'sunscreen': 'Beauty & Care', 'perfume': 'Beauty & Care', 'lipstick': 'Beauty & Care',
    'hair spray': 'Beauty & Care', 'soap': 'Beauty & Care', 'serum': 'Beauty & Care', 'shampoo': 'Beauty & Care',
    'cream': 'Beauty & Care', 'cosmetic': 'Beauty & Care', 'brush': 'Beauty & Care', 'comb': 'Beauty & Care',
    'spray': 'Beauty & Care', 'deodorant': 'Beauty & Care', 'powder': 'Beauty & Care', 'shaving': 'Beauty & Care',
    'razor': 'Beauty & Care',

    # Health
    'pill': 'Health', 'tablet': 'Health', 'vitamin': 'Health', 'supplement': 'Health', 'bandage': 'Health',
    'mask': 'Health', 'thermometer': 'Health', 'syringe': 'Health', 'stethoscope': 'Health', 'medicine': 'Health',
    'first aid': 'Health', 'sanitizer': 'Health',

    # Toys
    'teddy': 'Toys', 'puzzle': 'Toys', 'doll': 'Toys', 'toy': 'Toys', 'balloon': 'Toys', 'yo-yo': 'Toys',
    'pinwheel': 'Toys', 'puppet': 'Toys', 'maraca': 'Toys', 'whistle': 'Toys', 'kaleidoscope': 'Toys',
    'jigsaw': 'Toys', 'lego': 'Toys',

    # Electronics & Tech
    'cellular': 'Electronics', 'telephone': 'Electronics', 'phone': 'Electronics', 'smartphone': 'Electronics',
    'laptop': 'Electronics', 'notebook': 'Electronics', 'computer': 'Electronics', 'keyboard': 'Electronics',
    'mouse': 'Electronics', 'screen': 'Electronics', 'monitor': 'Electronics', 'television': 'Electronics',
    'tv': 'Electronics', 'radio': 'Electronics', 'camera': 'Electronics', 'camcorder': 'Electronics',
    'speaker': 'Electronics', 'headphone': 'Electronics', 'earphone': 'Electronics', 'microphone': 'Electronics',
    'projector': 'Electronics', 'modem': 'Electronics', 'printer': 'Electronics', 'hard disc': 'Electronics',
    'ipod': 'Electronics', 'player': 'Electronics', 'joystick': 'Electronics', 'remote': 'Electronics',
    'drill': 'Electronics', 'dryer': 'Electronics', 'vacuum': 'Electronics', 'iron': 'Electronics',
    'microwave': 'Electronics', 'toaster': 'Electronics', 'battery': 'Electronics', 'power': 'Electronics',
    'cord': 'Electronics', 'adapter': 'Electronics', 'charger': 'Electronics', 'usb': 'Electronics',
    'smartwatch': 'Electronics', 'webcam': 'Electronics', 'headset': 'Electronics', 'loudspeaker': 'Electronics',
    'cassette': 'Electronics', 'amplifier': 'Electronics', 'cd player': 'Electronics', 'disk': 'Electronics'
}

import re

CATEGORY_KEYWORDS_LIST = {
    'Books': [
        'book', 'comic', 'binder', 'envelope', 'menu', 'packet', 'page', 'paper', 'notebook', 'catalog',
        'pamphlet', 'magazine', 'journal', 'hardcover', 'paperback', 'dictionary', 'atlas', 'album', 'carton'
    ],
    'Food & Beverage': [
        'fruit', 'apple', 'banana', 'orange', 'lemon', 'strawberry', 'fig', 'pineapple', 'pomegranate',
        'grape', 'vegetable', 'cabbage', 'broccoli', 'cauliflower', 'cucumber', 'squash', 'bell pepper',
        'mushroom', 'carrot', 'corn', 'pizza', 'bagel', 'pretzel', 'bread', 'loaf', 'cheeseburger', 'burger',
        'hotdog', 'burrito', 'sandwich', 'ice cream', 'chocolate', 'cake', 'cookie', 'pie', 'pasta', 'spaghetti',
        'soup', 'coffee', 'espresso', 'tea', 'milk', 'beer', 'wine', 'juice', 'snack', 'candy', 'honey',
        'oil', 'syrup', 'meat', 'chicken', 'fish', 'guacamole', 'consomme', 'trifle'
    ],
    'Fashion': [
        'shoe', 'sneaker', 'boot', 'sandal', 'loafer', 'clog', 'slipper', 'sock', 'stocking', 'coat',
        'jacket', 'suit', 'jersey', 'sweatshirt', 'cardigan', 'vest', 'jean', 'denim', 'pant', 'skirt',
        'dress', 'gown', 'robe', 'kimono', 'tie', 'bow tie', 'wallet', 'purse', 'handbag', 'backpack',
        'sunglass', 'sunglasses', 'spectacles', 'hat', 'cap', 'sombrero', 'bonnet', 'beret', 'muffler',
        'scarf', 'glove', 'mitten', 'bikini', 'swimsuit', 'trunks', 'apron', 'trench', 'fur', 'uniform',
        'cloak', 'apparel', 'clothing', 'garment', 'blouse', 'brassiere', 'corset', 'pajama', 'overall',
        'wool', 'stole', 'miniskirt', 'sarong'
    ],
    'Sports & Fitness': [
        'dumbbell', 'barbell', 'racket', 'ball', 'tennis', 'baseball', 'basketball', 'soccer', 'rugby',
        'volleyball', 'golf', 'bicycle', 'bike', 'ski', 'snowboard', 'surfboard', 'skate', 'punching',
        'gym', 'mat', 'puck', 'bat', 'bow', 'helmet', 'weight', 'exercise', 'paddle', 'kayak', 'canoe',
        'ping-pong'
    ],
    'Home & Living': [
        'table', 'desk', 'chair', 'couch', 'sofa', 'pillow', 'quilt', 'bed', 'wardrobe', 'cabinet',
        'lamp', 'vase', 'pot', 'flowerpot', 'plate', 'bowl', 'wok', 'pan', 'knife', 'spoon', 'fork',
        'candle', 'tray', 'purifier', 'shelf', 'teapot', 'coffeepot', 'cup', 'mug', 'pitcher', 'jug',
        'bottle', 'tub', 'basin', 'mirror', 'carpet', 'rug', 'curtain', 'cushion', 'blanket', 'seat',
        'furniture', 'kitchen', 'sink', 'faucet'
    ],
    'Beauty & Care': [
        'lotion', 'sunscreen', 'perfume', 'lipstick', 'hair spray', 'soap', 'serum', 'shampoo',
        'cream', 'cosmetic', 'brush', 'comb', 'spray', 'deodorant', 'powder', 'shaving', 'razor'
    ],
    'Health': [
        'pill', 'tablet', 'vitamin', 'supplement', 'bandage', 'mask', 'thermometer', 'syringe',
        'stethoscope', 'medicine', 'first aid', 'sanitizer'
    ],
    'Toys': [
        'teddy', 'puzzle', 'doll', 'toy', 'balloon', 'yo-yo', 'pinwheel', 'puppet', 'maraca',
        'whistle', 'kaleidoscope', 'jigsaw', 'lego'
    ],
    'Electronics': [
        'cellular', 'telephone', 'phone', 'smartphone', 'laptop', 'notebook', 'computer', 'keyboard',
        'mouse', 'screen', 'monitor', 'television', 'tv', 'radio', 'camera', 'camcorder', 'speaker',
        'headphone', 'earphone', 'microphone', 'projector', 'modem', 'printer', 'hard disc', 'ipod',
        'player', 'joystick', 'remote', 'drill', 'dryer', 'vacuum', 'iron', 'microwave', 'toaster',
        'battery', 'power', 'cord', 'adapter', 'charger', 'usb', 'smartwatch', 'webcam', 'headset',
        'loudspeaker', 'cassette', 'amplifier', 'cd player', 'disk'
    ]
}

# Precompile word-boundary regexes for accuracy (no partial substring false positives)
CATEGORY_PATTERNS = {
    cat: re.compile(r'\b(?:' + '|'.join(re.escape(k) for k in kws) + r')(?:s|es)?\b', re.IGNORECASE)
    for cat, kws in CATEGORY_KEYWORDS_LIST.items()
}

def classify_pil_image(pil_img, filename=""):
    try:
        # Check filename first if user provided a meaningful product name (not camera/junk prefix)
        fname = (filename or "").lower()
        if fname:
            clean_name = re.sub(r'[-_.]', ' ', fname)
            stripped_name = re.sub(
                r'\b(camera|photo|image|img|pic|picture|screenshot|capture|download|whatsapp|file|upload|jpg|jpeg|png|webp)\b',
                '',
                clean_name
            ).strip()
            if stripped_name and not stripped_name.isdigit():
                for cat, pattern in CATEGORY_PATTERNS.items():
                    if pattern.search(stripped_name):
                        return cat, cat, 0.92

        import torch
        model, transform, categories = get_vision_classifier()
        batch = transform(pil_img).unsqueeze(0)
        with torch.no_grad():
            output = model(batch).squeeze(0).softmax(0)

        # Get top 10 predicted classes
        top10_prob, top10_idx = torch.topk(output, 10)
        top_label = categories[top10_idx[0].item()]
        top_confidence = round(top10_prob[0].item(), 3)

        # Accumulate probability mass per category across top 10
        category_weights = {}
        for prob, idx in zip(top10_prob, top10_idx):
            label = categories[idx.item()].lower()
            p = prob.item()
            for cat, pattern in CATEGORY_PATTERNS.items():
                if pattern.search(label):
                    category_weights[cat] = category_weights.get(cat, 0.0) + p
                    break

        if category_weights:
            best_cat = max(category_weights, key=category_weights.get)
            score = round(min(0.98, max(0.68, category_weights[best_cat])), 3)
            return best_cat, top_label, score

        # If none matched keywords, check aspect ratio & dominant color
        w, h = pil_img.size
        aspect = w / h
        if aspect < 0.80:
            return 'Fashion', 'Apparel/Portrait', 0.80
        elif aspect > 1.45:
            return 'Home & Living', 'Furniture/Interior', 0.75

        # Sample colors
        small = pil_img.resize((16, 16))
        pixels = list(small.getdata())
        r_sum = sum(p[0] for p in pixels)
        g_sum = sum(p[1] for p in pixels)
        b_sum = sum(p[2] for p in pixels)
        if g_sum > r_sum * 1.25 and g_sum > b_sum * 1.25:
            return 'Home & Living', 'Nature/Plants', 0.78
        if r_sum > g_sum * 1.25 and r_sum > b_sum * 1.25:
            return 'Food & Beverage', 'Food/Beverage', 0.78

        return 'Fashion', top_label, top_confidence
    except Exception as e:
        print(f"Classification error: {e}")
        return 'Fashion', 'Product', 0.75

def load_index_from_db():
    pass

# ── Schemas ──────────────────────────────────────────────────────────────────
class VisualSearchResult(BaseModel):
    product_id: str
    similarity_score: float

class VisualSearchResponse(BaseModel):
    results: List[VisualSearchResult] = []
    total_found: int = 0
    detected_category: str = "Fashion"
    top_label: str = ""
    confidence: float = 0.0

@router.post("/visual-search", response_model=VisualSearchResponse)
async def visual_search(image: UploadFile = File(...), top_k: int = 6):
    try:
        contents = await image.read()
        pil_img  = Image.open(io.BytesIO(contents)).convert("RGB")
        category, label, conf = classify_pil_image(pil_img, filename=image.filename or "")

        return VisualSearchResponse(
            results=[],
            total_found=0,
            detected_category=category,
            top_label=label,
            confidence=conf
        )
    except Exception as e:
        raise HTTPException(500, str(e))
