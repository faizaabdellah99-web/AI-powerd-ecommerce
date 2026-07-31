import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import api from '../../services/api';
import { useOrderStore } from '../../store/orderStore';
import { getSocket } from '../../hooks/useSocket';

const STATUS_COLOR = { delivered:'success', shipped:'info', confirmed:'info', pending:'warning', out_for_delivery:'warning', cancelled:'danger' };
const STATUS_LABEL = { pending:'⏳ Pending', confirmed:'✅ Confirmed', shipped:'🚚 Shipped', out_for_delivery:'📍 Out for Delivery', delivered:'📦 Delivered', cancelled:'❌ Cancelled' };

const STEP_ICONS  = { ordered:'🛒', pending:'⏳', confirmed:'✅', shipped:'🚚', out_for_delivery:'📍', delivered:'📦', cancelled:'❌' };

function OrderTimeline({ order }) {
  const allSteps = ['pending','confirmed','shipped','out_for_delivery','delivered'];
  if (order.status === 'cancelled') {
    return (
      <div style={{ padding:'12px 0', display:'flex', gap:10, alignItems:'center' }}>
        <span style={{ fontSize:20 }}>❌</span>
        <span style={{ fontSize:13, color:'var(--danger)', fontWeight:600 }}>Order Cancelled</span>
      </div>
    );
  }

  const currentIdx = allSteps.indexOf(order.status);

  return (
    <div style={{ padding:'16px 0 4px', position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-start' }}>
        {/* Progress line background */}
        <div style={{ position:'absolute', top:30, left:'10%', right:'10%', height:2, background:'var(--border)', zIndex:0 }} />
        <div style={{ position:'absolute', top:30, left:'10%', height:2, zIndex:0,
          background:'linear-gradient(90deg,#10b981,#6366f1)',
          width: currentIdx >= 0 ? `${(currentIdx / (allSteps.length-1)) * 80}%` : '0%',
          transition:'width 0.5s ease',
        }} />

        {allSteps.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
              <div style={{
                width:34, height:34, borderRadius:'50%',
                background: done ? (active ? 'var(--primary)' : '#10b981') : 'var(--bg3)',
                border: `2px solid ${done ? (active ? 'var(--primary)' : '#10b981') : 'var(--border)'}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none',
              }}>
                {STEP_ICONS[step] || '●'}
              </div>
              <div style={{ marginTop:6, fontSize:10, fontWeight:done?700:400, color:done?'var(--text)':'var(--text3)', textAlign:'center', lineHeight:1.3 }}>
                {STATUS_LABEL[step]?.split(' ').slice(1).join(' ') || step}
              </div>
              {/* Timeline entry date if available */}
              {order.timeline?.find(t=>t.status===step)?.timestamp && (
                <div style={{ fontSize:9, color:'var(--text3)', marginTop:2, textAlign:'center' }}>
                  {new Date(order.timeline.find(t=>t.status===step).timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const itemsSummary = order.items?.map(i => `${i.productName} ×${i.qty}`).join(', ') || '—';

  return (
    <Card style={{ marginBottom:14, cursor:'pointer', border:`1px solid ${expanded?'var(--primary)':'var(--border)'}`, transition:'border-color 0.15s' }}>
      {/* Header row */}
      <div onClick={() => setExpanded(v=>!v)} style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:14, fontWeight:800, color:'var(--primary)' }}>{order.orderId}</span>
            <Badge color={STATUS_COLOR[order.status] || 'info'}>
              {STATUS_LABEL[order.status] || order.status}
            </Badge>
            {order.paymentStatus === 'unpaid' && (
              <span style={{ fontSize:10, fontWeight:700, color:'var(--danger)', background:'#ef444415', padding:'2px 8px', borderRadius:20 }}>Unpaid</span>
            )}
          </div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:2 }}>
            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} — {itemsSummary.slice(0,60)}{itemsSummary.length>60?'…':''}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>
            {new Date(order.createdAt).toLocaleDateString()} · {new Date(order.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <div style={{ textAlign:'right', minWidth:100 }}>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--primary)', marginBottom:4 }}>${order.total?.toFixed(2)}</div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>
            {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : order.paymentMethod === 'chapa' ? '🏦 Chapa' : order.paymentMethod === 'telebirr' ? '📱 TeleBirr' : '💳 Card'}
          </div>
        </div>
        <div style={{ color:'var(--text3)', fontSize:18, transform:expanded?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}>▼</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
          {/* Timeline */}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:4 }}>DELIVERY TIMELINE</div>
          <OrderTimeline order={order} />

          {/* Items breakdown */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:8 }}>ORDER ITEMS</div>
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:12 }}>
              {order.items?.map((item,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'5px 0', borderBottom: i<order.items.length-1?'1px solid var(--border)':'none' }}>
                  <span style={{ color:'var(--text)' }}>{item.productName} <span style={{ color:'var(--text3)' }}>×{item.qty}</span></span>
                  <span style={{ fontWeight:700 }}>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:14, fontWeight:800, color:'var(--primary)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                <span>Total</span>
                <span>${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          {order.shippingAddress && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:8 }}>DELIVERY ADDRESS</div>
              <div style={{ background:'var(--bg3)', borderRadius:10, padding:12, fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                📍 {order.shippingAddress.fullName} · {order.shippingAddress.phone}<br/>
                {order.shippingAddress.street && `${order.shippingAddress.street}, `}
                Woreda {order.shippingAddress.woreda}, {order.shippingAddress.subCity}, {order.shippingAddress.city}
              </div>
            </div>
          )}

          {/* Actions */}
          {order.status === 'delivered' && (
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button style={{ flex:1, padding:10, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                ↩️ Return Item
              </button>
              <button style={{ flex:1, padding:10, background:'var(--primary)', border:'none', borderRadius:9, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600 }}>
                🔄 Reorder
              </button>
            </div>
          )}
          {order.status === 'shipped' && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'#3b82f615', border:'1px solid #3b82f633', borderRadius:10, fontSize:13, color:'#3b82f6', fontWeight:600 }}>
              🚚 Your order is on the way — estimated delivery in 1-2 days
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [error,   setError]   = useState('');
  const resetOrderUpdates = useOrderStore(s => s.resetOrderUpdates);

  useEffect(() => {
    // Reset notification count when page loads
    resetOrderUpdates();

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my');
        // Sort newest first
        const sorted = [...(data || [])].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sorted);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    // Listen for order status updates
    const socket = getSocket();
    const handleOrderStatusUpdate = (data) => {
      console.log('📦 OrdersPage: Order status updated', data);
      // Refresh orders when status changes
      fetchOrders();
    };

    socket.on('order-status-updated', handleOrderStatusUpdate);

    return () => {
      socket.off('order-status-updated', handleOrderStatusUpdate);
    };
  }, [resetOrderUpdates]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => ['pending','confirmed'].includes(o.status)).length,
    shipped:   orders.filter(o => ['shipped','out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <Layout title="📋 My Orders" subtitle="Track your purchases and delivery status">

      {/* Demo button for testing */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={() => {
            const socket = getSocket();
            // Simulate order status update from admin
            socket.emit('order-status-updated', { orderId: 'DEMO-001', status: 'shipped' });
          }}
          style={{
            padding: '8px 16px',
            background: 'var(--warning)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          🎭 Demo: Simulate Order Status Update
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['📋 Total',    counts.all,       'var(--primary)'],
          ['⏳ Active',   counts.pending,   'var(--warning)'],
          ['🚚 Shipped',  counts.shipped,   'var(--info)'],
          ['✅ Delivered',counts.delivered, 'var(--success)'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'var(--card)', border:`1px solid var(--border)`, borderRadius:12, padding:'14px 18px' }}>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
        {[['all','All'],['pending','Active'],['shipped','Shipped'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding:'8px 16px', borderRadius:20, fontSize:13, cursor:'pointer', fontWeight:500,
            background: filter===v ? 'var(--primary)' : 'var(--card)',
            color:      filter===v ? '#fff'           : 'var(--text2)',
            border: `1px solid ${filter===v ? 'var(--primary)' : 'var(--border)'}`,
          }}>{l} ({counts[v] ?? 0})</button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:14 }}>Loading your orders…</div>
        </div>
      )}

      {!loading && error && (
        <Card style={{ textAlign:'center', padding:40, borderColor:'var(--danger)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>❌</div>
          <div style={{ fontSize:14, color:'var(--danger)', marginBottom:6 }}>{error}</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Make sure the server is running and you are logged in.</div>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🛒</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>
            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          </div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
            {filter === 'all' ? 'Start shopping to see your orders here.' : `You have no ${filter} orders right now.`}
          </div>
          <a href="/customer/shop" style={{ padding:'10px 24px', background:'var(--primary)', color:'#fff', borderRadius:10, fontSize:14, fontWeight:700, textDecoration:'none' }}>
            🛍️ Start Shopping
          </a>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div>
          {filtered.map(order => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </Layout>
  );
}
