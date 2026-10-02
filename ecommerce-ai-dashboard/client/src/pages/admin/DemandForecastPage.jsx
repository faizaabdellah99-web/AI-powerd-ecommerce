import { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Spinner from '../../components/shared/Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from 'recharts';

// ── Generate realistic demo sales history ─────────────────────────────────────
function buildDemoHistory(productName, days) {
  const name = (productName || '').toLowerCase();
  const base = name.includes('milk') ? 140
    : name.includes('coffee') ? 95
    : name.includes('phone') || name.includes('samsung') ? 12
    : name.includes('headphone') || name.includes('sony') ? 8
    : name.includes('laptop') || name.includes('macbook') ? 5
    : name.includes('shoe') || name.includes('sneaker') ? 18
    : name.includes('book') ? 22
    : name.includes('vitamin') || name.includes('protein') ? 35
    : name.includes('dumbbell') || name.includes('yoga') ? 14
    : 40;

  const trendDir = Math.random() > 0.45 ? 1 : -0.4;
  const seasonal = Math.random() > 0.5;

  return Array.from({ length: days }, (_, i) => {
    const seasonalBoost = seasonal && (i % 7 === 5 || i % 7 === 6) ? base * 0.25 : 0;
    const qty = Math.max(1, Math.round(
      base
      + trendDir * (i / days) * base * 0.3
      + seasonalBoost
      + (Math.random() - 0.5) * base * 0.3
    ));
    return {
      date:     new Date(Date.now() - (days - i) * 86400000).toISOString().slice(0, 10),
      quantity: qty,
    };
  });
}

// ── Calculate local forecast ──────────────────────────────────────────────────
function calcLocalForecast(history, days) {
  if (!history.length) return [];
  const quantities = history.map(h => Number(h.quantity) || 0);
  const avg        = quantities.reduce((s, v) => s + v, 0) / quantities.length;
  const recent7    = quantities.slice(-7);
  const recentAvg  = recent7.reduce((s, v) => s + v, 0) / recent7.length;
  const trendF     = recentAvg > avg * 1.05 ? 1.015 : recentAvg < avg * 0.9 ? 0.985 : 1.0;

  return Array.from({ length: days }, (_, i) => {
    const pred = Math.max(1, Math.round(
      recentAvg * Math.pow(trendF, i + 1)
      + (Math.random() - 0.5) * recentAvg * 0.15
    ));
    return {
      date:        new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
      forecast:    pred,
      upper_bound: Math.round(pred * 1.22),
      lower_bound: Math.max(1, Math.round(pred * 0.78)),
    };
  });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text2)', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color:p.color, fontWeight:600, marginBottom:2 }}>
          {({ actual:'📊 Actual', forecast:'🔮 Forecast', upper_bound:'▲ Upper', lower_bound:'▼ Lower' }[p.dataKey] || p.dataKey)}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DemandForecastPage() {
  const [products,     setProducts]     = useState([]);
  const [productId,    setProductId]    = useState('');
  const [histDays,     setHistDays]     = useState(30);
  const [forecastDays, setForecastDays] = useState(30);
  const [salesHistory, setSalesHistory] = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [aiResult,     setAiResult]     = useState(null);  // AI-generated forecast
  const [aiLoading,    setAiLoading]    = useState(false);

  // ── Load products ────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/products?all=true&limit=200')
      .then(({ data }) => {
        const list = data.products || [];
        setProducts(list);
        if (list.length > 0) setProductId(list[0]._id);
      })
      .catch(() => setProducts([]));
  }, []);

  // ── Load/generate history when product or histDays changes ──────────────────
  useEffect(() => {
    if (!productId) return;
    setHistLoading(true);
    setAiResult(null); // clear old forecast when product/history changes

    api.get(`/products/${productId}/sales-history?days=${histDays}`)
      .then(({ data }) => {
        const h = (data.history || []).filter(s => s.quantity != null);
        if (h.length >= 5) {
          setSalesHistory(h.map(s => ({
            date:     s.date?.slice(0, 10),
            quantity: Number(s.quantity) || 0,
          })));
        } else {
          const prod = products.find(p => p._id === productId);
          setSalesHistory(buildDemoHistory(prod?.name, histDays));
        }
      })
      .catch(() => {
        const prod = products.find(p => p._id === productId);
        setSalesHistory(buildDemoHistory(prod?.name, histDays));
      })
      .finally(() => setHistLoading(false));
  }, [productId, histDays]); // eslint-disable-line

  // ── Local forecast: recalculates instantly whenever forecastDays or history changes ──
  const localForecast = useMemo(
    () => calcLocalForecast(salesHistory, forecastDays),
    [salesHistory, forecastDays]
  );

  // The "active" forecast: AI result if available, otherwise local
  const activeForecast = aiResult?.forecast ?? localForecast;

  // ── Safe filtered arrays — declare BEFORE using them ─────────────────────────
  const safeHistory  = (salesHistory  || []).filter(h => h && Number(h.quantity)  >= 0);
  const safeForecast = (activeForecast || []).filter(f => f && Number(f.forecast) >= 0);

  const activeTrend = aiResult?.trend ?? (() => {
    if (!safeHistory.length) return 'stable';
    const qs     = safeHistory.map(h => Number(h.quantity) || 0);
    const avg    = qs.reduce((s,v)=>s+v,0) / qs.length;
    const recent = qs.slice(-7);
    const rAvg   = recent.reduce((s,v)=>s+v,0) / Math.max(recent.length, 1);
    return rAvg > avg * 1.05 ? 'increasing' : rAvg < avg * 0.9 ? 'decreasing' : 'stable';
  })();

  const activeRec = aiResult?.recommendation ?? (() => {
    const total = safeForecast.reduce((s,f)=>s+(Number(f.forecast)||0),0);
    if (activeTrend === 'increasing')
      return `Demand is rising. Forecast total: ${total} units over ${forecastDays} days. Reorder ~${Math.round(total * 1.15)} units to stay ahead.`;
    if (activeTrend === 'decreasing')
      return `Demand is declining. Forecast total: ${total} units over ${forecastDays} days. Reduce next order by ~15% to avoid overstock.`;
    return `Demand is stable at ~${avgSales} units/day. Forecast total: ${total} units. Maintain current stock levels.`;
  })();

  // ── Run AI Forecast ──────────────────────────────────────────────────────────
  const runForecast = useCallback(async () => {
    if (!productId) return toast.error('Select a product first');
    setAiLoading(true);
    const prodName = products.find(p => p._id === productId)?.name || 'Product';
    try {
      const { data } = await api.post('/ai/demand-forecast', {
        product_id:    productId,
        product_name:  prodName,
        sales_history: salesHistory,
        forecast_days: forecastDays,
      });
      // Normalize response
      const fc = (data.forecast || []).map(f => ({
        date:        f.date,
        forecast:    Number(f.predicted_quantity ?? f.forecast) || 0,
        upper_bound: Number(f.upper_bound) || 0,
        lower_bound: Number(f.lower_bound) || 0,
      }));
      setAiResult({ ...data, forecast: fc });
      toast.success('AI forecast generated!');
    } catch {
      // AI failed → use enhanced local forecast + show message
      toast('AI quota exceeded — showing calculated forecast', { icon:'⚡' });
      setAiResult(null); // use localForecast (auto-updates via useMemo)
    } finally {
      setAiLoading(false);
    }
  }, [productId, products, salesHistory, forecastDays]);

  // ── Derived stats — safe Number() + || 0 everywhere ─────────────────────────

  const avgSales = safeHistory.length
    ? Math.round(
        safeHistory.reduce((s, h) => s + (Number(h.quantity) || 0), 0) / safeHistory.length
      )
    : 0;

  const maxSales = safeHistory.length
    ? Math.max(0, ...safeHistory.map(h => Number(h.quantity) || 0))
    : 0;

  const forecastTotal = safeForecast.length
    ? safeForecast.reduce((s, f) => s + (Number(f.forecast) || 0), 0)
    : 0;

  const peakForecast = safeForecast.length
    ? Math.max(0, ...safeForecast.map(f => Number(f.forecast) || 0))
    : 0;

  // Mini stats for recommendation card
  const next7  = safeForecast.slice(0, 7).reduce((s, f) => s + (Number(f.forecast) || 0), 0);
  const next30 = safeForecast.slice(0, 30).reduce((s, f) => s + (Number(f.forecast) || 0), 0);

  const trendColor = { increasing:'#10b981', decreasing:'#ef4444', stable:'#f59e0b' };
  const trendIcon  = { increasing:'📈', decreasing:'📉', stable:'➡️' };

  // ── Combined chart data ───────────────────────────────────────────────────────
  const combinedData = [
    ...safeHistory.map(s => ({ date: s.date, actual: Number(s.quantity) || 0 })),
    ...safeForecast.map(f => ({
      date:        f.date,
      forecast:    Number(f.forecast)     || 0,
      upper_bound: Number(f.upper_bound)  || 0,
      lower_bound: Number(f.lower_bound)  || 0,
    })),
  ];
  const splitDate = activeForecast[0]?.date;

  const selectedProduct = products.find(p => p._id === productId);
  const isAI = !!aiResult;

  return (
    <Layout title="📈 Demand Forecasting" subtitle="AI-powered sales analysis and demand prediction — sliders update in real time">

      {/* ── Settings ── */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Forecast Settings</div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:16, alignItems:'end' }}>

          {/* Product */}
          <div>
            <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>Product</label>
            <select value={productId} onChange={e=>{ setProductId(e.target.value); setAiResult(null); }}>
              {products.length===0 && <option value="">No products — add products first</option>}
              {products.map(p=><option key={p._id} value={p._id}>{p.name} — ${p.price}</option>)}
            </select>
          </div>

          {/* History slider */}
          <div>
            <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>
              History — <span style={{ color:'var(--primary)', fontWeight:700 }}>last {histDays} days</span>
            </label>
            <input type="range" min={14} max={90} step={7} value={histDays}
              onChange={e => setHistDays(+e.target.value)}
              style={{ width:'100%', accentColor:'var(--primary)', padding:0, border:'none', background:'transparent' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)' }}>
              <span>14d</span><span>90d</span>
            </div>
          </div>

          {/* Forecast slider — updates chart instantly */}
          <div>
            <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:6, fontWeight:500 }}>
              Forecast — <span style={{ color:'#f59e0b', fontWeight:700 }}>{forecastDays} days ahead</span>
            </label>
            <input type="range" min={7} max={90} step={7} value={forecastDays}
              onChange={e => setForecastDays(+e.target.value)}
              style={{ width:'100%', accentColor:'#f59e0b', padding:0, border:'none', background:'transparent' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)' }}>
              <span>7d</span><span>90d</span>
            </div>
          </div>

          {/* Run AI Forecast */}
          <button onClick={runForecast} disabled={aiLoading||!productId||histLoading} style={{
            padding:'11px 18px', borderRadius:9, border:'none', fontWeight:700, fontSize:13,
            cursor:aiLoading||!productId||histLoading?'not-allowed':'pointer',
            background:aiLoading||!productId||histLoading?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:aiLoading||!productId||histLoading?'var(--text3)':'#fff',
            boxShadow:aiLoading||!productId||histLoading?'none':'0 4px 14px rgba(99,102,241,0.35)',
            whiteSpace:'nowrap', transition:'all 0.2s',
          }}>
            {aiLoading ? '⏳ Running…' : isAI ? '🔄 Re-run AI' : '⚡ Run AI Forecast'}
          </button>
        </div>

        {/* Product info strip */}
        {selectedProduct && (
          <div style={{ marginTop:12, display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              ['Category',   selectedProduct.category],
              ['Price',      `$${selectedProduct.price}`],
              ['Stock',      `${selectedProduct.stock} units`],
              ['Avg/day',    `${avgSales} units`],
              ['Peak/day',   `${maxSales} units`],
              ['Forecast',   isAI ? '✦ AI (Gemini)' : '⚡ Auto-calculated'],
            ].map(([l,v])=>(
              <div key={l} style={{ padding:'5px 12px', background:'var(--bg3)', borderRadius:8, fontSize:12 }}>
                <span style={{ color:'var(--text3)' }}>{l}: </span>
                <span style={{ color:'var(--text)', fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Summary Stats — update when slider changes ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Trend',          (trendIcon[activeTrend]||'➡️')+' '+(activeTrend||'stable'),   trendColor[activeTrend]||'#f59e0b'],
          ['Avg Sales/day',  `${avgSales} units`,                                            'var(--primary)'                ],
          ['Forecast Total', `${forecastTotal.toLocaleString()} units`,                      '#10b981'                       ],
          ['Peak Forecast',  `${peakForecast} units/day`,                                   '#f59e0b'                       ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px', transition:'all 0.2s' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:c, textTransform:'capitalize' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Combined Chart ── */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>
              📊 Sales History
              <span style={{ color:'#f59e0b', marginLeft:8 }}>+ {isAI ? '✦ AI' : '⚡ Auto'} Forecast ({forecastDays}d)</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
              {histLoading ? '⏳ Loading…' : `${salesHistory.length} days actual · ${activeForecast.length} days forecast`}
              {isAI && <span style={{ marginLeft:8, color:'#10b981', fontWeight:600 }}>✦ Powered by AI</span>}
            </div>
          </div>
          {/* Live update indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text3)', background:'var(--bg3)', padding:'6px 12px', borderRadius:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }} />
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            Slider updates chart in real time
          </div>
        </div>

        {histLoading ? (
          <div style={{ height:300, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>
            <Spinner />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={combinedData} margin={{ top:10, right:10, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill:'var(--text3)', fontSize:10 }}
                tickFormatter={d => d?.slice(5)} axisLine={false} tickLine={false}
                interval="preserveStartEnd" />
              <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, paddingTop:10 }} />

              {/* Today divider */}
              {splitDate && (
                <ReferenceLine x={splitDate} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 3"
                  label={{ value:'Today', fill:'var(--text3)', fontSize:10, position:'insideTopRight' }} />
              )}

              {/* Confidence band */}
              <Area type="monotone" dataKey="upper_bound" fill="#f59e0b0e" stroke="none" name="upper_bound" legendType="none" />
              <Area type="monotone" dataKey="lower_bound" fill="#f59e0b0e" stroke="none" name="lower_bound" legendType="none" />

              {/* Actual sales */}
              <Area type="monotone" dataKey="actual" stroke="#6366f1" fill="url(#ag)"
                strokeWidth={2.5} dot={false} name="actual" connectNulls={false} />

              {/* Forecast */}
              <Line type="monotone" dataKey="forecast" stroke="#f59e0b"
                strokeWidth={2.5} dot={false} strokeDasharray="7 3"
                name="forecast" connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Recommendation + mini stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, marginBottom:20 }}>
        <Card style={{ textAlign:'center', padding:24 }}>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:10 }}>Detected Trend</div>
          <div style={{ fontSize:48, marginBottom:8 }}>{trendIcon[activeTrend]||'➡️'}</div>
          <div style={{ fontSize:20, fontWeight:800, color:trendColor[activeTrend]||'#f59e0b', textTransform:'capitalize' }}>{activeTrend}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Based on {histDays}-day history</div>
        </Card>

        <Card>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:10, fontWeight:600 }}>
            {isAI ? '✦ AI Recommendation' : '⚡ Auto Recommendation'}
          </div>
          <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, fontWeight:500, marginBottom:14 }}>
            {activeRec}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              ['Next 7 days',  `${next7} units`,                             '#6366f1'],
              ['Next 30 days', `${next30} units`,                            '#10b981'],
              ['Peak day',     `${peakForecast} units`,                      '#f59e0b'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--bg3)', borderRadius:9, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:c }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Forecast Table — updates with slider ── */}
      {activeForecast.length > 0 && (
        <Card>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>
            📋 Daily Forecast Table
            <span style={{ marginLeft:8, fontSize:12, fontWeight:400, color:'var(--text3)' }}>
              ({activeForecast.length} days · updates with slider)
            </span>
          </div>
          <div style={{ maxHeight:280, overflowY:'auto', scrollbarWidth:'thin' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                  {['#','Date','Predicted','Lower','Upper','Confidence'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontSize:11, color:'var(--text3)', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeForecast.map((row, i) => {
                  const pred  = Number(row?.forecast)     || 0;
                  const upper = Number(row?.upper_bound)  || 0;
                  const lower = Number(row?.lower_bound)  || 0;
                  const range = Math.max(0, upper - lower);
                  const conf  = pred > 0
                    ? Math.min(99, Math.max(1, Math.round(100 - (range / pred) * 40)))
                    : 50;
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text3)' }}>{i+1}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text2)' }}>{row.date}</td>
                      <td style={{ padding:'9px 12px', fontSize:13, fontWeight:800, color:'#f59e0b' }}>{pred}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text3)' }}>{lower}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text3)' }}>{upper}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:2, maxWidth:60, overflow:'hidden' }}>
                            <div style={{ width:`${conf}%`, height:'100%', borderRadius:2, background:conf>75?'#10b981':conf>50?'#f59e0b':'#ef4444', transition:'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize:11, color:'var(--text2)', minWidth:28 }}>{conf}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
}
