import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const confettiDone = useRef(false);

  const { orderId, cartItems = [], total = 0, payMethod, address } = state || {};

  useEffect(() => {
    if (!orderId) { navigate('/customer/shop'); return; }
    // Auto-redirect to orders after 8 seconds
    const t = setTimeout(() => navigate('/customer/orders'), 8000);
    return () => clearTimeout(t);
  }, [orderId, navigate]);

  if (!orderId) return null;

  const PAY_LABELS = { chapa:'Chapa', telebirr:'TeleBirr', card:'Credit Card', cod:'Cash on Delivery' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', color:'var(--text)' }}>
      <style>{`
        @keyframes popIn    { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      <div style={{ maxWidth:520, width:'100%', textAlign:'center' }}>
        {/* Success icon */}
        <div style={{ width:90, height:90, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', margin:'0 auto 24px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:42, boxShadow:'0 8px 32px rgba(16,185,129,0.4)', animation:'popIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
          ✓
        </div>

        <div style={{ animation:'fadeUp 0.5s ease 0.3s both' }}>
          <h1 style={{ fontSize:28, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Order Placed!</h1>
          <p style={{ fontSize:15, color:'var(--text2)', marginBottom:24 }}>
            Thank you for your order. We'll start processing it right away.
          </p>
        </div>

        {/* Order ID card */}
        <div style={{ background:'linear-gradient(135deg,#10b98122,#05966922)', border:'1px solid #10b98133', borderRadius:16, padding:'20px 24px', marginBottom:20, animation:'fadeUp 0.5s ease 0.4s both' }}>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:6, fontWeight:600, letterSpacing:0.8 }}>ORDER ID</div>
          <div style={{ fontSize:24, fontWeight:800, color:'var(--success)', letterSpacing:2, marginBottom:4 }}>{orderId}</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Save this for tracking your delivery</div>
        </div>

        {/* Details */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20, marginBottom:20, textAlign:'left', animation:'fadeUp 0.5s ease 0.5s both' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {[
              ['📦 Items',    `${cartItems.length} item${cartItems.length>1?'s':''}`],
              ['💰 Total',    `$${total.toFixed(2)}`],
              ['💳 Payment',  PAY_LABELS[payMethod] || payMethod],
              ['📍 Delivery', address?.city || 'Addis Ababa'],
            ].map(([l,v])=>(
              <div key={l} style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Items list */}
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:10 }}>ORDER ITEMS</div>
          {cartItems.slice(0,4).map((item,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--border)', color:'var(--text2)' }}>
              <span>{item.name} × {item.qty}</span>
              <span style={{ fontWeight:700, color:'var(--text)' }}>${(item.price*item.qty).toFixed(2)}</span>
            </div>
          ))}
          {cartItems.length > 4 && <div style={{ fontSize:12, color:'var(--text3)', marginTop:8, textAlign:'center' }}>+{cartItems.length-4} more items</div>}
        </div>

        {/* Delivery timeline preview */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:18, marginBottom:24, animation:'fadeUp 0.5s ease 0.6s both' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>📦 Estimated Delivery Timeline</div>
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>
            <div style={{ position:'absolute', top:14, left:'10%', right:'10%', height:2, background:'linear-gradient(90deg,var(--success),var(--primary),var(--border),var(--border))', zIndex:0 }} />
            {[['✓','Ordered','Now','#10b981'],['✓','Confirmed','Today','#10b981'],['🚚','Shipping','1-2 days','#6366f1'],['📦','Delivered','3-5 days','var(--border)']].map(([ic,l,t,c],i)=>(
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, position:'relative', zIndex:1, flex:1 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background: i<2?'#10b981':i===2?'#6366f1':'var(--bg3)', border:`2px solid ${c}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:i<3?'#fff':'var(--text3)' }}>{ic}</div>
                <div style={{ fontSize:10, fontWeight:600, color:i<3?'var(--text)':'var(--text3)', textAlign:'center' }}>{l}</div>
                <div style={{ fontSize:9, color:'var(--text3)', textAlign:'center' }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-redirect notice */}
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:20, animation:'shimmer 2s ease infinite' }}>
          ↪ Redirecting to My Orders in 8 seconds…
        </div>

        {/* Actions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, animation:'fadeUp 0.5s ease 0.7s both' }}>
          <button onClick={() => navigate('/customer/orders')} style={{ padding:12, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            📋 Track Order
          </button>
          <button onClick={() => navigate('/customer/shop')} style={{ padding:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            🛍️ Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
