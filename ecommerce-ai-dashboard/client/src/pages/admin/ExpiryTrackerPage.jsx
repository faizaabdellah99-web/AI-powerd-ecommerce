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
  if (days <= 7)  return { level:'critical', color:'#ef4444', bg:'#ef444415', label:'🔴 Critical / Expired', discount:40 };
  if (days <= 30) return { level:'warning',  color:'#f59e0b', bg:'#f59e0b15', label:'🟡 Warning / Expiring Soon', discount:20 };
  return           { level:'good',      color:'#10b981', bg:'#10b98115', label:'🟢 Safe / Fresh',         discount:0  };
}

// Generate a readable SKU/Batch number from the product _id
function getSku(p) {
  if (p.sku) return p.sku;
  const id = String(p._id || '');
  return `SKU-${id.slice(-6).toUpperCase() || 'N/A'}`;
}

function DaysBadge({ days }) {
  const urgency = getUrgency(days);
  if (days <= 0) {
    return <span style={{ background:'#ef444415', color:'#ef4444', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, border:'1px solid #ef444433', whiteSpace:'nowrap' }}>💀 Expired</span>;
  }
  return (
    <span style={{ background:urgency.bg, color:urgency.color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, border:`1px solid ${urgency.color}44`, whiteSpace:'nowrap' }}>
      {days} day{days !== 1 ? 's' : ''} left
    </span>
  );
}

export default function ExpiryTrackerPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('expiryDate');
  const [applied, setApplied] = useState({});
  const [statusMap, setStatusMap] = useState({});
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

  const withDays = products.map(p => ({ ...p, daysLeft: p.daysLeft !== undefined ? p.daysLeft : getDaysLeft(p.expiryDate) }));

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = withDays.filter(p => {
    // Status filter
    if (filter === 'expired')  return p.daysLeft <= 0;
    if (filter === 'critical') return p.daysLeft > 0 && p.daysLeft <= 7;
    if (filter === 'warning')  return p.daysLeft > 7 && p.daysLeft <= 30;
    // Category filter
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  // Sort products
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'expiryDate') {
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    }
    if (sortBy === 'daysLeft') {
      return a.daysLeft - b.daysLeft;
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const counts = {
    total:    products.length,
    expired:  withDays.filter(p=>p.daysLeft<=0).length,
    critical: withDays.filter(p=>p.daysLeft>0&&p.daysLeft<=7).length,
    warning:  withDays.filter(p=>p.daysLeft>7&&p.daysLeft<=30).length,
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

  const handleMarkStatus = async (product, status) => {
    try {
      await api.put(`/products/${product._id}/expiry-status`, { status });
      setStatusMap(prev => ({ ...prev, [product._id]: status }));
      toast.success(`${product.name} marked as ${status}`);
    } catch {
      toast.error(`Failed to mark ${product.name} as ${status}`);
    }
  };

  const handlePromoteProduct = async (product) => {
    try {
      await api.put(`/products/${product._id}/promote`, { isFlashSale: true });
      toast.success(`${product.name} promoted to Flash Sale section!`);
    } catch {
      toast.error('Failed to promote product');
    }
  };

  const handleMarkAsWaste = async (product) => {
    if (!window.confirm(`"${product.name}" ንጥል እንደ ሆነ ይመዝግቡ? ይህ ምርቱን ከ Inventory ያገለልባል እና በ Waste Management ይመዝግበዋል።`)) return;
    try {
      await api.put(`/products/${product._id}/mark-waste`, {
        wasteReason: 'Expired',
        wasteDate: new Date().toISOString(),
        stockAtWaste: product.stock,
      });
      setStatusMap(prev => ({ ...prev, [product._id]: 'waste' }));
      toast.success(`${product.name} ንጥል እንደ ሆነ ተመዝግቧል`);
      fetchProducts(); // Refresh to show updated status
    } catch {
      toast.error('ንጥል እንደ ሆነ መመዝገብ አልተቻለም');
    }
  };

  const getAiAdvice = async () => {
    setAiLoading(true);

    // If there are no items at risk, show a healthy inventory message
    if (counts.critical === 0 && counts.expired === 0) {
      setAiAnalysis('✅ No items at risk right now. Your inventory is healthy!');
      setAiLoading(false);
      return;
    }

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
    <Layout title="⏰ Expiry Tracker" subtitle="Monitor and manage near-expiry products with AI suggestions">

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div>Loading expiry data…</div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              ['💀 Expired',      counts.expired,  '#ef4444'],
              ['🔴 Critical (≤7d)', counts.critical,'#ef4444'],
              ['🟡 Warning (≤30d)', counts.warning, '#f59e0b'],
              ['� Safe (>30d)',   withDays.filter(p=>p.daysLeft>30).length, '#10b981'],
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
                <div style={{ fontSize:14, fontWeight:700 }}>⚡ AI Waste Reduction Plan</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Get an AI action plan for all near-expiry products</div>
              </div>
              <button onClick={getAiAdvice} disabled={aiLoading} style={{
                padding:'8px 16px', borderRadius:9, border:'none', cursor:aiLoading?'not-allowed':'pointer',
                background:aiLoading?'var(--bg3)':'linear-gradient(135deg,#ef4444,#f97316)',
                color:aiLoading?'var(--text3)':'#fff', fontSize:12, fontWeight:700,
              }}>{aiLoading ? '⏳ Analyzing…' : '⚡ Analyze Expiry Risk'}</button>
            </div>
            {aiAnalysis && (
              <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:10, border:'1px solid #ef444433', fontSize:13, color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>
                {aiAnalysis}
              </div>
            )}
          </Card>

          {/* Filter dropdowns */}
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
            {/* Status Filter */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Status:</span>
              <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:12, cursor:'pointer' }}>
                <option value="all">All Status</option>
                <option value="expired">Expired Only</option>
                <option value="critical">Expiring in 7 Days</option>
                <option value="warning">Expiring in 30 Days</option>
              </select>
            </div>

            {/* Category Filter */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Category:</span>
              <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:12, cursor:'pointer' }}>
                <option value="all">All Categories</option>
                {categories.filter(c=>c!=='all').map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Sort By:</span>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:12, cursor:'pointer' }}>
                <option value="expiryDate">Expiry Date (Soonest First)</option>
                <option value="daysLeft">Days Remaining</option>
                <option value="name">Product Name</option>
              </select>
            </div>
          </div>

          {/* Expiring Products Table */}
          {sorted.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)' }}>No products match this filter</div>
            </div>
          ) : (
            <Card style={{ overflow:'hidden', padding:0 }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg3)', color:'var(--text3)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Product</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Category</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Batch / SKU</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Quantity in Stock</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Expiration Date</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Days Remaining</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Status</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Price</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(p => {
                      const urgency = getUrgency(p.daysLeft);
                      const discountedPrice = +(p.price * (1 - urgency.discount / 100)).toFixed(2);
                      const isApplied = !!applied[p._id];
                      const status = statusMap[p._id] || p.expiryStatus || 'active';
                      const imgUrl = p.images?.[0]?.url;

                      return (
                        <tr key={p._id} style={{ borderTop:'1px solid var(--border)', background: status === 'donated' ? '#10b9810d' : status === 'discarded' ? '#ef44440d' : 'transparent' }}>
                          {/* Product Name & Photo */}
                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:40, height:40, borderRadius:8, background:'var(--bg3)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {imgUrl ? (
                                  <img src={imgUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                                ) : (
                                  <span style={{ fontSize:18 }}>📦</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight:700, color:'var(--text)' }}>{p.name}</div>
                                <div style={{ fontSize:11, color:'var(--text3)' }}>{getSku(p)}</div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding:'12px 16px', color:'var(--text2)' }}>
                            {p.category || '—'}
                          </td>

                          {/* Batch / SKU */}
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--text2)', background:'var(--bg3)', padding:'3px 8px', borderRadius:6 }}>
                              {p.batchNumber || p.lotNumber || 'N/A'}
                            </span>
                          </td>

                          {/* Quantity in Stock */}
                          <td style={{ padding:'12px 16px', color:'var(--text2)' }}>
                            {p.stock} units
                          </td>

                          {/* Expiration Date */}
                          <td style={{ padding:'12px 16px', color:'var(--text2)', whiteSpace:'nowrap' }}>
                            {p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : '—'}
                          </td>

                          {/* Days Remaining Badge */}
                          <td style={{ padding:'12px 16px' }}>
                            <DaysBadge days={p.daysLeft} />
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding:'12px 16px' }}>
                            {status === 'donated' ? (
                              <span style={{ fontSize:11, fontWeight:700, color:'#10b981', background:'#10b98115', padding:'5px 12px', borderRadius:20, border:'1px solid #10b98133', whiteSpace:'nowrap' }}>
                                ✓ Donated
                              </span>
                            ) : status === 'discarded' ? (
                              <span style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'#ef444415', padding:'5px 12px', borderRadius:20, border:'1px solid #ef444433', whiteSpace:'nowrap' }}>
                                ✕ Discarded
                              </span>
                            ) : (
                              <span style={{ fontSize:11, fontWeight:700, color:urgency.color, background:urgency.bg, padding:'5px 12px', borderRadius:20, border:`1px solid ${urgency.color}44`, whiteSpace:'nowrap' }}>
                                {urgency.label}
                              </span>
                            )}
                          </td>

                          {/* Price */}
                          <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                            {isApplied ? (
                              <span>
                                <s style={{ color:'var(--text3)', fontSize:12 }}>${p.price.toFixed(2)}</s>{' '}
                                <strong style={{ color:urgency.color }}>${applied[p._id].newPrice.toFixed(2)}</strong>
                              </span>
                            ) : (
                              <span style={{ color:'var(--text)' }}>${p.price.toFixed(2)}</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td style={{ padding:'12px 16px' }}>
                            {status === 'donated' || status === 'discarded' ? (
                              <span style={{ fontSize:11, color:'var(--text3)', fontStyle:'italic' }}>No actions</span>
                            ) : (
                              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                {urgency.discount > 0 && (
                                  <button
                                    onClick={() => handleApplyDiscount(p, urgency.discount, discountedPrice)}
                                    disabled={isApplied}
                                    style={{
                                      padding:'6px 12px', borderRadius:8, border:'none', cursor:isApplied?'not-allowed':'pointer',
                                      background:isApplied ? 'var(--bg3)' : `linear-gradient(135deg,${urgency.color},${urgency.color}cc)`,
                                      color:isApplied ? 'var(--text3)' : '#fff', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                                    }}
                                  >
                                    {isApplied ? `✓ ${applied[p._id].pct}% Off Applied` : `⚡ Apply ${urgency.discount}% Discount`}
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePromoteProduct(p)}
                                  style={{
                                    padding:'6px 12px', borderRadius:8, border:'1px solid #8b5cf644', cursor:'pointer',
                                    background:'#8b5cf610', color:'#8b5cf6', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                                  }}
                                >
                                  📢 Promote
                                </button>
                                <button
                                  onClick={() => handleMarkStatus(p, 'donated')}
                                  style={{
                                    padding:'6px 12px', borderRadius:8, border:'1px solid #10b98144', cursor:'pointer',
                                    background:'#10b98110', color:'#10b981', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                                  }}
                                >
                                  🎁 Donate
                                </button>
                                <button
                                  onClick={() => handleMarkAsWaste(p)}
                                  style={{
                                    padding:'6px 12px', borderRadius:8, border:'1px solid #ef444444', cursor:'pointer',
                                    background:'#ef444410', color:'#ef4444', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                                  }}
                                >
                                  🗑️ Waste
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}