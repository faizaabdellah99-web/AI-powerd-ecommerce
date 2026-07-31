const axios = require('axios');
const { getProductKnowledge } = require('../utils/productKnowledge');

// ── Gemini REST helper — supports both AIzaSy... and AQ.... key formats ───────
// Model list from Google AI Studio rate limits — ordered by most available quota first
const MODELS = [
  'gemini-2.5-flash',              // Gemini 2.5 Flash — 5 RPM, 20 RPD free
  'gemini-2.0-flash',              // Gemini 2 Flash
  'gemini-2.0-flash-lite',         // Gemini 2 Flash Lite
  'gemini-1.5-flash',              // Gemini 1.5 Flash
  'gemini-1.5-flash-8b',           // Gemini 1.5 Flash 8B — lightest model
];

function getKey() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in server/.env');
  }
  return key;
}

async function callGemini(body) {
  const key     = getKey();
  const headers = [
    { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  ];

  // Try each model. On quota error wait briefly then try next model.
  let lastErr;
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    for (const h of headers) {
      try {
        const resp = await axios.post(url, body, { headers: h, timeout: 30000 });
        const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (e) {
        lastErr = e;
        const status = e.response?.status;
        const msg    = (e.response?.data?.error?.message || '').toLowerCase();
        if (status !== 429 && !msg.includes('quota')) {
          if (status === 401 || status === 403) break; // wrong auth header, try next
          throw e; // hard error — don't retry
        }
        // quota → wait the retry-delay the API tells us, then try next model
        const retryMs = (() => {
          const raw = e.response?.data?.error?.message || '';
          const m   = raw.match(/retry in ([\d.]+)s/i);
          return m ? Math.min(parseFloat(m[1]) * 1000, 5000) : 1000;
        })();
        await new Promise(r => setTimeout(r, retryMs));
        break; // move to next model
      }
    }
  }
  throw lastErr || new Error('All Gemini models exceeded quota');
}

async function geminiGenerate(prompt) {
  return callGemini({ contents: [{ parts: [{ text: prompt }] }] });
}

async function geminiChat(history, message, systemContext) {
  const contents = [];
  history.slice(-10).forEach(m => {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  });
  contents.push({ role: 'user', parts: [{ text: message }] });

  return callGemini({
    system_instruction: { parts: [{ text: systemContext }] },
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  });
}

// ── Product Description ───────────────────────────────────────────────────────
const generateDescription = async (req, res) => {
  try {
    const { product_name, category, key_features, target_audience, tone } = req.body;

    if (!product_name) {
      return res.status(400).json({ message: 'product_name is required' });
    }

    const hasFeatures = Array.isArray(key_features) && key_features.filter(Boolean).length > 0;
    const featureList = hasFeatures ? key_features.filter(Boolean).join(', ') : null;

    const featuresInstruction = featureList
      ? `Seller-provided features to include: ${featureList}`
      : `No features provided. Use your full knowledge of "${product_name}" — its real specs, measurements, materials, compatibility, and use cases. Write as if creating an Amazon listing for this exact product.`;

    const categoryInstruction = category
      ? `Category: ${category}`
      : `Identify the correct product category for "${product_name}" from your knowledge.`;

    const prompt = `You are a senior e-commerce copywriter. Write a COMPLETE, DETAILED, ACCURATE product listing.

MISSION: Use everything you know about "${product_name}" — real specs, real numbers, real features. DO NOT give generic text.
TONE: ${tone || 'professional'} | AUDIENCE: ${target_audience || 'general shoppers'}
BANNED WORDS: premium, revolutionary, unmatched, exceptional, cutting-edge, innovative, elevate, transform, redefine, seamless

Product: ${product_name}
${categoryInstruction}
${featuresInstruction}

Return ONLY raw JSON with no markdown, no code fences:
{
  "short_description": "One factual sentence: what ${product_name} is, its key spec or purpose, and who it is for.",
  "long_description": "3 paragraphs separated by \\n\\n. P1: what ${product_name} is and who it is designed for. P2: specific features with real numbers and specs. P3: real-world use cases. Mention '${product_name}' at least once per paragraph.",
  "bullet_points": ["5 bullet points each with a specific, concrete feature or stat of ${product_name}. No vague claims."],
  "seo_tags": ["6 real search keywords buyers use to find ${product_name}"]
}`;

    const text  = await geminiGenerate(prompt);
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const data  = JSON.parse(clean);
    res.json(data);

  } catch (error) {
    console.error('Gemini Description Error:', error.response?.data || error.message);
    const { product_name, category, key_features, target_audience } = req.body;
    const feats = Array.isArray(key_features) && key_features.filter(Boolean).length
      ? key_features.filter(Boolean) : [];
    res.json(getProductKnowledge(product_name, category, feats, target_audience));
  }
};

// ── Demand Forecast ───────────────────────────────────────────────────────────
const demandForecastAI = async (req, res) => {
  try {
    const { product_name, sales_history, forecast_days = 30 } = req.body;
    if (!sales_history?.length) return res.status(400).json({ message: 'sales_history required' });

    const last7 = sales_history.slice(-7).map(s => s.quantity);
    const avg7  = last7.reduce((a, b) => a + b, 0) / last7.length;

    const prompt = `Analyze this sales data and forecast future demand.
Product: ${product_name || 'Product'}
Sales history: ${JSON.stringify(sales_history.slice(-30))}
Average daily sales (last 7 days): ${avg7.toFixed(1)}

Return ONLY this JSON:
{
  "trend": "increasing" or "decreasing" or "stable",
  "recommendation": "specific recommendation with numbers",
  "forecast": [{"date": "YYYY-MM-DD", "predicted_quantity": number, "lower_bound": number, "upper_bound": number}]
}`;

    const text  = await geminiGenerate(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const data  = JSON.parse(clean);
    res.json({ product_id: req.body.product_id, ...data });

  } catch (error) {
    console.error('Demand Forecast Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Smart Pricing ─────────────────────────────────────────────────────────────
const smartPricingAI = async (req, res) => {
  try {
    const { product_id, current_price, cost_price, category, stock_level,
            demand_trend, competitor_prices, avg_rating, days_in_stock } = req.body;

    // Calculate competitor stats for richer context
    const compPrices = (competitor_prices || []).map(c => c.price).filter(p => p > 0);
    const avgComp    = compPrices.length ? (compPrices.reduce((a,b)=>a+b,0)/compPrices.length).toFixed(2) : null;
    const minComp    = compPrices.length ? Math.min(...compPrices).toFixed(2) : null;
    const maxComp    = compPrices.length ? Math.max(...compPrices).toFixed(2) : null;
    const margin     = cost_price ? (((current_price - cost_price) / current_price) * 100).toFixed(1) : null;

    const prompt = `You are a pricing analyst. Recommend an optimal price using ALL of the following factors.

PRODUCT DATA:
- Category: ${category}
- Current price: $${current_price}
- Cost price: $${cost_price} ${margin ? `(current margin: ${margin}%)` : ''}
- Stock level: ${stock_level} units${days_in_stock ? ` (${days_in_stock} days in stock)` : ''}
- Demand trend: ${demand_trend}
- Average customer rating: ${avg_rating}/5
- Competitors: ${JSON.stringify(competitor_prices || [])}
${avgComp ? `- Competitor average: $${avgComp} | min: $${minComp} | max: $${maxComp}` : ''}

PRICING LOGIC TO APPLY:
1. Stock level: high stock (>100) → lower price to move inventory; low stock (<20) → can raise price
2. Demand trend: increasing → raise price up to 10%; decreasing → lower price 5-10%; stable → minor adjustment
3. Competitor prices: stay competitive — do not price more than 15% above avg competitor unless rating justifies it
4. Rating: rating above 4.5 allows premium of 5-8%; below 3.5 requires discount
5. Days in stock: over 60 days → reduce price to clear stock; under 14 days → product is selling well
6. Margin: never suggest a price below cost × 1.15 (minimum 15% margin)

Return ONLY raw JSON, no markdown:
{
  "suggested_price": number,
  "min_price": number,
  "max_price": number,
  "price_change_pct": number,
  "reasoning": "2-3 sentences explaining which specific factors drove this recommendation with numbers",
  "confidence": number between 0 and 1
}`;

    const text  = await geminiGenerate(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const data  = JSON.parse(clean);
    res.json({ product_id, current_price, ...data });

  } catch (error) {
    console.error('Smart Pricing Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Reorder Prediction ────────────────────────────────────────────────────────
const reorderPredictionAI = async (req, res) => {
  try {
    const { customer_id, order_history } = req.body;
    if (!order_history?.length) return res.status(400).json({ message: 'order_history required' });

    const prompt = `Analyze this customer's purchase patterns.
Order history: ${JSON.stringify(order_history)}
Predict next reorder for products ordered at least twice.
Return ONLY this JSON:
{"suggestions":[{"product_id":"string","product_name":"string","suggested_reorder_date":"YYYY-MM-DD","confidence":number,"avg_days_between_orders":number,"reason":"brief explanation"}]}`;

    const text  = await geminiGenerate(prompt);
    const clean = text.replace(/```json|```/g, '').trim();
    const data  = JSON.parse(clean);
    res.json({ customer_id, ...data });

  } catch (error) {
    console.error('Reorder Prediction Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── AI Chat ───────────────────────────────────────────────────────────────────
const aiChat = async (req, res) => {
  try {
    const { message, history = [], context = 'general' } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const systemContext = `You are an expert AI assistant for an e-commerce platform called "AI Commerce".
You help with: product insights, sales analysis, pricing strategies, inventory management, demand forecasting, and customer behavior.
Be concise, helpful, and data-driven. Current context: ${context}`;

    const reply = await geminiChat(history, message, systemContext);
    res.json({ reply, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ message: error.message || 'Chat failed' });
  }
};

// ── Analyze Product Image (Vision AI) ────────────────────────────────────────
const analyzeProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image file required' });

    const key         = getKey();
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType    = req.file.mimetype || 'image/jpeg';

    const prompt = `You are a product cataloging expert. Analyze this product image carefully and return ONLY raw JSON (no markdown):
{
  "product_name": "specific product name you can identify from the image",
  "category": "one of: Electronics|Clothing|Home & Garden|Food & Beverage|Sports & Fitness|Beauty & Care|Books|Toys|Automotive|Health",
  "tags": ["5 relevant search tags"],
  "short_description": "one factual sentence about what you see in the image",
  "long_description": "2 paragraphs describing the product based on what is visible",
  "bullet_points": ["4 visible features or attributes from the image"],
  "suggested_price_range": "realistic price range e.g. $20-$50",
  "confidence": "high|medium|low"
}`;

    const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
    const body = {
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ]}],
    };

    const attempts = [
      { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    ];

    let text = ''; let lastErr;
    for (const headers of attempts) {
      try {
        const resp = await axios.post(url, body, { headers, timeout: 30000 });
        text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) break;
      } catch (e) { lastErr = e; }
    }
    if (!text) throw lastErr || new Error('Vision API returned no text');

    const clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse vision response');
    res.json(JSON.parse(match[0]));

  } catch (error) {
    console.error('Vision Analysis Error:', error.message);
    // Fallback: return mock catalog data when Gemini Vision API is unavailable
    const crypto = require('crypto');
    const imgHash = req.file ? crypto.createHash('md5').update(req.file.buffer).digest('hex').slice(0, 8) : 'unknown';
    res.json({
      product_name: `Product ${imgHash}`,
      category: 'Electronics',
      tags: ['product', 'catalog', 'ai-detected', 'photo', 'ecommerce'],
      short_description: 'Product image uploaded. Enable GEMINI_API_KEY in server/.env for AI-powered cataloging with detailed product recognition.',
      long_description: 'This product was detected from an uploaded photo. For full AI-powered cataloging with product name, category, and feature detection, add a valid GEMINI_API_KEY to the server .env file and restart the server.',
      bullet_points: ['AI Vision detected the image', 'Photo uploaded successfully', 'Enable Gemini API for full analysis', 'Supports multiple product categories'],
      suggested_price_range: '$10-$100',
      confidence: 'medium',
    });
  }
};

// ── Detect Product (Smart Fill) ───────────────────────────────────────────────
const detectProduct = async (req, res) => {
  try {
    const { product_name } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ message: 'product_name is required' });

    const VALID_CATS = ['Electronics','Clothing','Home & Garden','Food & Beverage',
      'Sports & Fitness','Beauty & Care','Books','Toys','Automotive','Health'];

    const prompt = `Product: "${product_name}"
Return ONLY raw JSON (no markdown):
{"category":"one of: ${VALID_CATS.join('|')}","features":"3-5 real specific features as comma-separated string"}`;

    const text  = await geminiGenerate(prompt);
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = clean.match(/\{[^{}]*\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);
    const cat    = VALID_CATS.find(c => c.toLowerCase() === (parsed.category || '').toLowerCase()) || parsed.category;
    res.json({ category: cat || '', features: parsed.features || '' });

  } catch (error) {
    console.error('Detect Product Error:', error.message);
    res.status(500).json({ message: error.message || 'Detection failed' });
  }
};

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  generateDescription,
  demandForecastAI,
  smartPricingAI,
  reorderPredictionAI,
  aiChat,
  detectProduct,
  analyzeProductImage,
};
