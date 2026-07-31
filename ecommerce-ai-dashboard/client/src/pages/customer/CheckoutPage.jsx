import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id:'chapa',    icon:'🏦', label:'Chapa',            desc:'Ethiopian payment — Visa, MasterCard, Mobile',  color:'#10b981' },
  { id:'telebirr', icon:'📱', label:'TeleBirr',         desc:'Ethio Telecom mobile money',                    color:'#f59e0b' },
  { id:'card',     icon:'💳', label:'Credit / Debit Card', desc:'International Visa & Mastercard',            color:'#6366f1' },
  { id:'cod',      icon:'💵', label:'Cash on Delivery',  desc:'Pay cash when your order arrives',              color:'#8b5cf6' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const cartItems = location.state?.cartItems || [];
  const subtotal  = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping  = subtotal > 200 ? 0 : 15;
  const tax       = Math.round(subtotal * 0.15 * 100) / 100;
  const total     = subtotal + shipping + tax;

  const [step,    setStep]    = useState(1);
  const [placing, setPlacing] = useState(false);

  const [address, setAddress] = useState({
    fullName: user?.name || '', phone:'', city:'', subCity:'', woreda:'', street:'',
  });
  const [payMethod, setPayMethod] = useState('chapa');

  // Payment form states
  const [chapaPhone,  setChapaPhone]  = useState('');
  const [telePhone,   setTelePhone]   = useState('');
  const [card, setCard] = useState({ number:'', name:'', expiry:'', cvv:'' });

  const setAddr = (k, v) => setAddress(p => ({ ...p, [k]: v }));
  const setCardF = (k, v) => setCard(p => ({ ...p, [k]: v }));

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g,'').slice(0,4);
    return d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d;
  };

  const validateStep2 = () => {
    if (payMethod === 'chapa' && chapaPhone.replace(/\D/g,'').length < 9) {
      toast.error('Enter a valid phone number for Chapa'); return false;
    }
    if (payMethod === 'telebirr' && telePhone.replace(/\D/g,'').length < 9) {
      toast.error('Enter a valid TeleBirr phone number'); return false;
    }
    if (payMethod === 'card') {
      if (card.number.replace(/\s/g,'').length < 16) { toast.error('Enter a valid 16-digit card number'); return false; }
      if (!card.name.trim()) { toast.error('Enter the name on card'); return false; }
      if (card.expiry.length < 5) { toast.error('Enter card expiry MM/YY'); return false; }
      if (card.cvv.length < 3)   { toast.error('Enter a valid CVV'); return false; }
    }
    return true;
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          productId:   String(item.id),
          productName: item.name,
          category:    item.category,
          price:       item.price,
          qty:         item.qty,
        })),
        subtotal,
        shipping,
        tax,
        total,
        paymentMethod: payMethod,
        shippingAddress: address,
      };

      const { data } = await api.post('/orders', orderData);
      const orderId = data.orderId;

      navigate('/customer/order-confirmed', {
        state: { orderId, cartItems, total, payMethod, address },
      });
    } catch (e) {
      const errMsg = e.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(errMsg, { duration: 6000 });
    } finally {
      setPlacing(false);
    }
  };

  const steps = ['Delivery Address', 'Payment', 'Review & Place'];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)' }}>
      <style>{`
        .pay-card { transition: all 0.15s; cursor: pointer; }
        .pay-card:hover { transform: translateY(-1px); }
        .input-pay { background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:9px; padding:11px 14px; font-size:14px; width:100%; box-sizing:border-box; outline:none; font-family:inherit; transition:border-color 0.15s; }
        .input-pay:focus { border-color:var(--primary); }
      `}</style>

      {/* Header */}
      <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'14px 28px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>✦</div>
        <span style={{ fontSize:15,fontWeight:700 }}>Secure Checkout</span>
        <span style={{ fontSize:12,color:'var(--success)',marginLeft:4 }}>🔒 SSL Secured</span>
        <button onClick={()=>navigate(-1)} style={{ marginLeft:'auto',background:'transparent',border:'1px solid var(--border)',borderRadius:8,padding:'6px 14px',color:'var(--text2)',cursor:'pointer',fontSize:13 }}>← Back</button>
      </div>

      {/* Step indicator */}
      <div style={{ display:'flex',justifyContent:'center',alignItems:'center',padding:'24px 20px 0',gap:0 }}>
        {steps.map((s,i) => {
          const n=i+1; const done=step>n; const active=step===n;
          return (
            <div key={i} style={{ display:'flex',alignItems:'center' }}>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:done?'pointer':'default' }} onClick={()=>done&&setStep(n)}>
                <div style={{ width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,transition:'all 0.2s',
                  background:done?'var(--success)':active?'var(--primary)':'var(--bg3)',
                  color:done||active?'#fff':'var(--text3)',
                  border:`2px solid ${done?'var(--success)':active?'var(--primary)':'var(--border)'}`,
                }}>{done?'✓':n}</div>
                <div style={{ fontSize:11,color:active?'var(--primary)':'var(--text3)',fontWeight:active?700:400,whiteSpace:'nowrap' }}>{s}</div>
              </div>
              {i<steps.length-1 && <div style={{ width:80,height:2,background:done?'var(--success)':'var(--border)',margin:'0 8px 20px' }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:24,maxWidth:980,margin:'24px auto',padding:'0 20px' }}>

        {/* ── LEFT: Forms ── */}
        <div>

          {/* STEP 1: Address */}
          {step===1 && (
            <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:28 }}>
              <div style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>📍 Delivery Address</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                {[['fullName','Full Name *','e.g. Abebe Girma'],['phone','Phone Number *','09XX XXX XXXX'],['city','City *','Addis Ababa'],['subCity','Sub-City','Bole'],['woreda','Woreda','03'],['street','Street / House No.','Bole Road, House 15']].map(([k,l,ph])=>(
                  <div key={k} style={{ gridColumn:k==='street'?'1 / -1':'auto' }}>
                    <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500 }}>{l}</label>
                    <input className="input-pay" placeholder={ph} value={address[k]} onChange={e=>setAddr(k,e.target.value)} />
                  </div>
                ))}
              </div>
              <button onClick={()=>{
                if (!address.fullName||!address.phone||!address.city) return toast.error('Please fill Full Name, Phone, and City');
                setStep(2);
              }} style={{ marginTop:20,width:'100%',padding:13,background:'var(--primary)',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer' }}>
                Continue to Payment →
              </button>
            </div>
          )}

          {/* STEP 2: Payment */}
          {step===2 && (
            <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:28 }}>
              <div style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>💳 Payment Method</div>

              {/* Method cards */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24 }}>
                {PAYMENT_METHODS.map(m=>(
                  <div key={m.id} className="pay-card" onClick={()=>setPayMethod(m.id)} style={{
                    padding:'16px',borderRadius:12,
                    border:`2px solid ${payMethod===m.id?m.color:'var(--border)'}`,
                    background:payMethod===m.id?m.color+'18':'var(--bg3)',
                  }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                      <span style={{ fontSize:22 }}>{m.icon}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:payMethod===m.id?m.color:'var(--text)' }}>{m.label}</span>
                      {payMethod===m.id && <span style={{ marginLeft:'auto',fontSize:16,color:m.color }}>●</span>}
                    </div>
                    <div style={{ fontSize:11,color:'var(--text3)',lineHeight:1.4 }}>{m.desc}</div>
                  </div>
                ))}
              </div>

              {/* Chapa form */}
              {payMethod==='chapa' && (
                <div style={{ background:'var(--bg3)',borderRadius:12,padding:18,marginBottom:16,border:'1px solid #10b98133' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                    <span style={{ fontSize:20 }}>🏦</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:'#10b981' }}>Pay with Chapa</div>
                      <div style={{ fontSize:11,color:'var(--text3)' }}>You will be redirected to Chapa to complete payment</div>
                    </div>
                  </div>
                  <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500 }}>Phone Number *</label>
                  <input className="input-pay" placeholder="09XX XXX XXXX" value={chapaPhone} onChange={e=>setChapaPhone(e.target.value.replace(/[^0-9+]/g,''))} />
                  <div style={{ marginTop:10,fontSize:11,color:'var(--text3)',lineHeight:1.6 }}>
                    💡 Chapa supports Telebirr, CBE Birr, Awash Bank, Dashen Bank and more. Enter the phone number linked to your account.
                  </div>
                </div>
              )}

              {/* TeleBirr form */}
              {payMethod==='telebirr' && (
                <div style={{ background:'var(--bg3)',borderRadius:12,padding:18,marginBottom:16,border:'1px solid #f59e0b33' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                    <span style={{ fontSize:20 }}>📱</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:'#f59e0b' }}>Pay with TeleBirr</div>
                      <div style={{ fontSize:11,color:'var(--text3)' }}>Ethio Telecom mobile wallet payment</div>
                    </div>
                  </div>
                  <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:6,fontWeight:500 }}>TeleBirr Phone Number *</label>
                  <input className="input-pay" placeholder="09XX XXX XXXX" value={telePhone} onChange={e=>setTelePhone(e.target.value.replace(/[^0-9+]/g,''))} />
                  <div style={{ marginTop:10,padding:'10px 12px',background:'#f59e0b11',borderRadius:8,fontSize:11,color:'#f59e0b',lineHeight:1.6 }}>
                    📲 After clicking "Continue", you will receive a USSD push notification on your phone to approve the payment of <strong>${total.toFixed(2)}</strong>.
                  </div>
                </div>
              )}

              {/* Card form */}
              {payMethod==='card' && (
                <div style={{ background:'var(--bg3)',borderRadius:12,padding:18,marginBottom:16,border:'1px solid #6366f133' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                    <span style={{ fontSize:20 }}>💳</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:'var(--primary)' }}>Card Details</div>
                      <div style={{ fontSize:11,color:'var(--text3)',display:'flex',gap:6,marginTop:2 }}>
                        <span>💳 Visa</span><span>💳 Mastercard</span><span>💳 Amex</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'grid',gap:12 }}>
                    <div>
                      <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500 }}>Card Number *</label>
                      <input className="input-pay" placeholder="1234 5678 9012 3456" value={card.number} onChange={e=>setCardF('number',formatCard(e.target.value))} maxLength={19} />
                    </div>
                    <div>
                      <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500 }}>Name on Card *</label>
                      <input className="input-pay" placeholder="ABEBE GIRMA" value={card.name} onChange={e=>setCardF('name',e.target.value.toUpperCase())} />
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                      <div>
                        <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500 }}>Expiry *</label>
                        <input className="input-pay" placeholder="MM/YY" value={card.expiry} onChange={e=>setCardF('expiry',formatExpiry(e.target.value))} maxLength={5} />
                      </div>
                      <div>
                        <label style={{ fontSize:12,color:'var(--text2)',display:'block',marginBottom:5,fontWeight:500 }}>CVV *</label>
                        <input className="input-pay" type="password" placeholder="•••" value={card.cvv} onChange={e=>setCardF('cvv',e.target.value.replace(/\D/g,'').slice(0,4))} maxLength={4} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop:10,fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:5 }}>
                    🔒 Your card details are encrypted and never stored on our servers.
                  </div>
                </div>
              )}

              {/* Cash on Delivery */}
              {payMethod==='cod' && (
                <div style={{ background:'var(--bg3)',borderRadius:12,padding:18,marginBottom:16,border:'1px solid #8b5cf633' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                    <span style={{ fontSize:28 }}>💵</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:'#8b5cf6' }}>Cash on Delivery</div>
                      <div style={{ fontSize:11,color:'var(--text3)' }}>Pay in cash when your order arrives at your door</div>
                    </div>
                  </div>
                  <div style={{ display:'grid',gap:8 }}>
                    {[['📦','No prepayment required'],['🚚','Driver carries change'],['✅','Inspect before you pay'],['⏱️','Delivery: 2–4 business days']].map(([ic,t])=>(
                      <div key={t} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)' }}>
                        <span>{ic}</span><span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12,padding:'10px 12px',background:'#8b5cf611',borderRadius:8,fontSize:12,color:'#8b5cf6',fontWeight:600 }}>
                    Amount to prepare: <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setStep(1)} style={{ flex:1,padding:12,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text2)',cursor:'pointer',fontWeight:600,fontSize:13 }}>← Back</button>
                <button onClick={()=>{ if(validateStep2()) setStep(3); }} style={{ flex:2,padding:12,background:'var(--primary)',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer' }}>
                  Review Order →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step===3 && (
            <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:28 }}>
              <div style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>✅ Review Your Order</div>

              {/* Delivery */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',letterSpacing:0.8,marginBottom:8 }}>DELIVERY TO</div>
                <div style={{ background:'var(--bg3)',borderRadius:10,padding:'12px 14px',fontSize:13,color:'var(--text2)',lineHeight:1.8,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>{address.fullName} · {address.phone}<br/>{address.street && `${address.street}, `}Woreda {address.woreda}, {address.subCity}, {address.city}</div>
                  <button onClick={()=>setStep(1)} style={{ background:'transparent',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:12,fontWeight:600 }}>Edit</button>
                </div>
              </div>

              {/* Payment summary */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',letterSpacing:0.8,marginBottom:8 }}>PAYMENT</div>
                <div style={{ background:'var(--bg3)',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:20 }}>{PAYMENT_METHODS.find(m=>m.id===payMethod)?.icon}</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:'var(--text)' }}>{PAYMENT_METHODS.find(m=>m.id===payMethod)?.label}</div>
                      {payMethod==='chapa'    && <div style={{ fontSize:11,color:'var(--text3)' }}>Phone: {chapaPhone}</div>}
                      {payMethod==='telebirr' && <div style={{ fontSize:11,color:'var(--text3)' }}>Phone: {telePhone}</div>}
                      {payMethod==='card'     && <div style={{ fontSize:11,color:'var(--text3)' }}>•••• •••• •••• {card.number.replace(/\s/g,'').slice(-4)}</div>}
                      {payMethod==='cod'      && <div style={{ fontSize:11,color:'var(--text3)' }}>Pay ${total.toFixed(2)} on delivery</div>}
                    </div>
                  </div>
                  <button onClick={()=>setStep(2)} style={{ background:'transparent',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:12,fontWeight:600 }}>Edit</button>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text3)',letterSpacing:0.8,marginBottom:8 }}>ITEMS ({cartItems.length})</div>
                {cartItems.map((item,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:13 }}>
                    <span style={{ color:'var(--text)' }}>{item.name} <span style={{ color:'var(--text3)' }}>× {item.qty}</span></span>
                    <span style={{ fontWeight:700 }}>${(item.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Place order */}
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setStep(2)} style={{ flex:1,padding:12,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text2)',cursor:'pointer',fontWeight:600,fontSize:13 }}>← Back</button>
                <button onClick={placeOrder} disabled={placing} style={{
                  flex:2,padding:12,borderRadius:10,border:'none',fontWeight:700,fontSize:14,cursor:placing?'not-allowed':'pointer',
                  background:placing?'var(--bg3)':'linear-gradient(135deg,#10b981,#059669)',
                  color:placing?'var(--text3)':'#fff',
                }}>
                  {placing?'⏳ Processing payment…':'🛒 Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Order Summary ── */}
        <div>
          <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,padding:20,position:'sticky',top:20 }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Order Summary</div>
            <div style={{ maxHeight:300,overflowY:'auto',marginBottom:16,scrollbarWidth:'thin' }}>
              {cartItems.map((item,i)=>(
                <div key={i} style={{ display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:10,paddingBottom:10,borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight:600,color:'var(--text)',marginBottom:2 }}>{item.name}</div>
                    <div style={{ fontSize:11,color:'var(--text3)' }}>Qty: {item.qty}</div>
                  </div>
                  <div style={{ fontWeight:700,color:'var(--text)',flexShrink:0,marginLeft:8 }}>${(item.price*item.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>
            {[['Subtotal',`$${subtotal.toFixed(2)}`],['Shipping',shipping===0?'🎉 Free':`$${shipping.toFixed(2)}`],['Tax (15%)',`$${tax.toFixed(2)}`]].map(([l,v])=>(
              <div key={l} style={{ display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text2)',marginBottom:8 }}>
                <span>{l}</span><span style={{ color:l==='Shipping'&&shipping===0?'var(--success)':'var(--text)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:800,color:'var(--primary)',borderTop:'1px solid var(--border)',paddingTop:12,marginTop:8 }}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
            {shipping===0 && <div style={{ marginTop:8,fontSize:11,color:'var(--success)',textAlign:'center' }}>✓ Free shipping on orders over $200</div>}

            <div style={{ marginTop:16,padding:'10px 12px',background:'var(--bg3)',borderRadius:8,fontSize:11,color:'var(--text3)',lineHeight:1.6 }}>
              🔒 Your order is protected. 30-day return policy applies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
