import { useState } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SmartPricingPage() {
  const [form, setForm] = useState({
    product_id: 'prod_001', current_price: 79.99, cost_price: 35.00,
    category: 'Electronics', stock_level: 45, demand_trend: 'increasing',
    avg_rating: 4.2, days_in_stock: 20,
    competitor_prices: [
      { competitor_name: 'Competitor A', price: 85.00 },
      { competitor_name: 'Competitor B', price: 74.99 },
    ],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const runPricing = async () => {
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
        const minMargin  = form.cost_price * 1.15;

        let multiplier = 1.0;
        let reasons    = [];

        // Demand trend
        if (form.demand_trend === 'increasing')  { multiplier += 0.07; reasons.push('demand is increasing (+7%)'); }
        if (form.demand_trend === 'decreasing')  { multiplier -= 0.08; reasons.push('demand is decreasing (-8%)'); }

        // Stock level
        if (form.stock_level > 100) { multiplier -= 0.05; reasons.push('high stock level (-5%)'); }
        if (form.stock_level < 20)  { multiplier += 0.05; reasons.push('low stock (+5%)'); }

        // Rating
        if (form.avg_rating >= 4.5) { multiplier += 0.05; reasons.push(`high rating ${form.avg_rating}/5 (+5%)`); }
        if (form.avg_rating < 3.5)  { multiplier -= 0.05; reasons.push(`low rating ${form.avg_rating}/5 (-5%)`); }

        // Days in stock
        if (form.days_in_stock > 60) { multiplier -= 0.07; reasons.push('slow moving stock (-7%)'); }

        // Competitor pricing
        if (avgComp > 0 && form.current_price > avgComp * 1.15) {
          multiplier -= 0.05; reasons.push('priced above competitor average (-5%)');
        }
        if (avgComp > 0 && form.current_price < avgComp * 0.85) {
          multiplier += 0.05; reasons.push('priced below competitor average (+5%)');
        }

        let suggested = Math.max(form.current_price * multiplier, minMargin);
        suggested     = Math.round(suggested * 100) / 100;
        const changePct = +(((suggested - form.current_price) / form.current_price) * 100).toFixed(1);

        setResult({
          product_id:       form.product_id,
          current_price:    form.current_price,
          suggested_price:  suggested,
          min_price:        +minMargin.toFixed(2),
          max_price:        +(form.cost_price * 1.50).toFixed(2),
          price_change_pct: changePct,
          reasoning:        `Local analysis (quota exceeded): ${reasons.length ? reasons.join(', ') : 'no significant adjustments needed'}. Competitor avg: $${avgComp.toFixed(2)}.`,
          confidence:       0.72,
        });
        toast('Quota exceeded — showing local calculation', { icon: '⚡' });
      } else {
        toast.error(msg || 'Pricing analysis failed');
      }
    } finally { setLoading(false); }
  };

  const addCompetitor = () => setForm(p => ({ ...p, competitor_prices: [...p.competitor_prices, { competitor_name: '', price: 0 }] }));
  const updateComp = (i, k, v) => setForm(p => {
    const c = [...p.competitor_prices]; c[i] = { ...c[i], [k]: v }; return { ...p, competitor_prices: c };
  });

  const changeColor = result ? (result.price_change_pct > 0 ? '#10b981' : result.price_change_pct < 0 ? '#ef4444' : '#f59e0b') : '';

  return (
    <Layout title="💰 Smart Pricing" subtitle="AI-powered dynamic pricing based on demand, stock, and competitors">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input panel */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Product Details</div>
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
                  <input type={type} value={form[key]} step={type === 'number' ? 'any' : undefined}
                    onChange={e => set(key, type === 'number' ? +e.target.value : e.target.value)} />
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
            {form.competitor_prices.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                <input placeholder="Competitor name" value={c.competitor_name}
                  onChange={e => updateComp(i, 'competitor_name', e.target.value)} />
                <input type="number" placeholder="Price" value={c.price} step="any"
                  onChange={e => updateComp(i, 'price', +e.target.value)} />
              </div>
            ))}
          </Card>

          <Button onClick={runPricing} loading={loading} style={{ width: '100%', justifyContent: 'center' }} size="lg">
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
                Fill in product details and click "Analyze Pricing" to get AI-powered price recommendations.
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
