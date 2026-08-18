import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const SEG = {
  vip:       { color:'#f59e0b', label:'👑 VIP',        desc:'High spend + frequent' },
  highvalue: { color:'#6366f1', label:'💎 High Value', desc:'Large avg order'        },
  regular:   { color:'#10b981', label:'🟢 Regular',    desc:'Consistent, loyal'      },
  new:       { color:'#3b82f6', label:'🆕 New',        desc:'Recently joined'        },
  atrisk:    { color:'#ef4444', label:'⚠️ At Risk',    desc:'May churn'              },
  inactive:  { color:'#64748b', label:'😴 Inactive',   desc:'90+ days silent'        },
};

const PROD_SEG = {
  fast:      { color:'#10b981', label:'🚀 Fast-Moving',   desc:'Selling fast'         },
  normal:    { color:'#3b82f6', label:'📦 Normal',        desc:'Steady sales'         },
  slow:      { color:'#f59e0b', label:'🐢 Slow-Moving',   desc:'Low velocity'         },
  outstock:  { color:'#ef4444', label:'❌ Out of Stock',  desc:'Stock = 0'            },
  lowstock:  { color:'#f97316', label:'⚠️ Critical Low',  desc:'Stock ≤ reorderPoint' },
  lowstock2: { color:'#fbbf24', label:'🔶 Low Stock',     desc:'Stock < 2× reorder'   },
  dead:      { color:'#64748b', label:'💀 Dead Stock',    desc:'No sales, high stock' },
};

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#f97316'];

function getProductSegment(p) {
  if (p.stock === 0) return 'outstock';
  if (p.stock <= (p.reorderPoint || 10) * 0.5) return 'lowstock';
  if (p.stock <= (p.reorderPoint || 10))        return 'lowstock2';
  const sales = (p.salesHistory || []).reduce((s, h) => s + h.quantity, 0);
  if (sales === 0 && p.stock > 50) return 'dead';
  if (sales >= 20) return 'fast';
  if (sales >= 5)  return 'normal';
  return 'slow';
}

export default function CustomerSegmentPage() {
  const [tab,          setTab]          = useState('customers');
  const [customers,    setCustomers]    = useState([]);
  const [custLoading,  setCustLoading]  = useState(false);
  const [selected,     setSelected]     = useState('all');
  const [aiAdvice,     setAiAdvice]     = useState({});
  const [loadingId,    setLoadingId]    = useState(null);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [bulkAdvice,   setBulkAdvice]   = useState(null);
  const [products,     setProducts]     = useState([]);
  const [prodLoading,  setProdLoading]  = useState(false);
  const [prodFilter,   setProdFilter]   = useState('all');
  const [salesData,    setSalesData]    = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [stats,        setStats]        = useState({ totalCustomers:0, totalProducts:0, categorySales:0 });

  useEffect(() => {
    // Customers
    setCustLoading(true);
    api.get('/users/customers')
      .then(({ data }) => { setCustomers(data||[]); setStats(p=>({...p, totalCustomers:(data||[]).length})); })
      .catch(() => setCustomers([]))
      .finally(() => setCustLoading(false));

    // Products
    setProdLoading(true);
    api.get('/products?limit=200&all=true')
      .then(({ data }) => {
        const prods = (data.products||[]).map(p => ({...p, seg: getProductSegment(p)}));
        setProducts(prods);
        setStats(p => ({...p, totalProducts: prods.length}));
      })
      .catch(() => setProducts([]))
      .finally(() => setProdLoading(false));

    // Sales
    setSalesLoading(true);
    api.get('/orders?limit=500')
      .then(({ data }) => {
        const orders = data.orders || data || [];
        const catMap = {};
        orders.forEach(o => (o.items||[]).forEach(item => {
          const c = item.category || 'Other';
          catMap[c] = catMap[c] || { category:c, revenue:0, orders:0, qty:0 };
          catMap[c].revenue += (item.price||0) * (item.qty||1);
          catMap[c].orders++;
          catMap[c].qty += (item.qty||1);
        }));
        const catArr = Object.values(catMap).sort((a,b) => b.revenue - a.revenue);
        const total  = catArr.reduce((s,c) => s + c.revenue, 0);
        catArr.forEach(c => c.pct = total > 0 ? +((c.revenue/total)*100).toFixed(1) : 0);
        setSalesData({ categories:catArr, total, orderCount:orders.length });
        setStats(p => ({...p, categorySales: total}));
      })
      .catch(() => setSalesData(null))
      .finally(() => setSalesLoading(false));
  }, []);

  const getAiAdvice = async (customer) => {
    setLoadingId(customer._id);
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Customer: ${customer.name} | Segment: ${SEG[customer.status]?.label||customer.status} | Orders: ${customer.orders} | Spent: $${customer.totalSpent} | Last: ${customer.lastOrder?customer.lastOrder+'d ago':'never'} | Categories: ${customer.categories?.join(', ')||'none'}. Give 2 specific marketing actions.`,
        history: [], context: 'customer relationship management',
      });
      setAiAdvice(p => ({...p, [customer._id]: data.reply}));
    } catch {
      setAiAdvice(p => ({...p, [customer._id]: `1. Personalised offer on ${customer.categories?.[0]||'past purchases'}.\n2. ${customer.status==='atrisk'?'20% win-back discount':'10% loyalty reward'}.`}));
    } finally { setLoadingId(null); }
  };

  const getBulkStrategy = async () => {
    setBulkLoading(true); setBulkAdvice(null);
    const summary = Object.entries(
      customers.reduce((acc,c)=>{ acc[c.status]=(acc[c.status]||0)+1; return acc; },{})
    ).map(([k,v])=>`${SEG[k]?.label||k}: ${v}`).join(', ');
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Customer base (${customers.length} total): ${summary}. 4-point strategy: VIP retention, at-risk win-back, new nurture, inactive re-engagement.`,
        history: [], context: 'customer segmentation strategy',
      });
      setBulkAdvice(data.reply);
    } catch {
      setBulkAdvice('1. VIP: Exclusive early access + free shipping.\n2. At-Risk: 20% win-back coupon, 7-day urgency.\n3. New: Welcome series + 10% reorder incentive.\n4. Inactive: Final 30% offer, then mark churned.');
    } finally { setBulkLoading(false); }
  };

  const segCounts    = customers.reduce((acc,c)=>{ acc[c.status]=(acc[c.status]||0)+1; return acc; },{});
  const custFiltered = selected==='all' ? customers : customers.filter(c=>c.status===selected);
  const segPieData   = Object.entries(segCounts).map(([k,v])=>({ name:SEG[k]?.label||k, value:v, color:SEG[k]?.color||'#aaa' }));
  const prodCounts   = products.reduce((acc,p)=>{ acc[p.seg]=(acc[p.seg]||0)+1; return acc; },{});
  const prodFiltered = prodFilter==='all' ? products : products.filter(p=>p.seg===prodFilter);
  const prodPieData  = Object.entries(prodCounts).map(([k,v])=>({ name:PROD_SEG[k]?.label||k, value:v, color:PROD_SEG[k]?.color||'#aaa' }));

  return (
    <Layout title="🗂 Segmentation Analysis" subtitle="Customer, Product, and Sales Segments">

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['👥 Total Customers', stats.totalCustomers,                        'var(--primary)'],
          ['📦 Total Products',  stats.totalProducts,                         '#f59e0b'       ],
          ['💰 Category Sales',  `$${(stats.categorySales/1000).toFixed(1)}K`,'#10b981'       ],
          ['📍 Location Sales',  '$0.0K',                                     '#ef4444'       ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div><div style={{ fontSize:22, fontWeight:800, color:c }}>{v}</div></div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['customers','👥 Customer Segments'],['products','📦 Product Segments'],['sales','📊 Sales Segments']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:'9px 20px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
            background:tab===id?'var(--primary)':'transparent', color:tab===id?'#fff':'var(--text2)',
          }}>{label}</button>
        ))}
      </div>

      {/* ── CUSTOMERS ── */}
      {tab==='customers' && (
        <div>
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:bulkAdvice?14:0 }}>
              <div><div style={{ fontSize:14,fontWeight:700 }}>✦ AI Segmentation Strategy</div><div style={{ fontSize:12,color:'var(--text3)',marginTop:2 }}>Full targeting plan</div></div>
              <button onClick={getBulkStrategy} disabled={bulkLoading} style={{ padding:'8px 16px',borderRadius:9,border:'none',cursor:bulkLoading?'not-allowed':'pointer',background:bulkLoading?'var(--bg3)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:bulkLoading?'var(--text3)':'#fff',fontSize:12,fontWeight:700 }}>
                {bulkLoading?'⏳ Generating…':'✦ Generate Strategy'}
              </button>
            </div>
            {bulkAdvice && <div style={{ padding:'14px 16px',background:'var(--bg3)',borderRadius:10,border:'1px solid #6366f133',fontSize:13,color:'var(--text2)',lineHeight:1.9,whiteSpace:'pre-line',marginTop:12 }}>{bulkAdvice}</div>}
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {Object.entries(SEG).map(([k,s])=>(
              <div key={k} onClick={()=>setSelected(selected===k?'all':k)} style={{ background:'var(--card)',border:`2px solid ${selected===k?s.color:'var(--border)'}`,borderRadius:12,padding:'12px 16px',cursor:'pointer',transition:'all 0.15s' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                  <span style={{ background:s.color+'22',color:s.color,fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20 }}>{s.label}</span>
                  <span style={{ fontSize:20,fontWeight:800,color:s.color }}>{segCounts[k]||0}</span>
                </div>
                <div style={{ fontSize:11,color:'var(--text3)' }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {custLoading ? (
            <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>⏳ Loading customers from database…</div>
          ) : custFiltered.length===0 ? (
            <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
              <div style={{ fontSize:40,marginBottom:12 }}>👥</div>
              <div>{customers.length===0?'No customers registered yet':'No customers in this segment'}</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
              {custFiltered.map(c => {
                const s = SEG[c.status] || SEG.new;
                return (
                  <Card key={c._id}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                      <div style={{ width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${s.color},${s.color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#fff',fontWeight:700,flexShrink:0 }}>{c.name?.[0]||'?'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize:11,color:'var(--text3)' }}>{c.email}</div>
                      </div>
                      <span style={{ background:s.color+'22',color:s.color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20 }}>{s.label}</span>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12 }}>
                      {[['Orders',c.orders],['Spent',`$${c.totalSpent}`],['Last',c.lastOrder?`${c.lastOrder}d`:'Never']].map(([l,v])=>(
                        <div key={l} style={{ background:'var(--bg3)',borderRadius:8,padding:'7px 10px',textAlign:'center' }}>
                          <div style={{ fontSize:10,color:'var(--text3)',marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:13,fontWeight:700,color:'var(--text)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {c.categories?.length>0 && (
                      <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:10 }}>
                        {c.categories.map(cat=><span key={cat} style={{ fontSize:10,color:'var(--text2)',background:'var(--bg3)',padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)' }}>{cat}</span>)}
                      </div>
                    )}
                    {aiAdvice[c._id] && (
                      <div style={{ padding:'10px 12px',background:'var(--bg3)',borderRadius:10,border:`1px solid ${s.color}33`,fontSize:12,color:'var(--text2)',lineHeight:1.7,whiteSpace:'pre-line',marginBottom:10 }}>{aiAdvice[c._id]}</div>
                    )}
                    <button onClick={()=>getAiAdvice(c)} disabled={loadingId===c._id} style={{ width:'100%',padding:9,borderRadius:8,border:'none',cursor:loadingId===c._id?'not-allowed':'pointer',background:`linear-gradient(135deg,${s.color},${s.color}cc)`,color:'#fff',fontSize:12,fontWeight:700 }}>
                      {loadingId===c._id?'⏳ Generating…':aiAdvice[c._id]?'🔄 Refresh':'✦ Get AI Advice'}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab==='products' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
            <Card>
              <div style={{ fontSize:14,fontWeight:600,marginBottom:14 }}>📊 Product Segment Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={prodPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {prodPieData.map((e,i)=><Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[v+' products',n]} contentStyle={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:8 }}>
                {prodPieData.map((e,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text2)' }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:e.color }} />{e.name}: <strong>{e.value}</strong>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize:14,fontWeight:600,marginBottom:14 }}>📦 Products by Segment</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={prodPieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:'var(--text2)',fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill:'var(--text2)',fontSize:10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12 }} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {prodPieData.map((e,i)=><Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:16 }}>
            {[['all','All',products.length],...Object.entries(PROD_SEG).map(([k,s])=>[k,s.label,prodCounts[k]||0])].map(([v,l,n])=>(
              <button key={v} onClick={()=>setProdFilter(v)} style={{ padding:'7px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:prodFilter===v?'var(--primary)':'var(--card)',color:prodFilter===v?'#fff':'var(--text2)' }}>{l} ({n})</button>
            ))}
          </div>
          {prodLoading ? (
            <div style={{ textAlign:'center',padding:40,color:'var(--text3)' }}>⏳ Loading…</div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)',background:'var(--bg3)' }}>
                  {['Product','Category','Stock','Price','Segment'].map(h=>(
                    <th key={h} style={{ textAlign:'left',padding:'10px 12px',fontSize:11,color:'var(--text3)',fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodFiltered.slice(0,50).map(p => {
                  const s = PROD_SEG[p.seg] || PROD_SEG.normal;
                  return (
                    <tr key={p._id} style={{ borderBottom:'1px solid var(--border)',transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px',fontSize:13,fontWeight:600,color:'var(--text)' }}>{p.name}</td>
                      <td style={{ padding:'12px',fontSize:12,color:'var(--text2)' }}>{p.category}</td>
                      <td style={{ padding:'12px',fontSize:13,fontWeight:600,color:p.stock===0?'var(--danger)':p.stock<=5?'var(--warning)':'var(--text)' }}>
                        {p.stock===0?'⚠️ 0':p.stock}
                      </td>
                      <td style={{ padding:'12px',fontSize:13,fontWeight:700 }}>${p.price?.toFixed(2)}</td>
                      <td style={{ padding:'12px' }}>
                        <span style={{ background:s.color+'22',color:s.color,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20 }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── SALES ── */}
      {tab==='sales' && (
        <div>
          {salesLoading ? (
            <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>⏳ Loading sales data…</div>
          ) : !salesData || salesData.categories.length===0 ? (
            <div style={{ textAlign:'center',padding:60,color:'var(--text3)' }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📊</div>
              <div>No sales data yet — place orders to see segments</div>
            </div>
          ) : (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
                <Card>
                  <div style={{ fontSize:14,fontWeight:600,marginBottom:4 }}>💰 Sales by Category</div>
                  <div style={{ fontSize:12,color:'var(--text3)',marginBottom:14 }}>
                    Total: <strong style={{ color:'var(--success)' }}>${salesData.total.toFixed(2)}</strong> · {salesData.orderCount} orders
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={salesData.categories} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="revenue" paddingAngle={3}>
                        {salesData.categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v)=>[`$${Number(v).toFixed(2)}`,'Revenue']} contentStyle={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <div style={{ fontSize:14,fontWeight:600,marginBottom:14 }}>📈 Revenue Breakdown</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesData.categories.slice(0,8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fill:'var(--text2)',fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="category" tick={{ fill:'var(--text2)',fontSize:10 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip formatter={v=>[`$${Number(v).toFixed(2)}`,'Revenue']} contentStyle={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12 }} />
                      <Bar dataKey="revenue" radius={[0,4,4,0]}>
                        {salesData.categories.slice(0,8).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)',background:'var(--bg3)' }}>
                    {['Category','Revenue','Orders','Qty Sold','% of Total'].map(h=>(
                      <th key={h} style={{ textAlign:'left',padding:'10px 12px',fontSize:11,color:'var(--text3)',fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesData.categories.map((c,i)=>(
                    <tr key={c.category} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ width:10,height:10,borderRadius:'50%',background:COLORS[i%COLORS.length] }} />
                          <span style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>{c.category}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px',fontSize:13,fontWeight:700,color:'var(--success)' }}>${c.revenue.toFixed(2)}</td>
                      <td style={{ padding:'12px',fontSize:13,color:'var(--text2)' }}>{c.orders}</td>
                      <td style={{ padding:'12px',fontSize:13,color:'var(--text2)' }}>{c.qty}</td>
                      <td style={{ padding:'12px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ flex:1,height:6,background:'var(--border)',borderRadius:3,maxWidth:100 }}>
                            <div style={{ width:`${c.pct}%`,height:'100%',background:COLORS[i%COLORS.length],borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12,fontWeight:600,color:COLORS[i%COLORS.length] }}>{c.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
