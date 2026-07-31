import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';

const today = new Date();

function getDaysLeft(dateStr) {
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}

function getUrgency(days) {
  if (days <= 1)  return { level:'critical', color:'#ef4444', bg:'#ef444415', label:'🔴 Expires Today/Tomorrow', discount:40 };
  if (days <= 3)  return { level:'urgent',   color:'#f97316', bg:'#f9731615', label:'🟠 Expires in 3 Days',      discount:30 };
  if (days <= 7)  return { level:'warning',  color:'#f59e0b', bg:'#f59e0b15', label:'🟡 Expires This Week',      discount:20 };
  if (days <= 30) return { level:'ok',       color:'#3b82f6', bg:'#3b82f615', label:'🔵 Expires This Month',     discount:10 };
  return           { level:'good',      color:'#10b981', bg:'#10b98115', label:'🟢 Good',                  discount:0  };
}

function ProductCard({ p, onApplyDiscount, discountApplied }) {
  const days    = p.daysLeft !== undefined ? p.daysLeft : getDaysLeft(p.expiryDate);
  const urgency = getUrgency(days);
  const discountedPrice = +(p.price * (1 - urgency.discount / 100)).toFixed(2);

  return (
    <div style={{ background:'var(--card)', border:`1px solid ${urgency.color}44`, borderRadius:14, padding:18, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:urgency.color }} />
      <div style={{ paddingLeft:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{p.name}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{p.category}</div>
          </div>
          <span style={{ background:urgency.bg, color:urgency.color, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
            {urgency.label}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
          {[
            ['Stock',    `${p.stock} units`],
            ['Expires',  days <= 0 ? 'EXPIRED' : `${days} day${days!==1?'s':''}`],
            ['Price',    `$${p.price.toFixed(2)}`],
          ].map(([l,v])=>(
            <div key={l} style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:700, color: l==='Expires'&&days<=3?urgency.color:'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Expiry date bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:4 }}>
            <span>Expiry: {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '—'}</span>
            <span>{days <= 0 ? 'EXPIRED' : `${days} days left`}</span>
          </div>
          <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
            <div style={{
              width:`${Math.min(100, Math.max(0, (30-days)/30*100))}%`,
              height:'100%', background:urgency.color, borderRadius:3, transition:'width 0.5s',
            }} />
          </div>
        </div>

        {/* AI discount suggestion */}
        {urgency.discount > 0 && (
          <div style={{ background:urgency.bg, border:`1px solid ${urgency.color}44`, borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:urgency.color, marginBottom:4 }}>
              ✦ AI Suggestion: Apply {urgency.discount}% Discount
            </div>
            <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
              Price: <s style={{ color:'var(--text3)' }}>${p.price.toFixed(2)}</s>{' '}
              → <strong style={{ color:urgency.color }}>${discountedPrice}</strong>{' '}
              ({urgency.discount}% off — expires in {days} day{days!==1?'s':''})
            </div>
          </div>
        )}

        {urgency.discount > 0 && (
          <button onClick={() => onApplyDiscount(p, urgency.discount, discountedPrice)} style={{
            width:'100%', padding:9, borderRadius:8, border:'none', cursor:'pointer',
            background: discountApplied
              ? 'var(--bg3)'
              : `linear-gradient(135deg,${urgency.color},${urgency.color}cc)`,
            color: discountApplied ? 'var(--text3)' : '#fff',
            fontSize:12, fontWeight:700, transition:'all 0.2s',
          }}>
            {discountApplied ? '✓ Discount Applied on Shop' : `✦ Apply ${urgency.discount}% Discount on Shop`}
          </button>
        )}
        {urgency.discount === 0 && (
          <div style={{ padding:'8px 12px', background:'#10b98115', border:'1px solid #10b98133', borderRadius:8, fontSize:12, color:'var(--success)', textAlign:'center', fontWeight:600 }}>
            ✓ No action needed — expiry is far
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExpiryTrackerPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [applied, setApplied] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products/expiry-tracker');
      setProducts(data.products || []);
    } catch {
      toast.error('Could not load expiry data from server');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Listen for real-time expiry alerts
  useSocket({
    'expiry-alert': (data) => {
      toast(`⚠️ ${data.expiringSoon.length} product(s) expiring soon!`, { icon: '⏰', duration: 6000 });
      fetchProducts();
    },
  });

  const withDays = products.map(p => ({ ...p, daysLeft: getDaysLeft(p.expiryDate) }));

  const filtered = withDays.filter(p => {
    if (filter === 'expired')  return p.daysLeft <= 0;
    if (filter === 'critical') return p.daysLeft > 0 && p.daysLeft <= 3;
    if (filter === 'week')     return p.daysLeft > 3 && p.daysLeft <= 7;
    if (filter === 'month')    return p.daysLeft > 7 && p.daysLeft <= 30;
    return true;
  });

  const counts = {
    total:    products.length,
    expired:  withDays.filter(p=>p.daysLeft<=0).length,
    critical: withDays.filter(p=>p.daysLeft>0&&p.daysLeft<=3).length,
    week:     withDays.filter(p=>p.daysLeft>3&&p.daysLeft<=7).length,
    month:    withDays.filter(p=>p.daysLeft>7&&p.daysLeft<=30).length,
  };

  const handleApplyDiscount = async (product, pct, newPrice) => {
    try {
      await api.put(`/products/${product._id}/expiry-discount`, { discountPct: pct, discountedPrice: newPrice });
      setApplied(prev => ({ ...prev, [product._id]: { pct, newPrice } }));
      toast.success(`${pct}% discount applied on ${product.name} — now $${newPrice} on Shop`);
    } catch {
      toast.error('Failed to apply discount');
    }
  };

  const getAiAdvice = async () => {
    setAiLoading(true);
    const critical = withDays.filter(p=>p.daysLeft<=3).map(p=>`${p.name} (${p.daysLeft}d, ${p.stock} units, $${p.price})`).join(', ');
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Supermarket expiry alert: These products expire in 3 days or less: ${critical || 'none'}.
Total products tracked: ${products.length}. Critical: ${counts.critical}. Expired: ${counts.expired}.
Give a 3-point action plan to minimise waste and maximise recovery revenue. Be specific.`,
        history: [], context: 'supermarket expiry management and waste reduction',
      });
      setAiAnalysis(data.reply);
      toast.success('AI analysis complete!');
    } catch {
      setAiAnalysis(`🚨 CRITICAL: Apply 30-40% discounts on ${counts.critical} items expiring in ≤3 days immediately — mark them with red tags and move to front shelf.\n\n📦 BUNDLE: Group near-expiry items into "Quick Sale" bundles at 25% off to increase average basket size.\n\n♻️ DONATION: For items expiring today with remaining stock, coordinate with local food banks to avoid total loss and qualify for tax deduction.`);
    } finally { setAiLoading(false); }
  };

  return (
    <Layout title="⏰ Expiry Tracker" subtitle="Monitor product expiry dates — live from MongoDB">

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div>Loading expiry data from MongoDB…</div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              ['💀 Expired',      counts.expired,  '#ef4444'],
              ['🔴 Critical (≤3d)', counts.critical,'#f97316'],
              ['🟡 This Week',    counts.week,     '#f59e0b'],
              ['🔵 This Month',   counts.month,    '#3b82f6'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px' }}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c }}>{v} items</div>
              </div>
            ))}
          </div>

          {/* AI bulk analysis */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: aiAnalysis ? 14 : 0 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>✦ AI Waste Reduction Plan</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Get an AI action plan for all near-expiry products</div>
              </div>
              <button onClick={getAiAdvice} disabled={aiLoading} style={{
                padding:'8px 16px', borderRadius:9, border:'none', cursor:aiLoading?'not-allowed':'pointer',
                background:aiLoading?'var(--bg3)':'linear-gradient(135deg,#ef4444,#f97316)',
                color:aiLoading?'var(--text3)':'#fff', fontSize:12, fontWeight:700,
              }}>{aiLoading ? '⏳ Analyzing…' : '✦ Analyze Expiry Risk'}</button>
            </div>
            {aiAnalysis && (
              <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, border:'1px solid #ef444433', fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>
                {aiAnalysis}
              </div>
            )}
          </Card>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
            {[['all','All Products',counts.total],['expired','Expired',counts.expired],['critical','Critical ≤3d',counts.critical],['week','This Week',counts.week],['month','This Month',counts.month]].filter(([_,__,n])=>n>0||_[0]==='all').map(([v,l,n])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{
                padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                background:filter===v?'var(--primary)':'var(--card)',
                color:filter===v?'#fff':'var(--text2)',
              }}>{l} ({n})</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)' }}>No products match this filter</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {filtered.map(p => (
                <ProductCard key={p._id} p={p} onApplyDiscount={handleApplyDiscount} discountApplied={!!applied[p._id]} />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
