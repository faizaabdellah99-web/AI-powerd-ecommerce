import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import Card from '../../components/shared/Card';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const QUICK_REPLIES = [
  { label:'📦 Track my order',       msg:'Where is my order ORD-002? What is its current status?' },
  { label:'↩️ Return a product',     msg:'I want to return my Wireless Headphones from order ORD-001. How do I do that?' },
  { label:'💳 Payment issue',        msg:'I was charged twice for my last order. Can you help?' },
  { label:'🔍 Find a product',       msg:'Do you have noise-cancelling headphones under $150?' },
  { label:'📅 Delivery time',        msg:'How long does standard delivery take to Addis Ababa?' },
  { label:'🎁 Apply a coupon',       msg:'How do I apply a discount coupon code at checkout?' },
];

const MOCK_ORDERS = [
  { id:'ORD-001', product:'Wireless Headphones', status:'delivered', date:'2024-12-01', amount:'$79.99' },
  { id:'ORD-002', product:'Coffee Maker X1',     status:'shipped',   date:'2024-11-20', amount:'$49.99' },
  { id:'ORD-003', product:'Running Shoes V2',    status:'delivered', date:'2024-11-05', amount:'$99.99' },
];

const STATUS_COLOR = { delivered:'#10b981', shipped:'#3b82f6', pending:'#f59e0b', cancelled:'#ef4444' };

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', gap:10, marginBottom:16, flexDirection:isUser?'row-reverse':'row', animation:'fadeUp 0.2s ease' }}>
      <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
        background:isUser?'linear-gradient(135deg,#6366f1,#8b5cf6)':'linear-gradient(135deg,#10b981,#059669)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'#fff', fontWeight:700 }}>
        {isUser ? (msg.author?.[0] || 'U') : '✦'}
      </div>
      <div style={{ maxWidth:'75%' }}>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3, textAlign:isUser?'right':'left' }}>
          {isUser ? 'You' : 'AI Assistant'} · {new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </div>
        <div style={{
          padding:'11px 15px', fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap',
          borderRadius:isUser?'18px 4px 18px 18px':'4px 18px 18px 18px',
          background:isUser?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--bg3)',
          color:isUser?'#fff':'var(--text)',
          border:isUser?'none':'1px solid var(--border)',
        }}>{msg.content}</div>
      </div>
    </div>
  );
}

export default function CustomerChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([{
    role:'assistant', content:`Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI shopping assistant.\n\nI can help you with:\n• 📦 Order tracking and status\n• ↩️ Returns and refunds\n• 🔍 Finding products\n• 💳 Payment questions\n• 🚚 Delivery information\n\nWhat can I help you with today?`,
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const orderContext = `Customer: ${user?.name || 'Customer'} | Orders: ${MOCK_ORDERS.map(o=>`${o.id}(${o.product},${o.status},$${o.amount})`).join(', ')}`;

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg = { role:'user', content:msg, timestamp:new Date().toISOString(), author:user?.name };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.slice(-10).map(m => ({ role:m.role, content:m.content }));
      const { data } = await api.post('/ai/chat', {
        message: msg,
        history,
        context: `customer support assistant. ${orderContext}. Help with orders, returns, payments, products, and delivery. Be friendly, concise, and helpful.`,
      });
      setMessages(prev => [...prev, { role:'assistant', content:data.reply, timestamp:data.timestamp }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:'❌ I\'m having trouble connecting right now. Please try again in a moment, or contact support at support@aicommerce.com.',
        timestamp: new Date().toISOString(),
      }]);
      toast.error('Connection error');
    } finally { setLoading(false); setTimeout(()=>inputRef.current?.focus(),100); }
  };

  return (
    <Layout title="💬 AI Assistant" subtitle="24/7 smart support — orders, returns, products and more">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, height:'calc(100vh - 170px)' }}>

        {/* Left panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card style={{ background:'linear-gradient(135deg,#10b98111,#05966911)', border:'1px solid #10b98133' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✦</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>AI Assistant</div>
                <div style={{ fontSize:11, color:'var(--success)', display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)' }} /> Online
                </div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
              Powered by AI. Knows your orders and can help with returns, payments, and finding products.
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:0.8, marginBottom:10 }}>QUICK REPLIES</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {QUICK_REPLIES.map((q,i) => (
                <button key={i} onClick={() => send(q.msg)} style={{
                  padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--border)',
                  borderRadius:9, color:'var(--text2)', fontSize:12, cursor:'pointer', textAlign:'left',
                  transition:'border-color 0.15s, color 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--success)'; e.currentTarget.style.color='var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}
                >{q.label}</button>
              ))}
            </div>
          </Card>

          <Card>
            <button onClick={() => setShowOrders(v=>!v)} style={{ width:'100%', background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--text)', fontWeight:600, fontSize:13 }}>
              📦 My Orders <span>{showOrders?'▲':'▼'}</span>
            </button>
            {showOrders && (
              <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
                {MOCK_ORDERS.map(o => (
                  <div key={o.id} style={{ background:'var(--bg3)', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--primary)' }}>{o.id}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:STATUS_COLOR[o.status], background:STATUS_COLOR[o.status]+'20', padding:'1px 7px', borderRadius:20 }}>{o.status}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>{o.product}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{o.amount} · {o.date}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Chat window */}
        <div style={{ display:'flex', flexDirection:'column', background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#10b98108,#05966908)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>✦</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>AI Shopping Assistant</div>
                <div style={{ fontSize:11, color:loading?'var(--warning)':'var(--success)' }}>
                  {loading ? '⏳ Thinking…' : '● Online'}
                </div>
              </div>
            </div>
            <button onClick={() => setMessages([{ role:'assistant', content:'Chat cleared. How can I help you?', timestamp:new Date().toISOString() }])} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:8, padding:'5px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>
              Clear
            </button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>
            {messages.map((m,i) => <Bubble key={i} msg={m} />)}
            {loading && (
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'#fff', flexShrink:0 }}>✦</div>
                <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'4px 18px 18px 18px', padding:'12px 16px', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'var(--success)',animation:'bounce 1.2s infinite',animationDelay:`${i*0.2}s` }} />)}
                  <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-end', background:'var(--bg3)' }}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Ask about your orders, products, returns… (Enter to send)"
              rows={2} style={{ flex:1, padding:'11px 14px', borderRadius:12, background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, maxHeight:100, transition:'border-color 0.15s' }}
              onFocus={e=>e.target.style.borderColor='var(--success)'}
              onBlur={e=>e.target.style.borderColor='var(--border)'}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
              width:44, height:44, borderRadius:'50%', border:'none', flexShrink:0,
              background:loading||!input.trim()?'var(--bg3)':'linear-gradient(135deg,#10b981,#059669)',
              color:loading||!input.trim()?'var(--text3)':'#fff', fontSize:18, cursor:loading||!input.trim()?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
            }}>{loading?'⏳':'▶'}</button>
          </div>
          <div style={{ padding:'4px 18px 10px', fontSize:10, color:'var(--text3)', textAlign:'center', background:'var(--bg3)' }}>
            Powered by AI · Shift+Enter for new line
          </div>
        </div>
      </div>
    </Layout>
  );
}
