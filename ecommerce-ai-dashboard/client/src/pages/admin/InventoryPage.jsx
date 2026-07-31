import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS = {
  critical:  { color:'#ef4444', bg:'#ef444415', label:'🔴 Critical',  action:'Order Now'    },
  low:       { color:'#f59e0b', bg:'#f59e0b15', label:'🟡 Low Stock', action:'Reorder Soon' },
  overstock: { color:'#6366f1', bg:'#6366f115', label:'🟣 Overstock', action:'Add Discount' },
  ok:        { color:'#10b981', bg:'#10b98115', label:'🟢 Healthy',   action:'Monitor'      },
};

// Determine status from stock level
function getStatus(stock, reorderPoint = 10) {
  if (stock === 0)                 return 'critical';
  if (stock <= reorderPoint * 0.5) return 'critical';
  if (stock <= reorderPoint)       return 'low';
  if (stock >= reorderPoint * 8)   return 'overstock';
  return 'ok';
}

function AlertCard({ item, onAiAction, onStockUpdate }) {
  const cfg = STATUS[item.status];
  const pct = Math.min((item.stock / Math.max(item.stock, item.reorderPoint * 2)) * 100, 100);
  const [editStock, setEditStock] = useState(false);
  const [newStock,  setNewStock]  = useState(item.stock);

  const saveStock = async () => {
    if (+newStock < 0) return toast.error('Stock cannot be negative');
    await onStockUpdate(item._id, +newStock);
    setEditStock(false);
  };

  return (
    <div style={{ background:'var(--card)', border:`1px solid ${cfg.color}44`, borderRadius:14, padding:18, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:cfg.color }} />
      <div style={{ paddingLeft:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{item.name}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{item.category}</div>
          </div>
          <span style={{ background:cfg.bg, color:cfg.color, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{cfg.label}</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
          <div style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>Stock</div>
            {editStock ? (
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)}
                  style={{ width:60, padding:'2px 6px', fontSize:13, fontWeight:700, background:'var(--bg)', border:'1px solid var(--primary)', borderRadius:5, color:'var(--text)' }} />
                <button onClick={saveStock} style={{ background:'var(--success)', border:'none', borderRadius:5, padding:'2px 6px', color:'#fff', cursor:'pointer', fontSize:11 }}>✓</button>
                <button onClick={()=>setEditStock(false)} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 6px', color:'var(--text2)', cursor:'pointer', fontSize:11 }}>✕</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:14, fontWeight:700, color: item.stock===0?'#ef4444':'var(--text)' }}>
                  {item.stock === 0 ? '⚠️ 0' : item.stock}
                </div>
                <button onClick={()=>setEditStock(true)} style={{ background:'transparent', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:12 }}>✏️</button>
              </div>
            )}
          </div>
          <div style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>Price</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>${item.price?.toFixed(2)}</div>
          </div>
          <div style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>Reorder @</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.reorderPoint}</div>
          </div>
        </div>

        {/* Stock bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginBottom:4 }}>
            <span>Stock level</span>
            <span>Reorder point: {item.reorderPoint}</span>
          </div>
          <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:cfg.color, borderRadius:3, transition:'width 0.5s' }} />
          </div>
        </div>

        <button onClick={() => onAiAction(item)} style={{
          width:'100%', padding:9, borderRadius:8, border:'none', cursor:'pointer',
          background:`linear-gradient(135deg,${cfg.color},${cfg.color}bb)`,
          color:'#fff', fontSize:12, fontWeight:700,
        }}>✦ AI: {cfg.action}</button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [aiModal,     setAiModal]     = useState(null);
  const [bulkInsight, setBulkInsight] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchTerm,  setSearchTerm]  = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products?limit=200&all=true');
      const prods = (data.products || []).map(p => ({
        ...p,
        _id:         p._id,
        reorderPoint: p.reorderPoint || 10,
        status:      getStatus(p.stock, p.reorderPoint || 10),
        dailySales:  (p.salesHistory?.slice(-7) || []).reduce((s,h)=>s+(h.quantity||0),0) / 7 || 0,
      }));
      setProducts(prods);
    } catch {
      setProducts([]);
      toast.error('Could not load inventory');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleStockUpdate = async (productId, newStock) => {
    try {
      await api.put(`/products/${productId}`, { stock: newStock });
      setProducts(prev => prev.map(p =>
        p._id === productId
          ? { ...p, stock: newStock, status: getStatus(newStock, p.reorderPoint || 10) }
          : p
      ));
      toast.success('Stock updated!');
    } catch { toast.error('Failed to update stock'); }
  };

  const handleAiAction = async (item) => {
    setAiModal({ item, loading:true, advice:null });
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Inventory issue for "${item.name}" (${item.category}):
Stock: ${item.stock} units | Reorder point: ${item.reorderPoint} | Status: ${item.status}
Price: $${item.price} | Daily sales: ${item.dailySales?.toFixed(1) || '?'}/day
Give a specific 3-step action plan. Be concrete with numbers.`,
        history: [], context: 'inventory management',
      });
      setAiModal(prev => ({ ...prev, loading:false, advice:data.reply }));
    } catch {
      const fallback = {
        critical:`1. Place emergency reorder for ${(item.reorderPoint||10)*3} units today — stock critically low.\n2. Enable "Low Stock" badge on listing to drive urgency.\n3. Set automated reorder trigger at ${item.reorderPoint||10} units going forward.`,
        low:`1. Order ${(item.reorderPoint||10)*2} units within 3 days — stock running low.\n2. Check supplier lead time vs current depletion rate.\n3. Consider a 5% price adjustment to manage demand while restocking.`,
        overstock:`1. Apply 15–20% discount — excess stock tied up in capital.\n2. Bundle with a fast-moving product to increase movement.\n3. Pause new purchase orders until stock drops below ${(item.reorderPoint||10)*2} units.`,
        ok:`Stock is healthy. Continue monitoring weekly and set alerts if daily sales increase by more than 20%.`,
      }[item.status] || 'Monitor stock levels and review weekly.';
      setAiModal(prev => ({ ...prev, loading:false, advice:fallback }));
    }
  };

  const bulkAnalyze = async () => {
    setBulkLoading(true); setBulkInsight(null);
    const critical  = products.filter(p=>p.status==='critical').map(p=>p.name).join(', ') || 'none';
    const overstock = products.filter(p=>p.status==='overstock').map(p=>p.name).join(', ') || 'none';
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Inventory summary: CRITICAL: ${critical} | OVERSTOCK: ${overstock} | Total SKUs: ${products.length}
Give a 3-point executive summary and the single highest-priority action to take today.`,
        history: [], context: 'inventory executive summary',
      });
      setBulkInsight(data.reply);
      toast.success('Analysis complete!');
    } catch {
      const critCount = products.filter(p=>p.status==='critical').length;
      const overCount = products.filter(p=>p.status==='overstock').length;
      setBulkInsight(`⚠️ CRITICAL (${critCount} items): ${critical} — order immediately to prevent stockouts.\n\n📦 OVERSTOCK (${overCount} items): ${overstock} — run discounts or bundle deals to clear stock.\n\n✅ PRIORITY: Reorder critical items today, then discount overstock to free capital.`);
      toast.success('Showing cached analysis');
    } finally { setBulkLoading(false); }
  };

  const withStatus = products.filter(p => {
    if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const counts = {
    all:       products.length,
    critical:  products.filter(p=>p.status==='critical').length,
    low:       products.filter(p=>p.status==='low').length,
    overstock: products.filter(p=>p.status==='overstock').length,
    ok:        products.filter(p=>p.status==='ok').length,
  };

  return (
    <Layout title="📦 Smart Inventory" subtitle="Real-time stock monitoring from MongoDB — updates when orders are placed">

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['🔴 Critical',  counts.critical,  '#ef4444'],
          ['🟡 Low Stock', counts.low,        '#f59e0b'],
          ['🟣 Overstock', counts.overstock,  '#6366f1'],
          ['🟢 Healthy',   counts.ok,         '#10b981'],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px' }}>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c }}>{v} items</div>
          </div>
        ))}
      </div>

      {/* AI bulk analysis */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: bulkInsight?14:0 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>✦ AI Inventory Health Analysis</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Get an executive summary of your entire inventory</div>
          </div>
          <button onClick={bulkAnalyze} disabled={bulkLoading} style={{
            padding:'8px 16px', borderRadius:9, border:'none', cursor:bulkLoading?'not-allowed':'pointer',
            background:bulkLoading?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:bulkLoading?'var(--text3)':'#fff', fontSize:12, fontWeight:700,
          }}>{bulkLoading?'⏳ Analyzing…':'✦ Analyze All Inventory'}</button>
        </div>
        {bulkInsight && (
          <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, border:'1px solid #6366f133', fontSize:13, color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-line' }}>
            {bulkInsight}
          </div>
        )}
      </Card>

      {/* Filter + search */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[['all','All'],['critical','Critical'],['low','Low Stock'],['overstock','Overstock'],['ok','Healthy']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background:filter===v?'var(--primary)':'var(--card)', color:filter===v?'#fff':'var(--text2)',
            }}>{l} ({counts[v]})</button>
          ))}
        </div>
        <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="🔍 Search products…"
          style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', width:200 }}
        />
        <button onClick={fetchProducts} style={{ padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', cursor:'pointer', fontSize:13 }}>
          🔄
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12, animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div>Loading inventory from MongoDB…</div>
        </div>
      ) : withStatus.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)' }}>No products found</div>
          <div style={{ fontSize:12, marginTop:6 }}>Add products in the Products page first.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:16 }}>
          {withStatus.map(item => (
            <AlertCard key={item._id} item={item} onAiAction={handleAiAction} onStockUpdate={handleStockUpdate} />
          ))}
        </div>
      )}

      {/* AI Action Modal */}
      {aiModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={()=>setAiModal(null)}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:28, maxWidth:520, width:'92%', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>✦ AI Action Plan</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{aiModal.item.name}</div>
              </div>
              <button onClick={()=>setAiModal(null)} style={{ background:'var(--bg3)', border:'none', borderRadius:8, padding:'6px 12px', color:'var(--text2)', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            {aiModal.loading
              ? <div style={{ textAlign:'center', padding:30, color:'var(--text2)' }}>⏳ AI is analyzing inventory…</div>
              : <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:12, fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line', borderLeft:'3px solid var(--primary)' }}>
                  {aiModal.advice}
                </div>
            }
          </div>
        </div>
      )}
    </Layout>
  );
}
