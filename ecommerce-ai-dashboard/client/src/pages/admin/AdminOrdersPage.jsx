import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useOrderStore } from '../../store/orderStore';

const STATUS_CONFIG = {
  pending:          { color:'#eab308', bg:'#eab30818', label:'⏳ Pending',          next:'confirmed'         },
  confirmed:        { color:'#3b82f6', bg:'#3b82f618', label:'✅ Confirmed',        next:'shipped'           },
  shipped:          { color:'#f59e0b', bg:'#f59e0b18', label:'🚚 Shipped',          next:'out_for_delivery'  },
  out_for_delivery: { color:'#8b5cf6', bg:'#8b5cf618', label:'📍 Out for Delivery', next:'delivered'         },
  delivered:        { color:'#10b981', bg:'#10b98118', label:'📦 Delivered',        next:null                },
  cancelled:        { color:'#ef4444', bg:'#ef444418', label:'❌ Cancelled',        next:null                },
};

const PAY_STATUS = {
  unpaid:   { color:'#ef4444', label:'Unpaid'   },
  paid:     { color:'#10b981', label:'Paid ✓'   },
  refunded: { color:'#f59e0b', label:'Refunded' },
};

const PAY_METHOD = { chapa:'🏦 Chapa', telebirr:'📱 TeleBirr', card:'💳 Card', cod:'💵 Cash' };

// Generate 50+ demo orders for pagination demo
const generateDemoOrders = () => {
  const customers = [
    { name:'Abebe Girma', email:'abebe@test.com' },
    { name:'Sara Kebede', email:'sara@test.com' },
    { name:'Daniel Haile', email:'daniel@test.com' },
    { name:'Hana Tadesse', email:'hana@test.com' },
    { name:'Meron Alemu', email:'meron@test.com' },
    { name:'Biruk Tesfaye', email:'biruk@test.com' },
    { name:'Tigist Wondimu', email:'tigist@test.com' },
    { name:'Yonas Desta', email:'yonas@test.com' },
    { name:'Selam Ayele', email:'selam@test.com' },
    { name:'Ephrem Gizaw', email:'ephrem@test.com' },
  ];
  const products = [
    { name:'Wireless Headphones', price:129 },
    { name:'USB Hub', price:55 },
    { name:'Yoga Mat Premium', price:58 },
    { name:'Atomic Habits', price:16 },
    { name:'Deep Work', price:15 },
    { name:'Memory Foam Pillow', price:42 },
    { name:'Smart Watch Pro', price:299 },
    { name:'Coffee Maker X1', price:89 },
    { name:'Running Shoes V2', price:120 },
    { name:'Laptop Stand Pro', price:45 },
  ];
  const statuses = ['pending','confirmed','shipped','out_for_delivery','delivered','cancelled'];
  const payments = ['paid','unpaid','paid','paid','paid'];
  const methods = ['chapa','telebirr','card','cod','chapa','telebirr'];
  const cities = ['Addis Ababa','Adama','Bahir Dar','Hawassa','Dire Dawa','Mekelle','Gondar'];
  const subCities = ['Bole','Yeka','Kirkos','Nifas Silk','Lideta','Arada','Gullele'];

  const orders = [];
  for (let i = 1; i <= 52; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({ productName: product.name, qty, price: product.price });
      subtotal += product.price * qty;
    }
    const shipping = Math.random() > 0.3 ? 15 : 0;
    const tax = subtotal * 0.15;
    const total = subtotal + shipping + tax;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentStatus = payments[Math.floor(Math.random() * payments.length)];
    const paymentMethod = methods[Math.floor(Math.random() * methods.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const subCity = subCities[Math.floor(Math.random() * subCities.length)];

    orders.push({
      _id: `demo-${i}`,
      orderId: `ORD-${String(10000 + i).padStart(5, '0')}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      customer,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      status,
      paymentStatus,
      paymentMethod,
      shippingAddress: {
        fullName: customer.name,
        phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        city,
        subCity,
        woreda: String(Math.floor(Math.random() * 15) + 1).padStart(2, '0'),
        street: ['Bole Road','Meskel Square','CMC Road','Megenagna','Piassa','Mexico Square'][Math.floor(Math.random() * 6)],
      },
    });
  }
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const DEMO_ORDERS = generateDemoOrders();

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function OrderRow({ order, onStatusChange, onExpand, expanded }) {
  const [updating, setUpdating] = useState(false);
  const cfg     = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const payCfg  = PAY_STATUS[order.paymentStatus] || PAY_STATUS.unpaid;

  const handleNext = async (e) => {
    e.stopPropagation();
    if (!cfg.next) return;
    setUpdating(true);
    await onStatusChange(order._id, cfg.next);
    setUpdating(false);
  };

  return (
    <>
      <tr onClick={() => onExpand(order._id)} style={{
        borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s',
      }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <td style={{ padding:'13px 12px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--primary)' }}>{order.orderId}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{new Date(order.createdAt).toLocaleString()}</div>
        </td>
        <td style={{ padding:'13px 12px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{order.customer?.name || '—'}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{order.customer?.email || ''}</div>
        </td>
        <td style={{ padding:'13px 12px', fontSize:13, color:'var(--text2)' }}>
          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
        </td>
        <td style={{ padding:'13px 12px', fontSize:14, fontWeight:700, color:'var(--text)' }}>
          ${order.total?.toFixed(2)}
        </td>
        <td style={{ padding:'13px 12px' }}>
          <span style={{ color:payCfg.color, fontSize:12, fontWeight:700 }}>{payCfg.label}</span>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{PAY_METHOD[order.paymentMethod] || order.paymentMethod}</div>
        </td>
        <td style={{ padding:'13px 12px' }}><StatusBadge status={order.status} /></td>
        <td style={{ padding:'13px 12px' }}>
          {cfg.next ? (
            <button onClick={handleNext} disabled={updating} style={{
              padding:'5px 12px', borderRadius:7, border:'none', cursor:updating?'not-allowed':'pointer',
              background:updating?'var(--bg3)':'var(--primary)', color:'#fff',
              fontSize:11, fontWeight:700, whiteSpace:'nowrap',
            }}>
              {updating ? '⏳' : `→ ${STATUS_CONFIG[cfg.next]?.label.split(' ')[1] || cfg.next}`}
            </button>
          ) : (
            <span style={{ fontSize:11, color:'var(--text3)' }}>—</span>
          )}
        </td>
        <td style={{ padding:'13px 12px', color:'var(--text3)', fontSize:16 }}>{expanded ? '▲' : '▼'}</td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr style={{ borderBottom:'1px solid var(--border)' }}>
          <td colSpan={8} style={{ padding:'0 12px 16px' }}>
            <div style={{ background:'var(--bg3)', borderRadius:12, padding:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

              {/* Items */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:8 }}>ORDER ITEMS</div>
                {order.items?.map((item,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'var(--text2)' }}>
                    <span>{item.productName} × {item.qty}</span>
                    <span style={{ fontWeight:600 }}>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid var(--border)', marginTop:8, paddingTop:8 }}>
                  {[['Subtotal',`$${order.subtotal?.toFixed(2)}`],['Shipping',order.shipping===0?'Free':`$${order.shipping?.toFixed(2)}`],['Tax',`$${order.tax?.toFixed(2)}`]].map(([l,v])=>(
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:3 }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:800, color:'var(--primary)', marginTop:6 }}>
                    <span>Total</span><span>${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:8 }}>DELIVERY ADDRESS</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                  <div style={{ fontWeight:600, color:'var(--text)' }}>{order.shippingAddress?.fullName}</div>
                  <div>📞 {order.shippingAddress?.phone}</div>
                  <div>📍 {order.shippingAddress?.street && `${order.shippingAddress.street}, `}Woreda {order.shippingAddress?.woreda}, {order.shippingAddress?.subCity}, {order.shippingAddress?.city}</div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:8 }}>QUICK ACTIONS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {order.status === 'confirmed' && (
                    <button onClick={()=>onStatusChange(order._id,'shipped')} style={{ padding:'9px 14px', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      🚚 Mark as Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button onClick={()=>onStatusChange(order._id,'out_for_delivery')} style={{ padding:'9px 14px', background:'linear-gradient(135deg,#8b5cf6,#6366f1)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      📍 Out for Delivery
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button onClick={()=>onStatusChange(order._id,'delivered')} style={{ padding:'9px 14px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      ✅ Mark Delivered
                    </button>
                  )}
                  {!['delivered','cancelled'].includes(order.status) && (
                    <button onClick={()=>onStatusChange(order._id,'cancelled')} style={{ padding:'9px 14px', background:'transparent', border:'1px solid var(--danger)', color:'var(--danger)', borderRadius:9, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                      ❌ Cancel Order
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <div style={{ padding:'9px 14px', background:'#10b98118', border:'1px solid #10b98133', borderRadius:9, fontSize:12, color:'var(--success)', fontWeight:600, textAlign:'center' }}>
                      ✓ Order Complete
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminOrdersPage() {
  const [orders,     setOrders]    = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [filter,     setFilter]    = useState('all');
  const [search,     setSearch]    = useState('');
  const [expanded,   setExpanded]  = useState(null);
  const [isDemo,     setIsDemo]    = useState(false);

  // ── Pagination state ──
  const [page,       setPage]      = useState(1);
  const [totalPages, setTotalPages]= useState(1);
  const [totalItems, setTotalItems]= useState(0);
  const ITEMS_PER_PAGE = 10;

  const resetNewOrders = useOrderStore(s => s.resetNewOrders);

  useEffect(() => { resetNewOrders(); }, [resetNewOrders]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      params.set('page', page);
      params.set('limit', ITEMS_PER_PAGE);
      const { data } = await api.get(`/orders?${params}`);
      console.log('Orders API response:', data);
      setOrders(data.orders || []);
      setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      setTotalItems(data.total || 0);
      setIsDemo(false);
    } catch (err) {
      console.error('Orders fetch error:', err);
      // Only show demo if API is completely unavailable (server down)
      if (err.code === 'ERR_NETWORK' || err.response?.status === 500) {
        // Filter demo orders
        let filtered = DEMO_ORDERS;
        if (filter !== 'all') {
          filtered = DEMO_ORDERS.filter(o => o.status === filter);
        }
        setTotalItems(filtered.length);
        setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
        // Paginate demo orders
        const start = (page - 1) * ITEMS_PER_PAGE;
        setOrders(filtered.slice(start, start + ITEMS_PER_PAGE));
        setIsDemo(true);
      } else {
        setOrders([]);
        setIsDemo(false);
        toast.error('Failed to load orders from database');
      }
    } finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (isDemo) {
      setOrders(prev => prev.map(o => o._id === orderId ? {...o, status: newStatus} : o));
      toast.success(`Status updated to ${newStatus}`);
      return;
    }
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? data : o));
      toast.success(`Order status → ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  // Client-side search filter
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.orderId?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q);
  });

  const [totalCounts, setTotalCounts] = useState({
    all: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
  });

  // Fetch real total counts from /orders/stats endpoint
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data } = await api.get('/orders/stats');
        setTotalCounts({
          all: data.totalOrders || 0,
          pending: data.pendingOrders || 0,
          confirmed: data.confirmedOrders || 0,
          shipped: data.shippedOrders || 0,
          delivered: data.deliveredOrders || 0,
          cancelled: data.cancelledOrders || 0,
        });
      } catch {
        // Use current page counts as fallback
      }
    };
    if (!isDemo) fetchCounts();
  }, [isDemo]);

  const counts = isDemo ? {
    all:       totalItems,
    pending:   DEMO_ORDERS.filter(o=>o.status==='pending').length,
    confirmed: DEMO_ORDERS.filter(o=>o.status==='confirmed').length,
    shipped:   DEMO_ORDERS.filter(o=>['shipped','out_for_delivery'].includes(o.status)).length,
    delivered: DEMO_ORDERS.filter(o=>o.status==='delivered').length,
    cancelled: DEMO_ORDERS.filter(o=>o.status==='cancelled').length,
  } : totalCounts;

  const todayRevenue = isDemo
    ? DEMO_ORDERS
        .filter(o => o.paymentStatus==='paid' && new Date(o.createdAt).toDateString()===new Date().toDateString())
        .reduce((s,o) => s + (o.total||0), 0)
    : orders
        .filter(o => o.paymentStatus==='paid' && new Date(o.createdAt).toDateString()===new Date().toDateString())
        .reduce((s,o) => s + (o.total||0), 0);

  return (
    <Layout title="📋 Orders" subtitle="Manage and fulfill customer orders in real time">

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['📋 Total',    counts.all,       '#6366f1'],
          ['⏳ Pending',  counts.pending,   '#eab308'],
          ['🚚 Shipped',  counts.shipped,   '#f59e0b'],
          ['✅ Delivered',counts.delivered, '#10b981'],
          ['💰 Today Revenue', `$${todayRevenue.toFixed(2)}`, '#10b981'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'var(--card)', border:`1px solid ${c}33`, borderRadius:12, padding:'14px 18px' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {isDemo && (
        <div style={{ padding:'10px 16px', background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:10, marginBottom:16, fontSize:12, color:'#f59e0b' }}>
          ⚠️ Showing <strong>{totalItems} demo orders</strong> with pagination — connect to MongoDB to see real orders
        </div>
      )}

      {/* Filter + search */}
      <div style={{ display:'flex', gap:12, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['shipped','Shipped'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background:filter===v?'var(--primary)':'var(--card)',
              color:filter===v?'#fff':'var(--text2)',
            }}>{l} ({counts[v]||0})</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search order ID or customer…"
          style={{ marginLeft:'auto', padding:'8px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', width:240 }}
        />
        <button onClick={fetchOrders} style={{ padding:'8px 14px', borderRadius:9, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13, cursor:'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Orders table */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>⏳ Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text2)' }}>No orders found</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                {['Order ID','Customer','Items','Total','Payment','Status','Next Action',''].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <OrderRow key={order._id} order={order} onStatusChange={handleStatusChange} onExpand={toggleExpand} expanded={expanded===order._id} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 8, marginTop: 20, padding: '12px 0',
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: page === 1 ? 'var(--bg3)' : 'var(--card)',
              color: page === 1 ? 'var(--text3)' : 'var(--text2)',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            ← Previous
          </button>

          {/* Page numbers */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none',
                    background: page === pageNum ? 'var(--primary)' : 'var(--card)',
                    color: page === pageNum ? '#fff' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 13, fontWeight: page === pageNum ? 700 : 500,
                    border: page !== pageNum ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: page === totalPages ? 'var(--bg3)' : 'var(--card)',
              color: page === totalPages ? 'var(--text3)' : 'var(--text2)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Next →
          </button>

          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>
            Page {page} of {totalPages} ({totalItems} total)
          </span>
        </div>
      )}
    </Layout>
  );
}