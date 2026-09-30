import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  product_id: '',
  current_price: '',
  cost_price: '',
  category: '',
  stock_level: '',
  demand_trend: 'stable',
  avg_rating: '',
  days_in_stock: '',
  competitor_prices: [],
};

export default function SmartPricingPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeUrls, setScrapeUrls] = useState([{ url: '', competitor_name: '' }]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Fetch products for the selector
  useEffect(() => {
    api.get('/products?limit=100&all=true')
      .then(({ data }) => {
        console.log('Products fetched:', data);
        setProducts(data.products || []);
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        setProducts([]);
      });
  }, []);

  const selectProduct = (id) => {
    // No product selected → reset form to empty
    if (!id) {
      setForm(EMPTY_FORM);
      setResult(null);
      return;
    }

    const p = products.find(x => x._id === id);
    if (!p) return;

    // Load ALL product data from MongoDB (including competitor prices)
    setForm({
      product_id:    p._id,
      current_price: p.price ?? '',
      cost_price:    p.cost_price ?? (p.price ? p.price * 0.6 : ''),
      category:      p.category || '',
      stock_level:   p.stock ?? '',
      demand_trend:  p.demand_trend || 'stable',
      avg_rating:    p.ratings?.average ?? '',
      days_in_stock: p.days_in_stock !== undefined && p.days_in_stock !== null ? p.days_in_stock : '',
      competitor_prices: (p.competitor_prices && p.competitor_prices.length > 0)
        ? p.competitor_prices.map(c => ({ ...c, price: c.price ? Math.round(c.price * 100) / 100 : 0 }))
        : [{ competitor_name: '', price: 0 }],
    });
    setResult(null);
  };

  const applySuggestedPrice = async () => {
    if (!result?.suggested_price) return;
    setApplying(true);
    try {
      const { data } = await api.put(`/products/${form.product_id}/apply-price`, {
        suggestedPrice: result.suggested_price,
      });
      setForm(p => ({ ...p, current_price: data.product?.price ?? result.suggested_price }));
      setResult(r => ({ ...r, current_price: data.product?.price ?? result.suggested_price }));
      toast.success(`Price updated to $${result.suggested_price} in MongoDB!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply price';
      toast.error(msg);
    } finally { setApplying(false); }
  };

  const runPricing = async () => {
    if (!form.product_id) {
      toast.error('Please select a product first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/ai/smart-pricing', form);
      setResult(data);
      toast.success('AI pricing analysis complete!');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429');

      if (isQuota || err.response?.status === 429 || err.response?.status === 500) {
        // Local smart calculation fallback when AI quota is exceeded
        const compPrices = form.competitor_prices.map(c => c.price).filter(p => p > 0);
        const avgComp    = compPrices.length ? compPrices.reduce((a,b)=>a+b,0)/compPrices.length : form.current_price;
        const compHigh   = compPrices.length ? Math.max(...compPrices) : form.current_price;

        // Safe Price Range:
        //   Min = Cost × 1.15  (or slightly above purchase price)
        //   Max = Competitor High × 1.20  (or above competitor prices)
        const minPrice = form.cost_price * 1.15;
        const maxPrice = Math.max(compHigh * 1.20, minPrice);

        // Suggested price = midpoint of the safe range
        const suggested = Math.round(((minPrice + maxPrice) / 2) * 100) / 100;
        const changePct = +(((suggested - form.current_price) / form.current_price) * 100).toFixed(1);

        // Calculate dynamic confidence based on data quality
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on competitor data quality
        if (compPrices.length >= 3) confidence += 0.15;
        else if (compPrices.length >= 2) confidence += 0.10;
        else if (compPrices.length >= 1) confidence += 0.05;
        
        // Increase confidence if we have cost price
        if (form.cost_price > 0) confidence += 0.15;
        
        // Increase confidence if we have rating data
        if (form.avg_rating > 0) confidence += 0.10;
        
        // Increase confidence if we have stock data
        if (form.stock_level > 0) confidence += 0.05;
        
        // Adjust based on price range reasonableness
        const priceRangeRatio = (maxPrice - minPrice) / minPrice;
        if (priceRangeRatio > 0.2 && priceRangeRatio < 1.0) confidence += 0.05;
        
        // Cap confidence at 0.95
        confidence = Math.min(confidence, 0.95);

        setResult({
          product_id:       form.product_id,
          current_price:    form.current_price,
          suggested_price:  suggested,
          min_price:        +minPrice.toFixed(2),
          max_price:        +maxPrice.toFixed(2),
          price_change_pct: changePct,
          reasoning:        `Market Analysis: Based on competitor average of $${avgComp.toFixed(2)} and your cost price of $${form.cost_price.toFixed(2)}, the optimal price range is $${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}. The suggested price of $${suggested.toFixed(2)} positions you competitively while maintaining healthy margins. Current price is ${changePct > 0 ? 'below' : changePct < 0 ? 'above' : 'at'} the market sweet spot.`,
          confidence:       confidence,
        });
        toast('Market analysis complete', { icon: '📊' });
      } else {
        toast.error(msg || 'Pricing analysis failed');
      }
    } finally { setLoading(false); }
  };

  const addCompetitor = () => setForm(p => ({ ...p, competitor_prices: [...p.competitor_prices, { competitor_name: '', price: 0 }] }));
  const updateComp = (i, k, v) => setForm(p => {
    const c = [...p.competitor_prices]; c[i] = { ...c[i], [k]: v }; return { ...p, competitor_prices: c };
  });

  // ── Web Scraping Functions ───────────────────────────────────────────────────
  const addScrapeUrl = () => setScrapeUrls(prev => [...prev, { url: '', competitor_name: '' }]);
  const updateScrapeUrl = (i, k, v) => setScrapeUrls(prev => {
    const updated = [...prev];
    updated[i] = { ...updated[i], [k]: v };
    return updated;
  });
  const removeScrapeUrl = (i) => setScrapeUrls(prev => prev.filter((_, idx) => idx !== i));

  const scrapeCompetitorPrices = async () => {
    if (!form.product_id) {
      toast.error('Please select a product first');
      return;
    }

    const validUrls = scrapeUrls.filter(u => u.url.trim() !== '');
    if (validUrls.length === 0) {
      toast.error('Please add at least one competitor URL');
      return;
    }

    setScraping(true);
    try {
      const { data } = await api.post('/competitor/scrape', {
        product_id: form.product_id,
        competitor_urls: validUrls
      });

      // Update form with scraped prices
      if (data.updated_competitor_prices && data.updated_competitor_prices.length > 0) {
        setForm(p => ({ 
          ...p, 
          competitor_prices: data.updated_competitor_prices.map(c => ({
            ...c,
            price: c.price ? Math.round(c.price * 100) / 100 : 0
          }))
        }));
        toast.success(`Successfully scraped ${data.scraped_prices.length} competitor prices!`);
      }

      if (data.errors && data.errors.length > 0) {
        const errorDetails = data.errors.map(e => `${e.competitor}: ${e.error}`).join('\n');
        toast.error(`Failed to scrape ${data.errors.length} URLs:\n${errorDetails}`, { duration: 8000 });
        console.error('Scraping errors:', data.errors);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to scrape competitor prices';
      toast.error(msg);
      console.error('Scraping error:', err);
    } finally {
      setScraping(false);
    }
  };

  const changeColor = result ? (result.price_change_pct > 0 ? '#10b981' : result.price_change_pct < 0 ? '#ef4444' : '#f59e0b') : '';

  return (
    <Layout title="💰 Smart Pricing" subtitle="AI-powered dynamic pricing based on demand, stock, and competitors">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input panel */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Product Details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                Select Product
              </label>
              <select
                value={form.product_id}
                onChange={e => selectProduct(e.target.value)}
                style={{ width: '100%' }}
                disabled={products.length === 0}
              >
                <option value="">— Select a product —</option>
                {products.length === 0 ? (
                  <option disabled>Loading products...</option>
                ) : (
                  products.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ${p.price} ({p.category})
                    </option>
                  ))
                )}
              </select>
              {products.length === 0 && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                  No products available. Please check your connection.
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Product ID', 'product_id', 'text'],
                ['Category', 'category', 'text'],
                ['Current Price ($)', 'current_price', 'number'],
                ['Cost Price ($)', 'cost_price', 'number'],
                ['Stock Level', 'stock_level', 'number'],
                ['Days in Stock', 'days_in_stock', 'number'],
                ['Avg Rating (1-5)', 'avg_rating', 'number'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={form[key] ?? ''} step={type === 'number' ? 'any' : undefined}
                    onChange={e => set(key, type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Demand Trend</label>
                <select value={form.demand_trend} onChange={e => set('demand_trend', e.target.value)}>
                  <option value="increasing">📈 Increasing</option>
                  <option value="stable">➡️ Stable</option>
                  <option value="decreasing">📉 Decreasing</option>
                </select>
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Competitor Prices</div>
              <Button variant="ghost" size="sm" onClick={addCompetitor}>+ Add</Button>
            </div>
            {form.competitor_prices.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>
                Select a product to load competitor prices from MongoDB, or add your own.
              </div>
            )}
            {form.competitor_prices.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                <input placeholder="Competitor name" value={c.competitor_name}
                  onChange={e => updateComp(i, 'competitor_name', e.target.value)} />
                <input type="number" placeholder="Price" value={c.price ? Math.round(c.price * 100) / 100 : ''} step="0.01"
                  onChange={e => updateComp(i, 'price', e.target.value === '' ? 0 : Math.round(+e.target.value * 100) / 100)} />
              </div>
            ))}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>🌐 Auto-Scrape Competitor Prices</div>
              <Button variant="ghost" size="sm" onClick={addScrapeUrl}>+ Add URL</Button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Automatically fetch competitor prices from their websites by entering product page URLs.
            </div>
            {scrapeUrls.map((u, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="Competitor name (optional)"
                  value={u.competitor_name}
                  onChange={e => updateScrapeUrl(i, 'competitor_name', e.target.value)}
                />
                <input
                  placeholder="Product page URL (https://...)"
                  value={u.url}
                  onChange={e => updateScrapeUrl(i, 'url', e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScrapeUrl(i)}
                  style={{ color: '#ef4444' }}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              onClick={scrapeCompetitorPrices}
              loading={scraping}
              disabled={!form.product_id || scrapeUrls.every(u => !u.url.trim())}
              variant="primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {scraping ? '🔄 Scraping...' : '🔍 Scrape Prices from URLs'}
            </Button>
          </Card>

          <Button onClick={runPricing} loading={loading} disabled={!form.product_id}
            style={{ width: '100%', justifyContent: 'center', opacity: form.product_id ? 1 : 0.5 }} size="lg">
            🤖 Analyze Pricing
          </Button>
        </div>

        {/* Result panel */}
        <div>
          {loading && <Spinner />}
          {!loading && !result && (
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
              <div style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center' }}>
                Select a product from MongoDB, then click "Analyze Pricing" to get AI-powered price recommendations.
              </div>
            </Card>
          )}

          {result && !loading && (
            <>
              {/* Price comparison */}
              <Card style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Current Price</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>${result.current_price}</div>
                  </div>
                  <div style={{ fontSize: 28 }}>→</div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Suggested Price</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: changeColor }}>${result.suggested_price}</div>
                    <div style={{ fontSize: 14, color: changeColor, fontWeight: 600 }}>
                      {result.price_change_pct > 0 ? '▲' : '▼'} {Math.abs(result.price_change_pct)}%
                    </div>
                  </div>
                </div>
                {/* Apply Suggested Price button */}
                <button
                  onClick={applySuggestedPrice}
                  disabled={applying}
                  style={{
                    marginTop: 16,
                    padding: '10px 24px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: applying ? 'wait' : 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                  }}
                  onMouseEnter={e => { if (!applying) e.target.style.background = '#059669'; }}
                  onMouseLeave={e => { if (!applying) e.target.style.background = '#10b981'; }}
                >
                  {applying ? '⏳ Applying...' : '✅ Apply Suggested Price'}
                </button>
              </Card>

              {/* Price range */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Safe Price Range</div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }} />
                  {/* range indicator */}
                  {(() => {
                    const range = result.max_price - result.min_price;
                    const sugPct = ((result.suggested_price - result.min_price) / range) * 100;
                    const curPct = ((result.current_price - result.min_price) / range) * 100;
                    return (
                      <>
                        <div style={{ position: 'absolute', top: 0, left: '0%', right: `${100 - 100}%`, height: 8, background: 'linear-gradient(90deg,#ef444444,#10b98144)', borderRadius: 4 }} />
                        <div style={{ position: 'absolute', top: -4, left: `${Math.min(Math.max(sugPct,0),100)}%`, width: 16, height: 16, borderRadius: '50%', background: changeColor, border: '2px solid var(--card)', transform: 'translateX(-50%)' }} />
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  <span>Min: ${result.min_price}</span>
                  <span>Max: ${result.max_price}</span>
                </div>
              </Card>

              {/* Confidence */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Model Confidence</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${result.confidence * 100}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 5 }} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', minWidth: 50 }}>
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </Card>

              {/* Reasoning */}
              <Card>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🤖 AI Reasoning</div>
                <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--bg3)', padding: 14, borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                  {result.reasoning}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}